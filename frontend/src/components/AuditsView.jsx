import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './Audits.css';

const defaultSummary = {
  total: 0,
  by_entity: [],
  by_action: [],
  recent_users: [],
};

const defaultFilterOptions = {
  entities: [],
  actions: [],
  users: [],
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const AuditsView = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [filterOptions, setFilterOptions] = useState(defaultFilterOptions);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, limit: 25, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    entity: 'all',
    action: 'all',
    user_id: 'all',
    date_from: '',
    date_to: '',
    limit: 25,
    page: 1,
  });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.search === debouncedSearch) {
        return prev;
      }
      return { ...prev, search: debouncedSearch, page: 1 };
    });
  }, [debouncedSearch]);

  const requestPayload = useMemo(() => {
    const payload = {
      limit: filters.limit,
      page: filters.page,
    };

    if (filters.search) {
      payload.search = filters.search;
    }
    if (filters.entity !== 'all') {
      payload.entity = filters.entity;
    }
    if (filters.action !== 'all') {
      payload.action = filters.action;
    }
    if (filters.user_id !== 'all') {
      payload.user_id = filters.user_id;
    }
    if (filters.date_from) {
      payload.date_from = filters.date_from;
    }
    if (filters.date_to) {
      payload.date_to = filters.date_to;
    }

    return payload;
  }, [filters]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    const fetchAudits = async () => {
      try {
        const response = await api.getAudits(requestPayload);
        if (!isMounted) {
          return;
        }

        if (response?.success) {
          setLogs(response.data?.logs ?? []);
          setSummary(response.data?.summary ?? defaultSummary);
          setFilterOptions(response.data?.filters ?? defaultFilterOptions);
          setPagination(response.data?.pagination ?? { page: 1, pages: 1, limit: requestPayload.limit, total: 0 });
          setLoading(false);
        } else {
          setLogs([]);
          setSummary(defaultSummary);
          setPagination({ page: 1, pages: 1, limit: requestPayload.limit, total: 0 });
          setError(response?.message || 'No se pudo cargar la auditoría');
          setLoading(false);
        }
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }
        setError(fetchError?.message || 'Error de comunicación con el servidor');
        setLogs([]);
        setSummary(defaultSummary);
        setPagination({ page: 1, pages: 1, limit: requestPayload.limit, total: 0 });
        setLoading(false);
      }
    };

    fetchAudits();

    return () => {
      isMounted = false;
    };
  }, [requestPayload]);

  const handleSelectChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: name === 'limit' ? Number(value) : value,
      page: 1,
    }));
  };

  const handleDateChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters({
      search: '',
      entity: 'all',
      action: 'all',
      user_id: 'all',
      date_from: '',
      date_to: '',
      limit: 25,
      page: 1,
    });
    setExpandedRows(new Set());
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.exportAudits(requestPayload);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria_${new Date().toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando auditoría:', err);
      setError('No se pudo exportar el archivo. Inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  const handlePageChange = (direction) => {
    setFilters((prev) => {
      const totalPages = pagination.pages || 1;
      const nextPage = direction === 'prev' ? Math.max(1, prev.page - 1) : Math.min(totalPages, prev.page + 1);
      if (nextPage === prev.page) {
        return prev;
      }
      return { ...prev, page: nextPage };
    });
  };

  const toggleDetails = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderChanges = (changes) => {
    if (!changes) {
      return 'Sin detalles disponibles';
    }

    if (typeof changes === 'string') {
      return changes;
    }

    return (
      <pre className="audits-json">{JSON.stringify(changes, null, 2)}</pre>
    );
  };

  const limitOptions = useMemo(() => [10, 25, 50, 100], []);

  return (
    <div className="audits-wrapper">
      <div className="audits-header">
        <div>
          <h1>Auditoría del Sistema</h1>
          <p>Registro detallado de acciones realizadas en la plataforma</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="audits-button ghost"
            onClick={handleExport}
            disabled={exporting}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 4H19M9 4V2M15 4V2M6 11H18M6 17H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {exporting ? 'Exportando...' : 'Exportar'}
          </button>
          <button type="button" className="audits-button ghost" onClick={handleResetFilters}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Limpiar filtros
          </button>
        </div>
      </div>

      {error && <div className="audits-alert error">{error}</div>}

      <section className="audits-summary-grid">
        <article className="audits-summary-card primary">
          <h3>Total de eventos</h3>
          <p className="audits-summary-value">{summary.total ?? 0}</p>
          <span>En el periodo filtrado</span>
        </article>
        <article className="audits-summary-card">
          <h3>Acciones por módulo</h3>
          {summary.by_entity.length === 0 ? (
            <p className="audits-empty">No hay datos</p>
          ) : (
            <ul>
              {summary.by_entity.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="audits-summary-card">
          <h3>Tipos de acciones</h3>
          {summary.by_action.length === 0 ? (
            <p className="audits-empty">No hay datos</p>
          ) : (
            <ul>
              {summary.by_action.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="audits-summary-card">
          <h3>Usuarios activos</h3>
          {summary.recent_users.length === 0 ? (
            <p className="audits-empty">No hay datos</p>
          ) : (
            <ul>
              {summary.recent_users.map((user) => (
                <li key={`${user.id}-${user.email}`}>
                  <span>{user.nombre || user.email || 'Desconocido'}</span>
                  <strong>{user.total} eventos</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="audits-filters">
        <div className="filters-title">Filtros y Búsqueda</div>
        <div className="filters-controls">
          <div className="search-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#9aa2b1" strokeWidth="1.5" />
              <path d="M20 20L17 17" stroke="#9aa2b1" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por usuario, acción o entidad..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="filter-select-group">
            <select name="entity" value={filters.entity} onChange={handleSelectChange}>
              <option value="all">Todos los módulos</option>
              {filterOptions.entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
            <select name="action" value={filters.action} onChange={handleSelectChange}>
              <option value="all">Todas las acciones</option>
              {filterOptions.actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <select name="user_id" value={filters.user_id} onChange={handleSelectChange}>
              <option value="all">Todos los usuarios</option>
              {filterOptions.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre || user.email || `ID ${user.id}`}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleDateChange}
              aria-label="Fecha desde"
              className="date-input"
            />
            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleDateChange}
              aria-label="Fecha hasta"
              className="date-input"
            />
            <select name="limit" value={filters.limit} onChange={handleSelectChange} className="limit-select">
              {limitOptions.map((option) => (
                <option key={option} value={option}>
                  {option} por pág.
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="audits-table-wrapper">
        <table className="audits-table">
          <thead>
            <tr>
              <th>Acción</th>
              <th>Módulo</th>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="audits-loading">
                  Cargando historial de auditoría...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="audits-empty">
                  No hay registros que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr>
                    <td>
                      <div className="audits-action">
                        <strong>{log.accion}</strong>
                        {log.entidad_id && <span>ID #{log.entidad_id}</span>}
                      </div>
                    </td>
                    <td>{log.entidad || '-'}</td>
                    <td>
                      <div className="audits-user">
                        <strong>{log.nombre_usuario || 'Desconocido'}</strong>
                        <span>{log.usuario_email || 'Sin correo'}</span>
                      </div>
                    </td>
                    <td>{formatDateTime(log.fecha)}</td>
                    <td>
                      <button
                        type="button"
                        className="audits-toggle"
                        onClick={() => toggleDetails(log.id)}
                      >
                        {expandedRows.has(log.id) ? 'Ocultar' : 'Ver detalle'}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(log.id) && (
                    <tr className="audits-details-row">
                      <td colSpan={5}>{renderChanges(log.cambios)}</td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="audits-pagination">
        <button type="button" onClick={() => handlePageChange('prev')} disabled={pagination.page <= 1 || loading}>
          Anterior
        </button>
        <span>
          Página {pagination.page} de {pagination.pages || 1}
        </span>
        <button
          type="button"
          onClick={() => handlePageChange('next')}
          disabled={pagination.page >= (pagination.pages || 1) || loading}
        >
          Siguiente
        </button>
        <span className="audits-total">
          {pagination.total} eventos en total
        </span>
      </div>
    </div>
  );
};

export default AuditsView;
