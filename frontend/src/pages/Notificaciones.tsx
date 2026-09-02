import { useState, useEffect } from 'react';
import { FaBell, FaCheckCircle, FaExclamationTriangle, FaCheckDouble } from 'react-icons/fa';
import './Notificaciones.css';

interface Notificacion {
  id: string;
  tipo: 'info' | 'success' | 'warning';
  mensaje: string;
  fecha: string;
}

const LEIDAS_KEY = 'notificaciones_leidas';

function getLeidas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LEIDAS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveLeidas(leidas: Set<string>) {
  try {
    localStorage.setItem(LEIDAS_KEY, JSON.stringify([...leidas]));
  } catch { /* storage lleno o bloqueado: el estado vive solo en memoria */ }
}

function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [leidas, setLeidas] = useState<Set<string>>(getLeidas);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/notificaciones', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).message || 'Error al cargar');
        return r.json();
      })
      .then(setNotificaciones)
      .catch(e => setError(e.message || 'Error al conectar con el servidor'))
      .finally(() => setLoading(false));
  }, []);

  const marcarComoLeida = (id: string) => {
    const next = new Set(leidas);
    next.add(id);
    setLeidas(next);
    saveLeidas(next);
  };

  const marcarTodas = () => {
    const next = new Set(notificaciones.map(n => n.id));
    setLeidas(next);
    saveLeidas(next);
  };

  const noLeidas = notificaciones.filter(n => !leidas.has(n.id)).length;

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'success': return <FaCheckCircle />;
      case 'warning': return <FaExclamationTriangle />;
      default: return <FaBell />;
    }
  };

  const formatFecha = (iso: string) => {
    const fecha = new Date(iso);
    const diff = Date.now() - fecha.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const horas = Math.floor(mins / 60);
    if (horas < 24) return `Hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `Hace ${dias} día${dias === 1 ? '' : 's'}`;
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="notificaciones-page">
      <div className="page-header">
        <h1>Notificaciones</h1>
        <p className="subtitle">
          Actividad reciente de tu comunidad{noLeidas > 0 ? ` · ${noLeidas} sin leer` : ''}
        </p>
      </div>

      {notificaciones.length > 0 && noLeidas > 0 && (
        <button className="marcar-todas-btn" onClick={marcarTodas}>
          <FaCheckDouble /> Marcar todas como leídas
        </button>
      )}

      <div className="notificaciones-container">
        {loading ? (
          <p>Cargando notificaciones...</p>
        ) : error ? (
          <p className="notif-error">{error}</p>
        ) : notificaciones.length === 0 ? (
          <div className="empty-state">
            {/* Ilustración: campana dormida */}
            <svg width="140" height="110" viewBox="0 0 140 110" fill="none" aria-hidden="true">
              <circle cx="70" cy="52" r="44" fill="#10B981" opacity="0.08" />
              <path d="M70 22c-14 0-24 10-24 24v12l-8 12h64l-8-12V46c0-14-10-24-24-24z" fill="#CBD5E1" />
              <path d="M62 74a8 8 0 0 0 16 0" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="70" cy="18" r="4" fill="#CBD5E1" />
              <text x="104" y="30" fontSize="14" fill="#94A3B8" fontFamily="inherit">z</text>
              <text x="112" y="20" fontSize="18" fill="#94A3B8" fontFamily="inherit">z</text>
            </svg>
            <p>Todo tranquilo por aquí, no hay notificaciones</p>
          </div>
        ) : (
          <div className="notificaciones-list">
            {notificaciones.map((notif) => {
              const leida = leidas.has(notif.id);
              return (
                <div
                  key={notif.id}
                  className={`notificacion-item ${notif.tipo} ${leida ? 'leida' : ''}`}
                  onClick={() => marcarComoLeida(notif.id)}
                >
                  <div className="notif-icon">{getIcon(notif.tipo)}</div>
                  <div className="notif-content">
                    <p className="notif-mensaje">{notif.mensaje}</p>
                    <p className="notif-fecha">{formatFecha(notif.fecha)}</p>
                  </div>
                  {!leida && <div className="notif-badge"></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notificaciones;
