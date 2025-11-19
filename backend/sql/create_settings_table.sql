CREATE TABLE IF NOT EXISTS configuraciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    valor JSON NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO configuraciones (clave, valor) VALUES 
('general', '{"nombre_empresa": "Sistema de Inventarios", "correo_soporte": "soporte@inventarios.com", "telefono": "", "moneda": "USD", "zona_horaria": "UTC", "formato_fecha": "DD/MM/YYYY"}')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

INSERT INTO configuraciones (clave, valor) VALUES 
('branding', '{"tema": "verde", "color_primario": "#239C56", "color_secundario": "#1B7B43", "logo_url": "/imgs/gestoricon.webp", "favicon_url": "/imgs/gestoricon.webp"}')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

INSERT INTO configuraciones (clave, valor) VALUES 
('notificaciones', '{"correo_alertas": true, "notificaciones_push": false, "resumen_diario": true, "umbral_stock": 20, "recordatorio_pedidos": true}')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

INSERT INTO configuraciones (clave, valor) VALUES 
('seguridad', '{"two_factor": false, "expiracion_sesion": 60, "politica_contrasena": "media", "intentos_login": 5}')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);
