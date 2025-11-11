<?php
/**
 * Script de prueba para verificar la conexión a la base de datos
 * Eliminar este archivo en producción
 */

require_once __DIR__ . '/config/database.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if ($conn) {
        echo json_encode([
            'success' => true,
            'message' => 'Conexión a la base de datos exitosa',
            'database' => 'inventario'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'No se pudo establecer la conexión'
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>

