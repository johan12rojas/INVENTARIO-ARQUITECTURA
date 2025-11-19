<?php
/**
 * Controlador de auditoría
 */

require_once __DIR__ . '/../models/AuditModel.php';
require_once __DIR__ . '/../utils/Response.php';

class AuditController {
    private $auditModel;

    public function __construct() {
        $this->auditModel = new AuditModel();
    }

    public function index() {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            Response::error('Método no permitido', 405);
        }

        $filters = [
            'search' => isset($_GET['search']) ? trim($_GET['search']) : null,
            'entity' => isset($_GET['entity']) ? trim($_GET['entity']) : null,
            'action' => isset($_GET['action']) ? trim($_GET['action']) : null,
            'user_id' => isset($_GET['user_id']) ? (int) $_GET['user_id'] : null,
            'date_from' => isset($_GET['date_from']) ? $_GET['date_from'] : null,
            'date_to' => isset($_GET['date_to']) ? $_GET['date_to'] : null,
            'limit' => isset($_GET['limit']) ? (int) $_GET['limit'] : 50,
            'page' => isset($_GET['page']) ? (int) $_GET['page'] : 1,
        ];

        $logsResult = $this->auditModel->getLogs($filters);
        $summary = $this->auditModel->getSummary($filters);
        $filterOptions = $this->auditModel->getFilterOptions();

        $limit = $logsResult['pagination']['limit'];
        $total = max(0, (int) ($summary['total'] ?? 0));

        $data = [
            'logs' => $logsResult['logs'],
            'summary' => $summary,
            'filters' => $filterOptions,
            'pagination' => [
                'page' => $logsResult['pagination']['page'],
                'limit' => $limit,
                'total' => $total,
                'pages' => $limit > 0 ? (int) ceil($total / $limit) : 1,
            ],
        ];

        Response::success($data, 'Histórico de auditoría');
    }
    public function export() {
        $filters = [
            'search' => isset($_GET['search']) ? trim($_GET['search']) : null,
            'entity' => isset($_GET['entity']) ? trim($_GET['entity']) : null,
            'action' => isset($_GET['action']) ? trim($_GET['action']) : null,
            'user_id' => isset($_GET['user_id']) ? (int) $_GET['user_id'] : null,
            'date_from' => isset($_GET['date_from']) ? $_GET['date_from'] : null,
            'date_to' => isset($_GET['date_to']) ? $_GET['date_to'] : null,
            'limit' => 100000,
            'export' => true
        ];

        $logsResult = $this->auditModel->getLogs($filters);
        $logs = $logsResult['logs'];

        $filename = "auditoria_" . date('Y-m-d_H-i') . ".xls";

        header("Content-Type: application/vnd.ms-excel; charset=utf-8");
        header("Content-Disposition: attachment; filename=\"$filename\"");
        header("Pragma: no-cache");
        header("Expires: 0");

        echo '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
        echo '<head>';
        echo '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">';
        echo '<!--[if gte mso 9]>';
        echo '<xml>';
        echo '<x:ExcelWorkbook>';
        echo '<x:ExcelWorksheets>';
        echo '<x:ExcelWorksheet>';
        echo '<x:Name>Auditoría</x:Name>';
        echo '<x:WorksheetOptions>';
        echo '<x:Print>';
        echo '<x:ValidPrinterInfo/>';
        echo '</x:Print>';
        echo '</x:WorksheetOptions>';
        echo '</x:ExcelWorksheet>';
        echo '</x:ExcelWorksheets>';
        echo '</x:ExcelWorkbook>';
        echo '</xml>';
        echo '<![endif]-->';
        echo '<style>';
        echo 'table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }';
        echo 'th { background-color: #239c56; color: #ffffff; border: 1px solid #000000; padding: 10px; font-weight: bold; text-align: center; }';
        echo 'td { border: 1px solid #cccccc; padding: 8px; vertical-align: top; color: #333333; }';
        echo '.alt { background-color: #f2f2f2; }';
        echo '</style>';
        echo '</head>';
        echo '<body>';
        echo '<table>';
        echo '<thead>';
        echo '<tr>';
        echo '<th>ID</th>';
        echo '<th>Fecha</th>';
        echo '<th>Usuario</th>';
        echo '<th>Email</th>';
        echo '<th>Rol</th>';
        echo '<th>Acción</th>';
        echo '<th>Módulo</th>';
        echo '<th>ID Entidad</th>';
        echo '<th>Detalles</th>';
        echo '</tr>';
        echo '</thead>';
        echo '<tbody>';

        foreach ($logs as $index => $log) {
            $changes = $log['cambios'];
            if (is_array($changes)) {
                $changes = json_encode($changes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            }
            
            $rowClass = $index % 2 == 0 ? '' : 'class="alt"';
            
            echo "<tr $rowClass>";
            echo "<td>{$log['id']}</td>";
            echo "<td>{$log['fecha']}</td>";
            echo "<td>" . htmlspecialchars($log['nombre_usuario']) . "</td>";
            echo "<td>" . htmlspecialchars($log['usuario_email']) . "</td>";
            echo "<td>" . htmlspecialchars($log['usuario_rol']) . "</td>";
            echo "<td>" . htmlspecialchars($log['accion']) . "</td>";
            echo "<td>" . htmlspecialchars($log['entidad']) . "</td>";
            echo "<td>{$log['entidad_id']}</td>";
            echo "<td><pre>" . htmlspecialchars($changes) . "</pre></td>";
            echo "</tr>";
        }

        echo '</tbody>';
        echo '</table>';
        echo '</body>';
        echo '</html>';
        exit;
    }
}

