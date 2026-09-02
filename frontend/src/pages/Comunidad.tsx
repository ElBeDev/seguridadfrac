import { useState, useEffect, useCallback } from 'react';
import { FaBullhorn, FaCalendarAlt, FaPoll, FaInbox, FaPlus, FaTrash, FaLock } from 'react-icons/fa';
import './Modulos.css';

type TabKey = 'avisos' | 'eventos' | 'encuestas' | 'solicitudes';

interface Aviso { id: number; titulo: string; cuerpo: string; prioridad: string; autor: string; created_at: string }
interface Evento { id: number; titulo: string; descripcion: string; lugar: string; fecha_inicio: string; autor: string }
interface Opcion { id: number; texto: string; votos: number }
interface Encuesta { id: number; pregunta: string; descripcion: string; estado: string; total_votos: number; mi_voto: number | null; opciones: Opcion[] }
interface Solicitud { id: number; categoria: string; titulo: string; descripcion: string; estado: string; respuesta: string | null; propietario_nombre: string; created_at: string }

const PRIORIDAD_LABEL: { [k: string]: string } = { normal: 'Aviso', importante: 'Importante', urgente: 'Urgente' };
const SOLICITUD_ESTADOS: { [k: string]: string } = { abierta: 'Abierta', en_proceso: 'En proceso', resuelta: 'Resuelta' };
const CATEGORIAS = ['general', 'mantenimiento', 'queja', 'sugerencia'];

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Comunidad() {
  const [activeTab, setActiveTab] = useState<TabKey>('avisos');
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<'aviso' | 'evento' | 'encuesta' | 'solicitud' | null>(null);
  const [respondiendo, setRespondiendo] = useState<Solicitud | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [votoSel, setVotoSel] = useState<{ [encuestaId: number]: number }>({});

  const [avisoForm, setAvisoForm] = useState({ titulo: '', cuerpo: '', prioridad: 'normal' });
  const [eventoForm, setEventoForm] = useState({ titulo: '', descripcion: '', lugar: '', fecha_inicio: '' });
  const [encuestaForm, setEncuestaForm] = useState({ pregunta: '', descripcion: '', opciones: ['', ''] });
  const [solicitudForm, setSolicitudForm] = useState({ categoria: 'general', titulo: '', descripcion: '' });
  const [respuestaForm, setRespuestaForm] = useState({ estado: 'resuelta', respuesta: '' });

  let esAdmin = false;
  try { esAdmin = JSON.parse(localStorage.getItem('user') || '{}').rol === 'admin'; } catch { /* fallback propietario */ }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const cargar = useCallback(async () => {
    const get = async (url: string) => {
      const r = await fetch(url, { headers: authHeaders() });
      return r.ok ? r.json() : [];
    };
    if (activeTab === 'avisos') setAvisos(await get('/api/avisos'));
    if (activeTab === 'eventos') setEventos(await get('/api/eventos'));
    if (activeTab === 'encuestas') setEncuestas(await get('/api/encuestas'));
    if (activeTab === 'solicitudes') setSolicitudes(await get('/api/solicitudes-admin'));
  }, [activeTab]);

  useEffect(() => { cargar().catch(console.error); }, [cargar]);

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
        setRespondiendo(null);
        avisar(exito);
        await cargar();
        return true;
      }
      const err = await response.json();
      setErrorModal(err.message || 'Error al guardar');
    } catch {
      setErrorModal('Error al conectar con el servidor');
    } finally {
      setGuardando(false);
    }
    return false;
  };

  const votar = async (encuesta: Encuesta) => {
    const opcion = votoSel[encuesta.id];
    if (!opcion) return;
    const response = await fetch(`/api/encuestas/${encuesta.id}/votar`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ opcion_id: opcion }),
    });
    if (response.ok) { avisar('✓ Voto registrado'); cargar(); }
    else avisar((await response.json()).message || 'Error al votar');
  };

  const eliminar = async (recurso: 'avisos' | 'eventos', id: number) => {
    const response = await fetch(`/api/${recurso}/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (response.ok) { avisar('✓ Eliminado'); cargar(); }
  };

  const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: 'avisos', icon: <FaBullhorn />, label: 'Avisos' },
    { key: 'eventos', icon: <FaCalendarAlt />, label: 'Eventos' },
    { key: 'encuestas', icon: <FaPoll />, label: 'Encuestas' },
    { key: 'solicitudes', icon: <FaInbox />, label: 'Solicitudes' },
  ];

  const nuevoLabel: { [k in TabKey]: string } = {
    avisos: 'Nuevo Aviso', eventos: 'Nuevo Evento', encuestas: 'Nueva Encuesta', solicitudes: 'Nueva Solicitud',
  };
  const puedeCrear = activeTab === 'solicitudes' ? !esAdmin : esAdmin;

  return (
    <div className="modulo-page">
      <div className="header-card">
        <h1>Comunidad</h1>
        <p className="subtitle">Avisos, eventos, encuestas y solicitudes de tu fraccionamiento</p>
      </div>

      <div className="unified-card">
        <div className="button-tabs-row">
          {puedeCrear ? (
            <button className="btn-nuevo" onClick={() => { setModal(activeTab === 'solicitudes' ? 'solicitud' : activeTab === 'avisos' ? 'aviso' : activeTab === 'eventos' ? 'evento' : 'encuesta'); setErrorModal(''); }}>
              <FaPlus /> {nuevoLabel[activeTab]}
            </button>
          ) : <span />}
          <div className="tabs">
            {tabs.map(tab => (
              <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {toast && <div className="modulo-toast">{toast}</div>}

      {/* ---- AVISOS ---- */}
      {activeTab === 'avisos' && (
        <div className="cards-column">
          {avisos.length === 0 && <div className="table-card"><p className="modulo-empty">No hay avisos publicados.</p></div>}
          {avisos.map(aviso => (
            <div className={`aviso-card prioridad-${aviso.prioridad}`} key={aviso.id}>
              <div className="aviso-top">
                <span className={`prioridad-badge ${aviso.prioridad}`}>{PRIORIDAD_LABEL[aviso.prioridad] || aviso.prioridad}</span>
                <h3>{aviso.titulo}</h3>
                {esAdmin && (
                  <button className="btn-icon danger btn-mini" title="Eliminar aviso" onClick={() => eliminar('avisos', aviso.id)}>
                    <FaTrash />
                  </button>
                )}
              </div>
              <p className="aviso-cuerpo">{aviso.cuerpo}</p>
              <p className="aviso-meta">{aviso.autor || 'Administración'} · {formatFecha(aviso.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ---- EVENTOS ---- */}
      {activeTab === 'eventos' && (
        <div className="cards-column">
          {eventos.length === 0 && <div className="table-card"><p className="modulo-empty">No hay eventos próximos.</p></div>}
          {eventos.map(evento => {
            const fecha = new Date(evento.fecha_inicio);
            return (
              <div className="evento-card" key={evento.id}>
                <div className="evento-fecha">
                  <span className="evento-dia">{fecha.getDate()}</span>
                  <span className="evento-mes">{fecha.toLocaleDateString('es-MX', { month: 'short' })}</span>
                </div>
                <div className="evento-body">
                  <h3>{evento.titulo}</h3>
                  {evento.descripcion && <p>{evento.descripcion}</p>}
                  <p className="aviso-meta">
                    {formatFechaHora(evento.fecha_inicio)}{evento.lugar ? ` · ${evento.lugar}` : ''}
                  </p>
                </div>
                {esAdmin && (
                  <button className="btn-icon danger btn-mini" title="Eliminar evento" onClick={() => eliminar('eventos', evento.id)}>
                    <FaTrash />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- ENCUESTAS ---- */}
      {activeTab === 'encuestas' && (
        <div className="cards-column">
          {encuestas.length === 0 && <div className="table-card"><p className="modulo-empty">No hay encuestas.</p></div>}
          {encuestas.map(encuesta => {
            const yaVoto = encuesta.mi_voto !== null;
            const cerrada = encuesta.estado === 'cerrada';
            const muestraResultados = yaVoto || cerrada || esAdmin;
            return (
              <div className="table-card" key={encuesta.id}>
                <div className="encuesta-top">
                  <h3>{encuesta.pregunta}</h3>
                  <span className={`estado-badge-admin ${cerrada ? 'rejected' : 'verified'}`}>
                    {cerrada ? 'Cerrada' : 'Abierta'}
                  </span>
                </div>
                {encuesta.descripcion && <p className="aviso-cuerpo">{encuesta.descripcion}</p>}

                {muestraResultados ? (
                  <div className="encuesta-resultados">
                    {encuesta.opciones.map(op => {
                      const pct = encuesta.total_votos > 0 ? Math.round((op.votos / encuesta.total_votos) * 100) : 0;
                      return (
                        <div className="resultado-row" key={op.id}>
                          <span className="resultado-label">
                            {op.texto}{encuesta.mi_voto === op.id ? ' · tu voto' : ''}
                          </span>
                          <div className="resultado-track">
                            <div className="resultado-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="resultado-valor">{op.votos} ({pct}%)</span>
                        </div>
                      );
                    })}
                    <p className="aviso-meta">{encuesta.total_votos} voto{encuesta.total_votos === 1 ? '' : 's'}</p>
                  </div>
                ) : (
                  <div className="encuesta-votar">
                    {encuesta.opciones.map(op => (
                      <label className="voto-opcion" key={op.id}>
                        <input
                          type="radio"
                          name={`encuesta-${encuesta.id}`}
                          checked={votoSel[encuesta.id] === op.id}
                          onChange={() => setVotoSel({ ...votoSel, [encuesta.id]: op.id })}
                        />
                        {op.texto}
                      </label>
                    ))}
                    <button className="btn-action" disabled={!votoSel[encuesta.id]} onClick={() => votar(encuesta)}>
                      Votar
                    </button>
                  </div>
                )}

                {esAdmin && !cerrada && (
                  <button
                    className="btn-secondary btn-mini-text"
                    onClick={() => enviar(`/api/encuestas/${encuesta.id}/cerrar`, { method: 'PATCH' }, '✓ Encuesta cerrada')}
                  >
                    <FaLock /> Cerrar encuesta
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- SOLICITUDES ---- */}
      {activeTab === 'solicitudes' && (
        <div className="cards-column">
          {solicitudes.length === 0 && <div className="table-card"><p className="modulo-empty">No hay solicitudes.</p></div>}
          {solicitudes.map(sol => (
            <div className="table-card" key={sol.id}>
              <div className="encuesta-top">
                <h3>{sol.titulo}</h3>
                <span className={`estado-badge-admin ${sol.estado === 'resuelta' ? 'verified' : sol.estado === 'en_proceso' ? 'pending' : 'rejected'}`}>
                  {SOLICITUD_ESTADOS[sol.estado] || sol.estado}
                </span>
              </div>
              <p className="aviso-cuerpo">{sol.descripcion}</p>
              <p className="aviso-meta">
                {sol.categoria}{esAdmin ? ` · ${sol.propietario_nombre}` : ''} · {formatFecha(sol.created_at)}
              </p>
              {sol.respuesta && (
                <div className="solicitud-respuesta">
                  <strong>Respuesta de administración:</strong> {sol.respuesta}
                </div>
              )}
              {esAdmin && sol.estado !== 'resuelta' && (
                <button className="btn-action" onClick={() => { setRespondiendo(sol); setRespuestaForm({ estado: 'resuelta', respuesta: sol.respuesta || '' }); setErrorModal(''); }}>
                  Responder
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---- Modales ---- */}
      {modal === 'aviso' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Nuevo Aviso</h2>
            <form onSubmit={e => {
              e.preventDefault();
              enviar('/api/avisos', { method: 'POST', body: JSON.stringify(avisoForm) }, '✓ Aviso publicado')
                .then(ok => ok && setAvisoForm({ titulo: '', cuerpo: '', prioridad: 'normal' }));
            }}>
              <input placeholder="Título" value={avisoForm.titulo} onChange={e => setAvisoForm({ ...avisoForm, titulo: e.target.value })} required />
              <textarea className="modal-textarea" rows={4} placeholder="Contenido del aviso" value={avisoForm.cuerpo} onChange={e => setAvisoForm({ ...avisoForm, cuerpo: e.target.value })} required />
              <select className="modal-select" value={avisoForm.prioridad} onChange={e => setAvisoForm({ ...avisoForm, prioridad: e.target.value })}>
                <option value="normal">Prioridad normal</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Publicando...' : 'Publicar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'evento' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Nuevo Evento</h2>
            <form onSubmit={e => {
              e.preventDefault();
              enviar('/api/eventos', { method: 'POST', body: JSON.stringify(eventoForm) }, '✓ Evento creado')
                .then(ok => ok && setEventoForm({ titulo: '', descripcion: '', lugar: '', fecha_inicio: '' }));
            }}>
              <input placeholder="Título" value={eventoForm.titulo} onChange={e => setEventoForm({ ...eventoForm, titulo: e.target.value })} required />
              <textarea className="modal-textarea" rows={3} placeholder="Descripción" value={eventoForm.descripcion} onChange={e => setEventoForm({ ...eventoForm, descripcion: e.target.value })} />
              <input placeholder="Lugar" value={eventoForm.lugar} onChange={e => setEventoForm({ ...eventoForm, lugar: e.target.value })} />
              <input type="datetime-local" value={eventoForm.fecha_inicio} onChange={e => setEventoForm({ ...eventoForm, fecha_inicio: e.target.value })} required />
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Creando...' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'encuesta' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Nueva Encuesta</h2>
            <form onSubmit={e => {
              e.preventDefault();
              enviar('/api/encuestas', { method: 'POST', body: JSON.stringify(encuestaForm) }, '✓ Encuesta publicada')
                .then(ok => ok && setEncuestaForm({ pregunta: '', descripcion: '', opciones: ['', ''] }));
            }}>
              <input placeholder="Pregunta" value={encuestaForm.pregunta} onChange={e => setEncuestaForm({ ...encuestaForm, pregunta: e.target.value })} required />
              <textarea className="modal-textarea" rows={2} placeholder="Descripción (opcional)" value={encuestaForm.descripcion} onChange={e => setEncuestaForm({ ...encuestaForm, descripcion: e.target.value })} />
              {encuestaForm.opciones.map((op, i) => (
                <input
                  key={i}
                  placeholder={`Opción ${i + 1}`}
                  value={op}
                  onChange={e => {
                    const opciones = [...encuestaForm.opciones];
                    opciones[i] = e.target.value;
                    setEncuestaForm({ ...encuestaForm, opciones });
                  }}
                  required={i < 2}
                />
              ))}
              <button
                type="button"
                className="btn-secondary btn-mini-text"
                onClick={() => setEncuestaForm({ ...encuestaForm, opciones: [...encuestaForm.opciones, ''] })}
              >
                <FaPlus /> Agregar opción
              </button>
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Publicando...' : 'Publicar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'solicitud' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Nueva Solicitud</h2>
            <form onSubmit={e => {
              e.preventDefault();
              enviar('/api/solicitudes-admin', { method: 'POST', body: JSON.stringify(solicitudForm) }, '✓ Solicitud enviada')
                .then(ok => ok && setSolicitudForm({ categoria: 'general', titulo: '', descripcion: '' }));
            }}>
              <select className="modal-select" value={solicitudForm.categoria} onChange={e => setSolicitudForm({ ...solicitudForm, categoria: e.target.value })}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <input placeholder="Título" value={solicitudForm.titulo} onChange={e => setSolicitudForm({ ...solicitudForm, titulo: e.target.value })} required />
              <textarea className="modal-textarea" rows={4} placeholder="Describe tu solicitud" value={solicitudForm.descripcion} onChange={e => setSolicitudForm({ ...solicitudForm, descripcion: e.target.value })} required />
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Enviando...' : 'Enviar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {respondiendo && (
        <div className="modal-overlay" onClick={() => setRespondiendo(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Responder Solicitud</h2>
            <p className="aviso-cuerpo" style={{ marginBottom: 14 }}>"{respondiendo.titulo}" — {respondiendo.propietario_nombre}</p>
            <form onSubmit={e => {
              e.preventDefault();
              enviar(`/api/solicitudes-admin/${respondiendo.id}`, { method: 'PATCH', body: JSON.stringify(respuestaForm) }, '✓ Solicitud actualizada');
            }}>
              <select className="modal-select" value={respuestaForm.estado} onChange={e => setRespuestaForm({ ...respuestaForm, estado: e.target.value })}>
                <option value="en_proceso">Marcar en proceso</option>
                <option value="resuelta">Marcar resuelta</option>
              </select>
              <textarea className="modal-textarea" rows={4} placeholder="Respuesta al vecino" value={respuestaForm.respuesta} onChange={e => setRespuestaForm({ ...respuestaForm, respuesta: e.target.value })} required />
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setRespondiendo(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Responder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Comunidad;
