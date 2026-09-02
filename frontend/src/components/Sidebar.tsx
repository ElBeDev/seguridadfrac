import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaUsers, FaBell, FaChartBar, FaShieldAlt, FaSignOutAlt, FaBullhorn, FaIdBadge, FaWallet } from 'react-icons/fa';
import { APP_NAME } from '../config/branding';
import './Sidebar.css';

function Sidebar() {
  const location = useLocation();

  let user: { nombre_completo?: string; rol?: string } = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch { /* localStorage corrupto — mostramos fallback */ }

  const nombre = user.nombre_completo || 'Usuario';
  const rol = user.rol === 'admin' ? 'Administrador' : 'Propietario';
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  const esAdmin = user.rol === 'admin';

  const secciones: { titulo: string; items: { path: string; icon: React.ComponentType; label: string }[] }[] = [
    {
      titulo: 'Principal',
      items: [
        { path: '/inicio', icon: FaHome, label: 'Inicio' },
        { path: '/empleados', icon: FaUsers, label: 'Empleados' },
      ],
    },
    {
      titulo: 'Comunidad',
      items: [
        { path: '/comunidad', icon: FaBullhorn, label: 'Comunidad' },
        { path: '/accesos', icon: FaIdBadge, label: 'Accesos' },
        { path: '/finanzas', icon: FaWallet, label: 'Finanzas' },
      ],
    },
    {
      titulo: 'Sistema',
      items: [
        { path: '/notificaciones', icon: FaBell, label: 'Notificaciones' },
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

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img alt={APP_NAME} src="/logo.svg" />
        <div className="brand-text">
          <span className="brand-name">{APP_NAME}</span>
          <span className="brand-sub">Comunidad segura</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {secciones.map((seccion) => (
          <div className="nav-section" key={seccion.titulo}>
            <span className="nav-section-title">{seccion.titulo}</span>
            {seccion.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <span className="nav-icon">
                    <Icon />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-avatar">{iniciales || 'U'}</span>
          <div className="user-meta">
            <span className="user-name">{nombre}</span>
            <span className="user-rol">{rol}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <FaSignOutAlt />
          <span className="nav-label">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
