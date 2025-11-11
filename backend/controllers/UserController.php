<?php
/**
 * Controlador de Usuarios
 */

require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../utils/Response.php';

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
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
            Response::error('Método no permitido', 405);
        }

        $currentUser = $this->userModel->findByIdWithoutActiveFilter($id);
        if (!$currentUser) {
            Response::error('Usuario no encontrado', 404);
        }

        $payload = json_decode(file_get_contents('php://input'), true);
        if (!$payload) {
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

        $this->userModel->update($id, $updatedData);
        $user = $this->userModel->findByIdWithoutActiveFilter($id);
        $cleanUser = $this->userModel->getUserData($user);

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
        Response::success(null, 'Usuario eliminado');
    }
}


