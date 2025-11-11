/**
 * Servicio para realizar peticiones a la API
 */

const API_BASE_URL = 'http://localhost/GESTOR_INVENTARIO/backend/api';

class ApiService {
  /**
   * Realizar petición a la API
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const isFormData = options.body instanceof FormData;
    const config = {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      credentials: 'include',
    };

    if (!isFormData && options.body && typeof options.body === 'object' && !(options.body instanceof ReadableStream)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      
      // Intentar parsear JSON
      let data;
      try {
        data = await response.clone().json();
      } catch (e) {
        // Si no es JSON, usar texto
        const text = await response.text();
        throw new Error(text || 'Error en la respuesta del servidor');
      }

      if (!response.ok) {
        // Si hay errores específicos del backend, incluirlos
        if (data.errors) {
          const error = new Error(data.message || 'Error en la petición');
          error.errors = data.errors;
          throw error;
        }
        throw new Error(data.message || 'Error en la petición');
      }

      return data;
    } catch (error) {
      // Si es un error de red, mejorar el mensaje
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
      }
      throw error;
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async register(userData) {
    return this.request('/auth/register.php', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Iniciar sesión
   */
  async login(email, password) {
    return this.request('/auth/login.php', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * Cerrar sesión
   */
  async logout() {
    return this.request('/auth/logout.php', {
      method: 'POST',
    });
  }

  /**
   * Verificar sesión actual
   */
  async checkSession() {
    return this.request('/auth/check.php', {
      method: 'GET',
    });
  }

  /**
   * Obtener usuarios
   */
  async getUsers() {
    return this.request('/users', {
      method: 'GET',
    });
  }

  /**
   * Obtener listado de productos con filtros
   */
  async getProducts(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, value);
      }
    });

    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/products${queryString}`, {
      method: 'GET',
    });
  }

  async createProduct(product) {
    return this.request('/products', {
      method: 'POST',
      body: product,
    });
  }

  async updateProduct(id, product) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: product,
    });
  }

  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async importProducts(formData) {
    return this.request('/products/import', {
      method: 'POST',
      body: formData,
    });
  }

  async exportProducts(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, value);
      }
    });

    const queryString = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/products/export${queryString}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('No se pudo exportar el archivo');
    }

    return response.blob();
  }

  async getSuppliers(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, value);
      }
    });

    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/suppliers${queryString}`, {
      method: 'GET',
    });
  }

  async createSupplier(payload) {
    return this.request('/suppliers', {
      method: 'POST',
      body: payload,
    });
  }

  async updateSupplier(id, payload) {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: payload,
    });
  }

  async deleteSupplier(id) {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  async getMovements(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, value);
      }
    });

    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/movements${queryString}`, {
      method: 'GET',
    });
  }

  async createMovement(payload) {
    return this.request('/movements', {
      method: 'POST',
      body: payload,
    });
  }

  async deleteMovement(id) {
    return this.request(`/movements/${id}`, {
      method: 'DELETE',
    });
  }

  async getOrders(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, value);
      }
    });

    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/orders${queryString}`, {
      method: 'GET',
    });
  }

  async createOrder(payload) {
    return this.request('/orders', {
      method: 'POST',
      body: payload,
    });
  }

  async updateOrderStatus(id, estado) {
    return this.request(`/orders/${id}`, {
      method: 'PUT',
      body: { estado },
    });
  }

  async deleteOrder(id) {
    return this.request(`/orders/${id}`, {
      method: 'DELETE',
    });
  }

  async getAlerts(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params.append(key, value);
      }
    });

    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.request(`/alerts${queryString}`, {
      method: 'GET',
    });
  }

  async markAlertAsRead(id) {
    return this.request(`/alerts/${id}/read`, {
      method: 'PATCH',
    });
  }

  async deleteAlert(id) {
    return this.request(`/alerts/${id}`, {
      method: 'DELETE',
    });
  }

  async getRoles() {
    return this.request('/roles', {
      method: 'GET',
    });
  }

  async getSettings() {
    return this.request('/settings', {
      method: 'GET',
    });
  }

  async updateSettings(section, payload) {
    return this.request(`/settings/${section}`, {
      method: 'PUT',
      body: payload,
    });
  }

  async createUser(payload) {
    return this.request('/users', {
      method: 'POST',
      body: payload,
    });
  }

  async updateUser(id, payload) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: payload,
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();

