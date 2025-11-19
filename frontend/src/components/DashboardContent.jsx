import React, { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import ProductsView from './ProductsView';
import SuppliersView from './SuppliersView';
import MovementsView from './MovementsView';
import OrdersView from './OrdersView';
import AlertsView from './AlertsView';
import ReportsView from './ReportsView';
import UsersRolesView from './UsersRolesView';
import SettingsView from './SettingsView';
import AuditsView from './AuditsView';
import api from '../services/api';

const DashboardContent = ({ activeMenu, allowedMenus = [] }) => {
  const hasAccess = allowedMenus.length === 0 || allowedMenus.includes(activeMenu);

  const [homeState, setHomeState] = useState({
    loading: false,
    error: '',
    inventoryTotal: 0,
    lowStockCount: 0,
    pendingOrders: 0,
    totalValue: 0,
    lowStockProducts: [],
    alerts: [],
    stockTrend: [],
    categoryDistribution: [],
    costAnalysis: [],
  });

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    if (!hasAccess || activeMenu !== 'inicio') {
      return;
    }

    let cancelled = false;

    const loadHomeData = async () => {
      setHomeState((prev) => ({
        ...prev,
        loading: true,
        error: '',
      }));

      try {
        const [
          productsResponse,
          alertsResponse,
          ordersResponse,
          movementsResponse,
          deskProductResponse,
        ] = await Promise.all([
          api.getProducts({}),
          api.getAlerts({}),
          api.getOrders({}),
          api.getMovements({}),
          api.getProducts({ search: 'SKU-006' }),
        ]);

        if (cancelled) return;

        const productsData = productsResponse?.data ?? {};
        const productSummary = productsData.summary ?? {};
        const productList = productsData.products ?? [];
        
        // Map products for quick lookup
        const productMap = new Map(productList.map(p => [p.id, p]));

        const lowStockProducts = productList.filter(
          (item) => item.estado === 'low' && item.activo
        );

        // --- Alerts Logic ---
        const alertsRaw = alertsResponse?.data?.alerts ?? [];
        
        // Identify products that already have a low_stock alert
        const existingProductIds = new Set(
          alertsRaw
            .filter((alert) => alert.tipo === 'low_stock' && alert.producto?.id)
            .map((alert) => alert.producto.id)
        );

        // Generate virtual alerts for low stock products without existing alerts
        const virtualAlerts = productList
          .filter((product) => product.activo && product.estado === 'low')
          .filter((product) => !existingProductIds.has(product.id))
          .map((product) => ({
            id: `virtual-product-${product.id}`,
            tipo: 'low_stock',
            titulo: `Stock Bajo - ${product.nombre}`,
            mensaje: `El producto está por debajo del umbral mínimo (${product.stock}/${product.stock_minimo})`,
            producto: {
              id: product.id,
              nombre: product.nombre,
              sku: product.sku,
              stock: product.stock,
              stock_minimo: product.stock_minimo,
              activo: product.activo,
            },
            severidad: 'medium',
            leida: false,
            fecha_creacion: new Date().toISOString(),
          }));

        // Merge and prioritize alerts
        const allAlerts = [...virtualAlerts, ...alertsRaw];
        
        const prioritizedAlerts = [
          ...allAlerts.filter((alert) => alert.tipo === 'low_stock'),
          ...allAlerts.filter((alert) => alert.tipo !== 'low_stock'),
        ];
        
        // Slice for display but keep count accurate if needed elsewhere
        const alerts = prioritizedAlerts.slice(0, 5);

        // --- Orders Logic ---
        const ordersSummary = ordersResponse?.data?.summary ?? {};
        const pendingOrders =
          ['pendiente', 'confirmado', 'enviado', 'en_transito'].reduce(
            (total, key) => total + (ordersSummary[key] ?? 0),
            0
          );

        const movements = movementsResponse?.data?.movements ?? [];
        const now = new Date();
        
        // --- Stock Trend (Last 6 Months) ---
        // Initialize buckets
        const monthlyTotals = new Map();
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          monthlyTotals.set(key, {
            label: date.toLocaleDateString('es-ES', { month: 'short' }),
            entry: 0,
            exit: 0,
          });
        }

        // Single pass aggregation
        movements.forEach((movement) => {
          if (!movement.fecha_movimiento) return;
          const date = new Date(movement.fecha_movimiento);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          
          if (monthlyTotals.has(key)) {
            const current = monthlyTotals.get(key);
            const qty = Number(movement.cantidad) || 0;
            if (movement.tipo === 'entry') {
              current.entry += qty;
            } else if (movement.tipo === 'exit') {
              current.exit += qty;
            }
          }
        });
        const stockTrend = Array.from(monthlyTotals.values());

        // --- Value Analysis (Last 7 Days) ---
        // Initialize buckets
        const dailyTotals = new Map();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          const key = date.toISOString().slice(0, 10);
          dailyTotals.set(key, {
            label: date.toLocaleDateString('es-ES', { weekday: 'short' }),
            value: 0,
            count: 0
          });
        }

        // Single pass aggregation for value
        movements.forEach((movement) => {
          if (!movement.fecha_movimiento) return;
          const dateStr = movement.fecha_movimiento.slice(0, 10); // YYYY-MM-DD
          
          if (dailyTotals.has(dateStr)) {
            const current = dailyTotals.get(dateStr);
            const product = productMap.get(movement.producto_id);
            const price = product ? Number(product.precio) : 0;
            const qty = Number(movement.cantidad) || 0;
            
            // Calculate value moved (approximate based on current price)
            current.value += qty * price;
            current.count += 1;
          }
        });
        const costAnalysis = Array.from(dailyTotals.values());

        // --- Category Distribution (By Value) ---
        const categoryTotals = productList.reduce((acc, product) => {
          const key = product.categoria || 'Sin categoría';
          const stockValue = (Number(product.stock) || 0) * (Number(product.precio) || 0);
          
          if (!acc[key]) {
            acc[key] = 0;
          }
          acc[key] += stockValue;
          return acc;
        }, {});

        const totalInventoryValue = Object.values(categoryTotals).reduce(
          (sum, value) => sum + value,
          0
        );

        const categoryDistribution = Object.entries(categoryTotals)
          .map(([label, value]) => ({
            label,
            value,
            percent: totalInventoryValue === 0 ? 0 : Math.round((value / totalInventoryValue) * 100),
          }))
          .sort((a, b) => b.value - a.value) // Sort by value desc
          .slice(0, 5); // Top 5 categories

        setHomeState({
          loading: false,
          error: '',
          inventoryTotal: productSummary.stock_total ?? 0,
          lowStockCount: lowStockProducts.length,
          pendingOrders,
          totalValue: productSummary.valor_total ?? 0,
          lowStockProducts,
          alerts,
          stockTrend,
          categoryDistribution,
          costAnalysis,
        });
      } catch (error) {
        if (cancelled) return;
        setHomeState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || 'No se pudo cargar la información del tablero',
        }));
      }
    };

    loadHomeData();

    return () => {
      cancelled = true;
    };
  }, [activeMenu, hasAccess]);

  const renderHome = () => (
    <div className="dashboard-content">
      <div className="content-header">
        <h1>Panel de Control</h1>
        <p>Resumen general del inventario y operaciones</p>
      </div>

      {homeState.error && (
        <div className="dashboard-inline-error">{homeState.error}</div>
      )}

      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" />
            </svg>
          </div>
          <div className="metric-content">
            <h3>Inventario Total</h3>
            <p className="metric-value">
              {homeState.inventoryTotal.toLocaleString('es-CO')} unidades
            </p>
            <p className="metric-trend positive">+12% vs mes anterior ↗</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className="metric-content">
            <h3>Stock Bajo</h3>
            <p className="metric-value">
              {homeState.lowStockCount}{' '}
              {homeState.lowStockCount === 1 ? 'producto' : 'productos'}
            </p>
            <p className="metric-trend warning">Requiere atención ⚠</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 3H21L19 12H7L5 3H3Z" stroke="currentColor" strokeWidth="2" />
              <circle cx="9" cy="19" r="1" fill="currentColor" />
              <circle cx="20" cy="19" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="metric-content">
            <h3>Pedidos Pendientes</h3>
            <p className="metric-value">
              {homeState.pendingOrders}{' '}
              {homeState.pendingOrders === 1 ? 'pedido' : 'pedidos'}
            </p>
            <p className="metric-trend">En proceso de entrega</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
                fill="currentColor"
              />
              <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <div className="metric-content">
            <h3>Valor Total</h3>
            <p className="metric-value">{currencyFormatter.format(homeState.totalValue)}</p>
            <p className="metric-trend positive">+8.2% este mes ↗</p>
          </div>
        </div>
      </div>

      {homeState.loading && (
        <div className="dashboard-loading">Actualizando indicadores…</div>
      )}

      <div className="dashboard-secondary-grid">
        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Productos con stock bajo</h3>
            <span>{homeState.lowStockCount}</span>
          </div>
          {homeState.lowStockProducts.length === 0 ? (
            <p className="dashboard-empty">No hay productos con stock crítico.</p>
          ) : (
            <ul className="dashboard-list">
              {homeState.lowStockProducts.map((product) => (
                <li key={product.id}>
                  <div>
                    <strong>{product.nombre}</strong>
                    <span className="dashboard-list-sub">
                      SKU: {product.sku} · Stock: {product.stock}/{product.stock_minimo}
                    </span>
                  </div>
                  <span className="dashboard-list-badge low">Bajo</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Alertas activas</h3>
            <span>{homeState.alerts.length}</span>
          </div>
          {homeState.alerts.length === 0 ? (
            <p className="dashboard-empty">No hay alertas registradas.</p>
          ) : (
            <ul className="dashboard-list alerts">
              {homeState.alerts.map((alert) => (
                <li key={alert.id}>
                  <div>
                    <strong>{alert.titulo}</strong>
                    <span className="dashboard-list-sub">
                      {alert.producto?.nombre
                        ? `${alert.producto.nombre} · ${alert.mensaje}`
                        : alert.mensaje}
                    </span>
                  </div>
                  <span
                    className={`dashboard-list-badge ${
                      alert.severidad === 'high' ? 'critical' : 'info'
                    }`}
                  >
                    {alert.tipo === 'low_stock' ? 'Stock' : 'Alerta'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dashboard-charts-grid">
        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Movimiento de Stock</h3>
            <span>Últimos 6 meses</span>
          </div>
          {homeState.stockTrend.length === 0 ? (
            <p className="dashboard-empty">No hay movimientos registrados.</p>
          ) : (
            <div className="chart-lines">
              {(() => {
                const maxValue = Math.max(
                  ...homeState.stockTrend.map((item) =>
                    Math.max(item.entry, item.exit)
                  ),
                  1
                );
                return homeState.stockTrend.map((item) => (
                  <div className="chart-lines-column" key={item.label}>
                    <div className="chart-lines-bars">
                      <div
                        className="chart-lines-bar entry"
                        style={{ height: `${(item.entry / maxValue) * 100 || 0}%` }}
                        title={`Entradas: ${item.entry}`}
                      />
                      <div
                        className="chart-lines-bar exit"
                        style={{ height: `${(item.exit / maxValue) * 100 || 0}%` }}
                        title={`Salidas: ${item.exit}`}
                      />
                    </div>
                    <span className="chart-label">{item.label}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </section>

        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Valor por Categoría</h3>
            <span>Distribución financiera</span>
          </div>
          {homeState.categoryDistribution.length === 0 ? (
            <p className="dashboard-empty">Sin datos de categorías.</p>
          ) : (
            <ul className="chart-bars">
              {homeState.categoryDistribution.map((item) => (
                <li key={item.label}>
                  <span className="chart-label">{item.label}</span>
                  <div className="chart-bars-track">
                    <div
                      className="chart-bars-fill"
                      style={{ width: `${item.percent}%` }}
                      title={`${item.percent}% (${currencyFormatter.format(item.value)})`}
                    />
                  </div>
                  <span className="chart-value">{item.percent}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Movimiento de Valor</h3>
            <span>Últimos 7 días</span>
          </div>
          {homeState.costAnalysis.length === 0 ? (
            <p className="dashboard-empty">Sin movimientos recientes.</p>
          ) : (
            <div className="chart-columns">
              {(() => {
                const maxValue = Math.max(
                  ...homeState.costAnalysis.map((item) => item.value),
                  1
                );
                return homeState.costAnalysis.map((item) => (
                  <div className="chart-columns-item" key={item.label}>
                    <div
                      className="chart-columns-bar"
                      style={{ height: `${(item.value / maxValue) * 100 || 0}%` }}
                      title={`${currencyFormatter.format(item.value)} (${item.count} movs)`}
                    />
                    <span className="chart-label">{item.label}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </section>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case 'inicio':
        return renderHome();
      case 'productos':
        return <ProductsView />;
      case 'proveedores':
        return <SuppliersView />;
      case 'movimientos':
        return <MovementsView />;
      case 'pedidos':
        return <OrdersView />;
      case 'alertas':
        return <AlertsView />;
      case 'informes':
        return <ReportsView />;
      case 'auditoria':
        return <AuditsView />;
      case 'usuarios':
        return <UsersRolesView />;
      case 'configuracion':
        return <SettingsView />;
      default:
        return (
          <div className="dashboard-content">
            <div className="content-header">
              <h1>{activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1)}</h1>
              <p>Gestión de {activeMenu}</p>
            </div>
            <div className="coming-soon">
              <p>Esta sección estará disponible próximamente.</p>
            </div>
          </div>
        );
    }
  };

  if (!hasAccess) {
    return (
      <div className="dashboard-content">
        <div className="content-header">
          <h1>Acceso restringido</h1>
          <p>No tienes permisos para visualizar esta sección.</p>
        </div>
      </div>
    );
  }

  return renderContent();
};

export default DashboardContent;

