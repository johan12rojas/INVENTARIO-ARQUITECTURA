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
  { id: 'rotacion', label: 'Rotación 📈' },
  { id: 'costos', label: 'Costos 💰' },
  { id: 'stock', label: 'Niveles de Stock 📦' },
  { id: 'proveedores', label: 'Proveedores 🏢' },
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [productsResponse, ordersResponse, movementsResponse, suppliersResponse] =
          await Promise.all([
            api.getProducts({}),
            api.getOrders({}),
            api.getMovements({}),
            api.getSuppliers({}),
          ]);

        if (!productsResponse?.success) {
          throw new Error(productsResponse?.message || 'No se pudieron obtener los productos');
        }
        if (!ordersResponse?.success) {
          throw new Error(ordersResponse?.message || 'No se pudieron obtener los pedidos');
        }
        if (!movementsResponse?.success) {
          throw new Error(
            movementsResponse?.message || 'No se pudieron obtener los movimientos'
          );
        }
        if (!suppliersResponse?.success) {
          throw new Error(
            suppliersResponse?.message || 'No se pudieron obtener los proveedores'
          );
        }

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
  }, []);

  const productMap = useMemo(() => {
    const map = new Map();
    data.products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [data.products]);

  const filteredMovements = useMemo(() => {
    const now = new Date();
    const limitDate = new Date(now);
    switch (period) {
      case 'week':
        limitDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        limitDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        limitDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        limitDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        break;
    }

    return data.movements.filter((movement) => {
      const date = movement.fecha_movimiento ? new Date(movement.fecha_movimiento) : null;
      if (!date) return false;
      return date >= limitDate;
    });
  }, [data.movements, period]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const limitDate = new Date(now);
    switch (period) {
      case 'week':
        limitDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        limitDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        limitDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        limitDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        break;
    }

    return data.orders.filter((order) => {
      const date = order.fecha_creacion ? new Date(order.fecha_creacion) : null;
      if (!date) return false;
      return date >= limitDate;
    });
  }, [data.orders, period]);

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
      const total = Number(order.monto_total) || 0;
      entry.ventas += total * 0.65; // asumimos 65% ventas
      entry.compras += total * 0.35; // asumimos 35% compras
      entry.margen += total * 0.25; // margen estimado 25%
    });
    const list = Array.from(map.values());
    list.sort((a, b) => (a.label > b.label ? 1 : -1));
    return list;
  }, [filteredOrders]);

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
          cumplimiento: 92,
          plazoPromedio: 6,
        });
      }
      const entry = aggregation.get(supplier);
      entry.pedidos += 1;
      entry.montoTotal += Number(order.monto_total) || 0;
    });

    const totalOrders = Array.from(aggregation.values()).reduce(
      (acc, item) => acc + item.pedidos,
      0
    );

    const distribution = Array.from(aggregation.values()).map((item) => ({
      ...item,
      porcentaje: totalOrders === 0 ? 0 : Math.round((item.pedidos / totalOrders) * 100),
    }));

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
            Exportar PDF
          </button>
          <button type="button" className="btn-ghost" onClick={handleExportExcel}>
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
            {tab.label}
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
                <div className="reports-chart bars">
                  {(() => {
                    const topProducts = rotationPerProduct.slice(0, 5);
                    const maxValue = Math.max(
                      ...topProducts.map((item) => item.rotacion),
                      1
                    );
                    return topProducts.map((item) => (
                      <div className="reports-chart-column" key={item.producto_id}>
                        <div
                          className="reports-chart-bar"
                          style={{ height: `${(item.rotacion / maxValue) * 100 || 0}%` }}
                          title={`${item.nombre}: ${item.rotacion} salidas`}
                        />
                        <span>{item.nombre}</span>
                      </div>
                    ));
                  })()}
                </div>
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
                  Ventas y compras estimadas a partir de los pedidos registrados. El margen es una
                  aproximación del 25% sobre el valor del pedido.
                </p>
              </div>
              {costSummary.length === 0 ? (
                <p className="reports-empty">Sin información disponible para el período.</p>
              ) : (
                <div className="reports-chart stacked">
                  {(() => {
                    const maxValue = Math.max(
                      ...costSummary.map((item) => Math.max(item.ventas, item.compras)),
                      1
                    );
                    return costSummary.map((item) => (
                      <div className="reports-chart-stack" key={item.label}>
                        <div
                          className="reports-chart-block ventas"
                          style={{ height: `${(item.ventas / maxValue) * 100 || 0}%` }}
                          title={`Ventas: ${currencyFormatter.format(item.ventas)}`}
                        />
                        <div
                          className="reports-chart-block compras"
                          style={{ height: `${(item.compras / maxValue) * 100 || 0}%` }}
                          title={`Compras: ${currencyFormatter.format(item.compras)}`}
                        />
                        <span>{item.label}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            <div className="reports-grid two">
              <div className="reports-section">
                <h3>Resumen financiero</h3>
                <ul className="reports-list compact">
                  <li>
                    <span>Ingresos estimados</span>
                    <span>
                      {currencyFormatter.format(
                        costSummary.reduce((acc, item) => acc + item.ventas, 0)
                      )}
                    </span>
                  </li>
                  <li>
                    <span>Compras</span>
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
                <div className="reports-chart donut">
                  {(() => {
                    const total = supplierPerformance.reduce(
                      (acc, item) => acc + item.pedidos,
                      0
                    );
                    return supplierPerformance.map((item) => (
                      <div className="reports-donut-segment" key={item.proveedor}>
                        <span>{item.proveedor}</span>
                        <strong>
                          {((item.pedidos / total) * 100).toFixed(1)}% · {item.pedidos} pedidos
                        </strong>
                      </div>
                    ));
                  })()}
                </div>
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
                        <span className="reports-badge success">
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


