# Sistema de Control de Inventarios

Sistema de gestión de inventario desarrollado con arquitectura MVC, backend en PHP y frontend en React.

## Estructura del Proyecto

```
GESTOR_INVENTARIO/
├── backend/                 # Backend PHP con patrón MVC
│   ├── api/                # Endpoints de la API REST
│   ├── config/             # Configuración (Base de datos)
│   ├── controllers/        # Controladores
│   ├── models/             # Modelos de datos
│   ├── utils/              # Utilidades
│   └── .htaccess          # Configuración Apache
├── frontend/               # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── services/      # Servicios API
│   │   └── App.jsx        # Componente principal
│   └── public/            # Archivos públicos
└── inventario.sql         # Base de datos MySQL
```

## Requisitos

- XAMPP (PHP 7.4+ y MySQL/MariaDB)
- Node.js 16+ y npm
- Base de datos MySQL con nombre `inventario`

## Instalación

### 1. Base de Datos

1. Inicia XAMPP y asegúrate de que MySQL esté corriendo
2. Importa el archivo `inventario.sql` en phpMyAdmin o ejecuta:
   ```bash
   mysql -u root -p inventario < inventario.sql
   ```

### 2. Backend (PHP)

1. El backend está listo para usar. Asegúrate de que:
   - XAMPP esté corriendo
   - El proyecto esté en `C:\xampp\htdocs\GESTOR_INVENTARIO\`
   - O ajusta la ruta en `backend/config/database.php` si es necesario

2. Verifica la configuración de la base de datos en `backend/config/database.php`:
   ```php
   private $host = 'localhost';
   private $db_name = 'inventario';
   private $username = 'root';
   private $password = '';
   ```

### 3. Frontend (React)

1. Instala las dependencias:
   ```bash
   cd frontend
   npm install
   ```

2. Inicia el servidor de desarrollo:
   ```bash
   npm start
   ```

3. El frontend se abrirá en `http://localhost:3000`

## Uso

### Acceso al Sistema

1. **Registro de Usuario:**
   - Ve a `http://localhost:3000/register`
   - Completa el formulario con nombre, email y contraseña
   - Crea tu cuenta

2. **Inicio de Sesión:**
   - Ve a `http://localhost:3000/login`
   - Ingresa tu email y contraseña
   - Inicia sesión

### Endpoints de la API

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/check` - Verificar sesión actual

Base URL: `http://localhost/GESTOR_INVENTARIO/backend/api`

## Credenciales de Prueba

La base de datos incluye un usuario administrador:
- Email: `admin@admin.com`
- Contraseña: `password` (verificar en la base de datos)

## Tecnologías Utilizadas

- **Backend:** PHP 7.4+, MySQL/MariaDB
- **Frontend:** React 18, React Router DOM
- **Arquitectura:** MVC (Model-View-Controller)
- **Autenticación:** Sesiones PHP

## Notas

- El backend utiliza sesiones PHP para la autenticación
- Las contraseñas se almacenan con hash usando `password_hash()`
- El frontend se comunica con el backend mediante fetch API
- CORS está configurado para permitir peticiones desde `localhost:3000`

## Próximos Pasos

- Implementar dashboard principal
- Gestión de productos
- Gestión de proveedores
- Sistema de pedidos
- Reportes y estadísticas

