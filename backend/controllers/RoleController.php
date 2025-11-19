<?php
/**
 * Controlador de Roles
 */

require_once __DIR__ . '/../utils/Response.php';

class RoleController
{
    /**
     * Retorna los roles disponibles con permisos por módulo.
     * En esta versión se construye a partir de una configuración estática,
     * pero puede conectarse a una tabla `roles` si se requiere.
     */
    public function index()
    {
        $roles = [
            [
                'id' => 'admin',
                'name' => 'Administrador',
                'permissions' => $this->buildPermissions([
                    'products' => ['view', 'create', 'edit', 'delete'],
                    'suppliers' => ['view', 'create', 'edit', 'delete'],
                    'orders' => ['view', 'create', 'edit', 'delete'],
                    'movements' => ['view', 'create', 'edit', 'delete'],
                    'reports' => ['view', 'create', 'edit', 'delete'],
                    'alerts' => ['view', 'create', 'edit', 'delete'],
                    'users' => ['view', 'create', 'edit', 'delete'],
                    'audit' => ['view', 'edit'],
                ]),
            ],
            [
                'id' => 'inventory_manager',
                'name' => 'Gestor de Inventario',
                'permissions' => $this->buildPermissions([
                    'products' => ['view', 'create', 'edit'],
                    'suppliers' => ['view', 'create', 'edit'],
                    'orders' => ['view', 'create'],
                    'movements' => ['view', 'create'],
                    'reports' => ['view'],
                    'alerts' => ['view'],
                ]),
            ],
            [
                'id' => 'buyer',
                'name' => 'Comprador',
                'permissions' => $this->buildPermissions([
                    'products' => ['view'],
                    'suppliers' => ['view', 'create'],
                    'orders' => ['view', 'create'],
                    'reports' => ['view'],
                ]),
            ],
            [
                'id' => 'auditor',
                'name' => 'Auditor',
                'permissions' => $this->buildPermissions([
                    'products' => ['view'],
                    'suppliers' => ['view'],
                    'orders' => ['view'],
                    'movements' => ['view'],
                    'reports' => ['view'],
                    'alerts' => ['view'],
                    'audit' => ['view'],
                ]),
            ],
        ];

        Response::success(['roles' => $roles], 'Listado de roles');
    }

    private function buildPermissions(array $config)
    {
        $modules = [
            'products',
            'suppliers',
            'orders',
            'movements',
            'reports',
            'alerts',
            'users',
            'audit',
        ];

        $permissions = [];
        foreach ($modules as $module) {
            $actions = $config[$module] ?? [];
            $permissions[$module] = [
                'view' => in_array('view', $actions, true),
                'create' => in_array('create', $actions, true),
                'edit' => in_array('edit', $actions, true),
                'delete' => in_array('delete', $actions, true),
            ];
        }

        return $permissions;
    }
}




