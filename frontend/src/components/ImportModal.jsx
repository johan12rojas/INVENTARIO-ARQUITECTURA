import React, { useEffect, useRef, useState } from 'react';
import './ProductModal.css';

const ImportModal = ({ open, loading, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setError('');
      setDragActive(false);
    }
  }, [open]);

  if (!open) return null;

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Solo se permiten archivos CSV');
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const droppedFile = event.dataTransfer?.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleBrowseFile = () => {
    inputRef.current?.click();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!file) {
      setError('Selecciona un archivo CSV para importar');
      return;
    }
    onImport(file);
  };

  const handleClose = () => {
    if (loading) return;
    setFile(null);
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onDragEnter={handleDragOver}>
      <div className="modal-card import-card">
        <div className="modal-header">
          <div>
            <h2>Importar Productos desde CSV</h2>
            <p>Arrastra un archivo CSV o selecciónalo manualmente</p>
          </div>
          <button type="button" className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div
            className={`import-dropzone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragOver}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="import-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="8" width="24" height="24" rx="8" fill="#239C56" fillOpacity="0.1"/>
                <path d="M20 26V14" stroke="#239C56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 18L20 14L24 18" stroke="#239C56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 26H26" stroke="#239C56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {file ? (
              <>
                <p className="import-file">{file.name}</p>
                <p className="import-help">Archivo listo para importar</p>
              </>
            ) : (
              <>
                <p className="import-title">Arrastra un archivo CSV aquí</p>
                <p className="import-help">o haz clic para seleccionar</p>
                <button type="button" className="import-select" onClick={handleBrowseFile}>
                  Seleccionar archivo
                </button>
              </>
            )}
          </div>

          <div className="import-format">
            <strong>Formato requerido:</strong>{' '}
            <span>SKU, Nombre, Descripción, Categoría, Stock, Stock Mínimo, Precio, Proveedor, Activo (opcional)</span>
          </div>

          {error && <div className="import-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-button ghost" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="modal-button primary" disabled={loading}>
              {loading ? 'Importando…' : 'Importar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportModal;


