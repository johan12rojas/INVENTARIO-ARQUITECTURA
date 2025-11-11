import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './Products.css';
import ProductModal from './ProductModal';
import ImportModal from './ImportModal';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const defaultSummary = {
  total_products: 0,
  stock_total: 0,
  valor_total: 0,
  low_stock: 0,
};

const ProductsView = () => {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rowActionId, setRowActionId] = useState(null);

  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [alert, setAlert] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const showAlert = useCallback((type, message) => {
    setAlert({ type, message });
  }, []);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(timer);
  }, [alert]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(handler);
  }, [search]);

  const filterParams = useMemo(() => ({
    search: debouncedSearch,
    category,
    status,
  }), [debouncedSearch, category, status]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.getProducts(filterParams);

      if (response?.success) {
        setProducts(response.data?.products || []);
        setSummary(response.data?.summary || defaultSummary);
        setCategories(response.data?.categories || []);
        setProviders(response.data?.providers || []);
      } else {
        const message = response?.message || 'No se pudo obtener la información';
        setError(message);
        showAlert('error', message);
      }
    } catch (err) {
      const message = err?.message || 'Error de comunicación con el servidor';
      setError(message);
      showAlert('error', message);
    } finally {
      setLoading(false);
    }
  }, [filterParams, showAlert]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
  };

  const handleAddProduct = () => {
    setModalMode('create');
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleSubmitProduct = async (formData) => {
    setSubmitting(true);
    try {
      if (modalMode === 'edit' && selectedProduct) {
        await api.updateProduct(selectedProduct.id, formData);
        showAlert('success', 'Producto actualizado correctamente');
      } else {
        await api.createProduct(formData);
        showAlert('success', 'Producto creado correctamente');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      showAlert('error', err?.message || 'No se pudo guardar el producto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(`¿Eliminar el producto "${product.nombre}"?`);
    if (!confirmed) return;

    setRowActionId(product.id);
    try {
      await api.deleteProduct(product.id);
      showAlert('success', 'Producto eliminado');
      fetchProducts();
    } catch (err) {
      showAlert('error', err?.message || 'No se pudo eliminar el producto');
    } finally {
      setRowActionId(null);
    }
  };

  const handleOpenImportModal = () => {
    setImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    if (importing) return;
    setImportModalOpen(false);
  };

  const handleImportFile = async (file) => {
    if (!file) {
      showAlert('error', 'Selecciona un archivo CSV');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const response = await api.importProducts(formData);
      const data = response?.data;
      let message = response?.message || 'Importación finalizada';
      if (data) {
        message += ` (creados: ${data.created ?? 0}, actualizados: ${data.updated ?? 0}, omitidos: ${data.skipped ?? 0})`;
      }
      showAlert('success', message);
      fetchProducts();
      setImportModalOpen(false);
    } catch (err) {
      showAlert('error', err?.message || 'No se pudo importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.exportProducts(filterParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `productos_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showAlert('success', 'Archivo exportado correctamente');
    } catch (err) {
      showAlert('error', err?.message || 'No se pudo exportar el archivo');
    } finally {
      setExporting(false);
    }
  };

  const renderStock = (product) => {
    const isLow = product.estado === 'low';
    return (
      <span className={`products-stock ${isLow ? 'low' : ''}`}>
        {product.stock} <span className="products-stock-divider">/</span> {product.stock_minimo}
        {isLow && <span className="products-stock-alert" title="Stock bajo">!</span>}
      </span>
    );
  };

  const renderStatusBadges = (product) => {
    const isLow = product.estado === 'low';
    return (
      <div className="products-status-group">
        <span className={`products-status ${isLow ? 'low' : 'normal'}`}>
          {isLow ? 'Stock Bajo' : 'Normal'}
        </span>
        <span className={`products-active ${product.activo ? 'active' : 'inactive'}`}>
          {product.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    );
  };

  return (
    <div className="products-wrapper">
      {alert && (
        <div className={`products-alert ${alert.type}`}>
          {alert.message}
        </div>
      )}

      <div className="products-header">
        <div>
          <h1>Gestión de Productos</h1>
          <p>Administra tu catálogo de productos e inventario</p>
        </div>
        <div className="products-actions-top">
          <button
            type="button"
            className="products-button ghost"
            onClick={handleOpenImportModal}
            disabled={importing}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {importing ? 'Importando…' : 'Importar CSV'}
          </button>
          <button
            type="button"
            className="products-button ghost"
            onClick={handleExport}
            disabled={exporting}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 4H19M9 4V2M15 4V2M6 11H18M6 17H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          <button
            type="button"
            className="products-button primary"
            onClick={handleAddProduct}
            disabled={submitting}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Agregar Producto
          </button>
        </div>
      </div>

      <section className="products-summary-grid">
        <article className="products-summary-card">
          <h3>Total Productos</h3>
          <p className="value">{summary.total_products ?? 0}</p>
        </article>
        <article className="products-summary-card">
          <h3>Stock Total</h3>
          <p className="value">{summary.stock_total ?? 0} <span>unidades</span></p>
        </article>
        <article className="products-summary-card">
          <h3>Valor Total</h3>
          <p className="value">{currencyFormatter.format(summary.valor_total ?? 0)}</p>
        </article>
        <article className="products-summary-card">
          <h3>Stock Bajo</h3>
          <p className="value low">{summary.low_stock ?? 0} <span>productos</span></p>
        </article>
      </section>

      <section className="products-filters">
        <div className="filters-title">Filtros y Búsqueda</div>
        <div className="filters-controls">
          <div className="search-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#9aa2b1" strokeWidth="1.5"/>
              <path d="M20 20L17 17" stroke="#9aa2b1" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="filter-select-group">
            <select value={category} onChange={handleCategoryChange}>
              <option value="all">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
            <select value={status} onChange={handleStatusChange}>
              <option value="all">Todos los estados</option>
              <option value="low_stock">Stock bajo</option>
              <option value="normal">Stock normal</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </section>

      {error && <div className="products-alert error">{error}</div>}

      <div className="products-table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>Precio</th>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="products-loading">Cargando productos...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="products-empty">No hay productos que coincidan con los filtros.</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td className="sku">{product.sku}</td>
                  <td>
                    <div className="product-name">{product.nombre}</div>
                    {product.descripcion && (
                      <div className="product-description">{product.descripcion}</div>
                    )}
                  </td>
                  <td>
                    <span className="category-pill">{product.categoria}</span>
                  </td>
                  <td>{renderStock(product)}</td>
                  <td>{currencyFormatter.format(product.precio)}</td>
                  <td className="provider-cell">{product.proveedor}</td>
                  <td>{renderStatusBadges(product)}</td>
                  <td>
                    <div className="product-actions">
                      <button
                        type="button"
                        className="action"
                        title="Editar"
                        onClick={() => handleEditProduct(product)}
                        disabled={submitting || rowActionId === product.id}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M13.5 6.5L17.5 10.5M5 19L6.61375 17.3862M18.2071 8.79289C18.5976 8.40237 18.5976 7.7692 18.2071 7.37868L16.6213 5.79289C16.2308 5.40237 15.5976 5.40237 15.2071 5.79289L6.61375 14.3862L5 19L9.61375 17.3862L18.2071 8.79289Z" stroke="#636f7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="action"
                        title="Eliminar"
                        onClick={() => handleDeleteProduct(product)}
                        disabled={rowActionId === product.id || submitting}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 7H19M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7M18 7V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V7H18Z" stroke="#d1424b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        product={selectedProduct}
        categories={categories}
        providers={providers}
        loading={submitting}
        onClose={handleCloseModal}
        onSubmit={handleSubmitProduct}
      />

      <ImportModal
        open={importModalOpen}
        loading={importing}
        onClose={handleCloseImportModal}
        onImport={handleImportFile}
      />
    </div>
  );
};

export default ProductsView;


