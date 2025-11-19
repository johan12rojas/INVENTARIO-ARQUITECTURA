<?php
/**
 * Controlador de Productos
 */

require_once __DIR__ . '/../models/ProductModel.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/AuditLogger.php';

class ProductController {
    private $productModel;

    public function __construct() {
        $this->productModel = new ProductModel();
    }

    public function index() {
        $filters = [
            'search' => isset($_GET['search']) ? trim($_GET['search']) : null,
            'category' => isset($_GET['category']) ? $_GET['category'] : null,
            'status' => isset($_GET['status']) ? $_GET['status'] : null,
        ];

        $data = [
            'summary' => $this->productModel->getSummary($filters),
            'products' => $this->productModel->getProducts($filters),
            'categories' => $this->productModel->getCategories(),
            'providers' => $this->productModel->getSuppliers()
        ];

        Response::success($data, 'Listado de productos');
    }

    public function create() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validation = $this->validateProductData($data);
        if ($validation['hasErrors']) {
            Response::error('Datos de producto inválidos', 400, $validation['errors']);
        }

        $existingSku = $this->productModel->findBySku($validation['payload']['sku']);
        if ($existingSku) {
            Response::error('El SKU ya existe en la base de datos', 409);
        }

        $productId = $this->productModel->createProduct($validation['payload']);

        $auditPayload = $this->extractProductAuditData($validation['payload']);
        $auditPayload['id'] = (int) $productId;

        AuditLogger::log('Creaci�n de producto', 'Producto', $productId, [
            'producto' => $auditPayload,
        ]);

        Response::success([
            'id' => (int) $productId,
        ], 'Producto creado correctamente', 201);
    }

    public function update($id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
            Response::error('Método no permitido', 405);
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validation = $this->validateProductData($data, true);
        if ($validation['hasErrors']) {
            Response::error('Datos de producto inválidos', 400, $validation['errors']);
        }

        $product = $this->productModel->findById($id);
        if (!$product) {
            Response::error('Producto no encontrado', 404);
        }

        $existingSku = $this->productModel->findBySku($validation['payload']['sku']);
        if ($existingSku && (int) $existingSku['id'] !== (int) $id) {
            Response::error('El SKU ya existe en la base de datos', 409);
        }

        $this->productModel->updateProduct($id, $validation['payload']);

        AuditLogger::log('Actualizaci�n de producto', 'Producto', $id, [
            'antes' => $this->extractProductAuditData($product),
            'despues' => $this->extractProductAuditData($validation['payload']),
        ]);

        Response::success(['id' => (int) $id], 'Producto actualizado correctamente');
    }

    public function delete($id) {
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            Response::error('Método no permitido', 405);
        }

        $product = $this->productModel->findById($id);
        if (!$product) {
            Response::error('Producto no encontrado', 404);
        }

        $this->productModel->softDeleteProduct($id);

        $productAudit = $this->extractProductAuditData($product);
        $productAudit['id'] = (int) $product['id'];

        AuditLogger::log('Eliminaci�n de producto', 'Producto', $id, [
            'producto' => $productAudit,
        ]);

        Response::success(null, 'Producto eliminado');
    }

    public function import() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::error('Método no permitido', 405);
        }

        if (empty($_FILES['file'])) {
            Response::error('Archivo CSV requerido', 400);
        }

        $file = $_FILES['file'];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error('No se pudo procesar el archivo', 400);
        }

        $handle = fopen($file['tmp_name'], 'r');
        if (!$handle) {
            Response::error('No se pudo abrir el archivo', 400);
        }

        $header = fgetcsv($handle, 0, ',');
        if (!$header) {
            fclose($handle);
            Response::error('Archivo CSV vacío o inválido', 400);
        }

        $headerNormalization = [];
        foreach ($header as $index => $column) {
            $headerNormalization[$index] = $this->normalizeKey($column);
        }

        $headerMap = [
            'sku' => 'sku',
            'nombre' => 'nombre',
            'descripcion' => 'descripcion',
            'descripción' => 'descripcion',
            'categoria' => 'categoria',
            'categoría' => 'categoria',
            'categoria id' => 'categoria_id',
            'categoría id' => 'categoria_id',
            'stock' => 'stock',
            'stock minimo' => 'stock_minimo',
            'stock mínimo' => 'stock_minimo',
            'stock min' => 'stock_minimo',
            'precio' => 'precio',
            'proveedor' => 'proveedor',
            'proveedor id' => 'proveedor_id',
            'activo' => 'activo',
        ];

        $categoryMap = [];
        foreach ($this->productModel->getCategories() as $category) {
            $categoryMap[$this->normalizeKey($category['nombre'])] = (int) $category['id'];
        }

        $providerMap = [];
        foreach ($this->productModel->getSuppliers() as $provider) {
            $providerMap[$this->normalizeKey($provider['nombre'])] = (int) $provider['id'];
        }

        $processed = 0;
        $created = 0;
        $updated = 0;
        $skipped = 0;

        while (($row = fgetcsv($handle, 0, ',')) !== false) {
            $processed++;
            if (count($row) !== count($header)) {
                $skipped++;
                continue;
            }

            $normalizedRow = [];
            foreach ($row as $index => $value) {
                $keyNormalized = $headerNormalization[$index] ?? '';
                if ($keyNormalized === '') {
                    continue;
                }

                if (!array_key_exists($keyNormalized, $headerMap)) {
                    continue;
                }

                $mappedKey = $headerMap[$keyNormalized];
                $normalizedRow[$mappedKey] = trim((string) $value);
            }

            if (isset($normalizedRow['categoria'])) {
                $categoryKey = $this->normalizeKey($normalizedRow['categoria']);
                $normalizedRow['categoria_id'] = $categoryMap[$categoryKey] ?? null;
                unset($normalizedRow['categoria']);
            }

            if (isset($normalizedRow['categoria_id']) && $normalizedRow['categoria_id'] !== '') {
                $normalizedRow['categoria_id'] = (int) $normalizedRow['categoria_id'];
            }

            if (isset($normalizedRow['proveedor'])) {
                $providerKey = $this->normalizeKey($normalizedRow['proveedor']);
                $normalizedRow['proveedor_id'] = $providerMap[$providerKey] ?? null;
                unset($normalizedRow['proveedor']);
            }

            if (isset($normalizedRow['proveedor_id']) && $normalizedRow['proveedor_id'] !== '') {
                $normalizedRow['proveedor_id'] = (int) $normalizedRow['proveedor_id'];
            }

            if (isset($normalizedRow['stock'])) {
                $normalizedRow['stock'] = $this->normalizeInteger($normalizedRow['stock']);
            }

            if (isset($normalizedRow['stock_minimo'])) {
                $normalizedRow['stock_minimo'] = $this->normalizeInteger($normalizedRow['stock_minimo']);
            }

            if (isset($normalizedRow['precio'])) {
                $normalizedRow['precio'] = $this->normalizeDecimal($normalizedRow['precio']);
            }

            if (!isset($normalizedRow['activo']) || $normalizedRow['activo'] === '') {
                $normalizedRow['activo'] = 1;
            } else {
                $activoValue = $this->normalizeKey($normalizedRow['activo']);
                if (in_array($activoValue, ['0', 'no', 'false', 'inactivo', 'inactive'], true)) {
                    $normalizedRow['activo'] = 0;
                } else {
                    $normalizedRow['activo'] = 1;
                }
            }

            $validation = $this->validateProductData($normalizedRow, false, true);
            if ($validation['hasErrors']) {
                $skipped++;
                continue;
            }

            $existing = $this->productModel->findBySku($validation['payload']['sku']);
            if ($existing) {
                $this->productModel->updateProduct((int) $existing['id'], $validation['payload']);
                $updated++;
            } else {
                $this->productModel->createProduct($validation['payload']);
                $created++;
            }
        }

        fclose($handle);

        AuditLogger::log('Importación de productos', 'Producto', null, [
            'archivo' => $file['name'] ?? null,
            'procesados' => $processed,
            'creados' => $created,
            'actualizados' => $updated,
            'omitidos' => $skipped,
        ]);

        Response::success([
            'processed' => $processed,
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
        ], 'Importación finalizada');
    }

    public function export() {
        $filters = [
            'search' => isset($_GET['search']) ? trim($_GET['search']) : null,
            'category' => isset($_GET['category']) ? $_GET['category'] : null,
            'status' => isset($_GET['status']) ? $_GET['status'] : null,
        ];

        $products = $this->productModel->getProducts($filters);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="productos.csv"');

        $output = fopen('php://output', 'w');
        fputcsv($output, ['ID', 'SKU', 'Nombre', 'Descripción', 'Categoría', 'Proveedor', 'Stock', 'Stock mínimo', 'Precio', 'Estado', 'Activo']);

        foreach ($products as $product) {
            fputcsv($output, [
                $product['id'],
                $product['sku'],
                $product['nombre'],
                $product['descripcion'],
                $product['categoria'],
                $product['proveedor'],
                $product['stock'],
                $product['stock_minimo'],
                $product['precio'],
                $product['estado'],
                $product['activo'],
            ]);
        }

        fclose($output);
        exit;
    }

    private function validateProductData($data, $isUpdate = false, $fromCsv = false) {
        $errors = [];

        if (!$data) {
            return [
                'hasErrors' => true,
                'errors' => ['general' => 'Datos no proporcionados'],
            ];
        }

        $sku = isset($data['sku']) ? trim((string) $data['sku']) : '';
        $nombre = isset($data['nombre']) ? trim((string) $data['nombre']) : '';
        $descripcion = isset($data['descripcion']) ? trim((string) $data['descripcion']) : '';
        $categoria_id = isset($data['categoria_id']) && $data['categoria_id'] !== '' ? (int) $data['categoria_id'] : null;
        $proveedor_id = isset($data['proveedor_id']) && $data['proveedor_id'] !== '' ? (int) $data['proveedor_id'] : null;
        $stock = isset($data['stock']) && $data['stock'] !== '' ? (int) $data['stock'] : 0;
        $stock_minimo = isset($data['stock_minimo']) && $data['stock_minimo'] !== '' ? (int) $data['stock_minimo'] : 0;
        $precio = isset($data['precio']) && $data['precio'] !== '' ? (float) $data['precio'] : 0;
        $activo = isset($data['activo']) ? (int) $data['activo'] : 1;

        if ($sku === '') {
            $errors['sku'] = 'El SKU es obligatorio';
        }

        if ($nombre === '') {
            $errors['nombre'] = 'El nombre es obligatorio';
        }

        if ($stock < 0) {
            $errors['stock'] = 'El stock no puede ser negativo';
        }

        if ($stock_minimo < 0) {
            $errors['stock_minimo'] = 'El stock mínimo no puede ser negativo';
        }

        if ($precio < 0) {
            $errors['precio'] = 'El precio no puede ser negativo';
        }

        if (!in_array($activo, [0, 1], true)) {
            $errors['activo'] = 'Estado activo inválido';
        }

        return [
            'hasErrors' => !empty($errors),
            'errors' => $errors,
            'payload' => [
                'sku' => $sku,
                'nombre' => $nombre,
                'descripcion' => $descripcion,
                'categoria_id' => $categoria_id,
                'proveedor_id' => $proveedor_id,
                'stock' => $stock,
                'stock_minimo' => $stock_minimo,
                'precio' => $precio,
                'activo' => $activo,
            ],
        ];
    }

    private function normalizeKey($value) {
        $value = strtolower(trim((string) $value));
        $value = strtr($value, [
            'á' => 'a', 'à' => 'a', 'ä' => 'a', 'â' => 'a',
            'é' => 'e', 'è' => 'e', 'ë' => 'e', 'ê' => 'e',
            'í' => 'i', 'ì' => 'i', 'ï' => 'i', 'î' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ö' => 'o', 'ô' => 'o',
            'ú' => 'u', 'ù' => 'u', 'ü' => 'u', 'û' => 'u',
            'ñ' => 'n',
        ]);
        $value = preg_replace('/[^a-z0-9\s]/u', ' ', $value);
        $value = preg_replace('/\s+/', ' ', $value);
        return trim($value);
    }

    private function normalizeDecimal($value) {
        $value = trim((string) $value);
        if ($value === '') {
            return 0.0;
        }

        $value = str_replace(["\xC2\xA0", ' '], '', $value);
        $hasComma = strpos($value, ',') !== false;
        $hasDot = strpos($value, '.') !== false;

        if ($hasComma && $hasDot) {
            $lastComma = strrpos($value, ',');
            $lastDot = strrpos($value, '.');
            if ($lastComma > $lastDot) {
                $value = str_replace('.', '', $value);
                $value = str_replace(',', '.', $value);
            } else {
                $value = str_replace(',', '', $value);
            }
        } elseif ($hasComma) {
            $value = str_replace(',', '.', $value);
        }

        $value = preg_replace('/[^0-9+\-.]/', '', $value);
        if ($value === '' || $value === '-' || $value === '+') {
            return 0.0;
        }

        return (float) $value;
    }

    private function normalizeInteger($value) {
        return (int) round($this->normalizeDecimal($value));
    }

    private function extractProductAuditData(array $data): array {
        $fields = ['sku', 'nombre', 'descripcion', 'categoria_id', 'proveedor_id', 'stock', 'stock_minimo', 'precio', 'activo'];
        $filtered = AuditLogger::filterFields($data, $fields);

        foreach (['stock', 'stock_minimo'] as $field) {
            if (isset($filtered[$field])) {
                $filtered[$field] = (int) $filtered[$field];
            }
        }

        if (isset($filtered['precio'])) {
            $filtered['precio'] = (float) $filtered['precio'];
        }

        if (isset($filtered['activo'])) {
            $filtered['activo'] = (int) $filtered['activo'];
        }

        return $filtered;
    }
}
