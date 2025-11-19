import React, { useEffect, useMemo, useState } from 'react';
import './Reports.css';
import api from '../services/api';

const periodOptions = [
  { label: 'Última semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
  { label: 'Último trimestre', value: 'quarter' },
  { label: 'Este año', value: 'year' },
];

const tabs = [
  { 
    id: 'rotacion', 
    label: 'Rotación', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10"></line>
        <line x1="18" y1="20" x2="18" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="16"></line>
      </svg>
    )
  },
  { 
    id: 'costos', 
    label: 'Costos', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    )
  },
  { 
    id: 'stock', 
    label: 'Niveles de Stock', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    )
  },
  { 
    id: 'proveedores', 
    label: 'Proveedores', 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18"></path>
        <path d="M5 21V7l8-4 8 4v14"></path>
        <path d="M17 21v-8H7v8"></path>
        <path d="M9 9h1"></path>
        <path d="M9 13h1"></path>
        <path d="M9 17h1"></path>
        <path d="M14 9h1"></path>
        <path d="M14 13h1"></path>
        <path d="M14 17h1"></path>
      </svg>
    )
  },
];

const ReportsView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('rotacion');
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState({
    products: [],
    orders: [],
    movements: [],
    suppliers: [],
  });

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }),
    []
  );

  const dateFilters = useMemo(() => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDateObj = new Date(now);

    switch (period) {
      case 'week':
        startDateObj.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDateObj.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDateObj.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDateObj.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDateObj.setMonth(now.getMonth() - 1);
    }
    const startDate = startDateObj.toISOString().split('T')[0];
    return { startDate, endDate };
  }, [period]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [productsResponse, ordersResponse, movementsResponse, suppliersResponse] =
          await Promise.all([
            api.getProducts({}), // Products are always all needed for stock levels
            api.getOrders({ startDate: dateFilters.startDate, endDate: dateFilters.endDate }),
            api.getMovements({ startDate: dateFilters.startDate, endDate: dateFilters.endDate }),
            api.getSuppliers({}),
          ]);

        if (!productsResponse?.success) throw new Error(productsResponse?.message || 'Error al cargar productos');
        if (!ordersResponse?.success) throw new Error(ordersResponse?.message || 'Error al cargar pedidos');
        if (!movementsResponse?.success) throw new Error(movementsResponse?.message || 'Error al cargar movimientos');
        if (!suppliersResponse?.success) throw new Error(suppliersResponse?.message || 'Error al cargar proveedores');

        setData({
          products: productsResponse.data?.products || [],
          orders: ordersResponse.data?.orders || [],
          movements: movementsResponse.data?.movements || [],
          suppliers: suppliersResponse.data?.suppliers || [],
        });
      } catch (err) {
        setError(err?.message || 'No se pudieron cargar los informes');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateFilters]);

  const productMap = useMemo(() => {
    const map = new Map();
    data.products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [data.products]);

  // No need for client-side filtering anymore as API handles it
  const filteredMovements = data.movements;
  const filteredOrders = data.orders;

  const totalInventoryValue = useMemo(
    () =>
      data.products.reduce(
        (acc, product) => acc + (Number(product.stock) || 0) * (Number(product.precio) || 0),
        0
      ),
    [data.products]
  );

  const totalStockItems = useMemo(
    () => data.products.reduce((acc, product) => acc + (Number(product.stock) || 0), 0),
    [data.products]
  );

  const rotationPerProduct = useMemo(() => {
    const map = new Map();
    filteredMovements.forEach((movement) => {
      if (!movement.producto_id) return;
      const key = movement.producto_id;
      if (!map.has(key)) {
        map.set(key, {
          producto_id: key,
          sku: movement.producto_sku,
          nombre:
            movement.producto_nombre ||
            productMap.get(key)?.nombre ||
            `Producto ${key}`,
          entradas: 0,
          salidas: 0,
        });
      }
      const item = map.get(key);
      const cantidad = Number(movement.cantidad) || 0;
      if (movement.tipo === 'entry') {
        item.entradas += cantidad;
      } else if (movement.tipo === 'exit') {
        item.salidas += cantidad;
      }
    });
    const list = Array.from(map.values()).map((item) => ({
      ...item,
      rotacion: item.salidas,
    }));
    return list.sort((a, b) => b.rotacion - a.rotacion);
  }, [filteredMovements, productMap]);

  const averageRotation = useMemo(() => {
    if (rotationPerProduct.length === 0) return 0;
    const totalRotation = rotationPerProduct.reduce((acc, item) => acc + item.rotacion, 0);
    return totalRotation / rotationPerProduct.length;
  }, [rotationPerProduct]);

  const costSummary = useMemo(() => {
    const map = new Map();
    
    // Process Sales (from Exit Movements)
    filteredMovements.forEach((movement) => {
      if (movement.tipo !== 'exit') return;
      const date = movement.fecha_movimiento ? new Date(movement.fecha_movimiento) : null;
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!map.has(key)) {
        map.set(key, {
          label: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          ventas: 0,
          compras: 0,
          margen: 0,
        });
      }
      const entry = map.get(key);
      const totalVenta = (Number(movement.cantidad) || 0) * (Number(movement.producto_precio) || 0);
      entry.ventas += totalVenta;
      // Estimating margin as 30% of sales for simplicity if cost is not tracked per movement
      entry.margen += totalVenta * 0.30; 
    });

    // Process Purchases (from Orders)
    filteredOrders.forEach((order) => {
      const date = order.fecha_creacion ? new Date(order.fecha_creacion) : null;
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!map.has(key)) {
        map.set(key, {
          label: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          ventas: 0,
          compras: 0,
          margen: 0,
        });
      }
      const entry = map.get(key);
      entry.compras += Number(order.monto_total) || 0;
    });

    const list = Array.from(map.values());
    list.sort((a, b) => (a.label > b.label ? 1 : -1));
    return list;
  }, [filteredMovements, filteredOrders]);

  const grossMargin = useMemo(
    () => costSummary.reduce((acc, item) => acc + item.margen, 0),
    [costSummary]
  );

  const stockLevels = useMemo(() => {
    const statusTotals = {
      optimo: 0,
      aceptable: 0,
      bajo: 0,
    };
    const byCategory = new Map();
    const productsDetail = [];

    data.products.forEach((product) => {
      const stock = Number(product.stock) || 0;
      const min = Number(product.stock_minimo) || 0;
      const ratio = min === 0 ? 1 : stock / min;
      let status = 'optimo';
      if (ratio < 0.7) status = 'bajo';
      else if (ratio < 1) status = 'aceptable';
      statusTotals[status] += 1;

      const categoryKey = product.categoria || 'Sin categoría';
      if (!byCategory.has(categoryKey)) {
        byCategory.set(categoryKey, {
          categoria: categoryKey,
          stockActual: 0,
          stockMinimo: 0,
          status,
        });
      }
      const entry = byCategory.get(categoryKey);
      entry.stockActual += stock;
      entry.stockMinimo += min;
      entry.status = status;

      productsDetail.push({
        id: product.id,
        nombre: product.nombre,
        sku: product.sku,
        categoria: product.categoria || 'Sin categoría',
        stockActual: stock,
        stockMinimo: min,
        status,
      });
    });

    const totalProducts = data.products.length || 1;
    const availability =
      ((statusTotals.optimo + statusTotals.aceptable) / totalProducts) * 100;

    return {
      statusTotals,
      availability: Math.round(availability),
      categories: Array.from(byCategory.values()),
      products: productsDetail,
    };
  }, [data.products]);

  const supplierPerformance = useMemo(() => {
    const aggregation = new Map();
    filteredOrders.forEach((order) => {
      const supplier = order.proveedor?.nombre || 'Sin proveedor';
      if (!aggregation.has(supplier)) {
        aggregation.set(supplier, {
          proveedor: supplier,
          pedidos: 0,
          montoTotal: 0,
          entregadosATiempo: 0,
          totalEntregados: 0,
          diasEntregaAcumulado: 0,
        });
      }
      const entry = aggregation.get(supplier);
      entry.pedidos += 1;
      entry.montoTotal += Number(order.monto_total) || 0;

      if (order.estado === 'entregado' && order.fecha_actualizacion) {
        entry.totalEntregados += 1;
        const fechaCreacion = new Date(order.fecha_creacion);
        const fechaEntrega = new Date(order.fecha_actualizacion);
        const diffTime = Math.abs(fechaEntrega - fechaCreacion);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        entry.diasEntregaAcumulado += diffDays;

        if (order.fecha_entrega_estimada) {
            const fechaEstimada = new Date(order.fecha_entrega_estimada);
            // Consideramos "a tiempo" si se entrega el mismo día o antes de la estimada
            if (fechaEntrega <= fechaEstimada) {
                entry.entregadosATiempo += 1;
            }
        } else {
            // Si no hay fecha estimada, asumimos que está a tiempo (o podríamos no contarlo)
            entry.entregadosATiempo += 1;
        }
      }
    });

    const totalOrders = Array.from(aggregation.values()).reduce(
      (acc, item) => acc + item.pedidos,
      0
    );

    const distribution = Array.from(aggregation.values()).map((item) => {
        const cumplimiento = item.totalEntregados > 0 
            ? Math.round((item.entregadosATiempo / item.totalEntregados) * 100) 
            : 100; // Default to 100 if no delivered orders yet
        
        const plazoPromedio = item.totalEntregados > 0
            ? Math.round(item.diasEntregaAcumulado / item.totalEntregados)
            : 0;

        return {
            proveedor: item.proveedor,
            pedidos: item.pedidos,
            montoTotal: item.montoTotal,
            cumplimiento,
            plazoPromedio,
            porcentaje: totalOrders === 0 ? 0 : Math.round((item.pedidos / totalOrders) * 100),
        };
    });

    return distribution.sort((a, b) => b.pedidos - a.pedidos);
  }, [filteredOrders]);

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Valor total de inventario', totalInventoryValue],
      ['Rotación promedio', averageRotation],
      ['Margen bruto estimado', grossMargin],
      ['Items en stock', totalStockItems],
    ];
    const csvContent = rows
      .map((row) =>
        row
          .map((value) =>
            typeof value === 'number' ? value.toLocaleString('es-ES') : `"${value}"`
          )
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `informes_${period}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

// --- Chart Components ---

const SimpleBarChart = ({ data, valueKey, labelKey, color = '#239c56', height = 200 }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d[valueKey]), 1);
  const barWidth = 40;
  const gap = 20;
  const chartWidth = data.length * (barWidth + gap);
  const chartHeight = height;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
      <svg width={chartWidth} height={chartHeight + 30} style={{ minWidth: '100%' }}>
        {data.map((item, index) => {
          const value = item[valueKey];
          const barHeight = (value / maxValue) * chartHeight;
          const x = index * (barWidth + gap);
          const y = chartHeight - barHeight;

          return (
            <g key={index} transform={`translate(${x}, 0)`}>
              <rect
                x={0}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
                opacity={0.8}
              >
                <title>{`${item[labelKey]}: ${value}`}</title>
              </rect>
              <text
                x={barWidth / 2}
                y={chartHeight + 15}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
                style={{ pointerEvents: 'none' }}
              >
                {item[labelKey].substring(0, 10)}
              </text>
              <text
                x={barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#334155"
              >
                {value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const StackedBarChart = ({ data, keys, colors, height = 200, formatter }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(
    ...data.map((d) => keys.reduce((acc, key) => Math.max(acc, d[key]), 0)),
    1
  );
  
  const barWidth = 40;
  const gap = 30;
  const chartWidth = data.length * (barWidth + gap);
  const chartHeight = height;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
      <svg width={chartWidth} height={chartHeight + 30} style={{ minWidth: '100%' }}>
        {data.map((item, index) => {
          const x = index * (barWidth + gap);
          return (
            <g key={index} transform={`translate(${x}, 0)`}>
              {keys.map((key, kIndex) => {
                const value = item[key];
                const barHeight = (value / maxValue) * chartHeight;
                // Side by side for now to be clearer, or stacked? 
                // Let's do side-by-side slightly overlapping or just thin bars next to each other
                // Actually, the previous design was stacked/grouped. Let's do grouped.
                const subBarWidth = barWidth / keys.length;
                const subX = kIndex * subBarWidth;
                const y = chartHeight - barHeight;
                
                return (
                  <rect
                    key={key}
                    x={subX}
                    y={y}
                    width={subBarWidth - 2}
                    height={barHeight}
                    fill={colors[kIndex]}
                    rx={2}
                  >
                    <title>{`${key}: ${formatter ? formatter.format(value) : value}`}</title>
                  </rect>
                );
              })}
              <text
                x={barWidth / 2}
                y={chartHeight + 15}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const DonutChart = ({ data, valueKey, labelKey, colors, size = 200 }) => {
  if (!data || data.length === 0) return null;

  const total = data.reduce((acc, item) => acc + item[valueKey], 0);
  let accumulatedAngle = 0;

  const center = size / 2;
  const radius = size / 2 - 20;
  const holeRadius = radius * 0.6;

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, index) => {
          const value = item[valueKey];
          const percent = value / total;
          const startAngle = accumulatedAngle;
          accumulatedAngle += percent;
          const endAngle = accumulatedAngle;

          const [startX, startY] = getCoordinatesForPercent(startAngle);
          const [endX, endY] = getCoordinatesForPercent(endAngle);

          const largeArcFlag = percent > 0.5 ? 1 : 0;

          const pathData = [
            `M ${center + radius * startX} ${center + radius * startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${center + radius * endX} ${center + radius * endY}`,
            `L ${center + holeRadius * endX} ${center + holeRadius * endY}`,
            `A ${holeRadius} ${holeRadius} 0 ${largeArcFlag} 0 ${center + holeRadius * startX} ${center + holeRadius * startY}`,
            'Z',
          ].join(' ');

          return (
            <path
              key={index}
              d={pathData}
              fill={colors[index % colors.length]}
              transform={`rotate(-90 ${center} ${center})`}
              stroke="white"
              strokeWidth="2"
            >
              <title>{`${item[labelKey]}: ${value} (${(percent * 100).toFixed(1)}%)`}</title>
            </path>
          );
        })}
        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="14" fontWeight="bold" fill="#334155">
          {total}
        </text>
        <text x="50%" y="50%" textAnchor="middle" dy="1.5em" fontSize="10" fill="#64748b">
          Total
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colors[index % colors.length] }}></span>
            <span style={{ color: '#334155', fontWeight: '500' }}>{item[labelKey]}</span>
            <span style={{ color: '#64748b' }}>{Math.round((item[valueKey] / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main Component ---

  return (
    <div className="reports-wrapper">
      <div className="reports-header">
        <div>
          <h1>Informes y Analítica</h1>
          <p>Visualiza los KPI clave de tu inventario y operaciones</p>
        </div>
        <div className="reports-header-actions">
          <select
            className="reports-select"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary" onClick={handleExportPDF}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar PDF
          </button>
          <button type="button" className="btn-ghost" onClick={handleExportExcel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Exportar Excel
          </button>
        </div>
      </div>

      {error && <div className="reports-alert error">{error}</div>}
      {loading && <div className="reports-alert loading">Cargando información…</div>}

      <section className="reports-kpis">
        <article>
          <span>Valor Total del Inventario</span>
          <strong>{currencyFormatter.format(totalInventoryValue)}</strong>
        </article>
        <article>
          <span>Rotación Promedio de productos</span>
          <strong>{averageRotation.toFixed(1)} unidades</strong>
        </article>
        <article>
          <span>Margen Bruto estimado</span>
          <strong>{currencyFormatter.format(grossMargin)}</strong>
        </article>
        <article>
          <span>Total de Items en Stock</span>
          <strong>{totalStockItems.toLocaleString('es-ES')}</strong>
        </article>
      </section>

      <div className="reports-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="reports-content">
        {activeTab === 'rotacion' && (
          <div className="reports-tab-panel">
            <div className="reports-section">
              <div className="reports-section-header">
                <h2>Productos más vendidos</h2>
                <p className="reports-note">
                  Calculado a partir de las salidas registradas en los movimientos del período.
                </p>
              </div>
              {rotationPerProduct.length === 0 ? (
                <p className="reports-empty">No hay movimientos para este período.</p>
              ) : (
                <SimpleBarChart 
                  data={rotationPerProduct.slice(0, 10)} 
                  valueKey="rotacion" 
                  labelKey="nombre" 
                />
              )}
            </div>

            <div className="reports-grid two">
              <div className="reports-section">
                <h3>Qué productos rotan más rápido</h3>
                <ul className="reports-list">
                  {rotationPerProduct.slice(0, 8).map((item) => (
                    <li key={item.producto_id}>
                      <span>{item.nombre}</span>
                      <span>{item.rotacion} salidas</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="reports-section">
                <h3>Detalles de rotación por producto</h3>
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Entradas</th>
                      <th>Salidas</th>
                      <th>Rotación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rotationPerProduct.slice(0, 10).map((item) => (
                      <tr key={item.producto_id}>
                        <td>{item.nombre}</td>
                        <td>{item.entradas}</td>
                        <td>{item.salidas}</td>
                        <td>{item.rotacion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'costos' && (
          <div className="reports-tab-panel">
            <div className="reports-section">
              <div className="reports-section-header">
                <h2>Evolución mensual</h2>
                <p className="reports-note">
                  Comparativa de Ventas (Salidas valorizadas) vs Compras (Pedidos).
                </p>
              </div>
              {costSummary.length === 0 ? (
                <p className="reports-empty">Sin información disponible para el período.</p>
              ) : (
                <StackedBarChart 
                  data={costSummary} 
                  keys={['ventas', 'compras']} 
                  colors={['#239c56', '#f97316']}
                  formatter={currencyFormatter}
                />
              )}
            </div>

            <div className="reports-grid two">
              <div className="reports-section">
                <h3>Resumen financiero</h3>
                <ul className="reports-list compact">
                  <li>
                    <span>Ventas totales (Estimadas)</span>
                    <span>
                      {currencyFormatter.format(
                        costSummary.reduce((acc, item) => acc + item.ventas, 0)
                      )}
                    </span>
                  </li>
                  <li>
                    <span>Compras totales</span>
                    <span>
                      {currencyFormatter.format(
                        costSummary.reduce((acc, item) => acc + item.compras, 0)
                      )}
                    </span>
                  </li>
                  <li>
                    <span>Margen acumulado</span>
                    <span>{currencyFormatter.format(grossMargin)}</span>
                  </li>
                </ul>
              </div>

              <div className="reports-section">
                <h3>Top categorías por margen</h3>
                <ul className="reports-list">
                  {stockLevels.categories
                    .slice()
                    .sort((a, b) => b.stockActual - a.stockActual)
                    .slice(0, 5)
                    .map((item) => (
                      <li key={item.categoria}>
                        <span>{item.categoria}</span>
                        <span>{item.stockActual} uds.</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="reports-tab-panel">
            <div className="reports-section">
              <h2>Comparación Stock actual vs óptimo</h2>
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Stock actual</th>
                    <th>Stock mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLevels.categories.map((item) => (
                    <tr key={item.categoria}>
                      <td>{item.categoria}</td>
                      <td>{item.stockActual}</td>
                      <td>{item.stockMinimo}</td>
                      <td>
                        <span className={`reports-badge ${item.status}`}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="reports-section">
              <h3>Detalle por producto</h3>
              <table className="reports-table products">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLevels.products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.nombre}</td>
                      <td>{product.sku}</td>
                      <td>{product.categoria}</td>
                      <td>{product.stockActual}</td>
                      <td>{product.stockMinimo}</td>
                      <td>
                        <span className={`reports-badge ${product.status}`}>
                          {product.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="reports-grid two">
              <div className="reports-section">
                <h3>Estado general</h3>
                <ul className="reports-list compact">
                  <li>
                    <span>Óptimo</span>
                    <span>{stockLevels.statusTotals.optimo}</span>
                  </li>
                  <li>
                    <span>Aceptable</span>
                    <span>{stockLevels.statusTotals.aceptable}</span>
                  </li>
                  <li>
                    <span>Bajo</span>
                    <span>{stockLevels.statusTotals.bajo}</span>
                  </li>
                </ul>
              </div>

              <div className="reports-section">
                <h3>Disponibilidad</h3>
                <div className="reports-availability">
                  <div className="circle">
                    <span>{stockLevels.availability}%</span>
                  </div>
                  <p>Porcentaje de productos con stock suficiente.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'proveedores' && (
          <div className="reports-tab-panel">
            <div className="reports-section">
              <div className="reports-section-header">
                <h2>Distribución de pedidos por proveedor</h2>
                <p className="reports-note">
                  Basado en la cantidad de pedidos generados dentro del período seleccionado.
                </p>
              </div>
              {supplierPerformance.length === 0 ? (
                <p className="reports-empty">Sin pedidos en el período seleccionado.</p>
              ) : (
                <DonutChart 
                  data={supplierPerformance.slice(0, 5)} 
                  valueKey="pedidos" 
                  labelKey="proveedor"
                  colors={['#239c56', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']}
                />
              )}
            </div>

            <div className="reports-section">
              <h3>Performance de proveedores</h3>
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Pedidos</th>
                    <th>Montos</th>
                    <th>Plazo promedio (días)</th>
                    <th>Cumplimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierPerformance.map((item) => (
                    <tr key={item.proveedor}>
                      <td>{item.proveedor}</td>
                      <td>{item.pedidos}</td>
                      <td>{currencyFormatter.format(item.montoTotal)}</td>
                      <td>{item.plazoPromedio}</td>
                      <td>
                        <span className={`reports-badge ${item.cumplimiento >= 90 ? 'success' : item.cumplimiento >= 70 ? 'aceptable' : 'bajo'}`}>
                          {item.cumplimiento}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsView;


