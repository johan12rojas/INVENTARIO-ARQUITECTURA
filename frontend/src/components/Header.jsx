import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Dashboard.css';

const formatBadgeValue = (value) => {
  if (value > 99) return '99+';
  return String(value);
};

const Header = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alertsList, setAlertsList] = useState([]);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAlertsSummary = async () => {
      try {
        // Fetch both alerts and low stock products to calculate accurate count
        const [alertsResponse, productsResponse] = await Promise.all([
          api.getAlerts({}),
          api.getProducts({ status: 'low_stock' })
        ]);

        if (!isMounted) return;

        if (alertsResponse?.success) {
          const alertsData = alertsResponse.data?.alerts || [];
          const productsData = productsResponse?.data?.products || [];

          // Logic to identify "virtual" alerts (low stock products without existing alert)
          const existingProductIds = new Set(
            alertsData
              .filter((alert) => alert.tipo === 'low_stock' && alert.producto?.id)
              .map((alert) => alert.producto.id)
          );

          const virtualAlerts = productsData
            .filter((product) => product.activo && product.estado === 'low')
            .filter((product) => !existingProductIds.has(product.id))
            .map(product => ({
              id: `virtual-${product.id}`,
              titulo: 'Stock Bajo',
              mensaje: `El producto ${product.nombre} tiene stock bajo (${product.stockActual})`,
              tipo: 'low_stock',
              fecha_creacion: new Date().toISOString(),
              leida: false,
              virtual: true
            }));

          const allAlerts = [...virtualAlerts, ...alertsData].sort((a, b) => {
            return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
          });

          const dbUnreadCount = alertsData.filter(a => !a.leida).length;
          const totalUnread = dbUnreadCount + virtualAlerts.length;

          setUnreadAlerts(totalUnread);
          setAlertsList(allAlerts.slice(0, 5));
        }
      } catch (error) {
        console.error('No se pudo obtener el resumen de alertas', error);
      }
    };

    const handleSummaryUpdate = (event) => {
      if (!isMounted) return;
      const count = event.detail?.unread ?? 0;
      setUnreadAlerts(count);
    };

    loadAlertsSummary();
    window.addEventListener('alertsSummaryUpdate', handleSummaryUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('alertsSummaryUpdate', handleSummaryUpdate);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'A';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="7" height="7" rx="1" fill="white"/>
              <rect x="14" y="3" width="7" height="7" rx="1" fill="white"/>
              <rect x="3" y="14" width="7" height="7" rx="1" fill="white"/>
              <rect x="14" y="14" width="7" height="7" rx="1" fill="white"/>
            </svg>
          </div>
          <div className="logo-text-group">
            <span className="logo-title">Sistema de Inventarios</span>
            <span className="logo-subtitle">Panel administrativo</span>
          </div>
        </div>
      </div>
      <div className="header-right">
        <div 
          className="header-icon notification-icon" 
          onClick={() => setShowNotifications(!showNotifications)}
          style={{ cursor: 'pointer', position: 'relative' }}
          ref={notificationRef}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 3C10 3 8 4 8 6V8C8 8.55228 8.44772 9 9 9H11C11.5523 9 12 8.55228 12 8V6C12 4 10 3 10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 11V17M7 17H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={`notification-badge ${unreadAlerts === 0 ? 'empty' : ''}`}>
            {formatBadgeValue(unreadAlerts)}
          </span>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>Notificaciones</h3>
              </div>
              <ul className="notification-list">
                {alertsList.length === 0 ? (
                  <div className="notification-empty">No tienes notificaciones nuevas</div>
                ) : (
                  alertsList.map((alert) => (
                    <li 
                      key={alert.id} 
                      className={`notification-item ${!alert.leida ? 'unread' : ''}`}
                      onClick={() => {
                        if (onNavigate) onNavigate('alertas');
                        setShowNotifications(false);
                      }}
                    >
                      <div className={`notification-icon-box ${alert.tipo === 'critical_stock' ? 'critical_stock' : 'low_stock'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {alert.tipo === 'critical_stock' ? (
                            <>
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </>
                          ) : (
                            <>
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </>
                          )}
                        </svg>
                      </div>
                      <div className="notification-content">
                        <span className="notification-title">{alert.titulo}</span>
                        <p className="notification-message">{alert.mensaje}</p>
                        <span className="notification-time">
                          {new Date(alert.fecha_creacion).toLocaleDateString()}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <div className="notification-footer">
                <span 
                  className="notification-view-all" 
                  onClick={() => {
                    if (onNavigate) onNavigate('alertas');
                    setShowNotifications(false);
                  }}
                >
                  Ver todas las notificaciones
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="user-menu-container" ref={userMenuRef}>
          <div 
            className="user-info" 
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              {user.avatar ? (
                <img 
                  src={`${api.API_BASE_URL.replace('/api', '')}${user.avatar}`} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                />
              ) : (
                getUserInitials(user.nombre || 'Admin')
              )}
            </div>
            <span className="user-name">{user.nombre || 'Ana García'}</span>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="none" 
              className={`user-menu-arrow ${showUserMenu ? 'open' : ''}`}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {showUserMenu && (
            <div className="user-menu-dropdown">
              <div className="user-menu-item" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6M11 11L14 8M14 8L11 5M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Cerrar sesión</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

