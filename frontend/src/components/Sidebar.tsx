import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaUsers, FaBell, FaChartBar, FaShieldAlt, FaSignOutAlt, FaBullhorn, FaIdBadge, FaWallet, FaSearch, FaBars, FaTimes } from 'react-icons/fa';
import { APP_NAME } from '../config/branding';
import './Sidebar.css';

interface NavItem { path: string; icon: React.ComponentType; label: string }

function Sidebar() {
  const location = useLocation();
  const [busqueda, setBusqueda] = useState('');
  // En celular y tablet el menú es un panel que se abre desde la barra de arriba
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto]);

  let user: { nombre_completo?: string; email?: string; rol?: string } = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch { /* localStorage corrupto: mostramos fallback */ }

  const nombre = user.nombre_completo || 'Usuario';
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  const esAdmin = user.rol === 'admin';
  const esVigilancia = user.rol === 'vigilancia';

  // Grid de accesos rápidos (estilo Azure) + secciones de lista
  const tiles: NavItem[] = esVigilancia
    ? [{ path: '/accesos', icon: FaIdBadge, label: 'Accesos' }]
    : [
        { path: '/inicio', icon: FaHome, label: 'Inicio' },
        { path: '/empleados', icon: FaUsers, label: 'Empleados' },
        { path: '/accesos', icon: FaIdBadge, label: 'Accesos' },
        { path: '/finanzas', icon: FaWallet, label: 'Finanzas' },
      ];

  const secciones: { titulo: string; items: NavItem[] }[] = esVigilancia
    ? []
    : [
        {
          titulo: 'Comunidad',
          items: [
            { path: '/comunidad', icon: FaBullhorn, label: 'Comunidad' },
            { path: '/notificaciones', icon: FaBell, label: 'Notificaciones' },
          ],
        },
        {
          titulo: 'Sistema',
          items: [
            { path: '/system-stats', icon: FaChartBar, label: 'Estadísticas' },
            ...(esAdmin ? [{ path: '/admin', icon: FaShieldAlt, label: 'Admin' }] : []),
          ],
        },
      ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const q = busqueda.trim().toLowerCase();
  const todo: NavItem[] = [...tiles, ...secciones.flatMap(s => s.items)];
  const resultados = q ? todo.filter(i => i.label.toLowerCase().includes(q)) : [];

  const seccionActual = todo.find(i => i.path === location.pathname)?.label;

  return (
    <>
    <header className="mobile-bar">
      <img alt={APP_NAME} src="/logo.svg" />
      <span className="mobile-bar-title">{seccionActual || APP_NAME}</span>
      <button
        className="mobile-bar-toggle"
        onClick={() => setAbierto(a => !a)}
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={abierto}
        aria-controls="menu-principal"
      >
        {abierto ? <FaTimes /> : <FaBars />}
      </button>
    </header>
    <div className={`sidebar-backdrop ${abierto ? 'open' : ''}`} onClick={() => setAbierto(false)} aria-hidden />
    <aside id="menu-principal" className={`sidebar ${abierto ? 'open' : ''}`}>
      <div className="sidebar-header">
        <img alt={APP_NAME} src="/logo.svg" />
        <div className="brand-text">
          <span className="brand-name">{APP_NAME}</span>
          <span className="brand-sub">Comunidad segura</span>
        </div>
      </div>

      <div className="sidebar-search">
        <FaSearch />
        <input
          type="search"
          placeholder="Buscar sección"
          aria-label="Buscar sección del menú"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Al elegir una sección el panel se cierra solo */}
      <nav className="sidebar-nav" onClick={e => { if ((e.target as HTMLElement).closest('a')) setAbierto(false); }}>
        {q ? (
          <div className="nav-section">
            <span className="nav-section-title">Resultados</span>
            {resultados.length === 0 && <span className="nav-empty">Sin coincidencias</span>}
            {resultados.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => setBusqueda('')}
                >
                  <span className="nav-icon"><Icon /></span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <>
            <div className={`quick-grid ${tiles.length === 1 ? 'quick-solo' : ''}`}>
              {tiles.map(tile => {
                const Icon = tile.icon;
                return (
                  <Link
                    key={tile.path}
                    to={tile.path}
                    className={`quick-tile ${location.pathname === tile.path ? 'active' : ''}`}
                  >
                    <span className="quick-icon"><Icon /></span>
                    <span>{tile.label}</span>
                  </Link>
                );
              })}
            </div>

            {secciones.map(seccion => (
              <div className="nav-section" key={seccion.titulo}>
                <span className="nav-section-title">{seccion.titulo}</span>
                {seccion.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    >
                      <span className="nav-icon"><Icon /></span>
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <span className="user-avatar">{iniciales || 'U'}</span>
          <div className="user-meta">
            <span className="user-name">{nombre}</span>
            <span className="user-email">{user.email || (esVigilancia ? 'Caseta' : user.rol === 'admin' ? 'Administración' : 'Propietario')}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Cerrar sesión" aria-label="Cerrar sesión">
            <FaSignOutAlt />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}

export default Sidebar;
