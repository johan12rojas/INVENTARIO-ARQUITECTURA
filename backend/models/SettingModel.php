<?php
/**
 * Modelo de Configuraciones
 */

require_once __DIR__ . '/../config/database.php';

class SettingModel {
    private $conn;
    private $table = 'configuraciones';

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function getAll(): array {
        $query = "SELECT clave, valor FROM {$this->table}";
        $stmt = $this->conn->query($query);
        $settings = [];

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['clave']] = json_decode($row['valor'], true);
        }

        return $settings;
    }

    public function getByKey(string $key): ?array {
        $query = "SELECT valor FROM {$this->table} WHERE clave = :clave LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':clave', $key);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        return json_decode($row['valor'], true);
    }

    public function update(string $key, array $value): bool {
        $query = "UPDATE {$this->table}
                  SET valor = :valor, fecha_actualizacion = NOW()
                  WHERE clave = :clave";
        $stmt = $this->conn->prepare($query);
        $jsonValue = json_encode($value, JSON_UNESCAPED_UNICODE);
        $stmt->bindParam(':valor', $jsonValue);
        $stmt->bindParam(':clave', $key);

        return $stmt->execute();
    }

    public function updateMany(array $data): bool {
        $this->conn->beginTransaction();

        try {
            foreach ($data as $key => $value) {
                $this->update($key, $value);
            }
            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollBack();
            throw $e;
        }
    }
}




