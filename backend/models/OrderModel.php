<?php
/**
 * Modelo de pedidos
 */

require_once __DIR__ . '/../config/database.php';

class OrderModel {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function getOrders(array $filters = []) {
        $query = "SELECT
                    o.id,
                    o.numero_pedido,
                    o.estado,
                    o.monto_total,
                    o.fecha_entrega_estimada,
                    o.notas,
                    o.fecha_creacion,
                    o.fecha_actualizacion,
                    prov.id AS proveedor_id,
                    prov.nombre AS proveedor_nombre,
                    prov.contacto AS proveedor_contacto,
                    u.id AS creado_por_id,
                    u.nombre AS creado_por_nombre,
                    COUNT(pp.id) AS total_productos
                  FROM pedidos o
                  LEFT JOIN proveedores prov ON prov.id = o.proveedor_id
                  LEFT JOIN usuarios u ON u.id = o.creado_por
                  LEFT JOIN pedido_productos pp ON pp.pedido_id = o.id
                  WHERE 1 = 1";

        $params = [];

        if (!empty($filters['search'])) {
            $query .= " AND (
                o.numero_pedido LIKE :search OR
                prov.nombre LIKE :search OR
                u.nombre LIKE :search
            )";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($filters['status'])) {
            $allowed = ['pendiente', 'enviado', 'en_transito', 'entregado', 'cancelado', 'confirmado'];
            if (in_array($filters['status'], $allowed, true)) {
                $query .= " AND o.estado = :status";
                $params[':status'] = $filters['status'];
            }
        }

        $query .= " GROUP BY
                        o.id,
                        prov.id,
                        prov.nombre,
                        prov.contacto,
                        u.id,
                        u.nombre
                    ORDER BY o.fecha_creacion DESC";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        return array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'numero_pedido' => $row['numero_pedido'],
                'estado' => $row['estado'],
                'monto_total' => (float) $row['monto_total'],
                'fecha_entrega_estimada' => $row['fecha_entrega_estimada'],
                'notas' => $row['notas'],
                'fecha_creacion' => $row['fecha_creacion'],
                'fecha_actualizacion' => $row['fecha_actualizacion'],
                'proveedor' => [
                    'id' => $row['proveedor_id'] !== null ? (int) $row['proveedor_id'] : null,
                    'nombre' => $row['proveedor_nombre'],
                    'contacto' => $row['proveedor_contacto'],
                ],
                'creado_por' => [
                    'id' => $row['creado_por_id'] !== null ? (int) $row['creado_por_id'] : null,
                    'nombre' => $row['creado_por_nombre'],
                ],
                'total_productos' => (int) $row['total_productos'],
            ];
        }, $stmt->fetchAll());
    }

    public function getSummary() {
        $default = [
            'pendiente' => 0,
            'confirmado' => 0,
            'enviado' => 0,
            'en_transito' => 0,
            'entregado' => 0,
            'cancelado' => 0,
        ];

        $stmt = $this->conn->prepare("SELECT estado, COUNT(*) AS total FROM pedidos GROUP BY estado");
        $stmt->execute();
        $rows = $stmt->fetchAll();

        foreach ($rows as $row) {
            $estado = $row['estado'];
            if (!array_key_exists($estado, $default)) {
                $default[$estado] = 0;
            }
            $default[$estado] = (int) $row['total'];
        }

        return $default;
    }

    public function getProviders() {
        $stmt = $this->conn->prepare("SELECT id, nombre FROM proveedores WHERE activo = 1 ORDER BY nombre");
        $stmt->execute();
        return array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'nombre' => $row['nombre'],
            ];
        }, $stmt->fetchAll());
    }

    public function getProducts() {
        $stmt = $this->conn->prepare("SELECT id, nombre, sku, precio, stock FROM productos WHERE activo = 1 ORDER BY nombre");
        $stmt->execute();
        return array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'nombre' => $row['nombre'],
                'sku' => $row['sku'],
                'precio' => (float) $row['precio'],
                'stock' => (int) $row['stock'],
            ];
        }, $stmt->fetchAll());
    }

    public function getUsers() {
        $stmt = $this->conn->prepare("SELECT id, nombre FROM usuarios WHERE activo = 1 ORDER BY nombre");
        $stmt->execute();
        return array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'nombre' => $row['nombre'],
            ];
        }, $stmt->fetchAll());
    }

    public function create(array $data) {
        try {
            $this->conn->beginTransaction();

            $products = $data['productos'];
            if (empty($products)) {
                throw new Exception('Debes agregar productos al pedido');
            }
            $productIds = array_column($products, 'producto_id');
            if (empty($productIds)) {
                throw new Exception('Identificadores de producto inválidos');
            }
            $placeholders = implode(',', array_fill(0, count($productIds), '?'));

            $productStmt = $this->conn->prepare("SELECT id, precio FROM productos WHERE id IN ($placeholders)");
            foreach ($productIds as $index => $id) {
                $productStmt->bindValue($index + 1, $id, PDO::PARAM_INT);
            }
            $productStmt->execute();
            $productRows = $productStmt->fetchAll(PDO::FETCH_KEY_PAIR); // id => precio

            $montoTotal = 0;
            $detalle = [];
            foreach ($products as $item) {
                $productId = (int) $item['producto_id'];
                $cantidad = (int) $item['cantidad'];
                if (!isset($productRows[$productId])) {
                    throw new Exception('Producto no encontrado para el pedido');
                }
                $precioUnitario = (float) $productRows[$productId];
                $subtotal = $precioUnitario * $cantidad;
                $montoTotal += $subtotal;

                $detalle[] = [
                    'producto_id' => $productId,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal' => $subtotal,
                ];
            }

            $orderStmt = $this->conn->prepare("
                INSERT INTO pedidos
                    (numero_pedido, proveedor_id, estado, monto_total, fecha_entrega_estimada, notas, creado_por)
                VALUES
                    (:numero_pedido, :proveedor_id, :estado, :monto_total, :fecha_entrega_estimada, :notas, :creado_por)
            ");

            $orderStmt->bindValue(':numero_pedido', $data['numero_pedido']);
            $orderStmt->bindValue(':proveedor_id', $data['proveedor_id'], PDO::PARAM_INT);
            $orderStmt->bindValue(':estado', $data['estado']);
            $orderStmt->bindValue(':monto_total', $montoTotal);
            $orderStmt->bindValue(':fecha_entrega_estimada', $data['fecha_entrega_estimada']);
            $orderStmt->bindValue(':notas', $data['notas']);
            if ($data['creado_por'] !== null) {
                $orderStmt->bindValue(':creado_por', $data['creado_por'], PDO::PARAM_INT);
            } else {
                $orderStmt->bindValue(':creado_por', null, PDO::PARAM_NULL);
            }
            $orderStmt->execute();

            $orderId = (int) $this->conn->lastInsertId();

            $detailStmt = $this->conn->prepare("
                INSERT INTO pedido_productos
                    (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES
                    (:pedido_id, :producto_id, :cantidad, :precio_unitario, :subtotal)
            ");

            foreach ($detalle as $item) {
                $detailStmt->bindValue(':pedido_id', $orderId, PDO::PARAM_INT);
                $detailStmt->bindValue(':producto_id', $item['producto_id'], PDO::PARAM_INT);
                $detailStmt->bindValue(':cantidad', $item['cantidad'], PDO::PARAM_INT);
                $detailStmt->bindValue(':precio_unitario', $item['precio_unitario']);
                $detailStmt->bindValue(':subtotal', $item['subtotal']);
                $detailStmt->execute();
            }

            $this->conn->commit();

            return $orderId;
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }

    public function updateStatus(int $orderId, string $status) {
        $stmt = $this->conn->prepare("
            UPDATE pedidos
            SET estado = :estado,
                fecha_actualizacion = NOW()
            WHERE id = :id
        ");
        $stmt->bindValue(':estado', $status);
        $stmt->bindValue(':id', $orderId, PDO::PARAM_INT);
        return $stmt->execute();
    }

    public function delete(int $orderId) {
        try {
            $this->conn->beginTransaction();

            $this->conn->prepare("DELETE FROM pedido_productos WHERE pedido_id = :id")
                ->execute([':id' => $orderId]);

            $this->conn->prepare("DELETE FROM pedidos WHERE id = :id")
                ->execute([':id' => $orderId]);

            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
}


