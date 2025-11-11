import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './Movements.css';
import MovementModal from './MovementModal';

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const MovementsView = () => {
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState({
    total_entries: 0,
    total_exits: 0,
    balance: 0,
  });
  const [products, setProducts] = useState([]);
  const [responsibles, setResponsibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [rowActionId, setRowActionId] = useState(null);

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
      type: typeFilter !== 'all' ? typeFilter : undefined,
    }),
    [debouncedSearch, typeFilter]
  );

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getMovements(filters);
      if (response?.success) {
        setMovements(response.data?.movements || []);
        setSummary(response.data?.summary || {});
        setProducts(response.data?.products || []);
        setResponsibles(response.data?.responsibles || []);
      } else {
        const message = response?.message || 'No se pudo obtener la información';
        showAlert('error', message);
        setMovements([]);
        setSummary({
          total_entries: 0,
          total_exits: 0,
          balance: 0,
        });
      }
    } catch (error) {
      showAlert('error', error?.message || 'Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  }, [filters, showAlert]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleSubmitMovement = async (payload) => {
    setSubmitting(true);
    try {
      await api.createMovement(payload);
      showAlert('success', 'Movimiento registrado correctamente');
      setModalOpen(false);
      fetchMovements();
    } catch (error) {
      showAlert('error', error?.message || 'No se pudo registrar el movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMovement = async (movement) => {
    const confirmed = window.confirm('¿Eliminar el movimiento seleccionado?');
    if (!confirmed) return;

    setRowActionId(movement.id);
    try {
      await api.deleteMovement(movement.id);
      showAlert('success', 'Movimiento eliminado');
      fetchMovements();
    } catch (error) {
      showAlert('error', error?.message || 'No se pudo eliminar el movimiento');
    } finally {
      setRowActionId(null);
    }
  };

  const renderTypeBadge = (movement) => {
    const isEntry = movement.tipo === 'entry';
    return (
      <span className={`movement-type ${isEntry ? 'entry' : 'exit'}`}>
        {isEntry ? 'Entrada' : 'Salida'}
      </span>
    );
  };

  const renderQuantity = (movement) => {
    const isEntry = movement.tipo === 'entry';
    const sign = isEntry ? '+' : '-';
    return (
      <span className={`movement-qty ${isEntry ? 'entry' : 'exit'}`}>
        {sign}
        {movement.cantidad}
      </span>
    );
  };

  return (
    <div className="movements-wrapper">
      {alert && <div className={`movements-alert ${alert.type}`}>{alert.message}</div>}

      <div className="movements-header">
        <div>
          <h1>Movimientos de Inventario</h1>
          <p>Registro de entradas y salidas de productos</p>
        </div>
        <button type="button" className="movements-add-button" onClick={handleOpenModal}>
          <span>+</span> Registrar Movimiento
        </button>
      </div>

      <section className="movements-summary-grid">
        <article className="movements-summary-card entry">
          <h3>Total Entradas</h3>
          <p className="value">{summary.total_entries ?? 0} unidades</p>
        </article>
        <article className="movements-summary-card exit">
          <h3>Total Salidas</h3>
          <p className="value">{summary.total_exits ?? 0} unidades</p>
        </article>
        <article className="movements-summary-card balance">
          <h3>Balance</h3>
          <p className="value">{summary.balance ?? 0} unidades</p>
        </article>
      </section>

      <section className="movements-filters">
        <div className="movements-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#9aa2b1" strokeWidth="1.5" />
            <path d="M20 20L17 17" stroke="#9aa2b1" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        <input
          type="text"
          placeholder="Buscar movimientos..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        </div>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="all">Todos los tipos</option>
          <option value="entry">Entradas</option>
          <option value="exit">Salidas</option>
        </select>
      </section>

      <div className="movements-table-wrapper">
        <table className="movements-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Responsable</th>
              <th>Referencia</th>
              <th>Fecha y Hora</th>
              <th>Notas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="movements-loading">
                  Cargando movimientos…
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={8} className="movements-empty">
                  No se encontraron movimientos.
                </td>
              </tr>
            ) : (
              movements.map((movement) => (
                <tr key={movement.id}>
                  <td>{renderTypeBadge(movement)}</td>
                  <td>
                    <div className="movement-product">
                      <strong>{movement.producto_nombre}</strong>
                      <span>ID: {movement.producto_sku || `#${movement.producto_id}`}</span>
                    </div>
                  </td>
                  <td>{renderQuantity(movement)}</td>
                  <td>{movement.responsable_nombre || 'Sin responsable'}</td>
                  <td>{movement.referencia || '-'}</td>
                  <td>{formatDateTime(movement.fecha_movimiento)}</td>
                  <td>{movement.notas || '-'}</td>
                  <td>
                    <button
                      type="button"
                      className="movement-delete"
                      title="Eliminar"
                      onClick={() => handleDeleteMovement(movement)}
                      disabled={rowActionId === movement.id || submitting}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <MovementModal
        open={modalOpen}
        loading={submitting}
        products={products}
        responsibles={responsibles}
        onClose={handleCloseModal}
        onSubmit={handleSubmitMovement}
      />
    </div>
  );
};

export default MovementsView;


