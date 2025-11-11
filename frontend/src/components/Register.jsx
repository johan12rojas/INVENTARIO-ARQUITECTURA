import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmar_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (formData.password !== formData.confirmar_password) {
      newErrors.confirmar_password = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await api.register(formData);
      
      if (response.success) {
        // Redirigir al login después del registro exitoso
        navigate('/login', { 
          state: { message: 'Registro exitoso. Por favor inicia sesión.' }
        });
      }
    } catch (error) {
      const errorMessage = error.message || 'Error al registrar usuario';
      
      // Intentar parsear errores específicos del backend
      if (error.errors) {
        setErrors(error.errors);
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <img src="/imgs/gestoricon.webp" alt="Logo Gestor Inventario" />
          </div>
          <h1 className="auth-title">Sistema de Control de Inventarios</h1>
          <p className="auth-subtitle">Crea una nueva cuenta</p>
        </div>

        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre completo</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 16.5C4 13.7386 6.23858 11.5 9 11.5H11C13.7614 11.5 16 13.7386 16 16.5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                id="nombre"
                name="nombre"
                placeholder="Ana García"
                value={formData.nombre}
                onChange={handleChange}
                className={errors.nombre ? 'input-error' : ''}
                required
              />
            </div>
            {errors.nombre && <span className="field-error">{errors.nombre}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5.25C3 4.55964 3.55964 4 4.25 4H15.75C16.4404 4 17 4.55964 17 5.25V14.75C17 15.4404 16.4404 16 15.75 16H4.25C3.55964 16 3 15.4404 3 14.75V5.25Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.25 6L10 9.75L15.75 6" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'input-error' : ''}
                required
              />
            </div>
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6.5 9V7C6.5 4.79086 8.29086 3 10.5 3C12.7091 3 14.5 4.79086 14.5 7V9" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="5" y="9" width="11" height="8" rx="2" stroke="#666" strokeWidth="1.5"/>
                <path d="M10.5 12V14" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'input-error' : ''}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  {showPassword ? (
                    <>
                      <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 3.33333C6.66667 3.33333 4.16667 5.41667 2.5 8.33333C4.16667 11.25 6.66667 13.3333 10 13.3333C13.3333 13.3333 15.8333 11.25 17.5 8.33333C15.8333 5.41667 13.3333 3.33333 10 3.33333Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  ) : (
                    <>
                      <path d="M2.5 2.5L17.5 17.5M7.5 7.5C6.57953 7.5 5.83333 8.24579 5.83333 9.16667V11.6667C5.83333 12.5871 6.57953 13.3333 7.5 13.3333H12.5C13.4205 13.3333 14.1667 12.5871 14.1667 11.6667V9.16667M7.5 7.5V5.83333C7.5 3.53215 9.36548 1.66667 11.6667 1.66667H12.5C14.8012 1.66667 16.6667 3.53215 16.6667 5.83333V7.5M7.5 7.5H2.5M12.5 12.5L17.5 17.5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmar_password">Confirmar contraseña</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6.5 9V7C6.5 4.79086 8.29086 3 10.5 3C12.7091 3 14.5 4.79086 14.5 7V9" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="5" y="9" width="11" height="8" rx="2" stroke="#666" strokeWidth="1.5"/>
                <path d="M10.5 12V14" stroke="#666" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmar_password"
                name="confirmar_password"
                placeholder="••••••••"
                value={formData.confirmar_password}
                onChange={handleChange}
                className={errors.confirmar_password ? 'input-error' : ''}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  {showConfirmPassword ? (
                    <>
                      <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 3.33333C6.66667 3.33333 4.16667 5.41667 2.5 8.33333C4.16667 11.25 6.66667 13.3333 10 13.3333C13.3333 13.3333 15.8333 11.25 17.5 8.33333C15.8333 5.41667 13.3333 3.33333 10 3.33333Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  ) : (
                    <>
                      <path d="M2.5 2.5L17.5 17.5M7.5 7.5C6.57953 7.5 5.83333 8.24579 5.83333 9.16667V11.6667C5.83333 12.5871 6.57953 13.3333 7.5 13.3333H12.5C13.4205 13.3333 14.1667 12.5871 14.1667 11.6667V9.16667M7.5 7.5V5.83333C7.5 3.53215 9.36548 1.66667 11.6667 1.66667H12.5C14.8012 1.66667 16.6667 3.53215 16.6667 5.83333V7.5M7.5 7.5H2.5M12.5 12.5L17.5 17.5" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.confirmar_password && <span className="field-error">{errors.confirmar_password}</span>}
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p className="auth-footer-text">
            ¿Ya tienes cuenta? <Link to="/login" className="auth-link">Inicia sesión</Link>
          </p>

          <div className="security-info">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L2 5V8C2 11.5 4.5 14.5 8 15C11.5 14.5 14 11.5 14 8V5L8 2Z" fill="#FF9800" fillOpacity="0.8"/>
              <path d="M8 8V12M8 6V8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Conexión segura mediante HTTPS/TLS</span>
          </div>
        </form>
      </div>
      <footer className="main-footer">
        <p>© 2025 Sistema de Inventarios. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default Register;

