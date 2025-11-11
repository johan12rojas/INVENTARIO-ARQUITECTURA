<?php
/**
 * Utilidad para respuestas JSON estandarizadas
 */

class Response {
    public static function success($data = null, $message = 'Operación exitosa', $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        
        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error($message = 'Error en la operación', $statusCode = 400, $errors = null) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        
        $response = [
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
?>

