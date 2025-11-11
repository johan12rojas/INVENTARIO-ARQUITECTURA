import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      // Placeholder: only simulate success (no backend endpoint yet)
      await new Promise((resolve) => setTimeout(resolve, 800));
      setMessage('Si el correo existe, te enviaremos instrucciones para restablecer la contraseña.');
      setEmail('');
    } catch (err) {
      setError('No se pudo procesar la solicitud. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="10" width="22" height="18" rx="2" stroke="white" strokeWidth="2"/>
              <path d="M9 12L20 20L31 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="auth-title">Recuperar contraseña</h1>
          <p className="auth-subtitle">Ingresa tu correo para recibir instrucciones</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="recovery-email">Correo electrónico</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5.25C3 4.55964 3.55964 4 4.25 4H15.75C16.4404 4 17 4.55964 17 5.25V14.75C17 15.4404 16.4404 16 15.75 16H4.25C3.55964 16 3 15.4404 3 14.75V5.25Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.25 6L10 9.75L15.75 6" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="email"
                id="recovery-email"
                name="recovery-email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar instrucciones'}
          </button>

          <p className="auth-footer-text">
            ¿Recordaste tu contraseña? <Link to="/login" className="auth-link">Volver al inicio de sesión</Link>
          </p>
        </form>
      </div>
      <footer className="main-footer">
        <p>© 2025 Sistema de Inventarios. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default ForgotPassword;

