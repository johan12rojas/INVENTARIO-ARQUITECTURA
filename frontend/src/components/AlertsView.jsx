import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './Alerts.css';
import AlertConfigModal from './AlertConfigModal';

const severityLabels = {
  high: { label: 'Alta', className: 'high' },
  medium: { label: 'Media', className: 'medium' },
  low: { label: 'Baja', className: 'low' },
};

const typeLabels = {
  low_stock: 'Stock Bajo',
  order_delayed: 'Pedido',
  system: 'Sistema',
  threshold: 'Umbral',
};

const AlertsView = () => {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unread: 0, high_priority: 0 });
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);

  const [tab, setTab] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filters = useMemo(
    () => ({
      status: tab === 'unread' ? 'unread' : null,
      priority: priorityFilter === 'high' ? 'high' : null,
    }),
    [tab, priorityFilter]
  );

  const showMessage = useCallback((type, message) => {
    setAlertMessage({ type, message });
  }, []);

  useEffect(() => {
    if (!alertMessage) return;
    const timer = setTimeout(() => setAlertMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [alertMessage]);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const [alertsResponse, productsResponse] = await Promise.all([
        api.getAlerts(filters),
        api.getProducts({ status: 'low_stock' }),
      ]);

      if (!alertsResponse?.success) {
        showMessage(
          'error',
          alertsResponse?.message || 'No se pudieron cargar las alertas'
        );
        return;
      }

      const alertsData = alertsResponse.data?.alerts || [];
      const existingProductIds = new Set(
        alertsData
          .filter((alert) => alert.tipo === 'low_stock' && alert.producto?.id)
          .map((alert) => alert.producto.id)
      );

      const additionalAlerts = (productsResponse?.data?.products || [])
        .filter((product) => product.activo && product.estado === 'low')
        .filter((product) => !existingProductIds.has(product.id))
        .filter(() => priorityFilter !== 'high')
        .map((product) => {
          const severity =
            product.stock <= Math.max(product.stock_minimo / 2, 1) ? 'high' : 'medium';
          return {
            id: `product-${product.id}`,
            tipo: 'low_stock',
            titulo: `Stock Bajo - ${product.nombre}`,
            mensaje: `El producto está por debajo del umbral mínimo (${product.stock}/${product.stock_minimo}).`,
            producto: {
              id: product.id,
              nombre: product.nombre,
              sku: product.sku,
              stock: product.stock,
              stock_minimo: product.stock_minimo,
              activo: product.activo,
            },
            severidad: severity,
            leida: false,
            fecha_creacion: new Date().toISOString(),
          };
        });

      const mergedAlerts = [...additionalAlerts, ...alertsData];
      const adjustedSummary = {
        total: mergedAlerts.length,
        unread: mergedAlerts.filter((alert) => !alert.leida).length,
        high_priority: mergedAlerts.filter((alert) => alert.severidad === 'high').length,
      };

      setAlerts(mergedAlerts);
      setSummary(adjustedSummary);
      window.dispatchEvent(
        new CustomEvent('alertsSummaryUpdate', { detail: adjustedSummary })
      );
    } catch (error) {
      showMessage('error', error?.message || 'Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  }, [filters, showMessage]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.markAlertAsRead(id);
      showMessage('success', 'Alerta marcada como leída');
      fetchAlerts();
    } catch (error) {
      showMessage('error', error?.message || 'No se pudo actualizar la alerta');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('¿Eliminar esta alerta?');
    if (!confirmed) return;
    try {
      await api.deleteAlert(id);
      showMessage('success', 'Alerta eliminada');
      fetchAlerts();
    } catch (error) {
      showMessage('error', error?.message || 'No se pudo eliminar la alerta');
    }
  };

  const renderSeverityBadge = (severity) => {
    const info = severityLabels[severity] || severityLabels.low;
    return <span className={`alert-badge ${info.className}`}>{info.label}</span>;
  };

  return (
    <div className="alerts-wrapper">
      {alertMessage && (
        <div className={`alerts-toast ${alertMessage.type}`}>{alertMessage.message}</div>
      )}

      <div className="alerts-header">
        <div>
          <h1>Centro de Alertas</h1>
          <p>Notificaciones y alertas del sistema</p>
        </div>
        <button
          type="button"
          className="alerts-config-button"
          onClick={() => setConfigOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19.4 15A1.65 1.65 0 0 1 19 16L20 18L18 20L16 19A1.65 1.65 0 0 1 15 19.4L13 20H11L9 19.4A1.65 1.65 0 0 1 8 19L6 20L4 18L5 16A1.65 1.65 0 0 1 4.6 15L4 13V11L4.6 9A1.65 1.65 0 0 1 5 8L4 6L6 4L8 5A1.65 1.65 0 0 1 9 4.6L11 4H13L15 4.6A1.65 1.65 0 0 1 16 5L18 4L20 6L19 8A1.65 1.65 0 0 1 19.4 9L20 11V13L19.4 15Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Configurar Umbrales
        </button>
      </div>

      <section className="alerts-summary-grid">
        <article className="alerts-summary-card">
          <span>Total Alertas</span>
          <strong>{summary.total}</strong>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22C12.5304 22 13.0391 21.7893 13.4142 21.4142C13.7893 21.0391 14 20.5304 14 20H10C10 20.5304 10.2107 21.0391 10.5858 21.4142C10.9609 21.7893 11.4696 22 12 22Z"
              fill="#239C56"
            />
            <path
              d="M18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.60218 13.342 3.22064 13.0607 2.93934C12.7794 2.65804 12.3978 2.5 12 2.5C11.6022 2.5 11.2206 2.65804 10.9393 2.93934C10.658 3.22064 10.5 3.60218 10.5 4V4.68C7.63 5.36 6 7.94 6 11V16L4 18V19H20V18L18 16Z"
              fill="#239C56"
            />
          </svg>
        </article>
        <article className="alerts-summary-card">
          <span>No leídas</span>
          <strong>{summary.unread}</strong>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5C7 5 3.27 8.11 2 12C3.27 15.89 7 19 12 19C17 19 20.73 15.89 22 12C20.73 8.11 17 5 12 5Z"
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
              stroke="#3B82F6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </article>
        <article className="alerts-summary-card">
          <span>Alta Prioridad</span>
          <strong>{summary.high_priority}</strong>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M10.29 3.85999L2.82 17C1.97 18.54 3.08 20.5 4.82 20.5H19.18C20.92 20.5 22.03 18.54 21.18 17L13.71 3.85999C12.86 2.32999 11.14 2.32999 10.29 3.85999Z"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 9V13"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 17H12.01"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </article>
      </section>

      <section className="alerts-tabs">
        <div className="tabs-left">
          <button
            type="button"
            className={`tab-button ${tab === 'all' ? 'active' : ''}`}
            onClick={() => setTab('all')}
          >
            Todas ({summary.total})
          </button>
          <button
            type="button"
            className={`tab-button ${tab === 'unread' ? 'active' : ''}`}
            onClick={() => setTab('unread')}
          >
            No leídas ({summary.unread})
          </button>
          <button
            type="button"
            className={`tab-button ${priorityFilter === 'high' ? 'active' : ''}`}
            onClick={() =>
              setPriorityFilter((prev) => (prev === 'high' ? 'all' : 'high'))
            }
          >
            Prioridad Alta ({summary.high_priority})
          </button>
        </div>
      </section>

      <div className="alerts-list">
        {loading ? (
          <div className="alerts-empty">Cargando alertas…</div>
        ) : alerts.length === 0 ? (
          <div className="alerts-empty">No hay alertas para mostrar.</div>
        ) : (
          alerts.map((alert) => {
            const isLowStockType = alert.tipo === 'low_stock';
            const hasProductInfo =
              alert.producto &&
              alert.producto.stock !== null &&
              alert.producto.stock_minimo !== null;
            const productStock = hasProductInfo ? Number(alert.producto.stock) : null;
            const productMin = hasProductInfo ? Number(alert.producto.stock_minimo) : null;
            const stockBelow = hasProductInfo ? productStock < productMin : null;

            let messageToShow = alert.mensaje;
            if (isLowStockType && hasProductInfo) {
              messageToShow = stockBelow
                ? `El stock actual está por debajo del mínimo (${productStock}/${productMin}).`
                : `El stock actual está dentro del rango (${productStock}/${productMin}).`;
            }

            return (
              <article
                key={alert.id}
                className={`alert-card ${alert.leida ? 'read' : ''} ${
                  alert.severidad === 'high' ? 'priority' : ''
                }`}
              >
                <div className={`alert-icon ${alert.tipo || 'system'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 9V12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 18H3L12 3L21 18Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="16" r="1" fill="currentColor" />
                  </svg>
                </div>
                <div className="alert-body">
                  <div className="alert-header">
                    <h2>{alert.titulo}</h2>
                    <div className="alert-badges">
                      <span className="alert-badge new">Nuevo</span>
                      {renderSeverityBadge(alert.severidad)}
                    </div>
                  </div>
                  <p className="alert-message">{messageToShow}</p>
                  {alert.producto?.nombre && (
                    <p
                      className={`alert-meta ${
                        hasProductInfo && !stockBelow && isLowStockType ? 'resolved' : ''
                      }`}
                    >
                      Producto: {alert.producto.nombre}{' '}
                      {hasProductInfo && (
                        <span className="alert-meta-stock">
                          {productStock} / {productMin}{' '}
                          {isLowStockType &&
                            (stockBelow ? '(por debajo del mínimo)' : '(en rango)')}
                        </span>
                      )}
                    </p>
                  )}
                  <span className="alert-date">
                    {new Date(alert.fecha_creacion).toLocaleString('es-ES', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div className="alert-actions">
                  {!alert.leida && (
                    <button
                      type="button"
                      className="alert-action success"
                      onClick={() => handleMarkAsRead(alert.id)}
                      title="Marcar como leída"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17L4 12"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className="alert-action danger"
                    onClick={() => handleDelete(alert.id)}
                    title="Eliminar alerta"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M19 7L18.132 19.142C18.0563 20.2354 17.1389 21.0833 16.0434 21.0833H7.9566C6.86114 21.0833 5.94371 20.2354 5.868 19.142L5 7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 7H3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M15 7V5C15 4.46957 14.7893 3.96086 14.4142 3.58579C14.0391 3.21071 13.5304 3 13 3H11C10.4696 3 9.96086 3.21071 9.58579 3.58579C9.21071 3.96086 9 4.46957 9 5V7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <AlertConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  );
};

export default AlertsView;
