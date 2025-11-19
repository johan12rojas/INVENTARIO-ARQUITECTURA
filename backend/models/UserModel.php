<?php
/**
 * Modelo de Usuario
 */

require_once __DIR__ . '/../config/database.php';

class UserModel {
    private $conn;
    private $table = 'usuarios';

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    /**
     * Buscar usuario por email
     */
    public function findByEmail($email) {
        $query = "SELECT id, nombre, email, avatar, password, rol, activo, fecha_creacion 
                  FROM " . $this->table . " 
                  WHERE email = :email AND activo = 1
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();

        return $stmt->fetch();
    }

    /**
     * Buscar usuario por ID
     */
    public function findById($id) {
        $query = "SELECT id, nombre, email, avatar, rol, activo, fecha_creacion 
                  FROM " . $this->table . " 
                  WHERE id = :id AND activo = 1
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        return $stmt->fetch();
    }

    /**
     * Crear nuevo usuario
     */
    public function create($dataOrName, $email = null, $password = null) {
        if (is_array($dataOrName)) {
            $data = $dataOrName;
        } else {
            $data = [
                'nombre' => $dataOrName,
                'email' => $email,
                'password' => $password,
                'rol' => 'inventory_manager',
                'activo' => 1,
            ];
        }

        $nombre = trim($data['nombre'] ?? '');
        $correo = strtolower(trim($data['email'] ?? ''));
        $rol = $data['rol'] ?? 'inventory_manager';
        $activo = isset($data['activo']) ? (int)$data['activo'] : 1;
        $plainPassword = $data['password'] ?? null;

        if ($nombre === '' || $correo === '' || !$plainPassword) {
            return false;
        }

        if ($this->emailExists($correo)) {
            return false;
        }

        $hashedPassword = password_hash($plainPassword, PASSWORD_DEFAULT);

        $query = "INSERT INTO " . $this->table . "
                  (nombre, email, password, rol, activo, fecha_creacion, fecha_actualizacion)
                  VALUES (:nombre, :email, :password, :rol, :activo, NOW(), NOW())";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':nombre', $nombre);
        $stmt->bindParam(':email', $correo);
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':rol', $rol);
        $stmt->bindValue(':activo', $activo, PDO::PARAM_INT);

        if ($stmt->execute()) {
            return $this->findByIdWithoutActiveFilter((int)$this->conn->lastInsertId());
        }

        return false;
    }

    /**
     * Verificar contraseña
     */
    public function verifyPassword($password, $hashedPassword) {
        return password_verify($password, $hashedPassword);
    }

    /**
     * Obtener datos del usuario sin contraseña
     */
    public function getUserData($user) {
        unset($user['password']);
        return $user;
    }

    public function findByIdWithoutActiveFilter($id) {
        $query = "SELECT id, nombre, email, avatar, password, rol, activo, fecha_creacion, fecha_actualizacion
                  FROM " . $this->table . "
                  WHERE id = :id
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        return $stmt->fetch();
    }

    /**
     * Obtener listado completo de usuarios
     */
    public function getAll() {
        $query = "SELECT id, nombre, email, avatar, password, rol, activo, fecha_creacion, fecha_actualizacion
                  FROM " . $this->table . "
                  ORDER BY nombre ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getRoles() {
        $query = "SHOW COLUMNS FROM " . $this->table . " LIKE 'rol'";
        $stmt = $this->conn->query($query);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || !isset($row['Type'])) {
            return ['admin', 'inventory_manager', 'buyer', 'auditor'];
        }

        preg_match_all("/'([^']+)'/", $row['Type'], $matches);
        return $matches[1];
    }

    public function update($id, array $data) {
        $fields = [];
        $params = [':id' => $id];

        foreach (['nombre', 'email', 'password', 'rol', 'activo', 'avatar'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $fields[] = 'fecha_actualizacion = NOW()';

        $query = "UPDATE " . $this->table . " SET " . implode(', ', $fields) . " WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);

        foreach ($params as $key => $value) {
            if ($key === ':activo') {
                $stmt->bindValue($key, (int)$value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value);
            }
        }

        return $stmt->execute();
    }

    public function delete($id) {
        $query = "UPDATE " . $this->table . " SET activo = 0, fecha_actualizacion = NOW() WHERE id = :id LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    private function emailExists($email) {
        $query = "SELECT id FROM " . $this->table . " WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $email);
        $stmt->execute();

        return (bool) $stmt->fetchColumn();
    }
}
?>

