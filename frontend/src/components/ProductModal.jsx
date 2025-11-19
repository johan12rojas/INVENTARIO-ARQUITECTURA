import React, { useEffect, useState } from 'react';
import './ProductModal.css';

const defaultForm = {
  sku: '',
  nombre: '',
  descripcion: '',
  categoria_id: '',
  proveedor_id: '',
  stock: 0,
  stock_minimo: 0,
  precio: 0,
  activo: 1,
};

const ProductModal = ({ open, mode = 'create', product, categories, providers, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && product) {
        setForm({
          sku: product.sku || '',
          nombre: product.nombre || '',
          descripcion: product.descripcion || '',
          categoria_id: product.categoria_id || '',
          proveedor_id: product.proveedor_id || '',
          stock: product.stock ?? 0,
          stock_minimo: product.stock_minimo ?? 0,
          precio: product.precio ?? 0,
          activo: product.activo ?? 1,
        });
      } else {
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [open, mode, product]);

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

    if (!form.sku.trim()) {
      newErrors.sku = 'El SKU es obligatorio';
    }
    if (!form.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    if (form.stock < 0) {
      newErrors.stock = 'El stock no puede ser negativo';
    }
    if (form.stock_minimo < 0) {
      newErrors.stock_minimo = 'El stock mínimo no puede ser negativo';
    }
    if (form.precio < 0) {
      newErrors.precio = 'El precio no puede ser negativo';
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
            <h2>{mode === 'edit' ? 'Editar producto' : 'Agregar nuevo producto'}</h2>
            <p>Define la información principal del producto</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <div className="modal-field">
              <label htmlFor="sku">SKU *</label>
              <input
                id="sku"
                name="sku"
                type="text"
                value={form.sku}
                onChange={handleChange}
                placeholder="SKU-001"
              />
              {errors.sku && <span className="modal-error">{errors.sku}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="nombre">Nombre *</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Nombre del producto"
              />
              {errors.nombre && <span className="modal-error">{errors.nombre}</span>}
            </div>

            <div className="modal-field full">
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Detalles adicionales"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="categoria_id">Categoría</label>
              <select id="categoria_id" name="categoria_id" value={form.categoria_id ?? ''} onChange={handleChange}>
                <option value="">Sin categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="proveedor_id">Proveedor</label>
              <select id="proveedor_id" name="proveedor_id" value={form.proveedor_id ?? ''} onChange={handleChange}>
                <option value="">Sin proveedor</option>
                {providers.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="stock">Stock</label>
              <input
                id="stock"
                name="stock"
                type="number"
                value={form.stock}
                onChange={handleChange}
                min="0"
              />
              {errors.stock && <span className="modal-error">{errors.stock}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="stock_minimo">Stock mínimo</label>
              <input
                id="stock_minimo"
                name="stock_minimo"
                type="number"
                value={form.stock_minimo}
                onChange={handleChange}
                min="0"
              />
              {errors.stock_minimo && <span className="modal-error">{errors.stock_minimo}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="precio">Precio</label>
              <input
                id="precio"
                name="precio"
                type="number"
                step="0.01"
                value={form.precio}
                onChange={handleChange}
                min="0"
              />
              {errors.precio && <span className="modal-error">{errors.precio}</span>}
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
              {loading ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;






