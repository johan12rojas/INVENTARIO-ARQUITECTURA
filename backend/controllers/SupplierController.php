<?php
/**
 * Controlador de Proveedores
 */

require_once __DIR__ . '/../models/SupplierModel.php';
require_once __DIR__ . '/../utils/Response.php';

class SupplierController {
    private $supplierModel;

    public function __construct() {
        $this->supplierModel = new SupplierModel();
    }

    public function index() {
        $filters = [
            'search' => isset($_GET['search']) ? trim($_GET['search']) : null,
            'status' => isset($_GET['status']) ? $_GET['status'] : null,
        ];

        $data = [
            'summary' => $this->supplierModel->getSummary(),
            'suppliers' => $this->supplierModel->getSuppliers($filters),
        ];

        Response::success($data, 'Listado de proveedores');
    }

    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $validation = $this->validateSupplierData($data);
        if ($validation['hasErrors']) {
            Response::error('Datos de proveedor inválidos', 400, $validation['errors']);
        }

        $existing = $this->supplierModel->findByEmail($validation['payload']['email']);
        if ($existing) {
            Response::error('El email ya está registrado para otro proveedor', 409);
        }

        $supplierId = $this->supplierModel->create($validation['payload']);

        Response::success(['id' => (int) $supplierId], 'Proveedor creado correctamente', 201);
    }

    public function update($id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
            Response::error('Método no permitido', 405);
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $validation = $this->validateSupplierData($data, true);
        if ($validation['hasErrors']) {
            Response::error('Datos de proveedor inválidos', 400, $validation['errors']);
        }

        $supplier = $this->supplierModel->findById($id);
        if (!$supplier) {
            Response::error('Proveedor no encontrado', 404);
        }

        $existing = $this->supplierModel->findByEmail($validation['payload']['email']);
        if ($existing && (int) $existing['id'] !== (int) $id) {
            Response::error('El email ya está registrado para otro proveedor', 409);
        }

        $this->supplierModel->update($id, $validation['payload']);
        Response::success(['id' => (int) $id], 'Proveedor actualizado correctamente');
    }

    public function delete($id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            Response::error('Método no permitido', 405);
        }

        $supplier = $this->supplierModel->findById($id);
        if (!$supplier) {
            Response::error('Proveedor no encontrado', 404);
        }

        $this->supplierModel->softDelete($id);
        Response::success(null, 'Proveedor eliminado');
    }

    private function validateSupplierData($data, $isUpdate = false) {
        $errors = [];

        if (!$data) {
            return [
                'hasErrors' => true,
                'errors' => ['general' => 'Datos no proporcionados'],
            ];
        }

        $nombre = isset($data['nombre']) ? trim((string) $data['nombre']) : '';
        $contacto = isset($data['contacto']) ? trim((string) $data['contacto']) : '';
        $email = isset($data['email']) ? trim((string) $data['email']) : '';
        $telefono = isset($data['telefono']) ? trim((string) $data['telefono']) : '';
        $direccion = isset($data['direccion']) ? trim((string) $data['direccion']) : '';
        $productos_suministrados = isset($data['productos_suministrados']) ? (int) $data['productos_suministrados'] : 0;
        $total_pedidos = isset($data['total_pedidos']) ? (int) $data['total_pedidos'] : 0;
        $activo = isset($data['activo']) ? (int) $data['activo'] : 1;

        if ($nombre === '') {
            $errors['nombre'] = 'El nombre es obligatorio';
        }

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'El email no es válido';
        }

        if ($telefono === '') {
            $errors['telefono'] = 'El teléfono es obligatorio';
        }

        if ($productos_suministrados < 0) {
            $errors['productos_suministrados'] = 'Los productos suministrados no pueden ser negativos';
        }

        if ($total_pedidos < 0) {
            $errors['total_pedidos'] = 'Los pedidos no pueden ser negativos';
        }

        if (!in_array($activo, [0, 1], true)) {
            $errors['activo'] = 'Estado activo inválido';
        }

        return [
            'hasErrors' => !empty($errors),
            'errors' => $errors,
            'payload' => [
                'nombre' => $nombre,
                'contacto' => $contacto,
                'email' => $email,
                'telefono' => $telefono,
                'direccion' => $direccion,
                'productos_suministrados' => $productos_suministrados,
                'total_pedidos' => $total_pedidos,
                'activo' => $activo,
            ],
        ];
    }
}


