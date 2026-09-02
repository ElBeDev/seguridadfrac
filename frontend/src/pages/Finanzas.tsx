import { useState, useEffect, useCallback } from 'react';
import { FaFileInvoiceDollar, FaReceipt, FaChartPie, FaPlus, FaMoneyBillWave, FaExclamationTriangle, FaWallet, FaArrowDown } from 'react-icons/fa';
import './Modulos.css';
import { APP_NAME } from '../config/branding';
import { ToastMsg } from '../components/Toast';

type TabKey = 'cuotas' | 'egresos' | 'resumen';

/*
 * Colores de gráficas: par ingresos/egresos #059669 / #D97706 y serie única
 * #059669 — del trío categórico validado (CVD PASS, contraste >= 3:1). Ver
 * REDISENO.md fase 2.
 */
const COLOR_INGRESOS = '#059669';
const COLOR_EGRESOS = '#D97706';

interface Cuota {
  id: number; concepto: string; periodo: string | null; monto: string; vence: string;
  estado: string; vencida: boolean; pagada_at: string | null; metodo_pago: string | null;
  propietario_nombre: string; direccion: string;
}
interface Egreso { id: number; concepto: string; categoria: string; monto: string; fecha: string; notas: string }
interface Resumen {
  totales: { recaudado: string; por_cobrar: string; vencido: string; egresos: string };
  porMes: { mes: string; ingresos: string; egresos: string }[];
  egresosPorCategoria: { categoria: string; total: string }[];
}
interface UsuarioMin { id: number; nombre_completo: string; rol: string; estado: string }

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

function formatMes(iso: string) {
  const [year, month] = iso.split('-');
  return `${MESES[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

/* Columnas agrupadas ingresos vs egresos (2 series → leyenda obligatoria) */
function GroupedColumns({ data }: { data: { label: string; ingresos: number; egresos: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.ingresos, d.egresos]), 1);
  const width = 560;
  const height = 200;
  const padT = 20;
  const padB = 26;
  const chartH = height - padT - padB;
  const slot = width / data.length;
  const barW = Math.min(30, slot * 0.24);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Ingresos y egresos por mes">
      {[0.5, 1].map(f => (
        <line key={f} x1={0} x2={width} y1={padT + chartH * (1 - f)} y2={padT + chartH * (1 - f)} className="chart-grid" />
      ))}
      <line x1={0} x2={width} y1={padT + chartH} y2={padT + chartH} className="chart-axis" />
      {data.map((d, i) => {
        const cx = i * slot + slot / 2;
        const hIng = (d.ingresos / max) * chartH;
        const hEgr = (d.egresos / max) * chartH;
        return (
          <g key={d.label}>
            <title>{`${d.label}: ingresos ${mxn.format(d.ingresos)}, egresos ${mxn.format(d.egresos)}`}</title>
            {d.ingresos > 0 && <rect x={cx - barW - 1} y={padT + chartH - hIng} width={barW} height={hIng} rx={3} fill={COLOR_INGRESOS} />}
            {d.egresos > 0 && <rect x={cx + 1} y={padT + chartH - hEgr} width={barW} height={hEgr} rx={3} fill={COLOR_EGRESOS} />}
            <text x={cx} y={height - 8} textAnchor="middle" className="chart-label">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Finanzas() {
  const [activeTab, setActiveTab] = useState<TabKey>('cuotas');
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [propietarios, setPropietarios] = useState<UsuarioMin[]>([]);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<'cuota' | 'egreso' | null>(null);
  const [pagando, setPagando] = useState<Cuota | null>(null);
  const [metodoPago, setMetodoPago] = useState('transferencia');
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const [cuotaForm, setCuotaForm] = useState({ propietario_id: '', concepto: 'Cuota de mantenimiento', periodo: '', monto: '', vence: '' });
  const [egresoForm, setEgresoForm] = useState({ concepto: '', categoria: 'general', monto: '', fecha: '', notas: '' });

  let esAdmin = false;
  try { esAdmin = JSON.parse(localStorage.getItem('user') || '{}').rol === 'admin'; } catch { /* propietario */ }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const cargar = useCallback(async () => {
    const get = async (url: string) => {
      const r = await fetch(url, { headers: authHeaders() });
      return r.ok ? r.json() : null;
    };
    if (activeTab === 'cuotas') setCuotas((await get('/api/finanzas/cuotas')) || []);
    if (activeTab === 'egresos') setEgresos((await get('/api/finanzas/egresos')) || []);
    if (activeTab === 'resumen') setResumen(await get('/api/finanzas/resumen'));
  }, [activeTab]);

  useEffect(() => { cargar().catch(console.error); }, [cargar]);

  useEffect(() => {
    if (!esAdmin) return;
    fetch('/api/usuarios', { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : []))
      .then((users: UsuarioMin[]) => setPropietarios(users.filter(u => u.rol === 'propietario' && u.estado === 'verified')))
      .catch(console.error);
  }, [esAdmin]);

  const avisar = (texto: string) => {
    setToast(texto);
    setTimeout(() => setToast(''), 3000);
  };

  const enviar = async (url: string, options: RequestInit, exito: string) => {
    setGuardando(true);
    setErrorModal('');
    try {
      const response = await fetch(url, { ...options, headers: authHeaders() });
      if (response.ok) {
        setModal(null);
        setPagando(null);
        avisar(exito);
        await cargar();
        return true;
      }
      setErrorModal((await response.json()).message || 'Error al guardar');
    } catch {
      setErrorModal('Error al conectar con el servidor');
    } finally {
      setGuardando(false);
    }
    return false;
  };

  const estadoCuota = (cuota: Cuota) =>
    cuota.estado === 'pagada' ? 'pagada' : cuota.vencida ? 'vencida' : 'pendiente';

  const adeudo = cuotas.filter(c => c.estado === 'pendiente').reduce((acc, c) => acc + Number(c.monto), 0);

  const tabs: { key: TabKey; icon: React.ReactNode; label: string; soloAdmin?: boolean }[] = [
    { key: 'cuotas', icon: <FaFileInvoiceDollar />, label: esAdmin ? 'Cuotas' : 'Mis Cuotas' },
    { key: 'egresos', icon: <FaReceipt />, label: 'Egresos', soloAdmin: true },
    { key: 'resumen', icon: <FaChartPie />, label: 'Resumen', soloAdmin: true },
  ];

  return (
    <div className="modulo-page">
      <div className="header-card">
        <div className="page-crumb">{APP_NAME} · Finanzas</div>
        <div className="header-title-row">
          <span className="page-icon" style={{ background: '#FEF3C7', color: '#B45309' }}><FaWallet /></span>
          <h1>Finanzas</h1>
        </div>
        <p className="subtitle">
          {esAdmin ? 'Cuotas, egresos y salud financiera del fraccionamiento' : 'Tu estado de cuenta con la comunidad'}
        </p>
      </div>

      <div className="unified-card">
        <div className="button-tabs-row">
          {esAdmin && activeTab === 'cuotas' && (
            <button className="btn-nuevo" onClick={() => { setModal('cuota'); setErrorModal(''); }}>
              <FaPlus /> Nuevo Cargo
            </button>
          )}
          {esAdmin && activeTab === 'egresos' && (
            <button className="btn-nuevo" onClick={() => { setModal('egreso'); setErrorModal(''); }}>
              <FaPlus /> Registrar Egreso
            </button>
          )}
          {(!esAdmin || activeTab === 'resumen') && <span />}
          <div className="tabs">
            {tabs.filter(t => !t.soloAdmin || esAdmin).map(tab => (
              <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {toast && <div className="modulo-toast"><ToastMsg texto={toast} /></div>}

      {/* ---- CUOTAS ---- */}
      {activeTab === 'cuotas' && (
        <>
          {!esAdmin && (
            <div className={`adeudo-banner ${adeudo > 0 ? 'con-adeudo' : 'al-corriente'}`}>
              {adeudo > 0
                ? <><FaExclamationTriangle /> Adeudo actual: <strong>{mxn.format(adeudo)}</strong> , contacta a administración para liquidar</>
                : <><FaMoneyBillWave /> Estás al corriente con tus cuotas</>}
            </div>
          )}
          <div className="table-card">
            <h2>{esAdmin ? 'Cargos y pagos' : 'Historial de cuotas'}</h2>
            {cuotas.length === 0 ? (
              <p className="modulo-empty">No hay cuotas registradas.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Periodo</th>
                    {esAdmin && <th>Residente</th>}
                    <th>Monto</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    {esAdmin && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {cuotas.map(cuota => (
                    <tr key={cuota.id}>
                      <td>{cuota.concepto}</td>
                      <td>{cuota.periodo || '-'}</td>
                      {esAdmin && <td>{cuota.propietario_nombre}</td>}
                      <td className="monto-cell">{mxn.format(Number(cuota.monto))}</td>
                      <td>{new Date(cuota.vence).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                      <td><span className={`cuota-badge ${estadoCuota(cuota)}`}>{estadoCuota(cuota)}</span></td>
                      {esAdmin && (
                        <td>
                          {cuota.estado === 'pendiente' && (
                            <button className="btn-action" onClick={() => { setPagando(cuota); setErrorModal(''); }}>
                              Registrar pago
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ---- EGRESOS ---- */}
      {activeTab === 'egresos' && esAdmin && (
        <div className="table-card">
          <h2>Egresos del fraccionamiento</h2>
          {egresos.length === 0 ? (
            <p className="modulo-empty">No hay egresos registrados.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {egresos.map(egreso => (
                  <tr key={egreso.id}>
                    <td>{egreso.concepto}</td>
                    <td style={{ textTransform: 'capitalize' }}>{egreso.categoria}</td>
                    <td className="monto-cell">{mxn.format(Number(egreso.monto))}</td>
                    <td>{new Date(egreso.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---- RESUMEN ---- */}
      {activeTab === 'resumen' && esAdmin && resumen && (
        <>
          <div className="kpi-row" style={{ marginBottom: 20 }}>
            {[
              { icon: <FaMoneyBillWave />, tint: 'rgba(16,185,129,0.12)', color: '#059669', value: mxn.format(Number(resumen.totales.recaudado)), label: 'Recaudado' },
              { icon: <FaWallet />, tint: 'rgba(2,132,199,0.12)', color: '#0284C7', value: mxn.format(Number(resumen.totales.por_cobrar)), label: 'Por cobrar' },
              { icon: <FaExclamationTriangle />, tint: 'rgba(234,88,12,0.12)', color: '#C2410C', value: mxn.format(Number(resumen.totales.vencido)), label: 'Cartera vencida' },
              { icon: <FaArrowDown />, tint: 'rgba(217,119,6,0.12)', color: '#B45309', value: mxn.format(Number(resumen.totales.egresos)), label: 'Egresos totales' },
            ].map(k => (
              <div className="kpi-tile" key={k.label}>
                <span className="kpi-icon" style={{ background: k.tint, color: k.color }}>{k.icon}</span>
                <div>
                  <div className="kpi-value" style={{ fontSize: '1.25rem' }}>{k.value}</div>
                  <div className="kpi-label">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h2>Ingresos vs egresos por mes</h2>
              {resumen.porMes.length === 0 ? (
                <p className="modulo-empty">Sin movimientos en los últimos 6 meses.</p>
              ) : (
                <>
                  <GroupedColumns data={resumen.porMes.map(m => ({
                    label: formatMes(m.mes), ingresos: Number(m.ingresos), egresos: Number(m.egresos),
                  }))} />
                  <div className="chart-legend" style={{ marginTop: 10 }}>
                    <span className="legend-item"><span className="legend-swatch" style={{ background: COLOR_INGRESOS }} />Ingresos</span>
                    <span className="legend-item"><span className="legend-swatch" style={{ background: COLOR_EGRESOS }} />Egresos</span>
                  </div>
                </>
              )}
            </div>

            <div className="chart-card">
              <h2>Egresos por categoría</h2>
              {resumen.egresosPorCategoria.length === 0 ? (
                <p className="modulo-empty">Sin egresos registrados.</p>
              ) : (
                <div className="criterios-list">
                  {(() => {
                    const max = Math.max(...resumen.egresosPorCategoria.map(e => Number(e.total)), 1);
                    return resumen.egresosPorCategoria.map(e => (
                      <div className="criterio-row" key={e.categoria}>
                        <span className="criterio-label" style={{ textTransform: 'capitalize' }}>{e.categoria}</span>
                        <div className="criterio-track">
                          <div className="criterio-fill" style={{ width: `${(Number(e.total) / max) * 100}%`, background: COLOR_EGRESOS }} />
                        </div>
                        <span className="criterio-value" style={{ minWidth: 90 }}>{mxn.format(Number(e.total))}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
          <p className="aviso-meta" style={{ marginTop: 14, textAlign: 'center' }}>
            Los pagos se registran manualmente por administración. La pasarela de pago en línea y la facturación CFDI están en el roadmap.
          </p>
        </>
      )}

      {/* ---- Modal nuevo cargo ---- */}
      {modal === 'cuota' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Nuevo Cargo</h2>
            <form onSubmit={e => {
              e.preventDefault();
              enviar('/api/finanzas/cuotas', {
                method: 'POST',
                body: JSON.stringify({ ...cuotaForm, propietario_id: cuotaForm.propietario_id || null }),
              }, '✓ Cargo creado').then(ok => ok && setCuotaForm({ propietario_id: '', concepto: 'Cuota de mantenimiento', periodo: '', monto: '', vence: '' }));
            }}>
              <label className="modal-label" htmlFor="fin-dest">Aplicar a</label>
              <select id="fin-dest" className="modal-select" value={cuotaForm.propietario_id} onChange={e => setCuotaForm({ ...cuotaForm, propietario_id: e.target.value })}>
                <option value="">Todos los propietarios verificados</option>
                {propietarios.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
              </select>
              <label className="modal-label" htmlFor="fin-concepto">Concepto</label>
              <input id="fin-concepto" placeholder="Concepto" value={cuotaForm.concepto} onChange={e => setCuotaForm({ ...cuotaForm, concepto: e.target.value })} required />
              <label className="modal-label" htmlFor="fin-periodo">Periodo</label>
              <input id="fin-periodo" type="month" value={cuotaForm.periodo} onChange={e => setCuotaForm({ ...cuotaForm, periodo: e.target.value })} />
              <label className="modal-label" htmlFor="fin-monto-mxn">Monto (MXN)</label>
              <input id="fin-monto-mxn" type="number" min="1" step="0.01" placeholder="Monto (MXN)" value={cuotaForm.monto} onChange={e => setCuotaForm({ ...cuotaForm, monto: e.target.value })} required />
              <label className="modal-label" htmlFor="fin-vence">Fecha de vencimiento</label>
              <input id="fin-vence" type="date" value={cuotaForm.vence} onChange={e => setCuotaForm({ ...cuotaForm, vence: e.target.value })} required />
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Creando...' : 'Crear cargo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Modal registrar pago ---- */}
      {pagando && (
        <div className="modal-overlay" onClick={() => setPagando(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Registrar Pago</h2>
            <p className="aviso-cuerpo">
              {pagando.concepto} · {pagando.propietario_nombre} · <strong>{mxn.format(Number(pagando.monto))}</strong>
            </p>
            <form onSubmit={e => {
              e.preventDefault();
              enviar(`/api/finanzas/cuotas/${pagando.id}/pagar`, { method: 'PATCH', body: JSON.stringify({ metodo_pago: metodoPago }) }, '✓ Pago registrado');
            }}>
              <label className="modal-label" htmlFor="fin-metodo">Método de pago</label>
              <select id="fin-metodo" className="modal-select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setPagando(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Registrando...' : 'Confirmar pago'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Modal egreso ---- */}
      {modal === 'egreso' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Registrar Egreso</h2>
            <form onSubmit={e => {
              e.preventDefault();
              enviar('/api/finanzas/egresos', { method: 'POST', body: JSON.stringify({ ...egresoForm, fecha: egresoForm.fecha || null }) }, '✓ Egreso registrado')
                .then(ok => ok && setEgresoForm({ concepto: '', categoria: 'general', monto: '', fecha: '', notas: '' }));
            }}>
              <label className="modal-label" htmlFor="fin-concepto">Concepto</label>
              <input id="fin-concepto" placeholder="Concepto" value={egresoForm.concepto} onChange={e => setEgresoForm({ ...egresoForm, concepto: e.target.value })} required />
              <label className="modal-label" htmlFor="fin-cat-egr">Categoría</label>
              <select id="fin-cat-egr" className="modal-select" value={egresoForm.categoria} onChange={e => setEgresoForm({ ...egresoForm, categoria: e.target.value })}>
                <option value="general">General</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="seguridad">Seguridad</option>
                <option value="jardineria">Jardinería</option>
                <option value="administracion">Administración</option>
              </select>
              <label className="modal-label" htmlFor="fin-monto-mxn">Monto (MXN)</label>
              <input id="fin-monto-mxn" type="number" min="1" step="0.01" placeholder="Monto (MXN)" value={egresoForm.monto} onChange={e => setEgresoForm({ ...egresoForm, monto: e.target.value })} required />
              <label className="modal-label" htmlFor="fin-fecha-egr">Fecha del egreso</label>
              <input id="fin-fecha-egr" type="date" value={egresoForm.fecha} onChange={e => setEgresoForm({ ...egresoForm, fecha: e.target.value })} />
              <label className="modal-label" htmlFor="fin-notas-opcional">Notas (opcional)</label>
              <input id="fin-notas-opcional" placeholder="Notas (opcional)" value={egresoForm.notas} onChange={e => setEgresoForm({ ...egresoForm, notas: e.target.value })} />
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Registrando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finanzas;
