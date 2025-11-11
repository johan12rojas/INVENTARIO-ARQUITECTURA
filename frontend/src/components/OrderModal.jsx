import React, { useEffect, useMemo, useState } from 'react';
import './ProductModal.css';

const baseItem = {
  producto_id: '',
  cantidad: 1,
};

const OrderModal = ({
  open,
  loading,
  providers = [],
  products = [],
  users = [],
  defaultCreatorId = null,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState({
    numero_pedido: '',
    proveedor_id: '',
    estado: 'pendiente',
    fecha_entrega_estimada: '',
    notas: '',
    creado_por: defaultCreatorId || '',
  });

  const [items, setItems] = useState([{ ...baseItem }]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        numero_pedido: '',
        proveedor_id: '',
        estado: 'pendiente',
        fecha_entrega_estimada: '',
        notas: '',
        creado_por: defaultCreatorId || '',
      });
      setItems([{ ...baseItem }]);
      setErrors({});
    }
  }, [open, defaultCreatorId]);

  const productsMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  const total = useMemo(() => {
    return items.reduce((acc, item) => {
      const product = productsMap.get(Number(item.producto_id));
      if (!product) return acc;
      const qty = Number(item.cantidad) || 0;
      return acc + product.precio * qty;
    }, 0);
  }, [items, productsMap]);

  if (!open) return null;

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    if (field === 'cantidad') {
      updated[index][field] = value === '' ? '' : Math.max(1, Number(value));
    } else {
      updated[index][field] = value;
    }
    setItems(updated);

    if (errors[`items_${index}`]) {
      setErrors((prev) => ({ ...prev, [`items_${index}`]: undefined }));
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { ...baseItem }]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const newErrors = {};

    if (!form.numero_pedido.trim()) {
      newErrors.numero_pedido = 'El número de pedido es obligatorio';
    }

    if (!form.proveedor_id) {
      newErrors.proveedor_id = 'Selecciona un proveedor';
    }

    const cleanItems = items
      .map((item, index) => {
        const productId = Number(item.producto_id);
        const cantidad = Number(item.cantidad);
        if (!productId || !cantidad || cantidad <= 0) {
          newErrors[`items_${index}`] = 'Selecciona un producto y cantidad válidos';
          return null;
        }
        return {
          producto_id: productId,
          cantidad,
        };
      })
      .filter(Boolean);

    if (cleanItems.length === 0) {
      newErrors.items = 'Agrega al menos un producto válido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      numero_pedido: form.numero_pedido.trim(),
      proveedor_id: Number(form.proveedor_id),
      estado: form.estado,
      fecha_entrega_estimada: form.fecha_entrega_estimada || null,
      notas: form.notas.trim(),
      creado_por: form.creado_por ? Number(form.creado_por) : null,
      productos: cleanItems,
    };

    onSubmit(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card wide">
        <div className="modal-header">
          <div>
            <h2>Crear Pedido</h2>
            <p>Registra un nuevo pedido para tus proveedores</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <div className="modal-field">
              <label htmlFor="numero_pedido">Número de pedido *</label>
              <input
                id="numero_pedido"
                name="numero_pedido"
                type="text"
                value={form.numero_pedido}
                onChange={handleFieldChange}
                placeholder="PO-2025-001"
              />
              {errors.numero_pedido && <span className="modal-error">{errors.numero_pedido}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="proveedor_id">Proveedor *</label>
              <select
                id="proveedor_id"
                name="proveedor_id"
                value={form.proveedor_id}
                onChange={handleFieldChange}
              >
                <option value="">Selecciona proveedor</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.nombre}
                  </option>
                ))}
              </select>
              {errors.proveedor_id && <span className="modal-error">{errors.proveedor_id}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="estado">Estado</label>
              <select id="estado" name="estado" value={form.estado} onChange={handleFieldChange}>
                <option value="pendiente">Creado</option>
                <option value="confirmado">Confirmado</option>
                <option value="enviado">Enviado</option>
                <option value="en_transito">En tránsito</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="fecha_entrega_estimada">Entrega estimada</label>
              <input
                id="fecha_entrega_estimada"
                name="fecha_entrega_estimada"
                type="date"
                value={form.fecha_entrega_estimada}
                onChange={handleFieldChange}
              />
            </div>

            <div className="modal-field">
              <label htmlFor="creado_por">Creado por</label>
              <select
                id="creado_por"
                name="creado_por"
                value={form.creado_por}
                onChange={handleFieldChange}
              >
                <option value="">Selecciona usuario</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-field full">
              <label htmlFor="notas">Notas</label>
              <textarea
                id="notas"
                name="notas"
                value={form.notas}
                onChange={handleFieldChange}
                placeholder="Detalles adicionales para el proveedor"
              />
            </div>
          </div>

          <div className="modal-subsection">
            <div className="modal-subheader">
              <h3>Productos</h3>
              <button type="button" className="modal-add" onClick={handleAddItem}>
                + Agregar producto
              </button>
            </div>
            {errors.items && <span className="modal-error">{errors.items}</span>}
            <div className="order-items-list">
              {items.map((item, index) => {
                const product = productsMap.get(Number(item.producto_id));
                const subtotal = product ? product.precio * (Number(item.cantidad) || 0) : 0;

                return (
                  <div className="order-item-row" key={`item-${index}`}>
                    <div className="order-item-field">
                      <label>Producto</label>
                      <select
                        value={item.producto_id}
                        onChange={(event) =>
                          handleItemChange(index, 'producto_id', event.target.value)
                        }
                      >
                        <option value="">Selecciona producto</option>
                        {products.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.nombre} ({prod.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="order-item-field small">
                      <label>Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(event) =>
                          handleItemChange(index, 'cantidad', event.target.value)
                        }
                      />
                    </div>
                    <div className="order-item-field small readonly">
                      <label>Precio</label>
                      <span>
                        {product
                          ? new Intl.NumberFormat('es-ES', {
                              style: 'currency',
                              currency: 'USD',
                            }).format(product.precio)
                          : '-'}
                      </span>
                    </div>
                    <div className="order-item-field small readonly">
                      <label>Subtotal</label>
                      <span>
                        {new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(subtotal)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="order-item-remove"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      title="Eliminar producto"
                    >
                      ×
                    </button>
                    {errors[`items_${index}`] && (
                      <span className="modal-error inline">{errors[`items_${index}`]}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="order-total">
            <span>Total estimado</span>
            <strong>
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'USD',
              }).format(total)}
            </strong>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-button ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="modal-button primary" disabled={loading}>
              {loading ? 'Creando…' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;


