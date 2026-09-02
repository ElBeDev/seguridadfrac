import { useState, useEffect, useCallback } from 'react';
import { FaBullhorn, FaCalendarAlt, FaPoll, FaInbox, FaPlus, FaTrash, FaLock, FaSwimmingPool, FaPaperclip } from 'react-icons/fa';
import './Modulos.css';
import { APP_NAME } from '../config/branding';
import { ToastMsg } from '../components/Toast';

type TabKey = 'avisos' | 'eventos' | 'encuestas' | 'solicitudes' | 'reservas';

interface Aviso { id: number; titulo: string; cuerpo: string; prioridad: string; autor: string; created_at: string; adjunto: string | null; adjunto_nombre: string | null }
interface Amenidad { id: number; nombre: string; descripcion: string; capacidad: number | null }
interface Reserva { id: number; amenidad_id: number; amenidad_nombre: string; propietario_id: number; propietario_nombre: string; fecha: string; hora_inicio: string; hora_fin: string; notas: string }
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
  const [amenidades, setAmenidades] = useState<Amenidad[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<'aviso' | 'evento' | 'encuesta' | 'solicitud' | 'reserva' | null>(null);
  const [respondiendo, setRespondiendo] = useState<Solicitud | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [votoSel, setVotoSel] = useState<{ [encuestaId: number]: number }>({});

  const [avisoForm, setAvisoForm] = useState({ titulo: '', cuerpo: '', prioridad: 'normal' });
  const [avisoAdjunto, setAvisoAdjunto] = useState<File | null>(null);
  const [eventoForm, setEventoForm] = useState({ titulo: '', descripcion: '', lugar: '', fecha_inicio: '' });
  const [encuestaForm, setEncuestaForm] = useState({ pregunta: '', descripcion: '', opciones: ['', ''] });
  const [solicitudForm, setSolicitudForm] = useState({ categoria: 'general', titulo: '', descripcion: '' });
  const [respuestaForm, setRespuestaForm] = useState({ estado: 'resuelta', respuesta: '' });
  const [reservaForm, setReservaForm] = useState({ amenidad_id: '', fecha: '', hora_inicio: '', hora_fin: '', notas: '' });

  let usuario: { id?: number; nombre_completo?: string; rol?: string } = {};
  try { usuario = JSON.parse(localStorage.getItem('user') || '{}'); } catch { /* fallback propietario */ }
  const esAdmin = usuario.rol === 'admin';

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
    if (activeTab === 'reservas') {
      setAmenidades(await get('/api/reservas/amenidades'));
      setReservas(await get('/api/reservas'));
    }
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

  // Los avisos van como multipart por el adjunto opcional
  const crearAviso = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorModal('');
    try {
      const fd = new FormData();
      fd.append('titulo', avisoForm.titulo);
      fd.append('cuerpo', avisoForm.cuerpo);
      fd.append('prioridad', avisoForm.prioridad);
      if (avisoAdjunto) fd.append('adjunto', avisoAdjunto);
      const response = await fetch('/api/avisos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd,
      });
      if (response.ok) {
        setModal(null);
        setAvisoForm({ titulo: '', cuerpo: '', prioridad: 'normal' });
        setAvisoAdjunto(null);
        avisar('✓ Aviso publicado');
        await cargar();
      } else {
        setErrorModal((await response.json()).message || 'Error al publicar');
      }
    } catch {
      setErrorModal('Error al conectar con el servidor');
    } finally {
      setGuardando(false);
    }
  };

  const cancelarReserva = async (reserva: Reserva) => {
    const response = await fetch(`/api/reservas/${reserva.id}/cancelar`, {
      method: 'PATCH', headers: authHeaders(),
    });
    if (response.ok) { avisar('✓ Reserva cancelada'); cargar(); }
    else avisar((await response.json()).message || 'Error al cancelar');
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
    { key: 'reservas', icon: <FaSwimmingPool />, label: 'Reservas' },
  ];

  const nuevoLabel: { [k in TabKey]: string } = {
    avisos: 'Nuevo Aviso', eventos: 'Nuevo Evento', encuestas: 'Nueva Encuesta', solicitudes: 'Nueva Solicitud', reservas: 'Nueva Reserva',
  };
  const puedeCrear = activeTab === 'reservas' ? true : activeTab === 'solicitudes' ? !esAdmin : esAdmin;

  return (
    <div className="modulo-page">
      <div className="header-card">
        <div className="page-crumb">{APP_NAME} · Comunidad</div>
        <div className="header-title-row">
          <span className="page-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}><FaBullhorn /></span>
          <h1>Comunidad</h1>
        </div>
        <p className="subtitle">Avisos, eventos, encuestas y solicitudes de tu fraccionamiento</p>
      </div>

      <div className="unified-card">
        <div className="button-tabs-row">
          {puedeCrear ? (
            <button className="btn-nuevo" onClick={() => { setModal(activeTab === 'reservas' ? 'reserva' : activeTab === 'solicitudes' ? 'solicitud' : activeTab === 'avisos' ? 'aviso' : activeTab === 'eventos' ? 'evento' : 'encuesta'); setErrorModal(''); }}>
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

      {toast && <div className="modulo-toast"><ToastMsg texto={toast} /></div>}

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
              {aviso.adjunto && (
                <a className="aviso-adjunto" href={aviso.adjunto} target="_blank" rel="noreferrer">
                  <FaPaperclip /> {aviso.adjunto_nombre || 'Adjunto'}
                </a>
              )}
              <p className="aviso-meta">{aviso.autor || 'Administración'} · {formatFecha(aviso.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ---- RESERVAS ---- */}
      {activeTab === 'reservas' && (
        <>
          <div className="amenidades-row">
            {amenidades.map(a => (
              <div className="amenidad-chip" key={a.id}>
                <strong>{a.nombre}</strong>
                <span>{a.descripcion}{a.capacidad ? ` · hasta ${a.capacidad} personas` : ''}</span>
              </div>
            ))}
          </div>
          <div className="table-card">
            <h2>Próximas reservas</h2>
            {reservas.length === 0 ? (
              <p className="modulo-empty">No hay reservas próximas. Sé el primero en apartar.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Amenidad</th>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Reservó</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map(reserva => {
                    const esMia = usuario.id === reserva.propietario_id;
                    return (
                      <tr key={reserva.id}>
                        <td>{reserva.amenidad_nombre}</td>
                        <td>{new Date(reserva.fecha).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                        <td>{reserva.hora_inicio.slice(0, 5)} a {reserva.hora_fin.slice(0, 5)}</td>
                        <td>{reserva.propietario_nombre}{esMia ? ' (tú)' : ''}</td>
                        <td>
                          {(esAdmin || esMia) && (
                            <button className="btn-action btn-action-danger" onClick={() => cancelarReserva(reserva)}>
                              Cancelar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
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
            <form onSubmit={crearAviso}>
              <label className="modal-label" htmlFor="com-titulo">Título</label>
              <input id="com-titulo" placeholder="Título" value={avisoForm.titulo} onChange={e => setAvisoForm({ ...avisoForm, titulo: e.target.value })} required />
              <label className="modal-label" htmlFor="com-contenido-del-aviso">Contenido del aviso</label>
              <textarea id="com-contenido-del-aviso" className="modal-textarea" rows={4} placeholder="Contenido del aviso" value={avisoForm.cuerpo} onChange={e => setAvisoForm({ ...avisoForm, cuerpo: e.target.value })} required />
              <label className="modal-label" htmlFor="com-prioridad">Prioridad</label>
              <select id="com-prioridad" className="modal-select" value={avisoForm.prioridad} onChange={e => setAvisoForm({ ...avisoForm, prioridad: e.target.value })}>
                <option value="normal">Prioridad normal</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
              <label className="adjunto-input">
                <FaPaperclip /> {avisoAdjunto ? avisoAdjunto.name : 'Adjuntar PDF o imagen (opcional, máx 5MB)'}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  hidden
                  onChange={e => setAvisoAdjunto(e.target.files?.[0] || null)}
                />
              </label>
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
              <label className="modal-label" htmlFor="com-titulo">Título</label>
              <input id="com-titulo" placeholder="Título" value={eventoForm.titulo} onChange={e => setEventoForm({ ...eventoForm, titulo: e.target.value })} required />
              <label className="modal-label" htmlFor="com-descripcion">Descripción</label>
              <textarea id="com-descripcion" className="modal-textarea" rows={3} placeholder="Descripción" value={eventoForm.descripcion} onChange={e => setEventoForm({ ...eventoForm, descripcion: e.target.value })} />
              <label className="modal-label" htmlFor="com-lugar">Lugar</label>
              <input id="com-lugar" placeholder="Lugar" value={eventoForm.lugar} onChange={e => setEventoForm({ ...eventoForm, lugar: e.target.value })} />
              <label className="modal-label" htmlFor="com-fecha-evento">Fecha y hora</label>
              <input id="com-fecha-evento" type="datetime-local" value={eventoForm.fecha_inicio} onChange={e => setEventoForm({ ...eventoForm, fecha_inicio: e.target.value })} required />
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
              <label className="modal-label" htmlFor="com-pregunta">Pregunta</label>
              <input id="com-pregunta" placeholder="Pregunta" value={encuestaForm.pregunta} onChange={e => setEncuestaForm({ ...encuestaForm, pregunta: e.target.value })} required />
              <label className="modal-label" htmlFor="com-descripcion-opcional">Descripción (opcional)</label>
              <textarea id="com-descripcion-opcional" className="modal-textarea" rows={2} placeholder="Descripción (opcional)" value={encuestaForm.descripcion} onChange={e => setEncuestaForm({ ...encuestaForm, descripcion: e.target.value })} />
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
              <label className="modal-label" htmlFor="com-cat-sol">Categoría</label>
              <select id="com-cat-sol" className="modal-select" value={solicitudForm.categoria} onChange={e => setSolicitudForm({ ...solicitudForm, categoria: e.target.value })}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <label className="modal-label" htmlFor="com-titulo">Título</label>
              <input id="com-titulo" placeholder="Título" value={solicitudForm.titulo} onChange={e => setSolicitudForm({ ...solicitudForm, titulo: e.target.value })} required />
              <label className="modal-label" htmlFor="com-describe-tu-solicitud">Describe tu solicitud</label>
              <textarea id="com-describe-tu-solicitud" className="modal-textarea" rows={4} placeholder="Describe tu solicitud" value={solicitudForm.descripcion} onChange={e => setSolicitudForm({ ...solicitudForm, descripcion: e.target.value })} required />
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Enviando...' : 'Enviar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'reserva' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Nueva Reserva</h2>
            <form onSubmit={e => {
              e.preventDefault();
              enviar('/api/reservas', { method: 'POST', body: JSON.stringify(reservaForm) }, '✓ Reserva confirmada')
                .then(ok => ok && setReservaForm({ amenidad_id: '', fecha: '', hora_inicio: '', hora_fin: '', notas: '' }));
            }}>
              <label className="modal-label" htmlFor="com-amenidad">Amenidad</label>
              <select id="com-amenidad" className="modal-select" value={reservaForm.amenidad_id} onChange={e => setReservaForm({ ...reservaForm, amenidad_id: e.target.value })} required>
                <option value="">Selecciona la amenidad...</option>
                {amenidades.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
              <label className="modal-label" htmlFor="com-fecha-res">Fecha</label>
              <input id="com-fecha-res" type="date" value={reservaForm.fecha} onChange={e => setReservaForm({ ...reservaForm, fecha: e.target.value })} required />
              <div className="hora-row">
                <label>De <input type="time" value={reservaForm.hora_inicio} onChange={e => setReservaForm({ ...reservaForm, hora_inicio: e.target.value })} required /></label>
                <label>a <input type="time" value={reservaForm.hora_fin} onChange={e => setReservaForm({ ...reservaForm, hora_fin: e.target.value })} required /></label>
              </div>
              <label className="modal-label" htmlFor="com-notas-opcional">Notas (opcional)</label>
              <input id="com-notas-opcional" placeholder="Notas (opcional)" value={reservaForm.notas} onChange={e => setReservaForm({ ...reservaForm, notas: e.target.value })} />
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Reservando...' : 'Reservar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {respondiendo && (
        <div className="modal-overlay" onClick={() => setRespondiendo(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Responder Solicitud</h2>
            <p className="aviso-cuerpo" style={{ marginBottom: 14 }}>"{respondiendo.titulo}" · {respondiendo.propietario_nombre}</p>
            <form onSubmit={e => {
              e.preventDefault();
              enviar(`/api/solicitudes-admin/${respondiendo.id}`, { method: 'PATCH', body: JSON.stringify(respuestaForm) }, '✓ Solicitud actualizada');
            }}>
              <label className="modal-label" htmlFor="com-est-resp">Resolución</label>
              <select id="com-est-resp" className="modal-select" value={respuestaForm.estado} onChange={e => setRespuestaForm({ ...respuestaForm, estado: e.target.value })}>
                <option value="en_proceso">Marcar en proceso</option>
                <option value="resuelta">Marcar resuelta</option>
              </select>
              <label className="modal-label" htmlFor="com-respuesta-al-vecino">Respuesta al vecino</label>
              <textarea id="com-respuesta-al-vecino" className="modal-textarea" rows={4} placeholder="Respuesta al vecino" value={respuestaForm.respuesta} onChange={e => setRespuestaForm({ ...respuestaForm, respuesta: e.target.value })} required />
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
