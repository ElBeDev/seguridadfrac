import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserPlus, FaEye, FaSearch, FaUserEdit, FaStar } from 'react-icons/fa';
import './Empleados.css';

interface Empleado {
  id?: number;
  dni: string;
  nombre_completo: string;
  telefono: string;
  email?: string;
  zona?: string;
  servicio: string;
  estado_actual: string;
  motivo?: string;
  avg_puntualidad?: string;
  avg_limpieza?: string;
  avg_personalidad?: string;
  avg_calidad_servicio?: string;
}

type TabKey = 'listado' | 'buscar' | 'registrar' | 'servicios';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #10B981, #0EA5E9)',
  'linear-gradient(135deg, #8B5CF6, #EC4899)',
  'linear-gradient(135deg, #F59E0B, #EF4444)',
  'linear-gradient(135deg, #0EA5E9, #6366F1)',
  'linear-gradient(135deg, #14B8A6, #84CC16)',
];

function Avatar({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
  const hash = nombre.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (
    <span className="empleado-avatar" style={{ background: AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length] }}>
      {iniciales || '?'}
    </span>
  );
}

const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
  { key: 'listado', icon: <FaEye />, label: 'Listado' },
  { key: 'buscar', icon: <FaSearch />, label: 'Buscar' },
  { key: 'registrar', icon: <FaUserEdit />, label: 'Registrar' },
  { key: 'servicios', icon: <FaUserPlus />, label: 'Servicios' },
];

function Empleados(): React.ReactNode {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('listado');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroServicio, setFiltroServicio] = useState<string>('todos');
  const [serviciosDisponibles, setServiciosDisponibles] = useState<string[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Empleado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const [verDetalle, setVerDetalle] = useState<Empleado | null>(null);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [editForm, setEditForm] = useState({ nombre_completo: '', telefono: '', email: '', zona: '', servicio: '', estado_actual: 'disponible', motivo: '' });
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');
  const [toast, setToast] = useState('');

  let esAdmin = false;
  try {
    esAdmin = JSON.parse(localStorage.getItem('user') || '{}').rol === 'admin';
  } catch { /* sin user en storage: se asume propietario */ }

  const abrirDetalle = async (empleado: Empleado) => {
    setVerDetalle(empleado);
    // El detalle por CURP trae los promedios de rating actualizados
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/empleados/${empleado.dni}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setVerDetalle(await response.json());
    } catch { /* nos quedamos con los datos del listado */ }
  };

  const abrirEditar = (empleado: Empleado) => {
    setEditando(empleado);
    setEditForm({
      nombre_completo: empleado.nombre_completo,
      telefono: empleado.telefono || '',
      email: empleado.email || '',
      zona: empleado.zona || '',
      servicio: empleado.servicio || '',
      estado_actual: empleado.estado_actual || 'disponible',
      motivo: empleado.motivo || '',
    });
    setErrorEdit('');
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando?.id) return;
    setGuardandoEdit(true);
    setErrorEdit('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/empleados/${editando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        const actualizado = await response.json();
        setEmpleados(prev => prev.map(emp => (emp.id === editando.id ? { ...emp, ...actualizado } : emp)));
        setEditando(null);
        setToast('✓ Empleado actualizado');
        setTimeout(() => setToast(''), 3000);
      } else {
        const error = await response.json();
        setErrorEdit(error.message || 'Error al guardar');
      }
    } catch {
      setErrorEdit('Error al conectar con el servidor');
    } finally {
      setGuardandoEdit(false);
    }
  };

  const promedioDe = (empleado: Empleado) => {
    const vals = [empleado.avg_puntualidad, empleado.avg_limpieza, empleado.avg_personalidad, empleado.avg_calidad_servicio]
      .map(Number).filter(v => !isNaN(v) && v > 0);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  };

  const buscarEmpleados = async () => {
    if (!busqueda.trim()) {
      setErrorBusqueda('Ingresa un CURP o nombre para buscar');
      return;
    }
    setBuscando(true);
    setErrorBusqueda('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/empleados/buscar?q=${encodeURIComponent(busqueda)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setResultadosBusqueda(await response.json());
      } else {
        setErrorBusqueda('Error al buscar empleados');
      }
    } catch (error) {
      console.error('Error buscando empleados:', error);
      setErrorBusqueda('Error al conectar con el servidor');
    } finally {
      setBuscando(false);
    }
  };

  // Fetch empleados data
  useEffect(() => {
    const fetchEmpleados = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/empleados');
        if (response.ok) {
          const data = await response.json();
          setEmpleados(data);
        }
      } catch (error) {
        console.error('Error fetching empleados:', error);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'listado' || activeTab === 'servicios') {
      fetchEmpleados();
    }
  }, [activeTab]);

  // Fetch servicios disponibles
  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const response = await fetch('/api/services');
        if (response.ok) {
          const data = await response.json();
          const servicios = data.map((s: { name: string }) => s.name).sort();
          setServiciosDisponibles(servicios);
        }
      } catch (error) {
        console.error('Error fetching servicios:', error);
      }
    };

    fetchServicios();
  }, []);

  // Filter empleados by service
  const empleadosFiltrados = filtroServicio === 'todos'
    ? empleados
    : empleados.filter(emp => emp.servicio && emp.servicio.toLowerCase() === filtroServicio.toLowerCase());

  return (
    <div className="empleados-page">
      <div className="header-card">
        <h1>Gestión de Empleados</h1>
        <p className="subtitle">Administra y consulta información de empleados</p>
      </div>

      <div className="unified-card">
        <div className="button-tabs-row">
          <button className="btn-nuevo" onClick={() => setActiveTab('registrar')}>
            <FaUserPlus /> Nuevo Empleado
          </button>
          <div className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <label htmlFor="filtro-servicio">Filtrar por servicio:</label>
          <select
            id="filtro-servicio"
            value={filtroServicio}
            onChange={(e) => setFiltroServicio(e.target.value)}
          >
            <option value="todos">Todos los servicios</option>
            {serviciosDisponibles.map((servicio) => (
              <option key={servicio} value={servicio}>
                {servicio}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="content">
        {activeTab === 'listado' && (
          <div className="table-card">
            <h2>Listado de Empleados</h2>
            {loading ? (
              <p>Cargando empleados...</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>CURP</th>
                    <th>Nombre Completo</th>
                    <th>Teléfono</th>
                    <th>Zona</th>
                    <th>Servicio</th>
                    <th>Estado</th>
                    <th>Rating</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {empleadosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center' }}>
                        No hay empleados registrados
                      </td>
                    </tr>
                  ) : (
                    empleadosFiltrados.map((empleado) => (
                      <tr key={empleado.dni}>
                        <td>{empleado.dni}</td>
                        <td>
                          <span className="empleado-nombre-cell">
                            <Avatar nombre={empleado.nombre_completo} />
                            {empleado.nombre_completo}
                          </span>
                        </td>
                        <td>{empleado.telefono}</td>
                        <td>{empleado.zona || '-'}</td>
                        <td>{empleado.servicio}</td>
                        <td>
                          <span className={`status ${empleado.estado_actual.toLowerCase()}`}>
                            {empleado.estado_actual}
                          </span>
                        </td>
                        <td>{
                          (() => {
                            const vals = [empleado.avg_puntualidad, empleado.avg_limpieza, empleado.avg_personalidad, empleado.avg_calidad_servicio]
                              .map(Number).filter(v => !isNaN(v) && v > 0);
                            return vals.length > 0 ? <>{(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)} <FaStar className="star-icon" /></> : 'Sin calificar';
                          })()
                        }</td>
                        <td>
                          <button className="btn-action" onClick={() => abrirDetalle(empleado)}>Ver</button>
                          {esAdmin && <button className="btn-action" onClick={() => abrirEditar(empleado)}>Editar</button>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'buscar' && (
          <div className="table-card">
            <h2>Buscar Empleado</h2>
            <div className="filter-row">
              <label className="modal-label" htmlFor="emp-curp-o-nombre">CURP o nombre</label>
              <input
                id="emp-curp-o-nombre"
                type="text"
                placeholder="CURP o nombre"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarEmpleados()}
              />
              <button className="btn-action" onClick={buscarEmpleados} disabled={buscando}>
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {errorBusqueda && <p style={{ color: '#991b1b' }}>{errorBusqueda}</p>}
            {resultadosBusqueda.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>CURP</th>
                    <th>Nombre Completo</th>
                    <th>Zona</th>
                    <th>Servicio</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosBusqueda.map((empleado) => (
                    <tr key={empleado.dni}>
                      <td>{empleado.dni}</td>
                      <td>
                        <span className="empleado-nombre-cell">
                          <Avatar nombre={empleado.nombre_completo} />
                          {empleado.nombre_completo}
                        </span>
                      </td>
                      <td>{empleado.zona || '-'}</td>
                      <td>{empleado.servicio}</td>
                      <td>
                        <span className={`status ${empleado.estado_actual.toLowerCase()}`}>
                          {empleado.estado_actual}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'registrar' && (
          <div className="table-card">
            <h2>Registrar Nuevo Empleado</h2>
            <p>El alta de empleados (con CURP, servicio, zona y calificaciones) se hace desde Inicio.</p>
            <button className="btn-action" onClick={() => navigate('/inicio')}>
              Ir a Registrar Empleado
            </button>
          </div>
        )}

        {activeTab === 'servicios' && (
          <div className="table-card">
            <h2>Gestión de Servicios</h2>
            {serviciosDisponibles.length === 0 ? (
              <p>No hay servicios cargados.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Empleados registrados</th>
                  </tr>
                </thead>
                <tbody>
                  {serviciosDisponibles.map((servicio) => (
                    <tr key={servicio}>
                      <td>{servicio}</td>
                      <td>{empleados.filter(e => e.servicio && e.servicio.toLowerCase() === servicio.toLowerCase()).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {toast && <div className="empleados-toast">{toast}</div>}

      {/* Modal Ver detalle */}
      {verDetalle && (
        <div className="modal-overlay" onClick={() => setVerDetalle(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="detalle-header">
              <Avatar nombre={verDetalle.nombre_completo} />
              <div>
                <h2 style={{ margin: 0 }}>{verDetalle.nombre_completo}</h2>
                <span className={`status ${verDetalle.estado_actual.toLowerCase()}`}>{verDetalle.estado_actual}</span>
              </div>
            </div>
            <div className="detalle-grid">
              <div><strong>CURP</strong><span>{verDetalle.dni}</span></div>
              <div><strong>Teléfono</strong><span>{verDetalle.telefono || '-'}</span></div>
              <div><strong>Email</strong><span>{verDetalle.email || '-'}</span></div>
              <div><strong>Zona</strong><span>{verDetalle.zona || '-'}</span></div>
              <div><strong>Servicio</strong><span>{verDetalle.servicio || '-'}</span></div>
              <div><strong>Rating promedio</strong><span>{promedioDe(verDetalle) ? <>{promedioDe(verDetalle)} <FaStar className="star-icon" /></> : 'Sin calificar'}</span></div>
            </div>
            {verDetalle.motivo && (
              <p className="detalle-notas"><strong>Notas:</strong> {verDetalle.motivo}</p>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
              {esAdmin && (
                <button type="button" className="btn-primary" onClick={() => { abrirEditar(verDetalle); setVerDetalle(null); }}>
                  Editar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar (solo admin) */}
      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Empleado</h2>
            <form onSubmit={guardarEdicion}>
              <label className="modal-label" htmlFor="emp-nombre-completo">Nombre completo</label>
              <input
                id="emp-nombre-completo"
                placeholder="Nombre completo"
                value={editForm.nombre_completo}
                onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                required
              />
              <label className="modal-label" htmlFor="emp-telefono">Teléfono</label>
              <input
                id="emp-telefono"
                placeholder="Teléfono"
                value={editForm.telefono}
                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
              />
              <label className="modal-label" htmlFor="emp-email">Email</label>
              <input
                id="emp-email"
                type="email"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <label className="modal-label" htmlFor="emp-zona">Zona</label>
              <input
                id="emp-zona"
                placeholder="Zona"
                value={editForm.zona}
                onChange={(e) => setEditForm({ ...editForm, zona: e.target.value })}
              />
              <label className="modal-label" htmlFor="emp-servicio">Servicio</label>
              <select
                id="emp-servicio"
                value={editForm.servicio}
                onChange={(e) => setEditForm({ ...editForm, servicio: e.target.value })}
                className="modal-select"
              >
                <option value="">Sin servicio</option>
                {serviciosDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="modal-label" htmlFor="emp-estado">Estado</label>
              <select
                id="emp-estado"
                value={editForm.estado_actual}
                onChange={(e) => setEditForm({ ...editForm, estado_actual: e.target.value })}
                className="modal-select"
              >
                <option value="disponible">Disponible</option>
                <option value="trabajando">Trabajando</option>
                <option value="inactiva">Inactiva</option>
              </select>
              <textarea
                placeholder="Notas / motivo"
                rows={3}
                value={editForm.motivo}
                onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
                className="modal-textarea"
              />
              {errorEdit && <p className="modal-error">{errorEdit}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardandoEdit}>
                  {guardandoEdit ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Empleados;