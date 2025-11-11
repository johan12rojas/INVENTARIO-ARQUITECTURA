import React, { useEffect, useState } from 'react';
import './ProductModal.css';

const defaultForm = {
  nombre: '',
  contacto: '',
  email: '',
  telefono: '',
  direccion: '',
  productos_suministrados: 0,
  total_pedidos: 0,
  activo: 1,
};

const SupplierModal = ({ open, mode = 'create', supplier, loading, onClose, onSubmit }) => {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && supplier) {
        setForm({
          nombre: supplier.nombre || '',
          contacto: supplier.contacto || '',
          email: supplier.email || '',
          telefono: supplier.telefono || '',
          direccion: supplier.direccion || '',
          productos_suministrados: supplier.productos_suministrados ?? 0,
          total_pedidos: supplier.total_pedidos ?? 0,
          activo: supplier.activo ?? 1,
        });
      } else {
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [open, mode, supplier]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    let newValue = value;

    if (type === 'number') {
      newValue = value === '' ? '' : Number(value);
    }

    if (type === 'checkbox') {
      newValue = checked ? 1 : 0;
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

    if (!form.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!form.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio';
    }

    if (form.productos_suministrados < 0) {
      newErrors.productos_suministrados = 'No puede ser negativo';
    }

    if (form.total_pedidos < 0) {
      newErrors.total_pedidos = 'No puede ser negativo';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(form);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2>{mode === 'edit' ? 'Editar proveedor' : 'Agregar proveedor'}</h2>
            <p>Gestiona la información del proveedor</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <div className="modal-field">
              <label htmlFor="nombre">Nombre *</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Nombre de la empresa"
              />
              {errors.nombre && <span className="modal-error">{errors.nombre}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="contacto">Persona de contacto</label>
              <input
                id="contacto"
                name="contacto"
                type="text"
                value={form.contacto}
                onChange={handleChange}
                placeholder="Nombre del contacto"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="correo@proveedor.com"
              />
              {errors.email && <span className="modal-error">{errors.email}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="telefono">Teléfono *</label>
              <input
                id="telefono"
                name="telefono"
                type="text"
                value={form.telefono}
                onChange={handleChange}
                placeholder="+34 000 000 000"
              />
              {errors.telefono && <span className="modal-error">{errors.telefono}</span>}
            </div>

            <div className="modal-field full">
              <label htmlFor="direccion">Dirección</label>
              <input
                id="direccion"
                name="direccion"
                type="text"
                value={form.direccion}
                onChange={handleChange}
                placeholder="Dirección fiscal"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="productos_suministrados">Productos suministrados</label>
              <input
                id="productos_suministrados"
                name="productos_suministrados"
                type="number"
                value={form.productos_suministrados}
                onChange={handleChange}
                min="0"
              />
              {errors.productos_suministrados && <span className="modal-error">{errors.productos_suministrados}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="total_pedidos">Pedidos totales</label>
              <input
                id="total_pedidos"
                name="total_pedidos"
                type="number"
                value={form.total_pedidos}
                onChange={handleChange}
                min="0"
              />
              {errors.total_pedidos && <span className="modal-error">{errors.total_pedidos}</span>}
            </div>

            <div className="modal-field toggle">
              <label htmlFor="activo">Activo</label>
              <label className="switch">
                <input
                  id="activo"
                  name="activo"
                  type="checkbox"
                  checked={form.activo === 1}
                  onChange={handleChange}
                />
                <span className="slider" />
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-button ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="modal-button primary" disabled={loading}>
              {loading ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Crear proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;


