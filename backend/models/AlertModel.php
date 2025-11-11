<?php
/**
 * Modelo para alertas del sistema
 */

require_once __DIR__ . '/../config/database.php';

class AlertModel {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function getAlerts(array $filters = []) {
        $query = "SELECT
                    a.id,
                    a.tipo,
                    a.titulo,
                    a.mensaje,
                    a.producto_id,
                    a.severidad,
                    a.leida,
                    a.fecha_creacion,
                    p.nombre AS producto_nombre,
                    p.sku AS producto_sku,
                    p.stock,
                    p.stock_minimo,
                    p.activo AS producto_activo
                  FROM alertas a
                  LEFT JOIN productos p ON p.id = a.producto_id
                  WHERE 1 = 1";

        $params = [];

        if (!empty($filters['status'])) {
            if ($filters['status'] === 'unread') {
                $query .= " AND a.leida = 0";
            } elseif ($filters['status'] === 'read') {
                $query .= " AND a.leida = 1";
            }
        }

        if (!empty($filters['priority']) && $filters['priority'] === 'high') {
            $query .= " AND a.severidad = 'high'";
        }

        if (!empty($filters['type'])) {
            $query .= " AND a.tipo = :tipo";
            $params[':tipo'] = $filters['type'];
        }

        $query .= " ORDER BY a.fecha_creacion DESC";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $alerts = [];
        foreach ($rows as $row) {
            if ($row['tipo'] === 'low_stock') {
                $productActive = $row['producto_activo'] !== null ? (int) $row['producto_activo'] : null;
                if ($productActive === 0) {
                    continue;
                }

                $productStock = $row['stock'] !== null ? (int) $row['stock'] : null;
                $productMin = $row['stock_minimo'] !== null ? (int) $row['stock_minimo'] : null;
                if ($productStock !== null && $productMin !== null && $productStock >= $productMin) {
                    continue;
                }
            }

            $alerts[] = [
                'id' => (int) $row['id'],
                'tipo' => $row['tipo'],
                'titulo' => $this->normalizeText($row['titulo']),
                'mensaje' => $this->normalizeText($row['mensaje']),
                'producto' => [
                    'id' => $row['producto_id'] !== null ? (int) $row['producto_id'] : null,
                    'nombre' => $this->normalizeText($row['producto_nombre']),
                    'sku' => $row['producto_sku'],
                    'stock' => $row['stock'] !== null ? (int) $row['stock'] : null,
                    'stock_minimo' => $row['stock_minimo'] !== null ? (int) $row['stock_minimo'] : null,
                    'activo' => $row['producto_activo'] !== null ? (int) $row['producto_activo'] : null,
                ],
                'severidad' => $row['severidad'],
                'leida' => (bool) $row['leida'],
                'fecha_creacion' => $row['fecha_creacion'],
            ];
        }

        return $alerts;
    }

    public function getSummary() {
        $stmt = $this->conn->prepare("
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) AS unread,
                SUM(CASE WHEN severidad = 'high' THEN 1 ELSE 0 END) AS high_priority_total
            FROM alertas
        ");
        $stmt->execute();
        $row = $stmt->fetch();

        return [
            'total' => (int) ($row['total'] ?? 0),
            'unread' => (int) ($row['unread'] ?? 0),
            'high_priority' => (int) ($row['high_priority_total'] ?? 0),
        ];
    }

    public function markAsRead(int $id) {
        $stmt = $this->conn->prepare("UPDATE alertas SET leida = 1 WHERE id = :id");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    public function delete(int $id) {
        $stmt = $this->conn->prepare("DELETE FROM alertas WHERE id = :id");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
    private function normalizeText($value) {
        if ($value === null) {
            return null;
        }

        if (strpos($value, '├') !== false || strpos($value, 'Ã') !== false) {
            $map = [
                '├í' => 'á',
                '├¡' => 'í',
                '├│' => 'ó',
            ];
            $value = str_replace(array_keys($map), array_values($map), $value);
        }

        return $value;
    }
}
