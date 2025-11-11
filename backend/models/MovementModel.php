<?php
/**
 * Modelo de Movimientos de Inventario
 */

require_once __DIR__ . '/../config/database.php';

class MovementModel {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function getMovements(array $filters = []) {
        $query = "SELECT
                    m.id,
                    m.tipo,
                    m.producto_id,
                    m.cantidad,
                    m.responsable_id,
                    m.referencia,
                    m.notas,
                    m.fecha_movimiento,
                    p.nombre AS producto_nombre,
                    p.sku AS producto_sku,
                    p.stock AS producto_stock,
                    u.nombre AS responsable_nombre
                  FROM movimientos m
                  LEFT JOIN productos p ON p.id = m.producto_id
                  LEFT JOIN usuarios u ON u.id = m.responsable_id
                  WHERE 1 = 1";

        $params = [];

        if (!empty($filters['search'])) {
            $query .= " AND (
                p.nombre LIKE :search OR
                p.sku LIKE :search OR
                m.referencia LIKE :search OR
                m.notas LIKE :search
            )";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($filters['type']) && in_array($filters['type'], ['entry', 'exit'], true)) {
            $query .= " AND m.tipo = :type";
            $params[':type'] = $filters['type'];
        }

        $query .= " ORDER BY m.fecha_movimiento DESC";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        return array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'tipo' => $row['tipo'],
                'producto_id' => (int) $row['producto_id'],
                'producto_nombre' => $row['producto_nombre'] ?? 'Producto eliminado',
                'producto_sku' => $row['producto_sku'],
                'producto_stock' => isset($row['producto_stock']) ? (int) $row['producto_stock'] : null,
                'cantidad' => (int) $row['cantidad'],
                'responsable_id' => $row['responsable_id'] !== null ? (int) $row['responsable_id'] : null,
                'responsable_nombre' => $row['responsable_nombre'],
                'referencia' => $row['referencia'],
                'notas' => $row['notas'],
                'fecha_movimiento' => $row['fecha_movimiento'],
            ];
        }, $stmt->fetchAll());
    }

    public function getSummary(array $filters = []) {
        $query = "SELECT
                    COALESCE(SUM(CASE WHEN m.tipo = 'entry' THEN m.cantidad ELSE 0 END), 0) AS total_entries,
                    COALESCE(SUM(CASE WHEN m.tipo = 'exit' THEN m.cantidad ELSE 0 END), 0) AS total_exits
                  FROM movimientos m
                  LEFT JOIN productos p ON p.id = m.producto_id
                  WHERE 1 = 1";

        $params = [];

        if (!empty($filters['search'])) {
            $query .= " AND (
                m.referencia LIKE :search OR
                m.notas LIKE :search OR
                p.nombre LIKE :search OR
                p.sku LIKE :search
            )";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($filters['type']) && in_array($filters['type'], ['entry', 'exit'], true)) {
            $query .= " AND m.tipo = :type";
            $params[':type'] = $filters['type'];
        }

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        $row = $stmt->fetch();

        $entries = (int) ($row['total_entries'] ?? 0);
        $exits = (int) ($row['total_exits'] ?? 0);

        return [
            'total_entries' => $entries,
            'total_exits' => $exits,
            'balance' => $entries - $exits,
        ];
    }

    public function registerMovement(array $data) {
        try {
            $this->conn->beginTransaction();

            // Obtener producto y stock actual
            $productStmt = $this->conn->prepare("SELECT id, stock, activo FROM productos WHERE id = :id LIMIT 1");
            $productStmt->bindValue(':id', $data['producto_id'], PDO::PARAM_INT);
            $productStmt->execute();
            $product = $productStmt->fetch();

            if (!$product) {
                throw new Exception('Producto no encontrado');
            }

            $currentStock = (int) $product['stock'];
            $quantity = (int) $data['cantidad'];
            $newStock = $currentStock;

            if ($data['tipo'] === 'entry') {
                $newStock = $currentStock + $quantity;
            } else {
                if ($currentStock < $quantity) {
                    throw new Exception('Stock insuficiente para registrar la salida');
                }
                $newStock = $currentStock - $quantity;
            }

            // Insertar movimiento
            $movementStmt = $this->conn->prepare("
                INSERT INTO movimientos
                    (tipo, producto_id, cantidad, responsable_id, referencia, notas, fecha_movimiento)
                VALUES
                    (:tipo, :producto_id, :cantidad, :responsable_id, :referencia, :notas, :fecha_movimiento)
            ");

            $movementStmt->bindValue(':tipo', $data['tipo']);
            $movementStmt->bindValue(':producto_id', $data['producto_id'], PDO::PARAM_INT);
            $movementStmt->bindValue(':cantidad', $quantity, PDO::PARAM_INT);
            if ($data['responsable_id'] !== null) {
                $movementStmt->bindValue(':responsable_id', $data['responsable_id'], PDO::PARAM_INT);
            } else {
                $movementStmt->bindValue(':responsable_id', null, PDO::PARAM_NULL);
            }
            $movementStmt->bindValue(':referencia', $data['referencia']);
            $movementStmt->bindValue(':notas', $data['notas']);
            $movementStmt->bindValue(':fecha_movimiento', $data['fecha_movimiento']);
            $movementStmt->execute();

            $movementId = (int) $this->conn->lastInsertId();

            // Actualizar stock
            $stockStmt = $this->conn->prepare("
                UPDATE productos
                SET stock = :stock, fecha_actualizacion = NOW()
                WHERE id = :id
            ");
            $stockStmt->bindValue(':stock', $newStock, PDO::PARAM_INT);
            $stockStmt->bindValue(':id', $data['producto_id'], PDO::PARAM_INT);
            $stockStmt->execute();

            $this->conn->commit();

            return [
                'movement_id' => $movementId,
                'new_stock' => $newStock,
            ];
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    public function deleteMovement(int $movementId) {
        try {
            $this->conn->beginTransaction();

            $stmt = $this->conn->prepare("
                SELECT tipo, producto_id, cantidad
                FROM movimientos
                WHERE id = :id
                LIMIT 1
            ");
            $stmt->bindValue(':id', $movementId, PDO::PARAM_INT);
            $stmt->execute();
            $movement = $stmt->fetch();

            if (!$movement) {
                throw new Exception('Movimiento no encontrado');
            }

            $productStmt = $this->conn->prepare("SELECT stock FROM productos WHERE id = :id LIMIT 1");
            $productStmt->bindValue(':id', $movement['producto_id'], PDO::PARAM_INT);
            $productStmt->execute();
            $product = $productStmt->fetch();

            if (!$product) {
                throw new Exception('Producto asociado no encontrado');
            }

            $currentStock = (int) $product['stock'];
            $quantity = (int) $movement['cantidad'];
            $newStock = $currentStock;

            if ($movement['tipo'] === 'entry') {
                if ($currentStock < $quantity) {
                    throw new Exception('No se puede eliminar el movimiento porque deja el stock en negativo');
                }
                $newStock = $currentStock - $quantity;
            } else {
                $newStock = $currentStock + $quantity;
            }

            $deleteStmt = $this->conn->prepare("DELETE FROM movimientos WHERE id = :id");
            $deleteStmt->bindValue(':id', $movementId, PDO::PARAM_INT);
            $deleteStmt->execute();

            $updateStmt = $this->conn->prepare("
                UPDATE productos
                SET stock = :stock, fecha_actualizacion = NOW()
                WHERE id = :id
            ");
            $updateStmt->bindValue(':stock', $newStock, PDO::PARAM_INT);
            $updateStmt->bindValue(':id', $movement['producto_id'], PDO::PARAM_INT);
            $updateStmt->execute();

            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    public function getProductOptions() {
        $query = "SELECT id, sku, nombre, stock, activo FROM productos ORDER BY nombre";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'sku' => $row['sku'],
                'nombre' => $row['nombre'],
                'stock' => (int) $row['stock'],
                'activo' => (int) $row['activo'],
            ];
        }, $stmt->fetchAll());
    }

    public function getResponsableOptions() {
        $query = "SELECT id, nombre FROM usuarios WHERE activo = 1 ORDER BY nombre";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'nombre' => $row['nombre'],
            ];
        }, $stmt->fetchAll());
    }
}


