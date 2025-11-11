<?php
/**
 * Controlador para alertas del sistema.
 */

require_once __DIR__ . '/../models/AlertModel.php';
require_once __DIR__ . '/../utils/Response.php';

class AlertController {
    private $alertModel;

    public function __construct() {
        $this->alertModel = new AlertModel();
    }

    public function index() {
        $filters = [
            'status' => isset($_GET['status']) ? $_GET['status'] : null,
            'priority' => isset($_GET['priority']) ? $_GET['priority'] : null,
            'type' => isset($_GET['type']) ? $_GET['type'] : null,
        ];

        $alerts = $this->alertModel->getAlerts($filters);

        $summary = [
            'total' => count($alerts),
            'unread' => 0,
            'high_priority' => 0,
        ];

        foreach ($alerts as $alert) {
            if (empty($alert['leida'])) {
                $summary['unread']++;
            }
            if (($alert['severidad'] ?? '') === 'high') {
                $summary['high_priority']++;
            }
        }

        Response::success([
            'summary' => $summary,
            'alerts' => $alerts,
        ], 'Listado de alertas');
    }

    public function markAsRead($id) {
        if (!in_array($_SERVER['REQUEST_METHOD'], ['PATCH', 'PUT', 'POST'], true)) {
            Response::error('Método no permitido', 405);
        }

        $this->alertModel->markAsRead((int) $id);
        Response::success(null, 'Alerta marcada como leída');
    }

    public function delete($id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            Response::error('Método no permitido', 405);
        }

        $this->alertModel->delete((int) $id);
        Response::success(null, 'Alerta eliminada');
    }
}


