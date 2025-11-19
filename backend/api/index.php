<?php
/**
 * API REST - Punto de entrada principal
 */

// Headers CORS
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Ruta base del proyecto
define('BASE_PATH', dirname(__DIR__));

// Autoload simple
require_once BASE_PATH . '/config/database.php';
require_once BASE_PATH . '/utils/Response.php';
require_once BASE_PATH . '/models/UserModel.php';
require_once BASE_PATH . '/controllers/AuthController.php';
require_once BASE_PATH . '/controllers/UserController.php';
require_once BASE_PATH . '/controllers/RoleController.php';
require_once BASE_PATH . '/models/ProductModel.php';
require_once BASE_PATH . '/controllers/ProductController.php';
require_once BASE_PATH . '/models/SupplierModel.php';
require_once BASE_PATH . '/controllers/SupplierController.php';
require_once BASE_PATH . '/models/MovementModel.php';
require_once BASE_PATH . '/controllers/MovementController.php';
require_once BASE_PATH . '/models/OrderModel.php';
require_once BASE_PATH . '/controllers/OrderController.php';
require_once BASE_PATH . '/models/AlertModel.php';
require_once BASE_PATH . '/controllers/AlertController.php';
require_once BASE_PATH . '/models/SettingModel.php';
require_once BASE_PATH . '/controllers/SettingController.php';
require_once BASE_PATH . '/models/AuditModel.php';
require_once BASE_PATH . '/controllers/AuditController.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Obtener ruta de la petición
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remover query string
$requestUri = strtok($requestUri, '?');

// Obtener la ruta desde el parámetro path (si existe) o desde REQUEST_URI
if (isset($_GET['path'])) {
    $path = $_GET['path'];
} else {
    // Extraer la ruta después de /api/
    // Intentar diferentes variaciones de la ruta base
    $possibleBases = [
        '/GESTOR_INVENTARIO/backend/api/',
        '/backend/api/',
        '/api/'
    ];
    
    $path = '';
    foreach ($possibleBases as $basePath) {
        if (strpos($requestUri, $basePath) !== false) {
            $path = str_replace($basePath, '', $requestUri);
            break;
        }
    }
    
    // Si no se encontró, usar regex como último recurso
    if (empty($path)) {
        $path = preg_replace('#^.*/api/#', '', $requestUri);
    }
}

$path = trim($path, '/');

// Debug: descomentar para ver qué está recibiendo
// error_log("REQUEST_URI: " . $requestUri);
// error_log("Path extraído: " . $path);
// error_log("Resource: " . $resource);
// error_log("Action: " . $action);

// Dividir la ruta en segmentos
$segments = explode('/', $path);
$resource = $segments[0] ?? '';
$firstSegment = $segments[1] ?? null;
$secondSegment = $segments[2] ?? null;
$action = $firstSegment ?? '';

// Enrutamiento
try {
    switch ($resource) {
        case 'auth':
            $authController = new AuthController();
            
            switch ($action) {
                case 'register':
                    $authController->register();
                    break;
                    
                case 'login':
                    $authController->login();
                    break;
                    
                case 'logout':
                    $authController->logout();
                    break;
                    
                case 'check':
                    $authController->checkSession();
                    break;
                    
                default:
                    Response::error('Ruta no encontrada', 404);
            }
            break;

        case 'products':
            $productController = new ProductController();

            if ($requestMethod === 'GET') {
                if ($firstSegment === 'export') {
                    $productController->export();
                } else {
                    $productController->index();
                }
            } elseif ($requestMethod === 'POST') {
                if ($firstSegment === 'import') {
                    $productController->import();
                } else {
                    $productController->create();
                }
            } elseif ($requestMethod === 'PUT' || $requestMethod === 'PATCH') {
                $id = $firstSegment ? (int) $firstSegment : null;
                if (!$id) {
                    Response::error('ID de producto requerido', 400);
                }
                $productController->update($id);
            } elseif ($requestMethod === 'DELETE') {
                $id = $firstSegment ? (int) $firstSegment : null;
                if (!$id) {
                    Response::error('ID de producto requerido', 400);
                }
                $productController->delete($id);
            } else {
                Response::error('Método no permitido', 405);
            }
            break;
        case 'suppliers':
            $supplierController = new SupplierController();

            if ($requestMethod === 'GET') {
                $supplierController->index();
            } elseif ($requestMethod === 'POST') {
                $supplierController->create();
            } elseif ($requestMethod === 'PUT' || $requestMethod === 'PATCH') {
                $id = $firstSegment ? (int) $firstSegment : null;
                if (!$id) {
                    Response::error('ID de proveedor requerido', 400);
                }
                $supplierController->update($id);
            } elseif ($requestMethod === 'DELETE') {
                $id = $firstSegment ? (int) $firstSegment : null;
                if (!$id) {
                    Response::error('ID de proveedor requerido', 400);
                }
                $supplierController->delete($id);
            } else {
                Response::error('Método no permitido', 405);
            }
            break;
        case 'movements':
            $movementController = new MovementController();

            if ($requestMethod === 'GET') {
                $movementController->index();
            } elseif ($requestMethod === 'POST') {
                $movementController->create();
            } elseif ($requestMethod === 'DELETE') {
                $id = $firstSegment ? (int) $firstSegment : null;
                if (!$id) {
                    Response::error('ID de movimiento requerido', 400);
                }
                $movementController->delete($id);
            } else {
                Response::error('Método no permitido', 405);
            }
            break;
        case 'orders':
            $orderController = new OrderController();

            if ($requestMethod === 'GET') {
                $orderController->index();
            } elseif ($requestMethod === 'POST') {
                $orderController->create();
            } elseif ($requestMethod === 'PUT' || $requestMethod === 'PATCH') {
                $id = $firstSegment ? (int) $firstSegment : null;
                if (!$id) {
                    Response::error('ID de pedido requerido', 400);
                }
                $orderController->updateStatus($id);
            } elseif ($requestMethod === 'DELETE') {
                $id = $firstSegment ? (int) $firstSegment : null;
                if (!$id) {
                    Response::error('ID de pedido requerido', 400);
                }
                $orderController->delete($id);
            } else {
                Response::error('Método no permitido', 405);
            }
            break;
        case 'alerts':
            $alertController = new AlertController();

            if ($requestMethod === 'GET') {
                $alertController->index();
            } elseif (in_array($requestMethod, ['PATCH', 'PUT', 'POST'], true) && $secondSegment === 'read') {
                $id = $firstSegment ?? null;
                if (!$id) {
                    Response::error('ID de alerta requerido', 400);
                }
                $alertController->markAsRead($id);
            } elseif ($requestMethod === 'DELETE') {
                $id = $firstSegment ?? null;
                if (!$id) {
                    Response::error('ID de alerta requerido', 400);
                }
                $alertController->delete($id);
            } else {
                Response::error('Método no permitido', 405);
            }
            break;
        case 'users':
            $userController = new UserController();

            if ($requestMethod === 'GET') {
                if ($firstSegment) {
                    $userController->show((int)$firstSegment);
                } else {
                    $userController->index();
                }
            } elseif ($requestMethod === 'POST') {
                if ($firstSegment && is_numeric($firstSegment)) {
                    $userController->update((int)$firstSegment);
                } else {
                    $userController->create();
                }
            } elseif (in_array($requestMethod, ['PUT', 'PATCH'], true)) {
                $id = $firstSegment ? (int)$firstSegment : null;
                if (!$id) {
                    Response::error('ID de usuario requerido', 400);
                }
                $userController->update($id);
            } elseif ($requestMethod === 'DELETE') {
                $id = $firstSegment ? (int)$firstSegment : null;
                if (!$id) {
                    Response::error('ID de usuario requerido', 400);
                }
                $userController->delete($id);
            } else {
                Response::error('Método no permitido', 405);
            }
            break;
        case 'roles':
            $roleController = new RoleController();

            if ($requestMethod === 'GET') {
                $roleController->index();
            } else {
                Response::error('Método no permitido', 405);
            }
            break;

        case 'settings':
            $settingController = new SettingController();

            if ($requestMethod === 'GET') {
                $settingController->index();
            } elseif ($requestMethod === 'POST' && $firstSegment === 'reset') {
                $settingController->resetDefaults();
            } elseif (in_array($requestMethod, ['PUT', 'PATCH'], true) && $firstSegment) {
                $settingController->update($firstSegment);
            } else {
                Response::error('Método no permitido', 405);
            }
            break;

        case 'audits':
            $auditController = new AuditController();

            if ($requestMethod === 'GET') {
                if ($firstSegment === 'export') {
                    $auditController->export();
                } else {
                    $auditController->index();
                }
            } else {
                Response::error('Método no permitido', 405);
            }
            break;

        case '':
        case 'index.php':
            Response::success([
                'message' => 'API del Sistema de Control de Inventarios',
                'version' => '1.0.0',
                'endpoints' => [
                    'POST /api/auth/register' => 'Registrar nuevo usuario',
                    'POST /api/auth/login' => 'Iniciar sesión',
                    'POST /api/auth/logout' => 'Cerrar sesión',
                    'GET /api/auth/check' => 'Verificar sesión actual'
                ]
            ], 'API funcionando correctamente');
            break;
            
        default:
            Response::error('Recurso no encontrado', 404);
    }
} catch (Exception $e) {
    error_log("Error en API: " . $e->getMessage());
    Response::error('Error interno del servidor', 500);
}
?>
