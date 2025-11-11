import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Dashboard.css';

const Sidebar = ({ activeMenu, setActiveMenu }) => {
  const navigate = useNavigate();
  const [alertsBadge, setAlertsBadge] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      try {
        const response = await api.getAlerts({});
        if (isMounted && response?.success) {
          setAlertsBadge(response.data?.summary?.unread ?? 0);
        }
      } catch (error) {
        console.error('No se pudo obtener el resumen de alertas', error);
      }
    };

    const handleSummaryUpdate = (event) => {
      if (!isMounted) return;
      setAlertsBadge(event.detail?.unread ?? 0);
    };

    loadSummary();
    window.addEventListener('alertsSummaryUpdate', handleSummaryUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('alertsSummaryUpdate', handleSummaryUpdate);
    };
  }, []);

  const menuItems = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="4" height="4" rx="0.5" fill="currentColor"/>
          <rect x="8.5" y="3" width="4" height="4" rx="0.5" fill="currentColor"/>
          <rect x="14" y="3" width="3" height="4" rx="0.5" fill="currentColor"/>
          <rect x="3" y="8.5" width="4" height="4" rx="0.5" fill="currentColor"/>
          <rect x="8.5" y="8.5" width="4" height="4" rx="0.5" fill="currentColor"/>
          <rect x="14" y="8.5" width="3" height="4" rx="0.5" fill="currentColor"/>
          <rect x="3" y="14" width="4" height="3" rx="0.5" fill="currentColor"/>
          <rect x="8.5" y="14" width="4" height="3" rx="0.5" fill="currentColor"/>
          <rect x="14" y="14" width="3" height="3" rx="0.5" fill="currentColor"/>
        </svg>
      )
    },
    {
      id: 'productos',
      label: 'Productos',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6L5 4H15L17 6M3 6L5 8H15L17 6M3 6V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V6M3 6H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'proveedores',
      label: 'Proveedores',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="13" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 17C3 13.134 5.13401 11 9 11H11C14.866 11 17 13.134 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'movimientos',
      label: 'Movimientos',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 15L7 10L11 14L17 7M17 7H13M17 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 5H5M5 5L7 13H15L17 5H5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8" cy="17" r="1" fill="currentColor"/>
          <circle cx="15" cy="17" r="1" fill="currentColor"/>
        </svg>
      )
    },
    {
      id: 'informes',
      label: 'Informes',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4H16V16H4V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 8H13M7 12H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'alertas',
      label: 'Alertas',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 3C7.23858 3 5 5.23858 5 8V11.5C5 12.5 4.5 13.5 4 14.5H16C15.5 13.5 15 12.5 15 11.5V8C15 5.23858 12.7614 3 10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 14.5V15.5C7 16.8807 8.11929 18 9.5 18H10.5C11.8807 18 13 16.8807 13 15.5V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      badge: alertsBadge > 0 ? (alertsBadge > 99 ? '99+' : alertsBadge) : null
    },
    {
      id: 'auditoria',
      label: 'Auditoría',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 6V10L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'usuarios',
      label: 'Usuarios & Roles',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 17C5 13.134 7.13401 11 11 11H9C12.866 11 15 13.134 15 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 11C11.6569 11 13 9.65685 13 8C13 6.34315 11.6569 5 10 5C8.34315 5 7 6.34315 7 8C7 9.65685 8.34315 11 10 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 2C5.58172 2 2 4.68629 2 8C2 11.3137 5.58172 14 10 14C14.4183 14 18 11.3137 18 8C18 4.68629 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 14V18M7 18H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  const handleMenuClick = (menuId) => {
    setActiveMenu(menuId);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-menu">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
            onClick={() => handleMenuClick(item.id)}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
            {item.badge && (
              <span className="menu-badge">{item.badge}</span>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;

