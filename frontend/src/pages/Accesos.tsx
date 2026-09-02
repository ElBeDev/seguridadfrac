import { useState, useEffect, useCallback } from 'react';
import { FaIdBadge, FaBoxOpen, FaQrcode, FaPlus, FaSignInAlt, FaSignOutAlt, FaSearch } from 'react-icons/fa';
import QRCode from 'qrcode';
import './Modulos.css';

type TabKey = 'visitas' | 'paqueteria' | 'validar';

interface Visita {
  id: number; nombre_visitante: string; tipo: string; codigo: string;
  fecha_esperada: string; estado: string; entrada_at: string | null; salida_at: string | null;
  notas: string; propietario_nombre: string; direccion: string;
}
interface Paquete {
  id: number; descripcion: string; paqueteria: string; estado: string;
  propietario_nombre: string; direccion: string; created_at: string; entregado_at: string | null;
}
interface UsuarioMin { id: number; nombre_completo: string; rol: string; estado: string }

const ESTADO_VISITA: { [k: string]: string } = { esperada: 'Esperada', ingresada: 'Ingresada', salida: 'Salió', cancelada: 'Cancelada' };

function Accesos() {
  const [activeTab, setActiveTab] = useState<TabKey>('visitas');
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [propietarios, setPropietarios] = useState<UsuarioMin[]>([]);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<'visita' | 'paquete' | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  const [visitaForm, setVisitaForm] = useState({ nombre_visitante: '', tipo: 'visita', fecha_esperada: '', notas: '' });
  const [paqueteForm, setPaqueteForm] = useState({ propietario_id: '', descripcion: '', paqueteria: '' });

  // Pase generado / QR
  const [pase, setPase] = useState<Visita | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Validador de caseta
  const [codigoInput, setCodigoInput] = useState('');
  const [validada, setValidada] = useState<Visita | null>(null);
  const [errorValidar, setErrorValidar] = useState('');

  let esAdmin = false;
  try { esAdmin = JSON.parse(localStorage.getItem('user') || '{}').rol === 'admin'; } catch { /* propietario */ }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const cargar = useCallback(async () => {
    const get = async (url: string) => {
      const r = await fetch(url, { headers: authHeaders() });
      return r.ok ? r.json() : [];
    };
    if (activeTab === 'visitas') setVisitas(await get('/api/visitas'));
    if (activeTab === 'paqueteria') setPaquetes(await get('/api/paquetes'));
  }, [activeTab]);

  useEffect(() => { cargar().catch(console.error); }, [cargar]);

  // El registro de paquetes necesita la lista de propietarios (solo admin)
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

  const mostrarPase = async (visita: Visita) => {
    setPase(visita);
    try {
      setQrDataUrl(await QRCode.toDataURL(visita.codigo, { width: 220, margin: 1, color: { dark: '#0F172A' } }));
    } catch {
      setQrDataUrl('');
    }
  };

  const crearVisita = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorModal('');
    try {
      const response = await fetch('/api/visitas', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(visitaForm),
      });
      if (response.ok) {
        const visita = await response.json();
        setModal(null);
        setVisitaForm({ nombre_visitante: '', tipo: 'visita', fecha_esperada: '', notas: '' });
        await cargar();
        await mostrarPase(visita);
      } else {
        setErrorModal((await response.json()).message || 'Error al crear pase');
      }
    } catch {
      setErrorModal('Error al conectar con el servidor');
    } finally {
      setGuardando(false);
    }
  };

  const registrarPaquete = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorModal('');
    try {
      const response = await fetch('/api/paquetes', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(paqueteForm),
      });
      if (response.ok) {
        setModal(null);
        setPaqueteForm({ propietario_id: '', descripcion: '', paqueteria: '' });
        avisar('✓ Paquete registrado — el residente será notificado');
        await cargar();
      } else {
        setErrorModal((await response.json()).message || 'Error al registrar');
      }
    } catch {
      setErrorModal('Error al conectar con el servidor');
    } finally {
      setGuardando(false);
    }
  };

  const accionVisita = async (visita: Visita, accion: 'entrada' | 'salida' | 'cancelar') => {
    const response = await fetch(`/api/visitas/${visita.id}/${accion}`, { method: 'PATCH', headers: authHeaders() });
    if (response.ok) {
      avisar(`✓ ${accion === 'entrada' ? 'Entrada registrada' : accion === 'salida' ? 'Salida registrada' : 'Pase cancelado'}`);
      cargar();
      if (validada?.id === visita.id) setValidada(await response.json());
    } else {
      avisar((await response.json()).message || 'Error');
    }
  };

  const entregarPaquete = async (paquete: Paquete) => {
    const response = await fetch(`/api/paquetes/${paquete.id}/entregar`, { method: 'PATCH', headers: authHeaders() });
    if (response.ok) { avisar('✓ Paquete entregado'); cargar(); }
  };

  const validarCodigo = async () => {
    if (!codigoInput.trim()) return;
    setErrorValidar('');
    setValidada(null);
    try {
      const response = await fetch(`/api/visitas/validar/${encodeURIComponent(codigoInput.trim())}`, { headers: authHeaders() });
      if (response.ok) setValidada(await response.json());
      else setErrorValidar((await response.json()).message || 'Código no encontrado');
    } catch {
      setErrorValidar('Error al conectar con el servidor');
    }
  };

  const tabs: { key: TabKey; icon: React.ReactNode; label: string; soloAdmin?: boolean }[] = [
    { key: 'visitas', icon: <FaIdBadge />, label: esAdmin ? 'Visitas' : 'Mis Visitas' },
    { key: 'paqueteria', icon: <FaBoxOpen />, label: 'Paquetería' },
    { key: 'validar', icon: <FaQrcode />, label: 'Validar Código', soloAdmin: true },
  ];

  return (
    <div className="modulo-page">
      <div className="header-card">
        <h1>Control de Accesos</h1>
        <p className="subtitle">Pases de visita con código, validación en caseta y paquetería</p>
      </div>

      <div className="unified-card">
        <div className="button-tabs-row">
          {activeTab === 'visitas' && !esAdmin && (
            <button className="btn-nuevo" onClick={() => { setModal('visita'); setErrorModal(''); }}>
              <FaPlus /> Nuevo Pase
            </button>
          )}
          {activeTab === 'paqueteria' && esAdmin && (
            <button className="btn-nuevo" onClick={() => { setModal('paquete'); setErrorModal(''); }}>
              <FaPlus /> Registrar Paquete
            </button>
          )}
          {((activeTab === 'visitas' && esAdmin) || (activeTab === 'paqueteria' && !esAdmin) || activeTab === 'validar') && <span />}
          <div className="tabs">
            {tabs.filter(t => !t.soloAdmin || esAdmin).map(tab => (
              <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {toast && <div className="modulo-toast">{toast}</div>}

      {/* ---- VISITAS ---- */}
      {activeTab === 'visitas' && (
        <div className="table-card">
          <h2>{esAdmin ? 'Registro de visitas' : 'Mis pases de visita'}</h2>
          {visitas.length === 0 ? (
            <p className="modulo-empty">No hay visitas registradas.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Visitante</th>
                  <th>Código</th>
                  <th>Tipo</th>
                  {esAdmin && <th>Residente</th>}
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visitas.map(visita => (
                  <tr key={visita.id}>
                    <td>{visita.nombre_visitante}</td>
                    <td><code className="codigo-pill">{visita.codigo}</code></td>
                    <td style={{ textTransform: 'capitalize' }}>{visita.tipo}</td>
                    {esAdmin && <td>{visita.propietario_nombre}</td>}
                    <td>{new Date(visita.fecha_esperada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                    <td>
                      <span className={`visita-badge ${visita.estado}`}>{ESTADO_VISITA[visita.estado] || visita.estado}</span>
                    </td>
                    <td>
                      {visita.estado === 'esperada' && (
                        <>
                          <button className="btn-action" onClick={() => mostrarPase(visita)}>QR</button>
                          {esAdmin
                            ? <button className="btn-action" onClick={() => accionVisita(visita, 'entrada')}>Entrada</button>
                            : <button className="btn-action btn-action-danger" onClick={() => accionVisita(visita, 'cancelar')}>Cancelar</button>}
                        </>
                      )}
                      {visita.estado === 'ingresada' && esAdmin && (
                        <button className="btn-action" onClick={() => accionVisita(visita, 'salida')}>Salida</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---- PAQUETERÍA ---- */}
      {activeTab === 'paqueteria' && (
        <div className="table-card">
          <h2>{esAdmin ? 'Paquetes en caseta' : 'Mis paquetes'}</h2>
          {paquetes.length === 0 ? (
            <p className="modulo-empty">No hay paquetes registrados.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Paquetería</th>
                  {esAdmin && <th>Residente</th>}
                  <th>Recibido</th>
                  <th>Estado</th>
                  {esAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {paquetes.map(paquete => (
                  <tr key={paquete.id}>
                    <td>{paquete.descripcion}</td>
                    <td>{paquete.paqueteria || '—'}</td>
                    {esAdmin && <td>{paquete.propietario_nombre}</td>}
                    <td>{new Date(paquete.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                    <td>
                      <span className={`visita-badge ${paquete.estado === 'en_caseta' ? 'esperada' : 'salida'}`}>
                        {paquete.estado === 'en_caseta' ? 'En caseta' : 'Entregado'}
                      </span>
                    </td>
                    {esAdmin && (
                      <td>
                        {paquete.estado === 'en_caseta' && (
                          <button className="btn-action" onClick={() => entregarPaquete(paquete)}>Entregar</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---- VALIDAR (caseta) ---- */}
      {activeTab === 'validar' && esAdmin && (
        <div className="table-card validar-card">
          <h2>Validar código de acceso</h2>
          <p className="aviso-meta" style={{ marginBottom: 16 }}>
            Ingresa el código del pase (o escanéalo) para verificar la visita en caseta.
          </p>
          <div className="validar-row">
            <input
              className="validar-input"
              placeholder="V-XXXXXX"
              value={codigoInput}
              onChange={e => setCodigoInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && validarCodigo()}
            />
            <button className="btn-nuevo" onClick={validarCodigo}><FaSearch /> Validar</button>
          </div>
          {errorValidar && <p className="modal-error" style={{ marginTop: 12 }}>{errorValidar}</p>}
          {validada && (
            <div className={`validar-resultado ${validada.estado}`}>
              <div className="validar-info">
                <h3>{validada.nombre_visitante}</h3>
                <p>
                  Visita a <strong>{validada.propietario_nombre}</strong>{validada.direccion ? ` — ${validada.direccion}` : ''}
                </p>
                <p className="aviso-meta">
                  Tipo: {validada.tipo} · Esperada: {new Date(validada.fecha_esperada).toLocaleDateString('es-MX')}
                  {validada.notas ? ` · ${validada.notas}` : ''}
                </p>
                <span className={`visita-badge ${validada.estado}`}>{ESTADO_VISITA[validada.estado]}</span>
              </div>
              <div className="validar-acciones">
                {validada.estado === 'esperada' && (
                  <button className="btn-nuevo" onClick={() => accionVisita(validada, 'entrada')}>
                    <FaSignInAlt /> Registrar entrada
                  </button>
                )}
                {validada.estado === 'ingresada' && (
                  <button className="btn-nuevo" onClick={() => accionVisita(validada, 'salida')}>
                    <FaSignOutAlt /> Registrar salida
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Modal nuevo pase ---- */}
      {modal === 'visita' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Nuevo Pase de Visita</h2>
            <form onSubmit={crearVisita}>
              <input placeholder="Nombre del visitante" value={visitaForm.nombre_visitante} onChange={e => setVisitaForm({ ...visitaForm, nombre_visitante: e.target.value })} required />
              <select className="modal-select" value={visitaForm.tipo} onChange={e => setVisitaForm({ ...visitaForm, tipo: e.target.value })}>
                <option value="visita">Visita</option>
                <option value="proveedor">Proveedor / servicio</option>
                <option value="evento">Invitado a evento</option>
              </select>
              <input type="date" value={visitaForm.fecha_esperada} onChange={e => setVisitaForm({ ...visitaForm, fecha_esperada: e.target.value })} />
              <input placeholder="Notas (vehículo, señas, etc.)" value={visitaForm.notas} onChange={e => setVisitaForm({ ...visitaForm, notas: e.target.value })} />
              {errorModal && <p className="modal-error">{errorModal}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Generando...' : 'Generar pase'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Modal QR del pase ---- */}
      {pase && (
        <div className="modal-overlay" onClick={() => setPase(null)}>
          <div className="modal-card pase-card" onClick={e => e.stopPropagation()}>
            <h2>Pase de acceso</h2>
            <p className="aviso-cuerpo">{pase.nombre_visitante} · {new Date(pase.fecha_esperada).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}</p>
            {qrDataUrl && <img className="pase-qr" src={qrDataUrl} alt={`Código QR ${pase.codigo}`} />}
            <div className="pase-codigo">{pase.codigo}</div>
            <p className="aviso-meta">Comparte este código o QR con tu visitante. Se valida en caseta.</p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-primary" onClick={() => setPase(null)}>Listo</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Modal registrar paquete ---- */}
      {modal === 'paquete' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h2>Registrar Paquete</h2>
            <form onSubmit={registrarPaquete}>
              <select className="modal-select" value={paqueteForm.propietario_id} onChange={e => setPaqueteForm({ ...paqueteForm, propietario_id: e.target.value })} required>
                <option value="">Selecciona al residente...</option>
                {propietarios.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
              </select>
              <input placeholder="Descripción (ej. caja mediana Amazon)" value={paqueteForm.descripcion} onChange={e => setPaqueteForm({ ...paqueteForm, descripcion: e.target.value })} required />
              <input placeholder="Paquetería (DHL, Estafeta...)" value={paqueteForm.paqueteria} onChange={e => setPaqueteForm({ ...paqueteForm, paqueteria: e.target.value })} />
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

export default Accesos;
