<?php
/**
 * Controlador de Usuarios
 */

require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/AuditLogger.php';

class UserController {
    private $userModel;

    public function __construct() {
        $this->userModel = new UserModel();
    }

    public function index() {
        $users = $this->userModel->getAll();

        $formattedUsers = array_map(function ($user) {
            $cleanUser = $this->userModel->getUserData($user);
            return [
                'id' => (int) $cleanUser['id'],
                'nombre' => $cleanUser['nombre'],
                'email' => $cleanUser['email'],
                'rol' => $cleanUser['rol'],
                'avatar' => $cleanUser['avatar'] ?? null,
                'activo' => (int) $cleanUser['activo'],
                'fecha_creacion' => $cleanUser['fecha_creacion'],
                'fecha_actualizacion' => $cleanUser['fecha_actualizacion'],
            ];
        }, $users);

        Response::success(['users' => $formattedUsers], 'Listado de usuarios');
    }

    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        $payload = json_decode(file_get_contents('php://input'), true);
        if (!$payload) {
            Response::error('Datos no proporcionados', 400);
        }

        $nombre = isset($payload['nombre']) ? trim($payload['nombre']) : '';
        $email = isset($payload['email']) ? trim($payload['email']) : '';
        $rol = $payload['rol'] ?? 'inventory_manager';
        $activo = isset($payload['activo']) ? (int) $payload['activo'] : 1;
        $password = $payload['password'] ?? '';

        $errors = [];
        if ($nombre === '') {
            $errors['nombre'] = 'El nombre es obligatorio';
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Correo electrónico inválido';
        }
        if ($password === '' || strlen($password) < 6) {
            $errors['password'] = 'La contraseña debe tener al menos 6 caracteres';
        }

        $availableRoles = $this->userModel->getRoles();
        if (!in_array($rol, $availableRoles, true)) {
            $errors['rol'] = 'Rol no válido';
        }

        if (!empty($errors)) {
            Response::error('Datos inválidos', 422, $errors);
        }

        $user = $this->userModel->create([
            'nombre' => $nombre,
            'email' => $email,
            'rol' => $rol,
            'activo' => $activo,
            'password' => $password,
        ]);

        if (!$user) {
            Response::error('No se pudo crear el usuario. Verifica si el correo ya existe.', 400);
        }

        $cleanUser = $this->userModel->getUserData($user);

        AuditLogger::log('Creaci�n de usuario', 'Usuario', $cleanUser['id'], [
            'usuario' => $this->extractUserAuditData($cleanUser),
        ]);

        Response::success(['user' => $cleanUser], 'Usuario creado', 201);
    }

    public function show($id) {
        $user = $this->userModel->findByIdWithoutActiveFilter($id);
        if (!$user) {
            Response::error('Usuario no encontrado', 404);
        }
        $cleanUser = $this->userModel->getUserData($user);
        Response::success(['user' => $cleanUser], 'Detalle de usuario');
    }

    public function update($id) {
        $method = $_SERVER['REQUEST_METHOD'];
        if ($method !== 'PUT' && $method !== 'PATCH' && $method !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        $currentUser = $this->userModel->findByIdWithoutActiveFilter($id);
        if (!$currentUser) {
            Response::error('Usuario no encontrado', 404);
        }

        // Handle multipart/form-data for file uploads (which requires POST)
        // or JSON payload for standard updates
        $payload = [];
        if (!empty($_FILES) || !empty($_POST)) {
            $payload = $_POST;
        } else {
            $payload = json_decode(file_get_contents('php://input'), true);
        }

        if (!$payload && empty($_FILES)) {
            Response::error('Datos no proporcionados', 400);
        }

        $updatedData = [
            'nombre' => $payload['nombre'] ?? $currentUser['nombre'],
            'email' => $payload['email'] ?? $currentUser['email'],
            'rol' => $payload['rol'] ?? $currentUser['rol'],
            'activo' => isset($payload['activo']) ? (int) $payload['activo'] : (int) $currentUser['activo'],
        ];

        if (isset($payload['password']) && $payload['password'] !== '') {
            if (strlen($payload['password']) < 6) {
                Response::error('La contraseña debe tener al menos 6 caracteres', 422);
            }
            $updatedData['password'] = password_hash($payload['password'], PASSWORD_DEFAULT);
        }

        // Handle Avatar Upload
        if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['avatar'];
            $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            
            if (!in_array($file['type'], $allowedTypes)) {
                Response::error('Tipo de archivo no permitido. Solo JPG, PNG y WebP.', 400);
            }

            $uploadDir = __DIR__ . '/../imgs/avatars/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'user_' . $id . '_' . time() . '.' . $extension;
            $targetPath = $uploadDir . $filename;

            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                $updatedData['avatar'] = '/imgs/avatars/' . $filename;
            } else {
                Response::error('Error al subir la imagen', 500);
            }
        } elseif (isset($payload['remove_avatar']) && $payload['remove_avatar'] == 'true') {
            $updatedData['avatar'] = null;
        }

        $beforeData = $this->extractUserAuditData($this->userModel->getUserData($currentUser));

        $this->userModel->update($id, $updatedData);
        $user = $this->userModel->findByIdWithoutActiveFilter($id);
        $cleanUser = $this->userModel->getUserData($user);

        AuditLogger::log('Actualización de usuario', 'Usuario', $cleanUser['id'], [
            'antes' => $beforeData,
            'despues' => $this->extractUserAuditData($cleanUser),
        ]);

        Response::success(['user' => $cleanUser], 'Usuario actualizado');
    }

    public function delete($id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            Response::error('Método no permitido', 405);
        }

        $user = $this->userModel->findByIdWithoutActiveFilter($id);
        if (!$user) {
            Response::error('Usuario no encontrado', 404);
        }

        $this->userModel->delete($id);

        AuditLogger::log('Eliminaci�n de usuario', 'Usuario', $id, [
            'usuario' => $this->extractUserAuditData($this->userModel->getUserData($user)),
        ]);

        Response::success(null, 'Usuario eliminado');
    }

    private function extractUserAuditData(array $data): array {
        $fields = ['id', 'nombre', 'email', 'rol', 'activo'];
        $filtered = AuditLogger::filterFields($data, $fields);

        if (isset($filtered['id'])) {
            $filtered['id'] = (int) $filtered['id'];
        }

        if (isset($filtered['activo'])) {
            $filtered['activo'] = (int) $filtered['activo'];
        }

        return $filtered;
    }
}
