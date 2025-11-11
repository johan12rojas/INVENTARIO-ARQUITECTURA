import React, { useEffect, useMemo, useState } from 'react';
import './ProductModal.css';

const defaultForm = {
  nombre: '',
  email: '',
  rol: 'inventory_manager',
  activo: 1,
  password: '',
  confirmPassword: '',
};

const UserModal = ({
  open,
  mode = 'edit',
  user = null,
  roles = [],
  loading = false,
  serverError = '',
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  const roleOptions = useMemo(() => {
    if (!Array.isArray(roles) || roles.length === 0) {
      return [
        { id: 'admin', name: 'Administrador' },
        { id: 'inventory_manager', name: 'Gestor de Inventario' },
        { id: 'buyer', name: 'Comprador' },
        { id: 'auditor', name: 'Auditor' },
      ];
    }
    return roles;
  }, [roles]);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && user) {
      setForm({
        nombre: user.name || user.nombre || '',
        email: user.email || '',
        rol: user.roleKey || user.rol || roleOptions[0]?.id || 'inventory_manager',
        activo: user.status === 'active' || user.activo === 1 ? 1 : 0,
        password: '',
        confirmPassword: '',
      });
    } else {
      setForm((prev) => ({
        ...defaultForm,
        rol: roleOptions[0]?.id || 'inventory_manager',
      }));
    }
    setErrors({});
  }, [open, mode, user, roleOptions]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    let newValue = value;

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

  const validate = () => {
    const currentErrors = {};

    if (!form.nombre.trim()) {
      currentErrors.nombre = 'El nombre es obligatorio';
    }

    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      currentErrors.email = 'Correo electrónico inválido';
    }

    if (!form.rol) {
      currentErrors.rol = 'Selecciona un rol';
    }

    if (mode === 'create') {
      if (!form.password || form.password.length < 6) {
        currentErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      }
      if (form.password !== form.confirmPassword) {
        currentErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    } else if (mode === 'edit') {
      if (form.password && form.password.length < 6) {
        currentErrors.password = 'Debe tener al menos 6 caracteres';
      }
      if (form.password && form.password !== form.confirmPassword) {
        currentErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    return currentErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const currentErrors = validate();

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rol: form.rol,
      activo: Number(form.activo),
    };

    if (form.password) {
      payload.password = form.password;
    }

    onSubmit(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2>{mode === 'edit' ? 'Editar usuario' : 'Agregar usuario'}</h2>
            <p>Gestiona la información y permisos del usuario</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {serverError && <div className="modal-server-error">{serverError}</div>}
          <div className="modal-grid">
            <div className="modal-field">
              <label htmlFor="user-nombre">Nombre completo *</label>
              <input
                id="user-nombre"
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Nombre y apellidos"
              />
              {errors.nombre && <span className="modal-error">{errors.nombre}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="user-email">Correo electrónico *</label>
              <input
                id="user-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="usuario@empresa.com"
              />
              {errors.email && <span className="modal-error">{errors.email}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="user-rol">Rol *</label>
              <select id="user-rol" name="rol" value={form.rol} onChange={handleChange}>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {errors.rol && <span className="modal-error">{errors.rol}</span>}
            </div>

            <div className="modal-field toggle">
              <label htmlFor="user-activo">Activo</label>
              <label className="switch">
                <input
                  id="user-activo"
                  name="activo"
                  type="checkbox"
                  checked={Number(form.activo) === 1}
                  onChange={handleChange}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="modal-field">
              <label htmlFor="user-password">
                {mode === 'edit' ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
              </label>
              <input
                id="user-password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder={mode === 'edit' ? 'Actualizar contraseña' : 'Mínimo 6 caracteres'}
              />
              {errors.password && <span className="modal-error">{errors.password}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="user-confirm-password">
                {mode === 'edit' ? 'Confirmar contraseña' : 'Confirmar contraseña *'}
              </label>
              <input
                id="user-confirm-password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repite la contraseña"
              />
              {errors.confirmPassword && (
                <span className="modal-error">{errors.confirmPassword}</span>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-button ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="modal-button primary" disabled={loading}>
              {loading
                ? 'Guardando…'
                : mode === 'edit'
                ? 'Guardar cambios'
                : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;


