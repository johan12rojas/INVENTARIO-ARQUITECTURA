import React, { useEffect, useMemo, useState } from 'react';
import './UsersRoles.css';
import api from '../services/api';
import UserModal from './UserModal';

const tabs = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'roles', label: 'Roles y Permisos' },
];

const ROLE_LABELS = {
  admin: 'Administrador',
  inventory_manager: 'Gestor de Inventario',
  buyer: 'Comprador',
  auditor: 'Auditor',
};

const defaultPermissions = [
  'products',
  'suppliers',
  'orders',
  'movements',
  'reports',
  'alerts',
  'users',
  'audit',
];

const buildInitials = (name = '') => {
  const cleaned = name.trim();
  if (!cleaned) return 'U';
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

const mapUserFromApi = (user, roleDictionary = {}) => {
  const roleId = user.roleId || user.rol || 'inventory_manager';
  const role = roleDictionary[roleId];
  const roleName = role?.name || ROLE_LABELS[roleId] || roleId;
  const roleKey = role?.id || roleId;
  const displayName = user.nombre || user.name || '';
  const activeValue = user.status
    ? user.status === 'active'
      ? 1
      : 0
    : user.activo !== undefined
    ? Number(user.activo)
    : 1;

  return {
    id: String(user.id),
    name: displayName,
    initials: user.initials || buildInitials(displayName),
    avatar: user.avatar,
    email: user.email || '',
    position: user.position || roleName,
    roleId: roleKey,
    roleKey,
    roleName,
    status: activeValue === 1 ? 'active' : 'inactive',
    createdAt: user.fecha_creacion,
    updatedAt: user.fecha_actualizacion,
  };
};

const UsersRolesView = () => {
  const [activeTab, setActiveTab] = useState('usuarios');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingMocks, setUsingMocks] = useState(false);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        let mockUsers = !api.getUsers;
        const mockRoles = !api.getRoles;

        let usersResponse;
        try {
          usersResponse = await (mockUsers ? fakeUsers() : api.getUsers());
        } catch (err) {
          mockUsers = true;
          usersResponse = await fakeUsers();
        }

        let rolesResponse;
        try {
          rolesResponse = await (mockRoles ? fakeRoles() : api.getRoles());
        } catch (err) {
          rolesResponse = await fakeRoles();
        }

        if (!usersResponse.success) {
          throw new Error(usersResponse.message || 'No se pudieron cargar los usuarios');
        }
        if (!rolesResponse.success) {
          throw new Error(rolesResponse.message || 'No se pudieron cargar los roles');
        }

        const rolesList = rolesResponse.data.roles;
        const roleDictionary = rolesList.reduce((acc, role) => {
          acc[role.id] = role;
          return acc;
        }, {});

        const transformedUsers = usersResponse.data.users.map((user) =>
          mapUserFromApi(user, roleDictionary)
        );

        setUsingMocks(mockUsers || mockRoles);

        setUsers(transformedUsers);
        setRoles(rolesList);
        setSelectedRole(rolesList.length > 0 ? rolesList[0] : null);
      } catch (err) {
        setError(err?.message || 'No se pudo obtener la información de usuarios y roles');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filtersAppliedUsers = useMemo(() => {
    let list = [...users];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (user) =>
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term)
      );
    }
    if (roleFilter !== 'all') {
      list = list.filter((user) => user.roleId === roleFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter((user) => user.status === statusFilter);
    }
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'role') {
      list.sort((a, b) => a.roleName.localeCompare(b.roleName));
    }
    return list;
  }, [users, searchTerm, roleFilter, statusFilter, sortBy]);

  const summary = useMemo(() => {
    const total = users.length;
    const active = users.filter((user) => user.status === 'active').length;
    const inactive = total - active;
    const admin = users.filter((user) => user.roleKey === 'admin').length;
    return { total, active, inactive, admin };
  }, [users]);

  const rolesDictionary = useMemo(() => {
    return roles.reduce((acc, role) => {
      acc[role.id] = role;
      return acc;
    }, {});
  }, [roles]);

  const handleTogglePermission = (permissionKey, action) => {
    if (!selectedRole) return;
    const updatedRole = {
      ...selectedRole,
      permissions: {
        ...selectedRole.permissions,
        [permissionKey]: {
          ...selectedRole.permissions[permissionKey],
          [action]: !selectedRole.permissions[permissionKey][action],
        },
      },
    };
    setSelectedRole(updatedRole);
    setRoles((prev) =>
      prev.map((role) => (role.id === updatedRole.id ? updatedRole : role))
    );
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setModalError('');
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setModalError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setModalMode('edit');
    setModalLoading(false);
    setModalError('');
  };

  const handleSubmitUser = async (payload) => {
    setModalLoading(true);
    setModalError('');
    try {
      if (modalMode === 'edit' && selectedUser) {
        const response = await api.updateUser(selectedUser.id, payload);
        if (!response?.success) {
          throw new Error(response?.message || 'No se pudo actualizar el usuario');
        }
        const updatedUser = mapUserFromApi(response.data.user, rolesDictionary);
        setUsers((prev) =>
          prev.map((user) => (user.id === selectedUser.id ? updatedUser : user))
        );
        closeModal();
      } else if (modalMode === 'create') {
        const response = await api.createUser(payload);
        if (!response?.success) {
          throw new Error(response?.message || 'No se pudo crear el usuario');
        }
        const newUser = mapUserFromApi(response.data.user, rolesDictionary);
        setUsers((prev) =>
          [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name))
        );
        closeModal();
      }
    } catch (err) {
      setModalError(err?.message || 'No se pudo guardar el usuario');
      setModalLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmDelete = window.confirm(`¿Eliminar el usuario ${user.name}?`);
    if (!confirmDelete) return;
    try {
      await api.deleteUser(user.id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (err) {
      window.alert(err?.message || 'No se pudo eliminar el usuario');
    }
  };

  const renderUsersTab = () => (
    <div className="users-tab">
      <div className="users-summary-grid">
        <article>
          <span>Total Usuarios</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>Usuarios Activos</span>
          <strong>{summary.active}</strong>
        </article>
        <article>
          <span>Administradores</span>
          <strong>{summary.admin}</strong>
        </article>
        <article>
          <span>Usuarios Inactivos</span>
          <strong>{summary.inactive}</strong>
        </article>
      </div>

      <div className="users-filters">
        <div className="users-field search">
          <label>Buscar</label>
          <input
            type="text"
            placeholder="Nombre o correo…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="users-field">
          <label>Rol</label>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Todos los roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <div className="users-field">
          <label>Estado</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <div className="users-field">
          <label>Ordenar</label>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name">Por nombre</option>
            <option value="role">Por rol</option>
          </select>
        </div>
        <div className="users-actions-inline">
          <button type="button" className="btn-primary" onClick={openCreateModal}>
            + Agregar Usuario
          </button>
        </div>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtersAppliedUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="users-name">
                    <div className="users-avatar">
                      {user.avatar ? (
                        <img 
                          src={`${api.API_BASE_URL.replace('/api', '')}${user.avatar}`} 
                          alt="Avatar" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                        />
                      ) : (
                        user.initials
                      )}
                    </div>
                    <div>
                      <span>{user.name}</span>
                      <p>{user.position}</p>
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.roleKey}`}>{user.roleName}</span>
                </td>
                <td>
                  <span className={`status-badge ${user.status}`}>
                    {user.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div className="users-actions">
                    <button
                      type="button"
                      className="action"
                      title="Editar usuario"
                      onClick={() => openEditModal(user)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M13.5 6.5L17.5 10.5M5 19L6.61375 17.3862M18.2071 8.79289C18.5976 8.40237 18.5976 7.7692 18.2071 7.37868L16.6213 5.79289C16.2308 5.40237 15.5976 5.40237 15.2071 5.79289L6.61375 14.3862L5 19L9.61375 17.3862L18.2071 8.79289Z" stroke="#636f7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="action"
                      title="Eliminar usuario"
                      onClick={() => handleDeleteUser(user)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 7H19M9 7V5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5V7M18 7V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V7H18Z" stroke="#d1424b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRolePermissions = () => {
    if (!selectedRole) {
      return <p className="reports-empty">Selecciona un rol para ver sus permisos.</p>;
    }
    return (
      <div className="roles-permissions">
        <div className="roles-header">
          <select
            value={selectedRole.id}
            onChange={(event) => {
              const role = roles.find((item) => item.id === event.target.value);
              if (role) {
                setSelectedRole(role);
              }
            }}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary">
            Guardar cambios
          </button>
        </div>

        <p className="roles-description">
          Configuración granular de permisos por módulo.
        </p>

        <div className="permissions-grid">
          {defaultPermissions.map((permissionKey) => {
            const permissionName = permissionKey[0].toUpperCase() + permissionKey.slice(1);
            const permission = selectedRole.permissions[permissionKey] || {
              view: false,
              create: false,
              edit: false,
              delete: false,
            };
            return (
              <div className="permission-card" key={permissionKey}>
                <div className="permission-header">
                  <h4>{permissionName}</h4>
                </div>
                <div className="permission-row">
                  <span>Ver</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={permission.view}
                      onChange={() => handleTogglePermission(permissionKey, 'view')}
                    />
                    <span className="slider" />
                  </label>
                </div>
                <div className="permission-row">
                  <span>Crear</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={permission.create}
                      onChange={() => handleTogglePermission(permissionKey, 'create')}
                    />
                    <span className="slider" />
                  </label>
                </div>
                <div className="permission-row">
                  <span>Editar</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={permission.edit}
                      onChange={() => handleTogglePermission(permissionKey, 'edit')}
                    />
                    <span className="slider" />
                  </label>
                </div>
                <div className="permission-row">
                  <span>Eliminar</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={permission.delete}
                      onChange={() => handleTogglePermission(permissionKey, 'delete')}
                    />
                    <span className="slider" />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="role-summary">
          <h3>Descripción de Roles</h3>
          <ul>
            <li>
              <strong>Administrador:</strong> acceso completo a todas las funcionalidades.
            </li>
            <li>
              <strong>Gestor de Inventario:</strong> gestión de productos, movimientos y
              reportes.
            </li>
            <li>
              <strong>Comprador:</strong> gestión de proveedores y pedidos.
            </li>
            <li>
              <strong>Auditor:</strong> solo lectura con acceso a auditoría y reportes.
            </li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="users-roles-wrapper">
      <div className="users-roles-header">
        <div>
          <h1>Usuarios y Roles</h1>
          <p>Administra usuarios y permisos del sistema</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          + Agregar Usuario
        </button>
      </div>

      {error && <div className="reports-alert error">{error}</div>}
      {loading && <div className="reports-alert loading">Cargando usuarios...</div>}

      <div className="users-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="users-card">
        {usingMocks && (
          <div className="users-alert info">
            Estos datos son de demostración. Conecta los endpoints `getUsers` y `getRoles`
            para utilizar la información real del backend.
          </div>
        )}
        {activeTab === 'usuarios' ? renderUsersTab() : renderRolePermissions()}
      </div>

      {modalOpen && (
        <UserModal
          open={modalOpen}
          mode={modalMode}
          user={selectedUser}
          roles={roles}
          loading={modalLoading}
          serverError={modalError}
          onSubmit={handleSubmitUser}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default UsersRolesView;

const fakeUsers = async () => ({
  success: true,
  data: {
    users: [
      {
        id: '1',
        nombre: 'Ana García',
        name: 'Ana García',
        initials: 'A',
        email: 'ana.garcia@empresa.com',
        position: 'Coordinadora',
        rol: 'admin',
        activo: 1,
        password: '$2y$10$hash1',
        fecha_creacion: '2025-01-01 10:00:00',
        fecha_actualizacion: '2025-02-02 12:00:00',
      },
      {
        id: '2',
        nombre: 'Pedro Sánchez',
        name: 'Pedro Sánchez',
        initials: 'P',
        email: 'pedro.sanchez@empresa.com',
        position: 'Analista',
        rol: 'inventory_manager',
        activo: 1,
        password: '$2y$10$hash2',
        fecha_creacion: '2025-01-05 16:00:00',
        fecha_actualizacion: '2025-02-10 09:30:00',
      },
      {
        id: '3',
        nombre: 'María López',
        name: 'María López',
        initials: 'M',
        email: 'maria.lopez@empresa.com',
        position: 'Compras',
        rol: 'buyer',
        activo: 1,
        password: '$2y$10$hash3',
        fecha_creacion: '2025-01-12 14:15:00',
        fecha_actualizacion: '2025-02-05 08:45:00',
      },
      {
        id: '4',
        nombre: 'Juan Martínez',
        name: 'Juan Martínez',
        initials: 'J',
        email: 'juan.martinez@empresa.com',
        position: 'Auditor',
        rol: 'auditor',
        activo: 1,
        password: '$2y$10$hash4',
        fecha_creacion: '2024-12-20 11:00:00',
        fecha_actualizacion: '2025-01-25 12:30:00',
      },
      {
        id: '5',
        nombre: 'Carmen Rodríguez',
        name: 'Carmen Rodríguez',
        initials: 'C',
        email: 'carmen.rodriguez@empresa.com',
        position: 'Soporte',
        rol: 'inventory_manager',
        activo: 0,
        password: '$2y$10$hash5',
        fecha_creacion: '2024-11-10 09:00:00',
        fecha_actualizacion: '2025-01-15 10:10:00',
      },
    ],
  },
});

const fakeRoles = async () => ({
  success: true,
  data: {
    roles: [
      {
        id: 'admin',
        name: 'Administrador',
        permissions: buildPermissions({
          products: ['view', 'create', 'edit', 'delete'],
          suppliers: ['view', 'create', 'edit', 'delete'],
          orders: ['view', 'create', 'edit', 'delete'],
          movements: ['view', 'create', 'edit', 'delete'],
          reports: ['view', 'create', 'edit', 'delete'],
          alerts: ['view', 'create', 'edit', 'delete'],
          users: ['view', 'create', 'edit', 'delete'],
          audit: ['view', 'edit'],
        }),
      },
      {
        id: 'inventory_manager',
        name: 'Gestor de Inventario',
        permissions: buildPermissions({
          products: ['view', 'create', 'edit'],
          suppliers: ['view', 'create', 'edit'],
          orders: ['view', 'create'],
          movements: ['view', 'create'],
          reports: ['view'],
          alerts: ['view'],
        }),
      },
      {
        id: 'buyer',
        name: 'Comprador',
        permissions: buildPermissions({
          products: ['view'],
          suppliers: ['view', 'create'],
          orders: ['view', 'create'],
          reports: ['view'],
        }),
      },
      {
        id: 'auditor',
        name: 'Auditor',
        permissions: buildPermissions({
          products: ['view'],
          suppliers: ['view'],
          orders: ['view'],
          movements: ['view'],
          reports: ['view'],
          alerts: ['view'],
          audit: ['view'],
        }),
      },
    ],
  },
});

function buildPermissions(config) {
  const permissions = {};
  defaultPermissions.forEach((key) => {
    const actions = config[key] || [];
    permissions[key] = {
      view: actions.includes('view'),
      create: actions.includes('create'),
      edit: actions.includes('edit'),
      delete: actions.includes('delete'),
    };
  });
  return permissions;
}


