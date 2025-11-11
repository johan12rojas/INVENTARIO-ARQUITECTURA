<?php
/**
 * Modelo de Proveedores
 */

require_once __DIR__ . '/../config/database.php';

class SupplierModel {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function getSuppliers(array $filters = []) {
        $query = "SELECT
                    id,
                    nombre,
                    contacto,
                    email,
                    telefono,
                    direccion,
                    productos_suministrados,
                    total_pedidos,
                    activo
                  FROM proveedores
                  WHERE 1 = 1";

        $params = [];

        if (!empty($filters['search'])) {
            $query .= " AND (nombre LIKE :search OR contacto LIKE :search OR email LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($filters['status'])) {
            if ($filters['status'] === 'active') {
                $query .= " AND activo = 1";
            } elseif ($filters['status'] === 'inactive') {
                $query .= " AND activo = 0";
            }
        }

        $query .= " ORDER BY nombre ASC";

        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        return array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'nombre' => $row['nombre'],
                'contacto' => $row['contacto'],
                'email' => $row['email'],
                'telefono' => $row['telefono'],
                'direccion' => $row['direccion'],
                'productos_suministrados' => (int) $row['productos_suministrados'],
                'total_pedidos' => (int) $row['total_pedidos'],
                'activo' => (int) $row['activo'],
            ];
        }, $stmt->fetchAll());
    }

    public function getSummary() {
        $query = "SELECT
                    COUNT(*) AS total_proveedores,
                    COALESCE(SUM(productos_suministrados), 0) AS productos_totales,
                    COALESCE(SUM(total_pedidos), 0) AS pedidos_totales
                  FROM proveedores";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $row = $stmt->fetch();

        return [
            'total_proveedores' => (int) ($row['total_proveedores'] ?? 0),
            'productos_totales' => (int) ($row['productos_totales'] ?? 0),
            'pedidos_totales' => (int) ($row['pedidos_totales'] ?? 0),
        ];
    }

    public function findById(int $id) {
        $stmt = $this->conn->prepare("SELECT * FROM proveedores WHERE id = :id LIMIT 1");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function findByEmail(string $email) {
        $stmt = $this->conn->prepare("SELECT * FROM proveedores WHERE email = :email LIMIT 1");
        $stmt->bindValue(':email', $email);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function create(array $data) {
        $query = "INSERT INTO proveedores
            (nombre, contacto, email, telefono, direccion, productos_suministrados, total_pedidos, activo)
            VALUES
            (:nombre, :contacto, :email, :telefono, :direccion, :productos_suministrados, :total_pedidos, :activo)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':nombre', $data['nombre']);
        $stmt->bindValue(':contacto', $data['contacto']);
        $stmt->bindValue(':email', $data['email']);
        $stmt->bindValue(':telefono', $data['telefono']);
        $stmt->bindValue(':direccion', $data['direccion']);
        $stmt->bindValue(':productos_suministrados', $data['productos_suministrados'], PDO::PARAM_INT);
        $stmt->bindValue(':total_pedidos', $data['total_pedidos'], PDO::PARAM_INT);
        $stmt->bindValue(':activo', $data['activo'], PDO::PARAM_INT);
        $stmt->execute();
        return $this->conn->lastInsertId();
    }

    public function update(int $id, array $data) {
        $query = "UPDATE proveedores SET
                    nombre = :nombre,
                    contacto = :contacto,
                    email = :email,
                    telefono = :telefono,
                    direccion = :direccion,
                    productos_suministrados = :productos_suministrados,
                    total_pedidos = :total_pedidos,
                    activo = :activo
                  WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':nombre', $data['nombre']);
        $stmt->bindValue(':contacto', $data['contacto']);
        $stmt->bindValue(':email', $data['email']);
        $stmt->bindValue(':telefono', $data['telefono']);
        $stmt->bindValue(':direccion', $data['direccion']);
        $stmt->bindValue(':productos_suministrados', $data['productos_suministrados'], PDO::PARAM_INT);
        $stmt->bindValue(':total_pedidos', $data['total_pedidos'], PDO::PARAM_INT);
        $stmt->bindValue(':activo', $data['activo'], PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    public function softDelete(int $id) {
        $stmt = $this->conn->prepare("UPDATE proveedores SET activo = 0 WHERE id = :id");
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}


