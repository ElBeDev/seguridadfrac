import { useState, useEffect } from 'react';
import { FaUserShield, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaUndo, FaClipboardList } from 'react-icons/fa';
import './Admin.css';

interface Usuario {
  id: number;
  nombre_completo: string;
  email: string;
  telefono: string;
  direccion: string;
  rol: string;
  estado: string;
}

interface Reporte {
  id: number;
  tipo_reporte: string;
  titulo: string;
  descripcion: string;
  estado_moderacion: string;
  empleado_nombre: string | null;
  dni: string | null;
  propietario_nombre: string | null;
  created_at: string;
}

type Settings = { maintenance_mode: string; email_notifications: string; auto_backup: string };

const SETTING_LABELS: { key: keyof Settings; label: string }[] = [
  { key: 'maintenance_mode', label: 'Modo de mantenimiento' },
  { key: 'email_notifications', label: 'Notificaciones por email' },
  { key: 'auto_backup', label: 'Backup automático' },
];

const TIPO_REPORTE_LABEL: { [key: string]: string } = {
  advertencia_leve: 'Leve',
  advertencia_moderada: 'Moderada',
  advertencia_grave: 'Grave',
};

const ESTADO_LABEL: { [key: string]: string } = {
  pending: 'Pendiente',
  verified: 'Verificado',
  suspended: 'Suspendido',
  rejected: 'Rechazado',
};

function Admin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ nombre_completo: '', email: '', telefono: '', direccion: '', password: '', rol: 'propietario' });
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState('');

  const [editando, setEditando] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState({ nombre_completo: '', telefono: '', direccion: '' });
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');

  const [settings, setSettings] = useState<Settings | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [filtroReportes, setFiltroReportes] = useState<'pendiente' | 'todos'>('pendiente');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/usuarios', { headers: authHeaders() });
      if (response.ok) setUsuarios(await response.json());
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportes = async () => {
    try {
      const response = await fetch('/api/reportes', { headers: authHeaders() });
      if (response.ok) setReportes(await response.json());
    } catch (error) {
      console.error('Error fetching reportes:', error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchReportes();
    fetch('/api/settings', { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : null))
      .then(s => s && setSettings(s))
      .catch(() => { /* sin settings: los checkboxes quedan deshabilitados */ });
  }, []);

  const mostrarMensaje = (texto: string) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3000);
  };

  const toggleSetting = async (key: keyof Settings) => {
    if (!settings) return;
    const nuevoValor = settings[key] === 'true' ? 'false' : 'true';
    const previo = settings;
    setSettings({ ...settings, [key]: nuevoValor });
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ [key]: nuevoValor }),
      });
      if (response.ok) {
        setSettings(await response.json());
        mostrarMensaje('✓ Configuración guardada');
      } else {
        setSettings(previo);
        mostrarMensaje('Error al guardar configuración');
      }
    } catch {
      setSettings(previo);
      mostrarMensaje('Error al conectar con el servidor');
    }
  };

  const moderarReporte = async (reporte: Reporte, estado: 'aprobado' | 'rechazado') => {
    try {
      const response = await fetch(`/api/reportes/${reporte.id}/moderar`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ estado_moderacion: estado }),
      });
      if (response.ok) {
        const actualizado = await response.json();
        setReportes(prev => prev.map(r => (r.id === reporte.id ? { ...r, estado_moderacion: actualizado.estado_moderacion } : r)));
        mostrarMensaje(`✓ Reporte ${estado}`);
      } else {
        mostrarMensaje('Error al moderar reporte');
      }
    } catch {
      mostrarMensaje('Error al conectar con el servidor');
    }
  };

  const actualizarEstado = async (usuario: Usuario, endpoint: string, estado: string) => {
    try {
      const response = await fetch(`/api/usuarios/${usuario.id}/${endpoint}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ estado }),
      });
      if (response.ok) {
        const actualizado = await response.json();
        setUsuarios(prev => prev.map(u => (u.id === usuario.id ? { ...u, estado: actualizado.estado } : u)));
        mostrarMensaje('✓ Estado actualizado');
      } else {
        mostrarMensaje('Error al actualizar estado');
      }
    } catch (error) {
      console.error(error);
      mostrarMensaje('Error al conectar con el servidor');
    }
  };

  const abrirEditar = (usuario: Usuario) => {
    setEditando(usuario);
    setEditForm({
      nombre_completo: usuario.nombre_completo,
      telefono: usuario.telefono || '',
      direccion: usuario.direccion || '',
    });
    setErrorEdit('');
  };

  const handleGuardarEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    setGuardandoEdit(true);
    setErrorEdit('');
    try {
      const response = await fetch(`/api/usuarios/${editando.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        const actualizado = await response.json();
        setUsuarios(prev => prev.map(u => (u.id === editando.id ? { ...u, ...actualizado } : u)));
        setEditando(null);
        mostrarMensaje('✓ Usuario actualizado');
      } else {
        const error = await response.json();
        setErrorEdit(error.message || 'Error al editar usuario');
      }
    } catch (error) {
      console.error(error);
      setErrorEdit('Error al conectar con el servidor');
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoNuevo(true);
    setErrorNuevo('');
    try {
      const response = await fetch('/api/auth/create-propietario', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(nuevoForm),
      });
      if (response.ok) {
        setShowNuevo(false);
        const eraVigilancia = nuevoForm.rol === 'vigilancia';
        setNuevoForm({ nombre_completo: '', email: '', telefono: '', direccion: '', password: '', rol: 'propietario' });
        mostrarMensaje(eraVigilancia ? '✓ Usuario de vigilancia creado y activo' : '✓ Propietario creado, queda pendiente de verificación');
        fetchUsuarios();
      } else {
        const error = await response.json();
        setErrorNuevo(error.error || 'Error al crear usuario');
      }
    } catch (error) {
      console.error(error);
      setErrorNuevo('Error al conectar con el servidor');
    } finally {
      setGuardandoNuevo(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1>Panel de Administración</h1>
          <p className="subtitle">Gestión de usuarios del sistema</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowNuevo(true); setErrorNuevo(''); }}>
          <FaPlus /> Nuevo Usuario
        </button>
      </div>

      {mensaje && <div className="admin-toast">{mensaje}</div>}

      <div className="admin-container">
        <div className="users-card">
          <div className="card-header">
            <h2>
              <FaUserShield /> Usuarios del Sistema
            </h2>
          </div>

          {loading ? (
            <p>Cargando usuarios...</p>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.nombre_completo}</td>
                      <td>{usuario.email}</td>
                      <td>
                        <span className={`role-badge ${usuario.rol}`}>
                          {usuario.rol}
                        </span>
                      </td>
                      <td>
                        <span className={`estado-badge-admin ${usuario.estado}`}>
                          {ESTADO_LABEL[usuario.estado] || usuario.estado}
                        </span>
                      </td>
                      <td>
                        {usuario.estado === 'pending' && (
                          <>
                            <button
                              className="btn-icon"
                              title="Verificar propietario"
                              onClick={() => actualizarEstado(usuario, 'verificar', 'verified')}
                            >
                              <FaCheck />
                            </button>
                            <button
                              className="btn-icon danger"
                              title="Rechazar propietario"
                              onClick={() => actualizarEstado(usuario, 'verificar', 'rejected')}
                            >
                              <FaTimes />
                            </button>
                          </>
                        )}
                        <button className="btn-icon" title="Editar usuario" onClick={() => abrirEditar(usuario)}>
                          <FaEdit />
                        </button>
                        {usuario.estado === 'suspended' ? (
                          <button
                            className="btn-icon"
                            title="Reactivar usuario"
                            onClick={() => actualizarEstado(usuario, 'suspender', 'verified')}
                          >
                            <FaUndo />
                          </button>
                        ) : (
                          <button
                            className="btn-icon danger"
                            title="Suspender usuario"
                            onClick={() => actualizarEstado(usuario, 'suspender', 'suspended')}
                          >
                            <FaTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="users-card">
          <div className="card-header reportes-header">
            <h2>
              <FaClipboardList /> Moderación de Reportes
            </h2>
            <div className="reportes-filter">
              <button
                className={`filter-chip ${filtroReportes === 'pendiente' ? 'active' : ''}`}
                onClick={() => setFiltroReportes('pendiente')}
              >
                Pendientes ({reportes.filter(r => r.estado_moderacion === 'pendiente').length})
              </button>
              <button
                className={`filter-chip ${filtroReportes === 'todos' ? 'active' : ''}`}
                onClick={() => setFiltroReportes('todos')}
              >
                Todos ({reportes.length})
              </button>
            </div>
          </div>

          {(() => {
            const visibles = filtroReportes === 'pendiente'
              ? reportes.filter(r => r.estado_moderacion === 'pendiente')
              : reportes;
            if (visibles.length === 0) {
              return <p className="reportes-empty">
                {filtroReportes === 'pendiente' ? 'No hay reportes pendientes de moderación.' : 'No hay reportes registrados.'}
              </p>;
            }
            return (
              <div className="reportes-list">
                {visibles.map(reporte => (
                  <div className={`reporte-item severidad-${reporte.tipo_reporte}`} key={reporte.id}>
                    <div className="reporte-body">
                      <div className="reporte-top">
                        <span className={`tipo-badge ${reporte.tipo_reporte}`}>
                          {TIPO_REPORTE_LABEL[reporte.tipo_reporte] || reporte.tipo_reporte}
                        </span>
                        <strong>{reporte.titulo}</strong>
                        <span className={`estado-badge-admin ${reporte.estado_moderacion === 'pendiente' ? 'pending' : reporte.estado_moderacion === 'aprobado' ? 'verified' : 'rejected'}`}>
                          {reporte.estado_moderacion}
                        </span>
                      </div>
                      <p className="reporte-desc">{reporte.descripcion}</p>
                      <p className="reporte-meta">
                        {reporte.empleado_nombre ? `Sobre: ${reporte.empleado_nombre} (${reporte.dni})` : 'Sin empleado asociado'}
                        {reporte.propietario_nombre ? ` · Reportado por: ${reporte.propietario_nombre}` : ''}
                        {' · '}{new Date(reporte.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {reporte.estado_moderacion === 'pendiente' && (
                      <div className="reporte-actions">
                        <button className="btn-icon" title="Aprobar reporte" onClick={() => moderarReporte(reporte, 'aprobado')}>
                          <FaCheck />
                        </button>
                        <button className="btn-icon danger" title="Rechazar reporte" onClick={() => moderarReporte(reporte, 'rechazado')}>
                          <FaTimes />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h2>Configuración del Sistema</h2>
          </div>
          <div className="settings-content">
            {SETTING_LABELS.map(({ key, label }) => (
              <div className="setting-item" key={key}>
                <label htmlFor={`setting-${key}`}>{label}</label>
                <input
                  id={`setting-${key}`}
                  type="checkbox"
                  checked={settings ? settings[key] === 'true' : false}
                  disabled={!settings}
                  onChange={() => toggleSetting(key)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNuevo && (
        <div className="modal-overlay" onClick={() => setShowNuevo(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Nuevo Usuario</h2>
            <form onSubmit={handleCrearUsuario}>
              <select
                className="modal-select"
                value={nuevoForm.rol}
                onChange={(e) => setNuevoForm({ ...nuevoForm, rol: e.target.value })}
              >
                <option value="propietario">Propietario (requiere verificación)</option>
                <option value="vigilancia">Vigilancia / caseta (activo de inmediato)</option>
              </select>
              <input
                placeholder="Nombre completo"
                value={nuevoForm.nombre_completo}
                onChange={(e) => setNuevoForm({ ...nuevoForm, nombre_completo: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={nuevoForm.email}
                onChange={(e) => setNuevoForm({ ...nuevoForm, email: e.target.value })}
                required
              />
              <input
                placeholder="Teléfono"
                value={nuevoForm.telefono}
                onChange={(e) => setNuevoForm({ ...nuevoForm, telefono: e.target.value })}
                required
              />
              <input
                placeholder="Dirección"
                value={nuevoForm.direccion}
                onChange={(e) => setNuevoForm({ ...nuevoForm, direccion: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Contraseña (mínimo 6 caracteres)"
                value={nuevoForm.password}
                onChange={(e) => setNuevoForm({ ...nuevoForm, password: e.target.value })}
                minLength={6}
                required
              />
              {errorNuevo && <p className="modal-error">{errorNuevo}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowNuevo(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardandoNuevo}>
                  {guardandoNuevo ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Editar Usuario</h2>
            <form onSubmit={handleGuardarEdit}>
              <input
                placeholder="Nombre completo"
                value={editForm.nombre_completo}
                onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                required
              />
              <input
                placeholder="Teléfono"
                value={editForm.telefono}
                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
              />
              <input
                placeholder="Dirección"
                value={editForm.direccion}
                onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
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

export default Admin;
