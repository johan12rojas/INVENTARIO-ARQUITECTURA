import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardContent from './DashboardContent';
import './Dashboard.css';

const ROLE_MENUS = {
  admin: [
    'inicio',
    'productos',
    'proveedores',
    'movimientos',
    'pedidos',
    'informes',
    'alertas',
    'auditoria',
    'usuarios',
    'configuracion'
  ],
  inventory_manager: [
    'inicio',
    'productos',
    'proveedores',
    'movimientos',
    'pedidos',
    'informes',
    'alertas',
    'configuracion'
  ],
  buyer: [
    'inicio',
    'proveedores',
    'pedidos',
    'informes',
    'alertas',
    'configuracion'
  ],
  auditor: [
    'inicio',
    'informes',
    'alertas',
    'auditoria',
    'configuracion'
  ],
  default: ['inicio', 'alertas', 'configuracion']
};

const readUserFromStorage = () => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('No se pudo leer el usuario de localStorage', error);
    return null;
  }
};

const Dashboard = () => {
  const [user] = useState(readUserFromStorage);

  const allowedMenus = useMemo(() => {
    const role = user?.rol;
    if (role && ROLE_MENUS[role]) {
      return ROLE_MENUS[role];
    }
    return ROLE_MENUS.default;
  }, [user?.rol]);

  const [activeMenu, setActiveMenu] = useState(() => allowedMenus[0] || 'inicio');

  useEffect(() => {
    if (!allowedMenus.includes(activeMenu)) {
      setActiveMenu(allowedMenus[0] || 'inicio');
    }
  }, [allowedMenus, activeMenu]);

  return (
    <div className="dashboard-container">
      <Header onNavigate={setActiveMenu} />
      <div className="dashboard-body">
        <Sidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          allowedMenus={allowedMenus}
        />
        <main className="dashboard-main">
          <DashboardContent activeMenu={activeMenu} allowedMenus={allowedMenus} />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;


