import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './Suppliers.css';
import SupplierModal from './SupplierModal';

const SuppliersView = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [summary, setSummary] = useState({
    total_proveedores: 0,
    productos_totales: 0,
    pedidos_totales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
      status,
    }),
    [debouncedSearch, status]
  );

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getSuppliers(filters);
      if (response?.success) {
        setSuppliers(response.data?.suppliers || []);
        setSummary(response.data?.summary || {});
      } else {
        const message = response?.message || 'No se pudo obtener la información';
        setSuppliers([]);
        setSummary({
          total_proveedores: 0,
          productos_totales: 0,
          pedidos_totales: 0,
        });
        showAlert('error', message);
      }
    } catch (error) {
      showAlert('error', error?.message || 'Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  }, [filters, showAlert]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenModal = (mode, supplier = null) => {
    setModalMode(mode);
    setSelectedSupplier(supplier);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (modalMode === 'edit' && selectedSupplier) {
        await api.updateSupplier(selectedSupplier.id, payload);
        showAlert('success', 'Proveedor actualizado correctamente');
      } else {
        await api.createSupplier(payload);
        showAlert('success', 'Proveedor creado correctamente');
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      showAlert('error', error?.message || 'No se pudo guardar el proveedor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (supplier) => {
    const confirmDelete = window.confirm(`¿Eliminar el proveedor "${supplier.nombre}"?`);
    if (!confirmDelete) return;

    setRowActionId(supplier.id);
    try {
      await api.deleteSupplier(supplier.id);
      showAlert('success', 'Proveedor eliminado');
      fetchSuppliers();
    } catch (error) {
      showAlert('error', error?.message || 'No se pudo eliminar el proveedor');
    } finally {
      setRowActionId(null);
    }
  };

  return (
    <div className="suppliers-wrapper">
      {alert && <div className={`suppliers-alert ${alert.type}`}>{alert.message}</div>}

      <div className="suppliers-header">
        <div>
          <h1>Gestión de Proveedores</h1>
          <p>Administra tus proveedores y relaciones comerciales</p>
        </div>
        <button
          type="button"
          className="suppliers-add-button"
          onClick={() => handleOpenModal('create')}
        >
          <span>+</span> Agregar Proveedor
        </button>
      </div>

      <section className="suppliers-summary-grid">
        <article className="suppliers-summary-card">
          <h3>Total Proveedores</h3>
          <p className="value">{summary.total_proveedores ?? 0}</p>
        </article>
        <article className="suppliers-summary-card">
          <h3>Productos Totales</h3>
          <p className="value">{summary.productos_totales ?? 0}</p>
        </article>
        <article className="suppliers-summary-card">
          <h3>Pedidos Totales</h3>
          <p className="value">{summary.pedidos_totales ?? 0}</p>
        </article>
      </section>

      <section className="suppliers-filters">
        <div className="suppliers-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#9aa2b1" strokeWidth="1.5" />
            <path d="M20 20L17 17" stroke="#9aa2b1" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar proveedores..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </section>

      {loading ? (
        <div className="suppliers-loading">Cargando proveedores…</div>
      ) : suppliers.length === 0 ? (
        <div className="suppliers-empty">No se encontraron proveedores.</div>
      ) : (
        <div className="suppliers-grid">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className={`supplier-card ${supplier.activo ? '' : 'inactive'}`}>
              <div className="supplier-header">
                <div>
                  <h2>{supplier.nombre}</h2>
                  {supplier.contacto && <p>{supplier.contacto}</p>}
                </div>
                <div className="supplier-actions">
                  <button
                    type="button"
                    className="action"
                    title="Editar"
                    onClick={() => handleOpenModal('edit', supplier)}
                    disabled={rowActionId === supplier.id || submitting}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="action delete"
                    title="Eliminar"
                    onClick={() => handleDelete(supplier)}
                    disabled={rowActionId === supplier.id || submitting}
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div className="supplier-info">
                <div>
                  <strong>Correo:</strong> {supplier.email}
                </div>
                <div>
                  <strong>Teléfono:</strong> {supplier.telefono}
                </div>
                <div>
                  <strong>Dirección:</strong> {supplier.direccion || 'No especificada'}
                </div>
              </div>

              <div className="supplier-footer">
                <div>
                  <span>Productos</span>
                  <strong>{supplier.productos_suministrados}</strong>
                </div>
                <div>
                  <span>Pedidos</span>
                  <strong>{supplier.total_pedidos}</strong>
                </div>
                <div>
                  <span>Estado</span>
                  <strong className={supplier.activo ? 'active' : 'inactive'}>
                    {supplier.activo ? 'Activo' : 'Inactivo'}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SupplierModal
        open={modalOpen}
        mode={modalMode}
        supplier={selectedSupplier}
        loading={submitting}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default SuppliersView;


