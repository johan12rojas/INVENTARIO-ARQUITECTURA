<?php
/**
 * Configuración de la base de datos
 */

class Database {
    private $host = 'localhost';
    private $db_name = 'inventario';
    private $username = 'root';
    private $password = '';
    private $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            // Log del error real
            error_log("Error de conexión: " . $e->getMessage());
            
            // Respuesta JSON amigable para el frontend
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error de conexión a la base de datos. Por favor verifica la configuración.'
            ]);
            exit;
        }

        return $this->conn;
    }
}
?>

