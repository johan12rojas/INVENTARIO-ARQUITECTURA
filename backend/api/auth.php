<?php
/**
 * Endpoint directo para autenticación (fallback si mod_rewrite no funciona)
 */

// Redirigir a index.php con el path correcto
$_GET['path'] = 'auth/' . basename(__FILE__, '.php');
require_once __DIR__ . '/index.php';
?>


