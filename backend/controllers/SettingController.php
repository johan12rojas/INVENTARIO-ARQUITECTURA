<?php
/**
 * Controlador de Configuraciones
 */

require_once __DIR__ . '/../models/SettingModel.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/AuditLogger.php';

class SettingController {
    private $settingModel;
    private $allowedSections = ['general', 'branding', 'notificaciones', 'seguridad'];

    public function __construct() {
        $this->settingModel = new SettingModel();
    }

    public function index() {
        try {
            $settings = $this->settingModel->getAll();
            Response::success(['settings' => $settings], 'Configuraciones del sistema');
        } catch (Exception $e) {
            Response::error('Error al obtener configuraciones: ' . $e->getMessage(), 500);
        }
    }

    public function update($section) {
        if (!in_array($section, $this->allowedSections, true)) {
            Response::error('Sección de configuración no válida', 404);
        }

        $method = $_SERVER['REQUEST_METHOD'];
        if (!in_array($method, ['PUT', 'PATCH'], true)) {
            Response::error('Método no permitido', 405);
        }

        $payload = json_decode(file_get_contents('php://input'), true);
        if (!$payload || !is_array($payload)) {
            Response::error('Datos de configuración inválidos', 400);
        }
        $previous = $this->settingModel->getByKey($section);
        $sanitized = $this->sanitizeSection($section, $payload);
        $this->settingModel->update($section, $sanitized);

        AuditLogger::log('Actualización de configuración', 'Configuración', $section, [
            'antes' => $previous,
            'despues' => $sanitized,
        ]);

        Response::success([
            'section' => $section,
            'values' => $sanitized
        ], 'Configuración actualizada');
    }

    private function sanitizeSection(string $section, array $data): array {
        switch ($section) {
            case 'general':
                return [
                    'nombre_empresa' => trim($data['nombre_empresa'] ?? 'Sistema de Inventarios'),
                    'correo_soporte' => trim($data['correo_soporte'] ?? 'soporte@inventarios.com'),
                    'telefono' => trim($data['telefono'] ?? ''),
                    'moneda' => strtoupper($data['moneda'] ?? 'USD'),
                    'zona_horaria' => trim($data['zona_horaria'] ?? 'UTC'),
                    'formato_fecha' => $data['formato_fecha'] ?? 'DD/MM/YYYY',
                ];
            case 'branding':
                return [
                    'tema' => $data['tema'] ?? 'verde',
                    'color_primario' => $this->sanitizeColor($data['color_primario'] ?? '#239C56'),
                    'color_secundario' => $this->sanitizeColor($data['color_secundario'] ?? '#1B7B43'),
                    'logo_url' => trim($data['logo_url'] ?? '/imgs/gestoricon.webp'),
                    'favicon_url' => trim($data['favicon_url'] ?? '/imgs/gestoricon.webp'),
                ];
            case 'notificaciones':
                return [
                    'correo_alertas' => (bool) ($data['correo_alertas'] ?? true),
                    'notificaciones_push' => (bool) ($data['notificaciones_push'] ?? false),
                    'resumen_diario' => (bool) ($data['resumen_diario'] ?? true),
                    'umbral_stock' => max(0, (int) ($data['umbral_stock'] ?? 20)),
                    'recordatorio_pedidos' => (bool) ($data['recordatorio_pedidos'] ?? true),
                ];
            case 'seguridad':
                return [
                    'two_factor' => (bool) ($data['two_factor'] ?? false),
                    'expiracion_sesion' => max(5, (int) ($data['expiracion_sesion'] ?? 60)),
                    'politica_contrasena' => $this->sanitizePasswordPolicy($data['politica_contrasena'] ?? 'media'),
                    'intentos_login' => max(1, (int) ($data['intentos_login'] ?? 5)),
                ];
            default:
                return $data;
        }
    }

    private function sanitizeColor(string $color): string {
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            return '#239C56';
        }
        return strtoupper($color);
    }

    private function sanitizePasswordPolicy(string $policy): string {
        $allowed = ['baja', 'media', 'alta'];
        $policy = strtolower($policy);
        if (!in_array($policy, $allowed, true)) {
            return 'media';
        }
        return $policy;
    }
    public function resetDefaults() {
        $method = $_SERVER['REQUEST_METHOD'];
        if ($method !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        $defaults = [
            'general' => [
                'nombre_empresa' => 'Sistema de Inventarios',
                'correo_soporte' => 'soporte@inventarios.com',
                'telefono' => '',
                'moneda' => 'USD',
                'zona_horaria' => 'UTC',
                'formato_fecha' => 'DD/MM/YYYY',
            ],
            'branding' => [
                'tema' => 'verde',
                'color_primario' => '#239C56',
                'color_secundario' => '#1B7B43',
                'logo_url' => '/imgs/gestoricon.webp',
                'favicon_url' => '/imgs/gestoricon.webp',
            ],
            'notificaciones' => [
                'correo_alertas' => true,
                'notificaciones_push' => false,
                'resumen_diario' => true,
                'umbral_stock' => 20,
                'recordatorio_pedidos' => true,
            ],
            'seguridad' => [
                'two_factor' => false,
                'expiracion_sesion' => 60,
                'politica_contrasena' => 'media',
                'intentos_login' => 5,
            ],
        ];

        try {
            $this->settingModel->updateMany($defaults);
            AuditLogger::log('Restablecimiento de configuraciones', 'Configuración', 'all', [
                'accion' => 'reset_defaults'
            ]);
            Response::success(['settings' => $defaults], 'Configuraciones restablecidas a valores predeterminados');
        } catch (Exception $e) {
            Response::error('Error al restablecer configuraciones: ' . $e->getMessage(), 500);
        }
    }
}




