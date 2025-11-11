<?php
/**
 * Controlador de pedidos
 */

require_once __DIR__ . '/../models/OrderModel.php';
require_once __DIR__ . '/../utils/Response.php';

class OrderController {
    private $orderModel;

    public function __construct() {
        $this->orderModel = new OrderModel();
    }

    public function index() {
        $filters = [
            'search' => isset($_GET['search']) ? trim($_GET['search']) : null,
            'status' => isset($_GET['status']) ? $_GET['status'] : null,
        ];

        $data = [
            'summary' => $this->orderModel->getSummary(),
            'orders' => $this->orderModel->getOrders($filters),
            'providers' => $this->orderModel->getProviders(),
            'products' => $this->orderModel->getProducts(),
            'users' => $this->orderModel->getUsers(),
        ];

        Response::success($data, 'Listado de pedidos');
    }

    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        $payload = json_decode(file_get_contents('php://input'), true);
        $validation = $this->validateOrderData($payload);
        if ($validation['hasErrors']) {
            Response::error('Datos de pedido inválidos', 400, $validation['errors']);
        }

        try {
            $orderId = $this->orderModel->create($validation['payload']);
            Response::success(['id' => $orderId], 'Pedido creado correctamente', 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function updateStatus($id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
            Response::error('Método no permitido', 405);
        }

        $payload = json_decode(file_get_contents('php://input'), true);
        $status = isset($payload['estado']) ? $payload['estado'] : null;

        $allowed = ['pendiente', 'enviado', 'en_transito', 'entregado', 'cancelado', 'confirmado'];
        if (!$status || !in_array($status, $allowed, true)) {
            Response::error('Estado inválido', 400);
        }

        try {
            $this->orderModel->updateStatus((int) $id, $status);
            Response::success(null, 'Estado actualizado correctamente');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function delete($id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            Response::error('Método no permitido', 405);
        }

        try {
            $this->orderModel->delete((int) $id);
            Response::success(null, 'Pedido eliminado');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    private function validateOrderData($data) {
        $errors = [];

        if (!$data || !is_array($data)) {
            return [
                'hasErrors' => true,
                'errors' => ['general' => 'Datos no proporcionados'],
            ];
        }

        $numero_pedido = isset($data['numero_pedido']) ? trim((string) $data['numero_pedido']) : '';
        $proveedor_id = isset($data['proveedor_id']) ? (int) $data['proveedor_id'] : 0;
        $estado = isset($data['estado']) ? $data['estado'] : 'pendiente';
        $fecha_entrega_estimada = isset($data['fecha_entrega_estimada']) ? trim((string) $data['fecha_entrega_estimada']) : null;
        $notas = isset($data['notas']) ? trim((string) $data['notas']) : '';
        $creado_por = isset($data['creado_por']) && $data['creado_por'] !== '' ? (int) $data['creado_por'] : null;
        $productos = isset($data['productos']) && is_array($data['productos']) ? $data['productos'] : [];

        if ($numero_pedido === '') {
            $errors['numero_pedido'] = 'El número de pedido es obligatorio';
        }

        if ($proveedor_id <= 0) {
            $errors['proveedor_id'] = 'Selecciona un proveedor válido';
        }

        $allowedStatuses = ['pendiente', 'enviado', 'en_transito', 'entregado', 'cancelado', 'confirmado'];
        if (!in_array($estado, $allowedStatuses, true)) {
            $errors['estado'] = 'Estado no permitido';
        }

        if ($fecha_entrega_estimada) {
            $date = strtotime($fecha_entrega_estimada);
            if ($date === false) {
                $errors['fecha_entrega_estimada'] = 'Fecha de entrega inválida';
            } else {
                $fecha_entrega_estimada = date('Y-m-d', $date);
            }
        } else {
            $fecha_entrega_estimada = null;
        }

        if (empty($productos)) {
            $errors['productos'] = 'Debes agregar al menos un producto';
        } else {
            $productos = array_values(array_filter(array_map(function ($item) {
                $productoId = isset($item['producto_id']) ? (int) $item['producto_id'] : 0;
                $cantidad = isset($item['cantidad']) ? (int) $item['cantidad'] : 0;
                if ($productoId <= 0 || $cantidad <= 0) {
                    return null;
                }
                return [
                    'producto_id' => $productoId,
                    'cantidad' => $cantidad,
                ];
            }, $productos)));

            if (empty($productos)) {
                $errors['productos'] = 'Los productos deben tener cantidades válidas';
            }
        }

        return [
            'hasErrors' => !empty($errors),
            'errors' => $errors,
            'payload' => [
                'numero_pedido' => $numero_pedido,
                'proveedor_id' => $proveedor_id,
                'estado' => $estado,
                'fecha_entrega_estimada' => $fecha_entrega_estimada,
                'notas' => $notas,
                'creado_por' => $creado_por,
                'productos' => $productos,
            ],
        ];
    }
}


