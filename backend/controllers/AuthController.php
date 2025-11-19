<?php
/**
 * Controlador de Autenticación
 */

require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/AuditLogger.php';

class AuthController {
    private $userModel;

    public function __construct() {
        $this->userModel = new UserModel();
    }

    /**
     * Procesar registro de usuario
     */
    public function register() {
        // Verificar método HTTP
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        // Obtener datos del request
        $data = json_decode(file_get_contents('php://input'), true);

        // Validar datos
        $errors = $this->validateRegisterData($data);
        if (!empty($errors)) {
            Response::error('Datos de registro inválidos', 400, $errors);
        }

        // Crear usuario
        $user = $this->userModel->create(
            trim($data['nombre']),
            trim($data['email']),
            $data['password']
        );

        if (!$user) {
            Response::error('El email ya está registrado', 409);
        }

        // Retornar datos del usuario (sin contraseña)
        $userData = $this->userModel->getUserData($user);

        AuditLogger::log(
            'Registro de usuario',
            'Autenticaci�n',
            $userData['id'],
            [
                'email' => $userData['email'],
                'rol' => $userData['rol'] ?? null,
            ],
            [
                'user_id' => $userData['id'],
                'nombre_usuario' => $userData['nombre'],
            ]
        );

        Response::success($userData, 'Usuario registrado exitosamente', 201);
    }

    /**
     * Procesar inicio de sesión
     */
    public function login() {
        // Verificar método HTTP
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        // Obtener datos del request
        $data = json_decode(file_get_contents('php://input'), true);

        // Validar datos
        $errors = $this->validateLoginData($data);
        if (!empty($errors)) {
            Response::error('Datos de inicio de sesión inválidos', 400, $errors);
        }

        // Buscar usuario
        $user = $this->userModel->findByEmail(trim($data['email']));
        
        if (!$user) {
            Response::error('Credenciales inválidas', 401);
        }

        // Verificar contraseña
        if (!$this->userModel->verifyPassword($data['password'], $user['password'])) {
            Response::error('Credenciales inválidas', 401);
        }

        // Verificar si el usuario está activo
        if (!$user['activo']) {
            Response::error('Usuario inactivo', 403);
        }

        // Iniciar sesión
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_name'] = $user['nombre'];
        $_SESSION['user_rol'] = $user['rol'];

        // Retornar datos del usuario (sin contraseña)
        $userData = $this->userModel->getUserData($user);

        AuditLogger::log(
            'Inicio de sesión',
            'Autenticación',
            $userData['id'],
            ['email' => $userData['email'], 'rol' => $userData['rol'] ?? null],
            [
                'user_id' => $userData['id'],
                'nombre_usuario' => $userData['nombre'],
            ]
        );

        Response::success($userData, 'Inicio de sesión exitoso');
    }

    /**
     * Cerrar sesión
     */
    public function logout() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $userId = $_SESSION['user_id'] ?? null;
        $userName = $_SESSION['user_name'] ?? ($_SESSION['user_email'] ?? 'Usuario');

        AuditLogger::log(
            'Cierre de sesión',
            'Autenticación',
            $userId,
            ['email' => $_SESSION['user_email'] ?? null],
            [
                'user_id' => $userId,
                'nombre_usuario' => $userName,
            ]
        );

        session_unset();
        session_destroy();
        
        Response::success(null, 'Sesión cerrada exitosamente');
    }

    /**
     * Verificar sesión actual
     */
    public function checkSession() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION['user_id'])) {
            Response::error('No hay sesión activa', 401);
        }

        $user = $this->userModel->findById($_SESSION['user_id']);
        
        if (!$user) {
            session_unset();
            session_destroy();
            Response::error('Usuario no encontrado', 404);
        }

        $userData = $this->userModel->getUserData($user);
        Response::success($userData, 'Sesión activa');
    }

    /**
     * Validar datos de registro
     */
    private function validateRegisterData($data) {
        $errors = [];

        if (empty($data['nombre']) || strlen(trim($data['nombre'])) < 3) {
            $errors['nombre'] = 'El nombre debe tener al menos 3 caracteres';
        }

        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'El email no es válido';
        }

        if (empty($data['password']) || strlen($data['password']) < 6) {
            $errors['password'] = 'La contraseña debe tener al menos 6 caracteres';
        }

        if (empty($data['confirmar_password']) || $data['password'] !== $data['confirmar_password']) {
            $errors['confirmar_password'] = 'Las contraseñas no coinciden';
        }

        return $errors;
    }

    /**
     * Validar datos de inicio de sesión
     */
    private function validateLoginData($data) {
        $errors = [];

        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'El email no es válido';
        }

        if (empty($data['password'])) {
            $errors['password'] = 'La contraseña es requerida';
        }

        return $errors;
    }
}
?>

