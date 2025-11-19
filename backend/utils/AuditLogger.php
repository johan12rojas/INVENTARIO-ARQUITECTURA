<?php
/**
 * Utilidad para registrar auditorías
 */

require_once __DIR__ . '/../models/AuditModel.php';

class AuditLogger {
    private static $model;

    private static function getModel(): AuditModel {
        if (!self::$model) {
            self::$model = new AuditModel();
        }

        return self::$model;
    }

    public static function log(string $accion, string $entidad, $entidadId = null, $changes = null, array $context = []): void {
        $userContext = self::resolveUserContext($context);

        $payload = [
            'usuario_id' => $userContext['id'],
            'nombre_usuario' => $userContext['name'],
            'accion' => $accion,
            'entidad' => $entidad,
            'entidad_id' => $entidadId !== null ? (string) $entidadId : null,
            'cambios' => self::encodeChanges($changes),
        ];

        try {
            self::getModel()->create($payload);
        } catch (Exception $e) {
            error_log('AuditLogger error: ' . $e->getMessage());
        }
    }

    public static function filterFields(?array $data, array $fields): array {
        if (!$data) {
            return [];
        }

        $filtered = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $filtered[$field] = $data[$field];
            }
        }

        return $filtered;
    }

    private static function encodeChanges($changes): ?string {
        if ($changes === null || $changes === '') {
            return null;
        }

        if (is_string($changes)) {
            return $changes;
        }

        $encoded = json_encode($changes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            return null;
        }

        return $encoded;
    }

    private static function resolveUserContext(array $context): array {
        if (isset($context['user_id']) || isset($context['nombre_usuario'])) {
            return [
                'id' => isset($context['user_id']) ? (int) $context['user_id'] : null,
                'name' => $context['nombre_usuario'] ?? 'Sistema',
            ];
        }

        if (session_status() === PHP_SESSION_NONE) {
            @session_start();
        }

        return [
            'id' => isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null,
            'name' => $_SESSION['user_name'] ?? $_SESSION['user_email'] ?? 'Sistema',
        ];
    }
}

