import React, { useEffect, useMemo, useState } from 'react';
import './ProductModal.css';

const defaultForm = {
  tipo: 'entry',
  producto_id: '',
  cantidad: 0,
  responsable_id: '',
  referencia: '',
  notas: '',
  fecha_movimiento: '',
};

const MovementModal = ({
  open,
  loading,
  products = [],
  responsibles = [],
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      const now = new Date();
      const iso = now.toISOString().slice(0, 16);
      setForm({
        ...defaultForm,
        fecha_movimiento: iso,
      });
      setErrors({});
    }
  }, [open]);

  const productSelected = useMemo(
    () => products.find((product) => product.id === Number(form.producto_id)) || null,
    [products, form.producto_id]
  );

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    let newValue = value;

    if (type === 'number') {
      newValue = value === '' ? '' : Number(value);
    }

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const newErrors = {};

    if (!form.producto_id) {
      newErrors.producto_id = 'Selecciona un producto';
    }

    if (!form.cantidad || form.cantidad <= 0) {
      newErrors.cantidad = 'La cantidad debe ser mayor a 0';
    } else if (
      form.tipo === 'exit' &&
      productSelected &&
      productSelected.stock !== null &&
      form.cantidad > productSelected.stock
    ) {
      newErrors.cantidad = 'La cantidad excede el stock disponible';
    }

    if (!form.fecha_movimiento) {
      newErrors.fecha_movimiento = 'Selecciona una fecha';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      tipo: form.tipo,
      producto_id: Number(form.producto_id),
      cantidad: Number(form.cantidad),
      responsable_id: form.responsable_id ? Number(form.responsable_id) : null,
      referencia: form.referencia.trim(),
      notas: form.notas.trim(),
      fecha_movimiento: form.fecha_movimiento ? new Date(form.fecha_movimiento).toISOString() : null,
    };

    onSubmit(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2>Registrar movimiento</h2>
            <p>Define la entrada o salida de inventario</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <div className="modal-field">
              <label htmlFor="tipo">Tipo</label>
              <select id="tipo" name="tipo" value={form.tipo} onChange={handleChange}>
                <option value="entry">Entrada</option>
                <option value="exit">Salida</option>
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="producto_id">Producto *</label>
              <select
                id="producto_id"
                name="producto_id"
                value={form.producto_id}
                onChange={handleChange}
              >
                <option value="">Selecciona un producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.nombre} ({product.sku}) — Stock actual: {product.stock}
                  </option>
                ))}
              </select>
              {errors.producto_id && <span className="modal-error">{errors.producto_id}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="cantidad">Cantidad *</label>
              <input
                id="cantidad"
                name="cantidad"
                type="number"
                min="1"
                value={form.cantidad}
                onChange={handleChange}
              />
              {errors.cantidad && <span className="modal-error">{errors.cantidad}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="responsable_id">Responsable</label>
              <select
                id="responsable_id"
                name="responsable_id"
                value={form.responsable_id}
                onChange={handleChange}
              >
                <option value="">Sin responsable</option>
                {responsibles.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="referencia">Referencia</label>
              <input
                id="referencia"
                name="referencia"
                type="text"
                value={form.referencia}
                onChange={handleChange}
                placeholder="PO-2025-001"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="fecha_movimiento">Fecha y hora *</label>
              <input
                id="fecha_movimiento"
                name="fecha_movimiento"
                type="datetime-local"
                value={form.fecha_movimiento}
                onChange={handleChange}
              />
              {errors.fecha_movimiento && (
                <span className="modal-error">{errors.fecha_movimiento}</span>
              )}
            </div>

            <div className="modal-field full">
              <label htmlFor="notas">Notas</label>
              <textarea
                id="notas"
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Comentarios adicionales"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-button ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="modal-button primary" disabled={loading}>
              {loading ? 'Registrando…' : 'Registrar movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MovementModal;




