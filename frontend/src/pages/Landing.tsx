import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaStar, FaExclamationTriangle, FaIdCard, FaTags, FaUser, FaLock, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import { APP_NAME } from '../config/branding';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [empleadosCount, setEmpleadosCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/empleados')
      .then(r => (r.ok ? r.json() : []))
      .then((data) => Array.isArray(data) && setEmpleadosCount(data.length))
      .catch(() => { /* sin red: dejamos el fallback */ });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/inicio');
      } else {
        setError(data.error || 'Credenciales inválidas');
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <FaCog />, text: 'Gestión general de empleados y prestadores de servicios.' },
    { icon: <FaStar />, text: 'Referencias laborales, calificaciones e historial.' },
    { icon: <FaExclamationTriangle />, text: 'Reporta incidentes para proteger a tu comunidad.' },
    { icon: <FaIdCard />, text: 'Búsqueda rápida por CURP y datos personales.' },
    { icon: <FaTags />, text: 'Directorio de servicios por categorías.' },
  ];

  return (
    <div className="login-page-root">
      {/* Navbar glass */}
      <header className="top-nav">
        <div className="top-nav-brand">
          <img alt={APP_NAME} src="/logo.svg" />
          <span>{APP_NAME}</span>
        </div>
        <span className="top-nav-tag">Referencias laborales para tu fraccionamiento</span>
      </header>

      <div className="hero-section">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />

        <div className="hero-inner">
          <div className="hero-content">
            {/* Columna izquierda: pitch + features */}
            <div className="branding-section">
              <span className="hero-eyebrow">
                <FaShieldAlt /> Plataforma de confianza vecinal
              </span>
              <h1 className="hero-headline">
                Tu comunidad,<br />
                <span className="headline-grad">en buenas manos.</span>
              </h1>
              <p className="hero-sub">
                Registra, califica y consulta al personal doméstico y de
                servicios que entra a tu fraccionamiento — con referencias
                reales de tus propios vecinos.
              </p>

              <div className="hero-features">
                {features.map((f, i) => (
                  <div className="hero-feature" key={i} style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
                    <span className="feature-chip">{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna derecha: login */}
            <div className="login-form-container">
              <div className="login-card">
                <div className="login-header">
                  <h2 className="login-title">Iniciar Sesión</h2>
                  <p className="login-subtitle">Accede a tu cuenta para continuar</p>
                </div>

                <form className="form" onSubmit={handleSubmit}>
                  {error && <div className="login-error">{error}</div>}

                  <div className="input-container">
                    <FaUser size={16} />
                    <input
                      placeholder="Correo electrónico"
                      required
                      className="input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="input-container">
                    <FaLock size={16} />
                    <input
                      placeholder="Contraseña"
                      required
                      className="input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="login-button" disabled={loading}>
                    {loading ? 'Iniciando sesión...' : 'Entrar a mi comunidad'}
                  </button>
                </form>

                <div className="trust-section">
                  <div className="trust-item">
                    <FaCheckCircle size={13} />
                    <span>Datos 100% seguros</span>
                  </div>
                  <div className="trust-item">
                    <FaShieldAlt size={13} />
                    <span>Acceso solo a vecinos verificados</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="stat-number">{empleadosCount !== null ? empleadosCount : '—'}</div>
              <div className="stat-text">Empleados registrados</div>
            </div>
            <div className="hero-stat">
              <div className="stat-number">4</div>
              <div className="stat-text">Criterios de calificación</div>
            </div>
            <div className="hero-stat">
              <div className="stat-number">12</div>
              <div className="stat-text">Categorías de servicio</div>
            </div>
            <div className="hero-stat">
              <div className="stat-number">24/7</div>
              <div className="stat-text">Consulta disponible</div>
            </div>
          </div>
        </div>

        {/* Skyline del fraccionamiento */}
        <img className="hero-skyline" src="/skyline.svg" alt="" aria-hidden="true" />
      </div>
    </div>
  );
}

export default Landing;
