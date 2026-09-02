import { useState, useEffect } from 'react';
import { FaUsers, FaStar, FaClipboardList, FaUserShield, FaExclamationTriangle, FaExclamationCircle, FaExclamation } from 'react-icons/fa';
import './SystemStats.css';

/*
 * Colores de gráficas (validados con el validador de paleta del sistema):
 * - Serie única (magnitud): #059669 — contraste 3:1+ sobre blanco.
 * - Trío categórico estados: #059669 / #0284C7 / #D97706 — CVD PASS, 3:1+.
 * - Ramp ordinal severidad (leve→grave): #FB923C → #EA580C → #9A3412.
 */
const SINGLE_HUE = '#059669';
const ESTADO_COLORS: { key: string; label: string; color: string }[] = [
  { key: 'disponibles', label: 'Disponibles', color: '#059669' },
  { key: 'trabajando', label: 'Trabajando', color: '#0284C7' },
  { key: 'inactivos', label: 'Inactivos', color: '#D97706' },
];
const SEVERIDAD: { key: string; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'advertencia_leve', label: 'Leve', color: '#FB923C', icon: <FaExclamation /> },
  { key: 'advertencia_moderada', label: 'Moderada', color: '#EA580C', icon: <FaExclamationCircle /> },
  { key: 'advertencia_grave', label: 'Grave', color: '#9A3412', icon: <FaExclamationTriangle /> },
];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface Stats {
  totales: {
    empleados: number; disponibles: number; trabajando: number; inactivos: number;
    propietarios: number; reportes: number; reportes_pendientes: number; solicitudes: number;
  };
  ratingPromedios: { puntualidad: string | null; limpieza: string | null; personalidad: string | null; calidad_servicio: string | null };
  porServicio: { servicio: string; total: number }[];
  porMes: { mes: string; total: number }[];
  reportesPorTipo: { tipo_reporte: string; total: number }[];
}

interface TooltipState { x: number; y: number; text: string }

/* Barra horizontal con esquina redondeada solo en el extremo del dato */
function roundedRightRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, Math.max(w, 0.01), h / 2);
  return `M${x},${y} h${Math.max(w - rr, 0)} a${rr},${rr} 0 0 1 ${rr},${rr} v${h - 2 * rr} a${rr},${rr} 0 0 1 -${rr},${rr} h-${Math.max(w - rr, 0)} z`;
}

function roundedTopRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, Math.max(h, 0.01));
  return `M${x},${y + h} v-${Math.max(h - rr, 0)} a${rr},${rr} 0 0 1 ${rr},-${rr} h${w - 2 * rr} a${rr},${rr} 0 0 1 ${rr},${rr} v${Math.max(h - rr, 0)} z`;
}

function formatMes(iso: string) {
  const [year, month] = iso.split('-');
  return `${MESES[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

/* ---- Barras horizontales, serie única ---- */
function HBars({ data, color, onHover }: {
  data: { label: string; value: number }[];
  color: string;
  onHover: (t: TooltipState | null) => void;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const rowH = 34;
  const barH = 20;
  const labelW = 150;
  const width = 520;
  const chartW = width - labelW - 46;
  const height = data.length * rowH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Empleados por servicio">
      {data.map((d, i) => {
        const y = i * rowH + (rowH - barH) / 2;
        const w = (d.value / max) * chartW;
        return (
          <g
            key={d.label}
            onMouseEnter={() => onHover({ x: labelW + w, y: y + barH / 2, text: `${d.label}: ${d.value}` })}
            onMouseLeave={() => onHover(null)}
          >
            {/* hit target más grande que la marca */}
            <rect x={0} y={i * rowH} width={width} height={rowH} fill="transparent" />
            <text x={labelW - 10} y={y + barH / 2 + 4} textAnchor="end" className="chart-label">
              {d.label.length > 20 ? d.label.slice(0, 19) + '…' : d.label}
            </text>
            <path d={roundedRightRect(labelW, y, w, barH, 4)} fill={color} />
            <text x={labelW + w + 8} y={y + barH / 2 + 4} className="chart-value">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---- Columnas por mes, serie única ---- */
function Columns({ data, color, onHover }: {
  data: { label: string; value: number }[];
  color: string;
  onHover: (t: TooltipState | null) => void;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const width = 520;
  const height = 190;
  const padB = 26;
  const padT = 18;
  const chartH = height - padB - padT;
  const slot = width / data.length;
  const barW = Math.min(48, slot * 0.5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Registros por mes">
      {/* grid recesivo */}
      {[0.5, 1].map(f => (
        <line key={f} x1={0} x2={width} y1={padT + chartH * (1 - f)} y2={padT + chartH * (1 - f)} className="chart-grid" />
      ))}
      <line x1={0} x2={width} y1={padT + chartH} y2={padT + chartH} className="chart-axis" />
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = i * slot + (slot - barW) / 2;
        const y = padT + chartH - h;
        return (
          <g
            key={d.label}
            onMouseEnter={() => onHover({ x: x + barW / 2, y, text: `${d.label}: ${d.value}` })}
            onMouseLeave={() => onHover(null)}
          >
            <rect x={i * slot} y={0} width={slot} height={height} fill="transparent" />
            {d.value > 0 && <path d={roundedTopRect(x, y, barW, h, 4)} fill={color} />}
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="chart-value">{d.value}</text>
            <text x={i * slot + slot / 2} y={height - 8} textAnchor="middle" className="chart-label">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SystemStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState<{ chart: string; t: TooltipState } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).message || 'Error');
        return r.json();
      })
      .then(setStats)
      .catch(e => setError(e.message || 'Error al cargar estadísticas'));
  }, []);

  if (error) {
    return (
      <div className="stats-page">
        <div className="page-header stats-header"><div><h1>Estadísticas</h1><p className="subtitle">{error}</p></div></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-page">
        <div className="page-header stats-header"><div><h1>Estadísticas</h1><p className="subtitle">Cargando…</p></div></div>
      </div>
    );
  }

  const ratingVals = Object.values(stats.ratingPromedios).map(Number).filter(v => !isNaN(v) && v > 0);
  const ratingGlobal = ratingVals.length ? (ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length).toFixed(1) : '—';

  const totalEstados = stats.totales.disponibles + stats.totales.trabajando + stats.totales.inactivos;

  const kpis = [
    { icon: <FaUsers />, tint: 'rgba(16,185,129,0.12)', color: '#059669', value: stats.totales.empleados, label: 'Empleados registrados' },
    { icon: <FaStar />, tint: 'rgba(245,158,11,0.12)', color: '#B45309', value: ratingGlobal, label: 'Rating promedio global' },
    { icon: <FaClipboardList />, tint: 'rgba(234,88,12,0.12)', color: '#C2410C', value: stats.totales.reportes_pendientes, label: 'Reportes pendientes' },
    { icon: <FaUserShield />, tint: 'rgba(2,132,199,0.12)', color: '#0284C7', value: stats.totales.propietarios, label: 'Propietarios' },
  ];

  const servicioData = stats.porServicio.map(s => ({ label: s.servicio, value: s.total }));
  const mesData = stats.porMes.map(m => ({ label: formatMes(m.mes), value: m.total }));
  const criteriosData = [
    { label: 'Puntualidad', value: Number(stats.ratingPromedios.puntualidad) || 0 },
    { label: 'Limpieza', value: Number(stats.ratingPromedios.limpieza) || 0 },
    { label: 'Personalidad', value: Number(stats.ratingPromedios.personalidad) || 0 },
    { label: 'Calidad', value: Number(stats.ratingPromedios.calidad_servicio) || 0 },
  ];

  return (
    <div className="stats-page">
      <div className="page-header stats-header">
        <div>
          <h1>Estadísticas</h1>
          <p className="subtitle">Actividad y salud de tu comunidad, en números</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-row">
        {kpis.map(k => (
          <div className="kpi-tile" key={k.label}>
            <span className="kpi-icon" style={{ background: k.tint, color: k.color }}>{k.icon}</span>
            <div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        {/* Empleados por servicio */}
        <div className="chart-card">
          <h2>Empleados por servicio</h2>
          {servicioData.length === 0 ? (
            <p className="chart-empty">Aún no hay empleados registrados.</p>
          ) : (
            <div className="chart-wrap">
              <HBars data={servicioData} color={SINGLE_HUE} onHover={t => setTooltip(t ? { chart: 'serv', t } : null)} />
              {tooltip?.chart === 'serv' && <ChartTooltip t={tooltip.t} />}
            </div>
          )}
          <details className="chart-table">
            <summary>Ver como tabla</summary>
            <table>
              <thead><tr><th>Servicio</th><th>Empleados</th></tr></thead>
              <tbody>{servicioData.map(d => <tr key={d.label}><td>{d.label}</td><td>{d.value}</td></tr>)}</tbody>
            </table>
          </details>
        </div>

        {/* Estado del personal */}
        <div className="chart-card">
          <h2>Estado del personal</h2>
          {totalEstados === 0 ? (
            <p className="chart-empty">Sin datos de estado.</p>
          ) : (
            <>
              <div className="stacked-bar" role="img" aria-label="Distribución de estados del personal">
                {ESTADO_COLORS.map(e => {
                  const v = stats.totales[e.key as 'disponibles' | 'trabajando' | 'inactivos'];
                  if (v === 0) return null;
                  return (
                    <div
                      key={e.key}
                      className="stacked-seg"
                      style={{ flexGrow: v, background: e.color }}
                      title={`${e.label}: ${v}`}
                    >
                      {v}
                    </div>
                  );
                })}
              </div>
              <div className="chart-legend">
                {ESTADO_COLORS.map(e => (
                  <span className="legend-item" key={e.key}>
                    <span className="legend-swatch" style={{ background: e.color }} />
                    {e.label} ({stats.totales[e.key as 'disponibles' | 'trabajando' | 'inactivos']})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Registros por mes */}
        <div className="chart-card">
          <h2>Registros por mes</h2>
          {mesData.length === 0 ? (
            <p className="chart-empty">Sin registros en los últimos 6 meses.</p>
          ) : (
            <div className="chart-wrap">
              <Columns data={mesData} color={SINGLE_HUE} onHover={t => setTooltip(t ? { chart: 'mes', t } : null)} />
              {tooltip?.chart === 'mes' && <ChartTooltip t={tooltip.t} />}
            </div>
          )}
        </div>

        {/* Calificación promedio por criterio */}
        <div className="chart-card">
          <h2>Calificación promedio por criterio</h2>
          {ratingVals.length === 0 ? (
            <p className="chart-empty">Todavía no hay calificaciones.</p>
          ) : (
            <div className="criterios-list">
              {criteriosData.map(c => (
                <div className="criterio-row" key={c.label}>
                  <span className="criterio-label">{c.label}</span>
                  <div className="criterio-track">
                    <div className="criterio-fill" style={{ width: `${(c.value / 5) * 100}%` }} />
                  </div>
                  <span className="criterio-value">{c.value > 0 ? c.value.toFixed(1) : '—'}</span>
                </div>
              ))}
              <p className="criterio-scale">Escala 1–5 estrellas</p>
            </div>
          )}
        </div>

        {/* Reportes por severidad */}
        <div className="chart-card chart-card-wide">
          <h2>Reportes por severidad</h2>
          {stats.totales.reportes === 0 ? (
            <p className="chart-empty">No hay reportes — buena señal para tu comunidad.</p>
          ) : (
            <div className="severidad-row">
              {SEVERIDAD.map(s => {
                const found = stats.reportesPorTipo.find(r => r.tipo_reporte === s.key);
                const v = found ? found.total : 0;
                const max = Math.max(...stats.reportesPorTipo.map(r => r.total), 1);
                return (
                  <div className="severidad-item" key={s.key}>
                    <div className="severidad-bar-zone">
                      <div className="severidad-bar" style={{ height: `${8 + (v / max) * 92}px`, background: s.color, opacity: v === 0 ? 0.25 : 1 }} />
                    </div>
                    <span className="severidad-count">{v}</span>
                    <span className="severidad-label" style={{ color: s.color }}>{s.icon} {s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ t }: { t: TooltipState }) {
  return (
    <div className="chart-tooltip" style={{ left: `${(t.x / 520) * 100}%`, top: t.y }}>
      {t.text}
    </div>
  );
}

export default SystemStats;
