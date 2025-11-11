<?php
/**
 * Modelo de Productos
 */

require_once __DIR__ . '/../config/database.php';

class ProductModel {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    /**
     * Obtener listado de productos con filtros opcionales
     */
    public function getProducts(array $filters = []) {
        $query = "SELECT
                    p.id,
                    p.sku,
                    p.nombre,
                    p.descripcion,
                    p.categoria_id,
                    p.proveedor_id,
                    p.stock,
                    p.stock_minimo,
                    p.precio,
                    p.activo,
                    c.nombre AS categoria_nombre,
                    pr.nombre AS proveedor_nombre
                  FROM productos p
                  LEFT JOIN categorias c ON c.id = p.categoria_id
                  LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
                  WHERE 1 = 1";

        $params = [];

        if (!empty($filters['search'])) {
            $query .= " AND (p.nombre LIKE :search OR p.sku LIKE :search)";
            $search = '%' . $filters['search'] . '%';
            $params[':search'] = $search;
        }

        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $query .= " AND p.categoria_id = :category";
        }

        if (!empty($filters['status'])) {
            if ($filters['status'] === 'low_stock') {
                $query .= " AND p.stock < p.stock_minimo";
            } elseif ($filters['status'] === 'normal') {
                $query .= " AND p.stock >= p.stock_minimo";
            } elseif ($filters['status'] === 'active') {
                $query .= " AND p.activo = 1";
            } elseif ($filters['status'] === 'inactive') {
                $query .= " AND p.activo = 0";
            }
        }

        $query .= " ORDER BY p.nombre ASC";

        $stmt = $this->conn->prepare($query);

        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $params[':category'] = (int) $filters['category'];
        }

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        $rows = $stmt->fetchAll();

        $products = [];

        foreach ($rows as $row) {
            $isLowStock = (int) $row['stock'] < (int) $row['stock_minimo'];

            $products[] = [
                'id' => (int) $row['id'],
                'sku' => $row['sku'],
                'nombre' => $row['nombre'],
                'descripcion' => $row['descripcion'],
                'categoria' => $row['categoria_nombre'] ?? 'Sin categoría',
                'categoria_id' => $row['categoria_id'] ? (int) $row['categoria_id'] : null,
                'proveedor' => $row['proveedor_nombre'] ?? 'Sin proveedor',
                'proveedor_id' => $row['proveedor_id'] ? (int) $row['proveedor_id'] : null,
                'stock' => (int) $row['stock'],
                'stock_minimo' => (int) $row['stock_minimo'],
                'precio' => (float) $row['precio'],
                'estado' => $isLowStock ? 'low' : 'normal',
                'activo' => (int) $row['activo']
            ];
        }

        return $products;
    }

    /**
     * Obtener estadísticas resumidas
     */
    public function getSummary(array $filters = []) {
        $query = "SELECT
                    COUNT(*) AS total_productos,
                    COALESCE(SUM(p.stock), 0) AS stock_total,
                    COALESCE(SUM(p.stock * p.precio), 0) AS valor_total,
                  SUM(CASE WHEN p.stock < p.stock_minimo THEN 1 ELSE 0 END) AS productos_stock_bajo
                  FROM productos p
                  WHERE 1 = 1";

        $params = [];

        if (!empty($filters['search'])) {
            $query .= " AND (p.nombre LIKE :search OR p.sku LIKE :search)";
            $search = '%' . $filters['search'] . '%';
            $params[':search'] = $search;
        }

        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $query .= " AND p.categoria_id = :category";
            $params[':category'] = (int) $filters['category'];
        }

        if (!empty($filters['status'])) {
            if ($filters['status'] === 'low_stock') {
                $query .= " AND p.stock < p.stock_minimo";
            } elseif ($filters['status'] === 'normal') {
                $query .= " AND p.stock >= p.stock_minimo";
            } elseif ($filters['status'] === 'active') {
                $query .= " AND p.activo = 1";
            } elseif ($filters['status'] === 'inactive') {
                $query .= " AND p.activo = 0";
            }
        }

        $stmt = $this->conn->prepare($query);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        $result = $stmt->fetch();

        return [
            'total_products' => (int) ($result['total_productos'] ?? 0),
            'stock_total' => (int) ($result['stock_total'] ?? 0),
            'valor_total' => (float) ($result['valor_total'] ?? 0),
            'low_stock' => (int) ($result['productos_stock_bajo'] ?? 0)
        ];
    }

    public function getCategories() {
        $query = "SELECT id, nombre FROM categorias ORDER BY nombre";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getSuppliers() {
        $query = "SELECT id, nombre FROM proveedores ORDER BY nombre";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function createProduct(array $data) {
        $query = "INSERT INTO productos
                    (sku, nombre, descripcion, categoria_id, proveedor_id, stock, stock_minimo, precio, activo)
                  VALUES
                    (:sku, :nombre, :descripcion, :categoria_id, :proveedor_id, :stock, :stock_minimo, :precio, :activo)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':sku', $data['sku']);
        $stmt->bindValue(':nombre', $data['nombre']);
        $stmt->bindValue(':descripcion', $data['descripcion']);
        $stmt->bindValue(':categoria_id', $data['categoria_id'] ?: null, PDO::PARAM_INT);
        $stmt->bindValue(':proveedor_id', $data['proveedor_id'] ?: null, PDO::PARAM_INT);
        $stmt->bindValue(':stock', $data['stock'], PDO::PARAM_INT);
        $stmt->bindValue(':stock_minimo', $data['stock_minimo'], PDO::PARAM_INT);
        $stmt->bindValue(':precio', $data['precio']);
        $stmt->bindValue(':activo', $data['activo'], PDO::PARAM_INT);

        $stmt->execute();
        return $this->conn->lastInsertId();
    }

    public function updateProduct(int $id, array $data) {
        $query = "UPDATE productos SET
                    sku = :sku,
                    nombre = :nombre,
                    descripcion = :descripcion,
                    categoria_id = :categoria_id,
                    proveedor_id = :proveedor_id,
                    stock = :stock,
                    stock_minimo = :stock_minimo,
                    precio = :precio,
                    activo = :activo
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':sku', $data['sku']);
        $stmt->bindValue(':nombre', $data['nombre']);
        $stmt->bindValue(':descripcion', $data['descripcion']);
        $stmt->bindValue(':categoria_id', $data['categoria_id'] ?: null, PDO::PARAM_INT);
        $stmt->bindValue(':proveedor_id', $data['proveedor_id'] ?: null, PDO::PARAM_INT);
        $stmt->bindValue(':stock', $data['stock'], PDO::PARAM_INT);
        $stmt->bindValue(':stock_minimo', $data['stock_minimo'], PDO::PARAM_INT);
        $stmt->bindValue(':precio', $data['precio']);
        $stmt->bindValue(':activo', $data['activo'], PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);

        return $stmt->execute();
    }

    public function softDeleteProduct(int $id) {
        $query = "UPDATE productos SET activo = 0 WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    public function findById(int $id) {
        $query = "SELECT * FROM productos WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function findBySku(string $sku) {
        $query = "SELECT * FROM productos WHERE sku = :sku LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':sku', $sku);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function upsertBySku(array $data) {
        $existing = $this->findBySku($data['sku']);

        if ($existing) {
            return $this->updateProduct((int) $existing['id'], $data);
        }

        return $this->createProduct($data);
    }
}


