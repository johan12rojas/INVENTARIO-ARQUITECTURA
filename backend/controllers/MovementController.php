<?php
/**
 * Controlador de Movimientos de Inventario
 */

require_once __DIR__ . '/../models/MovementModel.php';
require_once __DIR__ . '/../utils/Response.php';

class MovementController {
    private $movementModel;

    public function __construct() {
        $this->movementModel = new MovementModel();
    }

    public function index() {
        $filters = [
            'search' => isset($_GET['search']) ? trim($_GET['search']) : null,
            'type' => isset($_GET['type']) ? $_GET['type'] : null,
        ];

        $data = [
            'summary' => $this->movementModel->getSummary($filters),
            'movements' => $this->movementModel->getMovements($filters),
            'products' => $this->movementModel->getProductOptions(),
            'responsibles' => $this->movementModel->getResponsableOptions(),
        ];

        Response::success($data, 'Listado de movimientos');
    }

    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $validation = $this->validateMovementData($data);
        if ($validation['hasErrors']) {
            Response::error('Datos de movimiento inválidos', 400, $validation['errors']);
        }

        try {
            $result = $this->movementModel->registerMovement($validation['payload']);
            Response::success([
                'id' => $result['movement_id'],
                'new_stock' => $result['new_stock'],
            ], 'Movimiento registrado correctamente', 201);
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function delete($id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            Response::error('Método no permitido', 405);
        }

        try {
            $this->movementModel->deleteMovement($id);
            Response::success(null, 'Movimiento eliminado');
        } catch (Exception $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    private function validateMovementData($data) {
        $errors = [];

        if (!$data) {
            return [
                'hasErrors' => true,
                'errors' => ['general' => 'Datos no proporcionados'],
            ];
        }

        $tipo = isset($data['tipo']) ? $data['tipo'] : '';
        $producto_id = isset($data['producto_id']) ? (int) $data['producto_id'] : 0;
        $cantidad = isset($data['cantidad']) ? (int) $data['cantidad'] : 0;
        $responsable_id = isset($data['responsable_id']) && $data['responsable_id'] !== '' ? (int) $data['responsable_id'] : null;
        $referencia = isset($data['referencia']) ? trim((string) $data['referencia']) : '';
        $notas = isset($data['notas']) ? trim((string) $data['notas']) : '';
        $fecha_movimiento = isset($data['fecha_movimiento']) ? trim((string) $data['fecha_movimiento']) : null;

        if (!in_array($tipo, ['entry', 'exit'], true)) {
            $errors['tipo'] = 'Tipo inválido';
        }

        if ($producto_id <= 0) {
            $errors['producto_id'] = 'Producto inválido';
        }

        if ($cantidad <= 0) {
            $errors['cantidad'] = 'La cantidad debe ser mayor a 0';
        }

        if ($fecha_movimiento) {
            $timestamp = strtotime($fecha_movimiento);
            if ($timestamp === false) {
                $errors['fecha_movimiento'] = 'Fecha inválida';
            } else {
                $fecha_movimiento = date('Y-m-d H:i:s', $timestamp);
            }
        } else {
            $fecha_movimiento = date('Y-m-d H:i:s');
        }

        return [
            'hasErrors' => !empty($errors),
            'errors' => $errors,
            'payload' => [
                'tipo' => $tipo,
                'producto_id' => $producto_id,
                'cantidad' => $cantidad,
                'responsable_id' => $responsable_id,
                'referencia' => $referencia,
                'notas' => $notas,
                'fecha_movimiento' => $fecha_movimiento,
            ],
        ];
    }
}


