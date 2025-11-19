import React from 'react';
import './ProductModal.css';

const AlertConfigModal = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2>Configurar Umbrales</h2>
            <p>Próximamente podrás personalizar los niveles de alerta.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-form">
          <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6 }}>
            Esta sección está en construcción. Aquí podrás definir los niveles de stock y
            configuraciones para notificaciones personalizadas.
          </p>
        </div>

        <div className="modal-actions">
          <button type="button" className="modal-button primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertConfigModal;




