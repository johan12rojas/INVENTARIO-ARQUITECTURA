import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const response = await api.login(formData.email, formData.password);
      
      if (response.success) {
        // Guardar información del usuario en localStorage
        if (response.data) {
          localStorage.setItem('user', JSON.stringify(response.data));
        }
        
        // Guardar en localStorage si seleccionó "Recordarme"
        if (rememberMe) {
          localStorage.setItem('user_email', formData.email);
        } else {
          localStorage.removeItem('user_email');
        }

        // Redirigir al dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      setErrors({ 
        general: error.message || 'Error al iniciar sesión. Verifica tus credenciales.' 
      });
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
          <p className="auth-subtitle">Ingresa a tu cuenta</p>
        </div>

        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
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
                      <path d="M2.5 10C4.16667 6.66667 6.66667 5 10 5C13.3333 5 15.8333 6.66667 17.5 10C15.8333 13.3333 13.3333 15 10 15C6.66667 15 4.16667 13.3333 2.5 10Z" stroke="#636f7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="#636f7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  ) : (
                    <>
                      <path d="M2.5 10C4.16667 6.66667 6.66667 5 10 5C13.3333 5 15.8333 6.66667 17.5 10C16.7482 11.5 15.7441 12.6667 14.4876 13.5" stroke="#636f7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12.5 10C12.5 11.3807 11.3807 12.5 10 12.5C8.61929 12.5 7.5 11.3807 7.5 10C7.5 8.61929 8.61929 7.5 10 7.5" stroke="#636f7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 4L16 16" stroke="#636f7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="checkbox-custom" aria-hidden="true"></span>
              <span className="checkbox-text">Recordarme</span>
            </label>
            <Link to="/forgot-password" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>

          <div className="auth-divider">
            <span>o continúa con</span>
          </div>

          <div className="social-login">
            <button type="button" className="social-button" title="Continuar con Google">
              <img src="/imgs/googleicon.webp" alt="Google" />
            </button>
            <button type="button" className="social-button" title="Continuar con Apple">
              <img src="/imgs/appleicon.webp" alt="Apple" />
            </button>
            <button type="button" className="social-button" title="Continuar con Facebook">
              <img src="/imgs/faceicon.webp" alt="Facebook" />
            </button>
          </div>

          <p className="auth-footer-text">
            ¿No tienes cuenta? <Link to="/register" className="auth-link">Regístrate</Link>
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

export default Login;

