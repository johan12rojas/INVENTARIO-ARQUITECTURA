import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './Orders.css';
import OrderModal from './OrderModal';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
});

const statusLabels = {
  pendiente: { label: 'Creado', color: 'created' },
  confirmado: { label: 'Confirmado', color: 'confirmed' },
  enviado: { label: 'Enviado', color: 'shipped' },
  en_transito: { label: 'En tránsito', color: 'transit' },
  entregado: { label: 'Entregado', color: 'delivered' },
  cancelado: { label: 'Cancelado', color: 'cancelled' },
};

const OrdersView = () => {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [providers, setProviders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (error) {
      return {};
    }
  }, []);

  const showAlert = useCallback((type, message) => {
    setAlert({ type, message });
  }, []);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(timer);
  }, [alert]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    [debouncedSearch, statusFilter]
  );

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getOrders(filters);
      if (response?.success) {
        setOrders(response.data?.orders || []);
        setSummary(response.data?.summary || {});
        setProviders(response.data?.providers || []);
        setProducts(response.data?.products || []);
        setUsers(response.data?.users || []);
      } else {
        showAlert('error', response?.message || 'No se pudo cargar la información de pedidos');
        setOrders([]);
        setSummary({});
      }
    } catch (error) {
      showAlert('error', error?.message || 'Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  }, [filters, showAlert]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const computedSummary = useMemo(() => {
    const base = {
      created: summary.pendiente || 0,
      confirmed: summary.confirmado || 0,
      shipped: (summary.enviado || 0) + (summary.en_transito || 0),
      delivered: summary.entregado || 0,
      cancelled: summary.cancelado || 0,
    };
    return base;
  }, [summary]);

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleCreateOrder = async (payload) => {
    setSubmitting(true);
    try {
      await api.createOrder(payload);
      showAlert('success', 'Pedido creado correctamente');
      setModalOpen(false);
      fetchOrders();
    } catch (error) {
      showAlert('error', error?.message || 'No se pudo crear el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (estado) => {
    const info = statusLabels[estado] || { label: estado, color: 'default' };
    return <span className={`order-status ${info.color}`}>{info.label}</span>;
  };

  return (
    <div className="orders-wrapper">
      {alert && <div className={`orders-alert ${alert.type}`}>{alert.message}</div>}

      <div className="orders-header">
        <div>
          <h1>Gestión de Pedidos</h1>
          <p>Administra pedidos a proveedores y seguimiento de entregas</p>
        </div>
        <button type="button" className="orders-add-button" onClick={handleOpenModal}>
          <span>+</span> Crear Pedido
        </button>
      </div>

      <section className="orders-summary-grid">
        <article className="orders-summary-card created">
          <h3>Creado</h3>
          <p className="value">{computedSummary.created}</p>
        </article>
        <article className="orders-summary-card confirmed">
          <h3>Confirmado</h3>
          <p className="value">{computedSummary.confirmed}</p>
        </article>
        <article className="orders-summary-card shipped">
          <h3>Enviado</h3>
          <p className="value">{computedSummary.shipped}</p>
        </article>
        <article className="orders-summary-card delivered">
          <h3>Entregado</h3>
          <p className="value">{computedSummary.delivered}</p>
        </article>
        <article className="orders-summary-card cancelled">
          <h3>Cancelado</h3>
          <p className="value">{computedSummary.cancelled}</p>
        </article>
      </section>

      <section className="orders-filters">
        <div className="orders-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#9aa2b1" strokeWidth="1.5" />
            <path d="M20 20L17 17" stroke="#9aa2b1" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar pedidos..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="pendiente">Creado</option>
          <option value="confirmado">Confirmado</option>
          <option value="enviado">Enviado</option>
          <option value="en_transito">En tránsito</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </section>

      <div className="orders-list">
        {loading ? (
          <div className="orders-empty">Cargando pedidos…</div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">No se encontraron pedidos.</div>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="order-card-left">
                <div className="order-icon">
                  <span>{order.numero_pedido.slice(0, 2).toUpperCase()}</span>
                </div>
              </div>
              <div className="order-card-main">
                <div className="order-card-title">
                  <h2>Pedido #{order.numero_pedido.replace(/\D/g, '') || order.numero_pedido}</h2>
                  {renderStatusBadge(order.estado)}
                </div>
                <p className="order-card-subtitle">
                  Proveedor: {order.proveedor?.nombre || 'Sin proveedor'}
                </p>
                <p className="order-card-meta">
                  {order.total_productos} producto(s) • Creado por{' '}
                  {order.creado_por?.nombre || 'Sin asignar'}
                </p>
              </div>
              <div className="order-card-info">
                <strong>{currencyFormatter.format(order.monto_total || 0)}</strong>
                <div className="order-dates">
                  <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 5H19V21H5V5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 3V7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 3V7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 11H19"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Entrega: {order.fecha_entrega_estimada || 'Sin definir'}
                  </span>
                  <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 7V12L15 15"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Creado: {new Date(order.fecha_creacion).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <OrderModal
        open={modalOpen}
        loading={submitting}
        providers={providers}
        products={products}
        users={users}
        defaultCreatorId={currentUser?.id}
        onClose={handleCloseModal}
        onSubmit={handleCreateOrder}
      />
    </div>
  );
};

export default OrdersView;




