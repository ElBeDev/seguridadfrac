import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaStar, FaExclamationTriangle, FaIdCard, FaTags, FaUser, FaLock, FaCheckCircle, FaShieldAlt, FaEnvelope } from 'react-icons/fa';
import { APP_NAME, SUPPORT_EMAIL } from '../config/branding';
import './Landing.css';

// Reveal-on-scroll accesible: sin JS los elementos quedan visibles; el
// observer solo agrega la clase de entrada, y prefers-reduced-motion lo
// apaga por completo. IntersectionObserver, nunca listeners de scroll.
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.classList.add('reveal-pending');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('reveal-in');
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

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
        navigate(data.user.rol === 'vigilancia' ? '/accesos' : '/inicio');
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
    { icon: <FaCog />, title: 'Gestión de personal', text: 'Empleados y prestadores de servicios de toda la comunidad, en un solo registro.' },
    { icon: <FaStar />, title: 'Referencias reales', text: 'Calificaciones e historial laboral aportados por tus propios vecinos.' },
    { icon: <FaExclamationTriangle />, title: 'Reportes de incidentes', text: 'Incidentes visibles para la comunidad, moderados por administración.' },
    { icon: <FaIdCard />, title: 'Accesos con QR', text: 'Pases de visita con código, validados en caseta al momento.' },
    { icon: <FaTags />, title: 'Directorio de servicios', text: 'Plomeros, electricistas, niñeras y más, por categoría.' },
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

      {/* Hero: eyebrow + headline + subtexto + login (el CTA). Nada más. */}
      <div className="hero-section">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />

        <div className="hero-inner">
          <div className="hero-content">
            <div className="branding-section">
              <span className="hero-eyebrow">
                <FaShieldAlt /> Plataforma de confianza vecinal
              </span>
              <h1 className="hero-headline">
                Tu comunidad,<br />
                <span className="headline-grad">en buenas manos.</span>
              </h1>
              <p className="hero-sub">
                Registra, califica y consulta al personal que entra a tu
                fraccionamiento, con referencias reales de tus vecinos.
              </p>
            </div>

            <div className="login-form-container">
              <div className="login-card">
                <div className="login-header">
                  <h2 className="login-title">Iniciar Sesión</h2>
                  <p className="login-subtitle">Accede a tu cuenta para continuar</p>
                </div>

                <form className="form" onSubmit={handleSubmit}>
                  {error && <div className="login-error">{error}</div>}

                  <label className="input-label" htmlFor="login-email">Correo electrónico</label>
                  <div className="input-container">
                    <FaUser size={16} />
                    <input
                      id="login-email"
                      name="email"
                      autoComplete="email"
                      placeholder="tucorreo@ejemplo.com"
                      required
                      className="input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <label className="input-label" htmlFor="login-password">Contraseña</label>
                  <div className="input-container">
                    <FaLock size={16} />
                    <input
                      id="login-password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="Tu contraseña"
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
                    <span>Conexión cifrada</span>
                  </div>
                  <div className="trust-item">
                    <FaShieldAlt size={13} />
                    <span>Acceso solo a vecinos verificados</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skyline del fraccionamiento */}
        <img className="hero-skyline" src="/skyline.svg" alt="" aria-hidden="true" />
      </div>

      {/* Features: fuera del hero, mismo tema oscuro */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <Reveal>
            <h2 className="section-headline">Lo que tu fraccionamiento resuelve aquí</h2>
          </Reveal>
          <div className="features-grid">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className="feature-card">
                  <span className="feature-chip">{f.icon}</span>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats: sección propia */}
      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <div className="hero-stats">
            {[
              { number: empleadosCount !== null ? String(empleadosCount) : '…', text: 'Empleados registrados' },
              { number: '4', text: 'Criterios de calificación' },
              { number: '12', text: 'Categorías de servicio' },
              { number: '24/7', text: 'Consulta disponible' },
            ].map((s, i) => (
              <Reveal key={s.text} delay={i * 70}>
                <div className="hero-stat">
                  <div className="stat-number">{s.number}</div>
                  <div className="stat-text">{s.text}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA para administraciones (prospectos) */}
      <section className="landing-section">
        <div className="landing-section-inner prospect-cta">
          <Reveal>
            <h2 className="section-headline">¿Administras un fraccionamiento?</h2>
            <p className="prospect-sub">
              {APP_NAME} se instala con la marca y colores de tu comunidad.
            </p>
            <a className="prospect-button" href={`mailto:${SUPPORT_EMAIL}?subject=Demo de ${APP_NAME}`}>
              <FaEnvelope /> Escríbenos para una demo
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

export default Landing;
