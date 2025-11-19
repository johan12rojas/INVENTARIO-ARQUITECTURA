<?php
/**
 * Modelo para auditoría del sistema
 */

require_once __DIR__ . '/../config/database.php';

class AuditModel {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function create(array $data): int {
        $stmt = $this->conn->prepare("
            INSERT INTO auditoria
                (usuario_id, nombre_usuario, accion, entidad, entidad_id, cambios, fecha)
            VALUES
                (:usuario_id, :nombre_usuario, :accion, :entidad, :entidad_id, :cambios, NOW())
        ");

        $stmt->bindValue(':usuario_id', $data['usuario_id'] ?? null, PDO::PARAM_INT);
        $stmt->bindValue(':nombre_usuario', $data['nombre_usuario'] ?? null);
        $stmt->bindValue(':accion', $data['accion']);
        $stmt->bindValue(':entidad', $data['entidad']);
        $stmt->bindValue(':entidad_id', $data['entidad_id'] ?? null);
        $stmt->bindValue(':cambios', $data['cambios'] ?? null);
        $stmt->execute();

        return (int) $this->conn->lastInsertId();
    }

    public function getLogs(array $filters = []): array {
        $isExport = isset($filters['export']) && $filters['export'] === true;
        $maxLimit = $isExport ? 100000 : 200;
        $limit = isset($filters['limit']) ? max(1, min((int) $filters['limit'], $maxLimit)) : 50;
        $page = isset($filters['page']) && (int) $filters['page'] > 0 ? (int) $filters['page'] : 1;
        $offset = ($page - 1) * $limit;

        $params = [];
        $where = $this->buildWhereClause($filters, $params);

        $query = "
            SELECT
                a.id,
                a.usuario_id,
                a.nombre_usuario,
                a.accion,
                a.entidad,
                a.entidad_id,
                a.cambios,
                a.fecha,
                u.email AS usuario_email,
                u.rol AS usuario_rol
            FROM auditoria a
            LEFT JOIN usuarios u ON u.id = a.usuario_id
            {$where}
            ORDER BY a.fecha DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();

        return [
            'logs' => array_map([$this, 'mapLog'], $rows),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'count' => count($rows),
            ],
        ];
    }

    public function getSummary(array $filters = []): array {
        $params = [];
        $where = $this->buildWhereClause($filters, $params);

        $summary = [
            'total' => 0,
            'by_entity' => [],
            'by_action' => [],
            'recent_users' => [],
        ];

        $totalStmt = $this->conn->prepare("SELECT COUNT(*) FROM auditoria a {$where}");
        foreach ($params as $key => $value) {
            $totalStmt->bindValue($key, $value);
        }
        $totalStmt->execute();
        $summary['total'] = (int) $totalStmt->fetchColumn();

        $summary['by_entity'] = $this->fetchGroupedData(
            "SELECT a.entidad AS label, COUNT(*) AS value
             FROM auditoria a
             {$where}
             GROUP BY a.entidad
             ORDER BY value DESC
             LIMIT 5",
            $params
        );

        $summary['by_action'] = $this->fetchGroupedData(
            "SELECT a.accion AS label, COUNT(*) AS value
             FROM auditoria a
             {$where}
             GROUP BY a.accion
             ORDER BY value DESC
             LIMIT 5",
            $params
        );

        $recentStmt = $this->conn->prepare("
            SELECT
                a.usuario_id,
                COALESCE(u.nombre, a.nombre_usuario, 'Desconocido') AS nombre,
                COALESCE(u.email, '') AS email,
                COALESCE(u.rol, '') AS rol,
                COUNT(*) AS total,
                MAX(a.fecha) AS ultima_accion
            FROM auditoria a
            LEFT JOIN usuarios u ON u.id = a.usuario_id
            {$where}
            GROUP BY a.usuario_id, nombre, email, rol
            ORDER BY ultima_accion DESC
            LIMIT 5
        ");

        foreach ($params as $key => $value) {
            $recentStmt->bindValue($key, $value);
        }
        $recentStmt->execute();
        $summary['recent_users'] = array_map(function ($row) {
            return [
                'id' => $row['usuario_id'] !== null ? (int) $row['usuario_id'] : null,
                'nombre' => $row['nombre'],
                'email' => $row['email'],
                'rol' => $row['rol'],
                'total' => (int) $row['total'],
                'ultima_accion' => $row['ultima_accion'],
            ];
        }, $recentStmt->fetchAll());

        return $summary;
    }

    public function getFilterOptions(): array {
        $entitiesStmt = $this->conn->query("
            SELECT DISTINCT entidad
            FROM auditoria
            WHERE entidad IS NOT NULL AND entidad <> ''
            ORDER BY entidad ASC
        ");
        $actionsStmt = $this->conn->query("
            SELECT DISTINCT accion
            FROM auditoria
            WHERE accion IS NOT NULL AND accion <> ''
            ORDER BY accion ASC
        ");
        $usersStmt = $this->conn->query("
            SELECT DISTINCT
                a.usuario_id,
                COALESCE(u.nombre, a.nombre_usuario, 'Desconocido') AS nombre,
                COALESCE(u.email, '') AS email
            FROM auditoria a
            LEFT JOIN usuarios u ON u.id = a.usuario_id
            WHERE a.usuario_id IS NOT NULL
            ORDER BY nombre ASC
        ");

        return [
            'entities' => array_values(array_filter(array_map(function ($row) {
                return $row['entidad'];
            }, $entitiesStmt->fetchAll()))),
            'actions' => array_values(array_filter(array_map(function ($row) {
                return $row['accion'];
            }, $actionsStmt->fetchAll()))),
            'users' => array_map(function ($row) {
                return [
                    'id' => $row['usuario_id'] !== null ? (int) $row['usuario_id'] : null,
                    'nombre' => $row['nombre'],
                    'email' => $row['email'],
                ];
            }, $usersStmt->fetchAll()),
        ];
    }

    private function fetchGroupedData(string $query, array $params): array {
        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        return array_map(function ($row) {
            return [
                'label' => $row['label'],
                'value' => (int) $row['value'],
            ];
        }, $stmt->fetchAll());
    }

    private function buildWhereClause(array $filters, array &$params): string {
        $conditions = [];

        if (!empty($filters['search'])) {
            $conditions[] = "(a.nombre_usuario LIKE :search OR a.accion LIKE :search OR a.entidad LIKE :search OR a.entidad_id LIKE :search OR a.cambios LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($filters['entity'])) {
            $conditions[] = 'a.entidad = :entity';
            $params[':entity'] = $filters['entity'];
        }

        if (!empty($filters['action'])) {
            $conditions[] = 'a.accion = :action';
            $params[':action'] = $filters['action'];
        }

        if (!empty($filters['user_id']) && (int) $filters['user_id'] > 0) {
            $conditions[] = 'a.usuario_id = :user_id';
            $params[':user_id'] = (int) $filters['user_id'];
        }

        if (!empty($filters['date_from'])) {
            $dateFrom = $this->normalizeDate($filters['date_from'], false);
            if ($dateFrom) {
                $conditions[] = 'a.fecha >= :date_from';
                $params[':date_from'] = $dateFrom;
            }
        }

        if (!empty($filters['date_to'])) {
            $dateTo = $this->normalizeDate($filters['date_to'], true);
            if ($dateTo) {
                $conditions[] = 'a.fecha <= :date_to';
                $params[':date_to'] = $dateTo;
            }
        }

        if (empty($conditions)) {
            return '';
        }

        return ' WHERE ' . implode(' AND ', $conditions);
    }

    private function normalizeDate(string $value, bool $endOfDay): ?string {
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            return null;
        }

        return $endOfDay
            ? date('Y-m-d 23:59:59', $timestamp)
            : date('Y-m-d 00:00:00', $timestamp);
    }

    private function mapLog(array $row): array {
        $changes = null;

        if (!empty($row['cambios'])) {
            $decoded = json_decode($row['cambios'], true);
            $changes = $decoded !== null ? $decoded : $row['cambios'];
        }

        return [
            'id' => (int) $row['id'],
            'usuario_id' => $row['usuario_id'] !== null ? (int) $row['usuario_id'] : null,
            'nombre_usuario' => $row['nombre_usuario'],
            'usuario_email' => $row['usuario_email'],
            'usuario_rol' => $row['usuario_rol'],
            'accion' => $row['accion'],
            'entidad' => $row['entidad'],
            'entidad_id' => $row['entidad_id'],
            'cambios' => $changes,
            'fecha' => $row['fecha'],
        ];
    }
}

