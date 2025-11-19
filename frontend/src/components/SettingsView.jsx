import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './Settings.css';
import './ProductModal.css';
import api from '../services/api';

const defaultSettings = {
  general: {
    nombre_empresa: 'Sistema de Inventarios',
    correo_soporte: 'soporte@inventarios.com',
    telefono: '',
    moneda: 'USD',
    zona_horaria: 'UTC',
    formato_fecha: 'DD/MM/YYYY',
  },
  branding: {
    tema: 'verde',
    color_primario: '#239C56',
    color_secundario: '#1B7B43',
    logo_url: '/imgs/gestoricon.webp',
    favicon_url: '/imgs/gestoricon.webp',
  },
  notificaciones: {
    correo_alertas: true,
    notificaciones_push: false,
    resumen_diario: true,
    umbral_stock: 20,
    recordatorio_pedidos: true,
  },
  seguridad: {
    two_factor: false,
    expiracion_sesion: 60,
    politica_contrasena: 'media',
    intentos_login: 5,
  },
};

const currencyOptions = [
  { value: 'USD', label: 'USD - Dólar estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'COP', label: 'COP - Peso colombiano' },
  { value: 'MXN', label: 'MXN - Peso mexicano' },
  { value: 'ARS', label: 'ARS - Peso argentino' },
];

const timezoneOptions = [
  'America/Bogota',
  'America/Mexico_City',
  'America/Santiago',
  'America/Lima',
  'Europe/Madrid',
  'UTC',
];

const dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

const languageOptions = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
];

const themeOptions = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

const roleLabels = {
  admin: 'Administrador',
  inventory_manager: 'Gestor de Inventario',
  buyer: 'Comprador',
  auditor: 'Auditor',
};

const SettingsView = () => {
  const initialUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('No se pudo leer la información del usuario en localStorage', error);
      return {};
    }
  }, []);

  const [currentUser, setCurrentUser] = useState(initialUser);
  const isAdmin = currentUser?.rol === 'admin';

  const profilePrefsKey = useMemo(
    () => (currentUser?.id ? `profile_prefs_${currentUser.id}` : null),
    [currentUser]
  );

  const [profileForm, setProfileForm] = useState({
    nombre: currentUser?.nombre || '',
    email: currentUser?.email || '',
    password: '',
    confirmPassword: '',
    avatar: null,
    avatarPreview: currentUser?.avatar ? `${api.API_BASE_URL.replace('/api', '')}${currentUser.avatar}` : null
  });

  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    idioma: 'es',
    tema_ui: 'auto',
    avisos_email: true,
  });

  const profileInitials = useMemo(() => {
    const name = currentUser?.nombre || '';
    if (!name.trim()) {
      return 'US';
    }
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'US';
  }, [currentUser]);

  const profileRoleLabel = useMemo(() => {
    const role = currentUser?.rol;
    if (!role) return 'Invitado';
    return roleLabels[role] || role;
  }, [currentUser]);

  const isProfileEditable = Boolean(currentUser?.id);

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({
    general: false,
    branding: false,
    notificaciones: false,
    seguridad: false,
  });
  const [message, setMessage] = useState(null);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  useEffect(() => {
    setProfileForm({
      nombre: currentUser?.nombre || '',
      email: currentUser?.email || '',
      password: '',
      confirmPassword: '',
      avatar: null,
      avatarPreview: currentUser?.avatar ? `${api.API_BASE_URL.replace('/api', '')}${currentUser.avatar}` : null
    });
  }, [currentUser]);

  useEffect(() => {
    if (!profilePrefsKey) return;
    try {
      const stored = localStorage.getItem(profilePrefsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (error) {
      console.error('No se pudieron cargar las preferencias personales', error);
    }
  }, [profilePrefsKey]);

  useEffect(() => {
    let mounted = true;

    const fetchSettings = async () => {
      try {
        const response = await api.getSettings();
        if (mounted && response?.success) {
          setSettings((prev) => ({
            ...prev,
            ...response.data.settings,
          }));
        }
      } catch (error) {
        console.error('No se pudieron cargar las configuraciones', error);
        showMessage('error', error?.message || 'No se pudieron cargar las configuraciones');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      mounted = false;
    };
  }, [showMessage]);

  const handleChange = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleToggle = (section, field) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field],
      },
    }));
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePreferenceToggle = (field) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const [avatarLoading, setAvatarLoading] = useState(false);

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    
    // Preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm((prev) => ({
        ...prev,
        avatarPreview: reader.result
      }));
    };
    reader.readAsDataURL(file);

    // Upload immediately
    const formData = new FormData();
    formData.append('avatar', file);

    setAvatarLoading(true);
    try {
      const response = await api.updateUser(currentUser.id, formData);
      if (!response?.success) {
        throw new Error(response?.message || 'No se pudo subir la imagen');
      }
      const updatedUser = response.data?.user;
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      showMessage('success', 'Foto de perfil actualizada');
    } catch (error) {
      console.error('Error uploading avatar', error);
      showMessage('error', error?.message || 'No se pudo subir la imagen');
      // Revert preview if failed
      setProfileForm((prev) => ({
        ...prev,
        avatarPreview: currentUser?.avatar ? `${api.API_BASE_URL.replace('/api', '')}${currentUser.avatar}` : null
      }));
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar tu foto de perfil?')) {
      return;
    }

    const formData = new FormData();
    formData.append('remove_avatar', 'true');

    setAvatarLoading(true);
    try {
      const response = await api.updateUser(currentUser.id, formData);
      if (!response?.success) {
        throw new Error(response?.message || 'No se pudo eliminar la imagen');
      }
      const updatedUser = response.data?.user;
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfileForm((prev) => ({
        ...prev,
        avatarPreview: null
      }));
      showMessage('success', 'Foto de perfil eliminada');
    } catch (error) {
      console.error('Error removing avatar', error);
      showMessage('error', error?.message || 'No se pudo eliminar la imagen');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleProfileFieldChange = (field, value) => {
    if (field === 'avatar') {
      handleAvatarUpload(value);
    } else {
      setProfileForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
    if (profileErrors[field]) {
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleProfileSave = async () => {
    if (!currentUser?.id) {
      showMessage('error', 'No se pudo identificar al usuario actual');
      return;
    }

    const errors = {};
    if (!profileForm.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio';
    }
    if (
      !profileForm.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim())
    ) {
      errors.email = 'Correo electrónico inválido';
    }
    if (profileForm.password) {
      if (profileForm.password.length < 6) {
        errors.password = 'La contraseña debe tener al menos 6 caracteres';
      }
      if (profileForm.password !== profileForm.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    const formData = new FormData();
    formData.append('nombre', profileForm.nombre.trim());
    formData.append('email', profileForm.email.trim());
    formData.append('rol', currentUser?.rol);
    formData.append('activo', currentUser?.activo ?? 1);
    
    if (profileForm.password) {
      formData.append('password', profileForm.password);
    }

    setProfileSaving(true);
    try {
      const response = await api.updateUser(currentUser.id, formData);
      if (!response?.success) {
        throw new Error(response?.message || 'No se pudo actualizar el perfil');
      }
      const updatedUser = response.data?.user;
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfileForm((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));
      setProfileErrors({});
      showMessage('success', 'Perfil actualizado correctamente');
    } catch (error) {
      console.error('No se pudo actualizar el perfil', error);
      showMessage('error', error?.message || 'No se pudo actualizar el perfil');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePreferencesSave = () => {
    if (!profilePrefsKey) {
      showMessage('error', 'No se pudieron guardar las preferencias');
      return;
    }
    setPreferencesSaving(true);
    try {
      localStorage.setItem(profilePrefsKey, JSON.stringify(preferences));
      showMessage('success', 'Preferencias personales guardadas');
    } catch (error) {
      console.error('No se pudieron guardar las preferencias personales', error);
      showMessage('error', 'No se pudieron guardar las preferencias');
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handleSave = async (section) => {
    setSaving((prev) => ({ ...prev, [section]: true }));
    try {
      const payload = settings[section];
      const response = await api.updateSettings(section, payload);
      if (!response?.success) {
        throw new Error(response?.message || 'No se pudo guardar la configuración');
      }
      showMessage('success', 'Configuración actualizada correctamente');
    } catch (error) {
      showMessage('error', error?.message || 'No se pudo guardar la configuración');
    } finally {
      setSaving((prev) => ({ ...prev, [section]: false }));
    }
  };

  const renderProfile = () => (
    <section className="settings-card profile-card">
      <div className="profile-header">
        <div className="profile-avatar-container">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar large">
              {avatarLoading ? (
                <div className="avatar-loading">...</div>
              ) : profileForm.avatarPreview ? (
                <img 
                  src={profileForm.avatarPreview} 
                  alt="Avatar" 
                  className="avatar-image"
                />
              ) : (
                profileInitials
              )}
            </div>
            <label className="avatar-overlay" htmlFor="avatar-upload">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => handleProfileFieldChange('avatar', e.target.files[0])}
              disabled={!isProfileEditable || avatarLoading}
              className="hidden-input"
            />
          </div>
          {profileForm.avatarPreview && !avatarLoading && (
            <button 
              type="button" 
              className="remove-avatar-btn"
              onClick={handleAvatarRemove}
              title="Eliminar foto"
            >
              Eliminar foto
            </button>
          )}
        </div>
        <div className="profile-info-header">
          <h2>Perfil personal</h2>
          <p>Actualiza tu información básica, foto y preferencias.</p>
        </div>
      </div>

      <div className="profile-meta">
        <span className="profile-name">{currentUser?.nombre || 'Usuario'}</span>
        <span className="profile-role">{profileRoleLabel}</span>
      </div>

      <div className="profile-grid">


        <div className="settings-field">
          <label>Nombre completo</label>
          <input
            type="text"
            value={profileForm.nombre}
            onChange={(e) => handleProfileFieldChange('nombre', e.target.value)}
            disabled={!isProfileEditable}
            placeholder="Tu nombre y apellidos"
          />
          {profileErrors.nombre && <span className="modal-error">{profileErrors.nombre}</span>}
        </div>

        <div className="settings-field">
          <label>Correo electrónico</label>
          <input
            type="email"
            value={profileForm.email}
            onChange={(e) => handleProfileFieldChange('email', e.target.value)}
            disabled={!isProfileEditable}
            placeholder="usuario@empresa.com"
          />
          {profileErrors.email && <span className="modal-error">{profileErrors.email}</span>}
        </div>

        <div className="settings-field">
          <label>Nueva contraseña</label>
          <input
            type="password"
            value={profileForm.password}
            onChange={(e) => handleProfileFieldChange('password', e.target.value)}
            disabled={!isProfileEditable}
            placeholder="Opcional"
          />
          {profileErrors.password && <span className="modal-error">{profileErrors.password}</span>}
        </div>

        <div className="settings-field">
          <label>Confirmar contraseña</label>
          <input
            type="password"
            value={profileForm.confirmPassword}
            onChange={(e) => handleProfileFieldChange('confirmPassword', e.target.value)}
            disabled={!isProfileEditable}
            placeholder="Repite la contraseña"
          />
          {profileErrors.confirmPassword && (
            <span className="modal-error">{profileErrors.confirmPassword}</span>
          )}
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className="modal-button primary"
          onClick={handleProfileSave}
          disabled={profileSaving || !isProfileEditable}
        >
          {profileSaving ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </div>

      <div className="settings-subsection">
        <h3>Preferencias personales</h3>
        <p>Estos ajustes solo aplican para tu cuenta y dispositivo.</p>
      </div>

      <div className="settings-card-body grid preferences-grid">
        <div className="settings-field">
          <label>Idioma de la interfaz</label>
          <select
            value={preferences.idioma}
            onChange={(e) => handlePreferenceChange('idioma', e.target.value)}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-field">
          <label>Modo de visualización</label>
          <select
            value={preferences.tema_ui}
            onChange={(e) => handlePreferenceChange('tema_ui', e.target.value)}
          >
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-toggle">
          <div>
            <strong>Resumen por correo</strong>
            <span>Recibe un resumen semanal con actividad relevante.</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={preferences.avisos_email}
              onChange={() => handlePreferenceToggle('avisos_email')}
            />
            <span className="slider" />
          </label>
        </div>
      </div>

      <div className="settings-actions secondary">
        <button
          type="button"
          className="modal-button ghost"
          onClick={handlePreferencesSave}
          disabled={preferencesSaving}
        >
          {preferencesSaving ? 'Guardando…' : 'Guardar preferencias'}
        </button>
      </div>
    </section>
  );

  const handleResetDefaults = async () => {
    if (!window.confirm('¿Estás seguro de que deseas restablecer todas las configuraciones a sus valores predeterminados? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.resetSettings();
      if (response?.success) {
        setSettings((prev) => ({
          ...prev,
          ...response.data.settings,
        }));
        showMessage('success', 'Configuraciones restablecidas correctamente');
      } else {
        throw new Error(response?.message || 'Error al restablecer configuraciones');
      }
    } catch (error) {
      console.error('Error reset settings:', error);
      showMessage('error', error?.message || 'No se pudieron restablecer las configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const renderAdminNotice = () => (
    <section className="settings-card info-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Configuraciones administrativas</h2>
          <p>
            Estas opciones solo están disponibles para administradores del sistema.
          </p>
        </div>
        <button
          type="button"
          className="modal-button danger"
          onClick={handleResetDefaults}
          style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
        >
          Restablecer valores predeterminados
        </button>
      </div>
    </section>
  );

  const renderGeneral = () => (
    <section className="settings-card">
      <header className="settings-card-header">
        <div>
          <h2>Preferencias generales</h2>
          <p>Define los datos principales y parámetros regionales.</p>
        </div>
        <button
          type="button"
          className="modal-button primary"
          onClick={() => handleSave('general')}
          disabled={saving.general}
        >
          {saving.general ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </header>
      <div className="settings-card-body grid">
        <div className="settings-field">
          <label htmlFor="nombre_empresa">Nombre de la empresa</label>
          <input
            id="nombre_empresa"
            type="text"
            value={settings.general.nombre_empresa}
            onChange={(e) => handleChange('general', 'nombre_empresa', e.target.value)}
            placeholder="Nombre corporativo"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="correo_soporte">Correo de soporte</label>
          <input
            id="correo_soporte"
            type="email"
            value={settings.general.correo_soporte}
            onChange={(e) => handleChange('general', 'correo_soporte', e.target.value)}
            placeholder="soporte@empresa.com"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="telefono">Teléfono de contacto</label>
          <input
            id="telefono"
            type="text"
            value={settings.general.telefono}
            onChange={(e) => handleChange('general', 'telefono', e.target.value)}
            placeholder="+34 000 000 000"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="moneda">Moneda principal</label>
          <select
            id="moneda"
            value={settings.general.moneda}
            onChange={(e) => handleChange('general', 'moneda', e.target.value)}
          >
            {currencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-field">
          <label htmlFor="zona_horaria">Zona horaria</label>
          <select
            id="zona_horaria"
            value={settings.general.zona_horaria}
            onChange={(e) => handleChange('general', 'zona_horaria', e.target.value)}
          >
            {timezoneOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-field">
          <label htmlFor="formato_fecha">Formato de fecha</label>
          <select
            id="formato_fecha"
            value={settings.general.formato_fecha}
            onChange={(e) => handleChange('general', 'formato_fecha', e.target.value)}
          >
            {dateFormats.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );

  const renderBranding = () => (
    <section className="settings-card">
      <header className="settings-card-header">
        <div>
          <h2>Identidad visual</h2>
          <p>Personaliza la apariencia del sistema y los recursos gráficos.</p>
        </div>
        <button
          type="button"
          className="modal-button primary"
          onClick={() => handleSave('branding')}
          disabled={saving.branding}
        >
          {saving.branding ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </header>
      <div className="settings-card-body grid">
        <div className="settings-field">
          <label>Tema</label>
          <select
            value={settings.branding.tema}
            onChange={(e) => handleChange('branding', 'tema', e.target.value)}
          >
            <option value="verde">Verde (predeterminado)</option>
            <option value="azul">Azul</option>
            <option value="gris">Gris</option>
          </select>
        </div>
        <div className="settings-field">
          <label>Color primario</label>
          <div className="color-input">
            <input
              type="color"
              value={settings.branding.color_primario}
              onChange={(e) => handleChange('branding', 'color_primario', e.target.value)}
            />
            <input
              type="text"
              value={settings.branding.color_primario}
              onChange={(e) => handleChange('branding', 'color_primario', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-field">
          <label>Color secundario</label>
          <div className="color-input">
            <input
              type="color"
              value={settings.branding.color_secundario}
              onChange={(e) => handleChange('branding', 'color_secundario', e.target.value)}
            />
            <input
              type="text"
              value={settings.branding.color_secundario}
              onChange={(e) => handleChange('branding', 'color_secundario', e.target.value)}
            />
          </div>
        </div>
        <div className="settings-field">
          <label>Logo principal (URL)</label>
          <input
            type="text"
            value={settings.branding.logo_url}
            onChange={(e) => handleChange('branding', 'logo_url', e.target.value)}
            placeholder="/imgs/gestoricon.webp"
          />
        </div>
        <div className="settings-field">
          <label>Favicon (URL)</label>
          <input
            type="text"
            value={settings.branding.favicon_url}
            onChange={(e) => handleChange('branding', 'favicon_url', e.target.value)}
            placeholder="/imgs/gestoricon.webp"
          />
        </div>
        <div className="settings-preview">
          <span>Previsualización</span>
          <div className="branding-preview">
            <div
              className="branding-logo"
              style={{ backgroundColor: settings.branding.color_primario }}
            >
              <img src={settings.branding.logo_url} alt="Logo actual" />
            </div>
            <div className="branding-theme">
              <span>Color primario</span>
              <div style={{ backgroundColor: settings.branding.color_primario }} />
              <span>Color secundario</span>
              <div style={{ backgroundColor: settings.branding.color_secundario }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderNotifications = () => (
    <section className="settings-card">
      <header className="settings-card-header">
        <div>
          <h2>Alertas y notificaciones</h2>
          <p>Controla cómo y cuándo recibir novedades del inventario.</p>
        </div>
        <button
          type="button"
          className="modal-button primary"
          onClick={() => handleSave('notificaciones')}
          disabled={saving.notificaciones}
        >
          {saving.notificaciones ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </header>
      <div className="settings-card-body grid">
        <div className="settings-toggle">
          <div>
            <strong>Alertas por correo</strong>
            <span>Recibe un correo cuando existan alertas críticas o stock bajo.</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.notificaciones.correo_alertas}
              onChange={() => handleToggle('notificaciones', 'correo_alertas')}
            />
            <span className="slider" />
          </label>
        </div>
        <div className="settings-toggle">
          <div>
            <strong>Notificaciones push</strong>
            <span>Activa los mensajes en tiempo real dentro de la plataforma.</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.notificaciones.notificaciones_push}
              onChange={() => handleToggle('notificaciones', 'notificaciones_push')}
            />
            <span className="slider" />
          </label>
        </div>
        <div className="settings-toggle">
          <div>
            <strong>Resumen diario</strong>
            <span>Recibe un resumen con indicadores clave y alertas.</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.notificaciones.resumen_diario}
              onChange={() => handleToggle('notificaciones', 'resumen_diario')}
            />
            <span className="slider" />
          </label>
        </div>
        <div className="settings-field">
          <label>Umbral de stock bajo (%)</label>
          <input
            type="number"
            min="0"
            value={settings.notificaciones.umbral_stock}
            onChange={(e) =>
              handleChange('notificaciones', 'umbral_stock', Number(e.target.value))
            }
          />
        </div>
        <div className="settings-toggle">
          <div>
            <strong>Recordatorio de pedidos</strong>
            <span>Activa avisos para pedidos en tránsito o pendientes.</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.notificaciones.recordatorio_pedidos}
              onChange={() => handleToggle('notificaciones', 'recordatorio_pedidos')}
            />
            <span className="slider" />
          </label>
        </div>
      </div>
    </section>
  );

  const renderSecurity = () => (
    <section className="settings-card">
      <header className="settings-card-header">
        <div>
          <h2>Seguridad y acceso</h2>
          <p>Define políticas de autenticación y resguardo de la información.</p>
        </div>
        <button
          type="button"
          className="modal-button primary"
          onClick={() => handleSave('seguridad')}
          disabled={saving.seguridad}
        >
          {saving.seguridad ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </header>
      <div className="settings-card-body grid">
        <div className="settings-toggle">
          <div>
            <strong>Autenticación de dos factores</strong>
            <span>Solicita un código adicional para iniciar sesión.</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.seguridad.two_factor}
              onChange={() => handleToggle('seguridad', 'two_factor')}
            />
            <span className="slider" />
          </label>
        </div>
        <div className="settings-field">
          <label>Expiración de sesión (minutos)</label>
          <input
            type="number"
            min="5"
            value={settings.seguridad.expiracion_sesion}
            onChange={(e) =>
              handleChange('seguridad', 'expiracion_sesion', Number(e.target.value))
            }
          />
        </div>
        <div className="settings-field">
          <label>Política de contraseña</label>
          <select
            value={settings.seguridad.politica_contrasena}
            onChange={(e) => handleChange('seguridad', 'politica_contrasena', e.target.value)}
          >
            <option value="baja">Baja (mínimo 6 caracteres)</option>
            <option value="media">Media (8 caracteres + números)</option>
            <option value="alta">Alta (12 caracteres + símbolos)</option>
          </select>
        </div>
        <div className="settings-field">
          <label>Intentos de inicio de sesión</label>
          <input
            type="number"
            min="1"
            value={settings.seguridad.intentos_login}
            onChange={(e) =>
              handleChange('seguridad', 'intentos_login', Number(e.target.value))
            }
          />
        </div>
      </div>
    </section>
  );

  return (
    <div className="dashboard-content">
      <div className="content-header">
        <div>
          <h1>Configuración del sistema</h1>
          <p>Administra la identidad, preferencias y políticas de tu plataforma.</p>
        </div>
      </div>

      {message && (
        <div className={`settings-toast ${message.type}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="settings-loading">Cargando configuraciones…</div>
      ) : (
        <div className="settings-grid">
          {renderProfile()}
          {isAdmin ? (
            <>
              {renderGeneral()}
              {renderBranding()}
              {renderNotifications()}
              {renderSecurity()}
              {renderAdminNotice()}
            </>
          ) : (
            renderAdminNotice()
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsView;


