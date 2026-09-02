import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUserPlus,
  FaSearch,
  FaClipboardList,
  FaUsers,
  FaUserCheck,
  FaStar,
  FaTags,
  FaClock,
  FaBroom,
  FaSmile,
  FaBullseye,
  FaCheckCircle,
  FaWrench,
  FaPaintRoller,
  FaBolt,
  FaFire,
  FaCouch,
  FaHome,
  FaSnowflake,
  FaTemperatureLow,
  FaTools,
  FaHardHat,
  FaUserNurse,
  FaCheck
} from 'react-icons/fa';
import { ZONAS } from '../config/branding';
import './Inicio.css';
import { ToastMsg } from '../components/Toast';

const servicios = [
  { value: "Cuidados Adultos", icon: <FaUserNurse /> },
  { value: "Plomeros", icon: <FaWrench /> },
  { value: "Pintor", icon: <FaPaintRoller /> },
  { value: "Electricistas", icon: <FaBolt /> },
  { value: "Gasistas", icon: <FaFire /> },
  { value: "Limpieza Alfombras", icon: <FaBroom /> },
  { value: "Limpieza Sillones", icon: <FaCouch /> },
  { value: "Limpieza de hogar", icon: <FaHome /> },
  { value: "Tecnico de Aires Acondicionados", icon: <FaSnowflake /> },
  { value: "Tecnico de heladera", icon: <FaTemperatureLow /> },
  { value: "Arreglos generales", icon: <FaTools /> },
  { value: "Construcción - Maestros", icon: <FaHardHat /> }
];

const zonas = ZONAS;

interface FormData {
  dni: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  servicio: string;
  zona: string;
  ratings: {
    puntualidad: number;
    limpieza: number;
    personalidad: number;
    calidad: number;
  };
  descripcion: string;
}

function Inicio() {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<string>('registrar');
  const [dniBuscar, setDniBuscar] = useState('');
  const [empleadoEncontrado, setEmpleadoEncontrado] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [buscarServicioTexto, setBuscarServicioTexto] = useState('');
  const [categoriaServicio, setCategoriaServicio] = useState('');
  
  // Estados para reportar problema
  const [reporteData, setReporteData] = useState({
    empleadoBusqueda: '',
    tipoProblema: '',
    zona: '',
    descripcion: ''
  });
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [mensajeReporte, setMensajeReporte] = useState('');
  
  // Estados para registrar empleado
  const [enviandoRegistro, setEnviandoRegistro] = useState(false);
  const [mensajeRegistro, setMensajeRegistro] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    dni: '',
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    servicio: '',
    zona: '',
    ratings: {
      puntualidad: 0,
      limpieza: 0,
      personalidad: 0,
      calidad: 0
    },
    descripcion: ''
  });

  // Stats del strip superior (endpoint público)
  const [stats, setStats] = useState<{ total: number; disponibles: number; calificados: number; servicios: number } | null>(null);

  useEffect(() => {
    fetch('/api/empleados')
      .then(r => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        const conRating = data.filter(e =>
          [e.avg_puntualidad, e.avg_limpieza, e.avg_personalidad, e.avg_calidad_servicio].some((v) => Number(v) > 0)
        );
        setStats({
          total: data.length,
          disponibles: data.filter(e => e.estado_actual === 'disponible').length,
          calificados: conRating.length,
          servicios: new Set(data.map(e => e.servicio).filter(Boolean)).size,
        });
      })
      .catch(() => { /* sin red: el strip simplemente no se muestra */ });
  }, []);

  const cards = [
    {
      id: 'registrar',
      title: 'Registrar Empleado',
      description: 'Agregar nuevo personal o servicio al sistema',
      icon: <FaUserPlus />,
      color: '#10B981'
    },
    {
      id: 'buscar-empleado',
      title: 'Buscar Empleado',
      description: 'Verificar su historial y calificaciones',
      icon: <FaSearch />,
      color: '#0EA5E9'
    },
    {
      id: 'buscar-servicio',
      title: 'Buscar Servicio',
      description: 'Encontrar servicios y proveedores para tu hogar',
      icon: <FaTags />,
      color: '#8B5CF6'
    },
    {
      id: 'reportar',
      title: 'Reportar Problema',
      description: 'Reportar incidentes, robos o conflictos',
      icon: <FaClipboardList />,
      color: '#F59E0B'
    }
  ];

  const handleCardClick = (id: string) => {
    setSelectedCard(id);
    setDniBuscar('');
    setEmpleadoEncontrado(null);
    setErrorBusqueda('');
  };

  const buscarEmpleado = async () => {
    if (!dniBuscar.trim()) {
      setErrorBusqueda('Por favor ingresa un CURP');
      return;
    }

    setBuscando(true);
    setErrorBusqueda('');
    setEmpleadoEncontrado(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/empleados/${dniBuscar}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmpleadoEncontrado(data);
      } else if (response.status === 404) {
        setErrorBusqueda('No se encontró ningún empleado con ese CURP');
      } else {
        setErrorBusqueda('Error al buscar empleado');
      }
    } catch (error) {
      console.error('Error buscando empleado:', error);
      setErrorBusqueda('Error al conectar con el servidor');
    } finally {
      setBuscando(false);
    }
  };

    const calcularPromedioRating = (empleado: any) => {
    if (!empleado) return '0.0';
    const valores = [empleado.avg_puntualidad, empleado.avg_limpieza, empleado.avg_personalidad, empleado.avg_calidad_servicio]
      .map(Number)
      .filter((v) => !isNaN(v) && v > 0);
    if (valores.length === 0) return '0.0';
    const suma = valores.reduce((acc, val) => acc + val, 0);
    return (suma / valores.length).toFixed(1);
  };

  const getServiceDescription = (servicio: string) => {
    const descriptions: { [key: string]: string } = {
      'Cuidados Adultos': 'Cuidado profesional para adultos mayores',
      'Plomeros': 'Reparación e instalación de cañerías',
      'Pintor': 'Servicios de pintura para interiores y exteriores',
      'Electricistas': 'Instalaciones y reparaciones eléctricas',
      'Gasistas': 'Instalación y mantenimiento de sistemas de gas',
      'Limpieza Alfombras': 'Limpieza profunda de alfombras y tapetes',
      'Limpieza Sillones': 'Limpieza especializada de muebles tapizados',
      'Limpieza de hogar': 'Servicio integral de limpieza para el hogar',
      'Tecnico de Aires Acondicionados': 'Instalación y mantenimiento de aire acondicionado',
      'Tecnico de heladera': 'Reparación y mantenimiento de heladeras',
      'Arreglos generales': 'Reparaciones y mantenimiento general',
      'Construcción - Maestros': 'Servicios profesionales de construcción'
    };
    return descriptions[servicio] || 'Servicios profesionales con personal calificado.';
  };

  const handleRatingClick = (category: keyof FormData['ratings'], rating: number) => {
    setFormData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: rating
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.dni || !formData.nombre || !formData.apellido) {
      setMensajeRegistro('Por favor completa CURP, nombre y apellido');
      setTimeout(() => setMensajeRegistro(''), 3000);
      return;
    }

    if (!formData.servicio || !formData.zona) {
      setMensajeRegistro('Por favor selecciona servicio y zona');
      setTimeout(() => setMensajeRegistro(''), 3000);
      return;
    }

    setEnviandoRegistro(true);
    setMensajeRegistro('');

    try {
      const token = localStorage.getItem('token');

      // Preparar datos para el backend
      const empleadoData = {
        dni: formData.dni,
        nombre_completo: `${formData.nombre} ${formData.apellido}`.trim(),
        telefono: formData.telefono,
        email: formData.email,
        zona: formData.zona,
        servicio: formData.servicio,
        motivo: formData.descripcion,
        estado_actual: 'disponible',
        ratings: {
          puntualidad: formData.ratings.puntualidad || null,
          limpieza: formData.ratings.limpieza || null,
          personalidad: formData.ratings.personalidad || null,
          calidad_servicio: formData.ratings.calidad || null,
        }
      };

      const response = await fetch('/api/empleados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(empleadoData)
      });

      if (response.ok) {
        setMensajeRegistro('✓ Empleado registrado exitosamente');
        // Limpiar formulario
        setFormData({
          dni: '',
          nombre: '',
          apellido: '',
          telefono: '',
          email: '',
          servicio: '',
          zona: '',
          ratings: { puntualidad: 0, limpieza: 0, personalidad: 0, calidad: 0 },
          descripcion: ''
        });
        setTimeout(() => setMensajeRegistro(''), 3000);
      } else {
        const error = await response.json();
        setMensajeRegistro(error.message || 'Error al registrar empleado');
        setTimeout(() => setMensajeRegistro(''), 3000);
      }
    } catch (error) {
      console.error('Error:', error);
      setMensajeRegistro('Error al conectar con el servidor');
      setTimeout(() => setMensajeRegistro(''), 3000);
    } finally {
      setEnviandoRegistro(false);
    }
  };

  const handleReporteSubmit = async () => {
    if (!reporteData.descripcion.trim()) {
      setMensajeReporte('Por favor describe el problema');
      setTimeout(() => setMensajeReporte(''), 3000);
      return;
    }

    if (!reporteData.tipoProblema) {
      setMensajeReporte('Por favor selecciona el tipo de problema');
      setTimeout(() => setMensajeReporte(''), 3000);
      return;
    }

    setEnviandoReporte(true);
    setMensajeReporte('');

    try {
      const token = localStorage.getItem('token');
      
      // Si se proporcionó CURP, buscar el empleado primero
      let empleadoId = null;
      if (reporteData.empleadoBusqueda.trim()) {
        try {
          const buscarResponse = await fetch(`/api/empleados/${reporteData.empleadoBusqueda}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (buscarResponse.ok) {
            const empleado = await buscarResponse.json();
            empleadoId = empleado.id;
          }
        } catch (error) {
          console.log('No se encontró empleado con ese CURP, continuando sin empleado asociado');
        }
      }

      // Mapear tipo de problema a tipo_reporte del backend
      const tipoReporteMap: { [key: string]: string } = {
        'incidente': 'advertencia_moderada',
        'robo': 'advertencia_grave',
        'comportamiento': 'advertencia_leve',
        'otro': 'advertencia_leve'
      };

      if (!empleadoId) {
        setMensajeReporte('Debe proporcionar un CURP de empleado válido');
        setTimeout(() => setMensajeReporte(''), 3000);
        setEnviandoReporte(false);
        return;
      }

      const reportePayload = {
        empleada_id: empleadoId,
        tipo_reporte: tipoReporteMap[reporteData.tipoProblema] || 'advertencia_leve',
        titulo: `${reporteData.tipoProblema.charAt(0).toUpperCase() + reporteData.tipoProblema.slice(1)} - ${reporteData.zona || 'Sin zona'}`,
        descripcion: reporteData.descripcion
      };

      const response = await fetch('/api/reportes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportePayload)
      });

      if (response.ok) {
        setMensajeReporte('✓ Reporte enviado exitosamente');
        setReporteData({
          empleadoBusqueda: '',
          tipoProblema: '',
          zona: '',
          descripcion: ''
        });
        setTimeout(() => setMensajeReporte(''), 3000);
      } else {
        const error = await response.json();
        setMensajeReporte(error.message || 'Error al enviar reporte');
        setTimeout(() => setMensajeReporte(''), 3000);
      }
    } catch (error) {
      console.error('Error:', error);
      setMensajeReporte('Error al conectar con el servidor');
      setTimeout(() => setMensajeReporte(''), 3000);
    } finally {
      setEnviandoReporte(false);
    }
  };

  return (
    <div className="inicio-container">
      <div className="inicio-content">
        {/* Strip de stats */}
        {stats && (
          <div className="stats-strip">
            <div className="stat-tile">
              <span className="stat-tile-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}><FaUsers /></span>
              <div>
                <div className="stat-tile-number">{stats.total}</div>
                <div className="stat-tile-label">Empleados registrados</div>
              </div>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-icon" style={{ background: 'rgba(14,165,233,0.12)', color: '#0EA5E9' }}><FaUserCheck /></span>
              <div>
                <div className="stat-tile-number">{stats.disponibles}</div>
                <div className="stat-tile-label">Disponibles</div>
              </div>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}><FaStar /></span>
              <div>
                <div className="stat-tile-number">{stats.calificados}</div>
                <div className="stat-tile-label">Con calificaciones</div>
              </div>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}><FaTags /></span>
              <div>
                <div className="stat-tile-number">{stats.servicios}</div>
                <div className="stat-tile-label">Servicios activos</div>
              </div>
            </div>
          </div>
        )}

        {/* Cards de acciones principales */}
        <div className="action-cards-grid">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`action-card ${selectedCard === card.id ? 'selected' : ''}`}
              onClick={() => handleCardClick(card.id)}
              style={{ '--card-accent': card.color } as React.CSSProperties}
            >
              <div className="card-icon">
                {card.icon}
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>

        {/* Sección dinámica según la tarjeta seleccionada */}
        <section className="about-section">
          {selectedCard === 'buscar-empleado' && (
            <>
              <h2>Buscar Empleado</h2>
              <p style={{ marginTop: '4px', marginBottom: '28px', color: 'rgb(71, 85, 105)', fontSize: '15px' }}>
                Consultá el estado de cada empleado registrado, su historial y calificaciones.
              </p>
              
              <div className="buscar-section">
                <div className="buscar-input-wrapper">
                  <FaSearch className="buscar-icon" />
                  <input
                    type="text"
                    aria-label="Buscar empleado por CURP o nombre" placeholder="CURP, nombre o apellido"
                    value={dniBuscar}
                    onChange={(e) => setDniBuscar(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && buscarEmpleado()}
                    disabled={buscando}
                  />
                </div>
                <button 
                  onClick={buscarEmpleado} 
                  disabled={buscando}
                  className="buscar-btn"
                >
                  {buscando ? 'BUSCANDO...' : 'BUSCAR'}
                </button>
              </div>

              {errorBusqueda && (
                <div className="error-message">{errorBusqueda}</div>
              )}

              {empleadoEncontrado && (
                <div className="empleado-resultado">
                  <h3><FaCheckCircle className="star-icon" /> Empleado Encontrado</h3>
                  <div className="empleado-info">
                    <div className="info-row">
                      <strong>CURP:</strong> {empleadoEncontrado.dni}
                    </div>
                    <div className="info-row">
                      <strong>Nombre:</strong> {empleadoEncontrado.nombre_completo}
                    </div>
                    <div className="info-row">
                      <strong>Teléfono:</strong> {empleadoEncontrado.telefono || 'No registrado'}
                    </div>
                    <div className="info-row">
                      <strong>Servicio:</strong> {empleadoEncontrado.servicio || 'No especificado'}
                    </div>
                    <div className="info-row">
                      <strong>Estado:</strong> 
                      <span className={`estado-badge ${empleadoEncontrado.estado_actual}`}>
                        {empleadoEncontrado.estado_actual || 'disponible'}
                      </span>
                    </div>
                    <div className="info-row">
                      <strong>Rating Promedio:</strong> 
                      <span className="rating-badge">
                        <FaStar className="star-icon" /> {calcularPromedioRating(empleadoEncontrado)}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    className="ver-completo-btn"
                    onClick={() => navigate('/empleados')}
                  >
                    Ver Perfil Completo
                  </button>
                </div>
              )}
            </>
          )}

          {selectedCard === 'registrar' && (
            <>
              <h2>Registrar Empleado</h2>
              
              <div className="form-layout">
                {/* Columna Izquierda */}
                <div className="form-column">
                  <h3>Información Personal</h3>
                  <div className="form-grid">
                    <div className="campo">
                      <label className="campo-label" htmlFor="reg-curp">CURP *</label>
                      <input
                        id="reg-curp"
                        type="text"
                        placeholder="18 caracteres"
                        value={formData.dni}
                        onChange={(e) => setFormData({...formData, dni: e.target.value})}
                      />
                    </div>
                    <div className="campo">
                      <label className="campo-label" htmlFor="reg-telefono">Teléfono</label>
                      <input
                        id="reg-telefono"
                        type="text"
                        placeholder="10 dígitos"
                        value={formData.telefono}
                        onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                      />
                    </div>
                    <div className="campo">
                      <label className="campo-label" htmlFor="reg-nombre">Nombre *</label>
                      <input
                        id="reg-nombre"
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      />
                    </div>
                    <div className="campo">
                      <label className="campo-label" htmlFor="reg-apellido">Apellido *</label>
                      <input
                        id="reg-apellido"
                        type="text"
                        value={formData.apellido}
                        onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                      />
                    </div>
                    <div className="campo" style={{ gridColumn: '1 / -1' }}>
                      <label className="campo-label" htmlFor="reg-email">Email</label>
                      <input
                        id="reg-email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <h3>Servicio</h3>
                  <select 
                    value={formData.servicio}
                    onChange={(e) => setFormData({...formData, servicio: e.target.value})}
                  >
                    <option value="">Selecciona un servicio...</option>
                    {servicios.map(s => (
                      <option key={s.value} value={s.value}>{s.value}</option>
                    ))}
                  </select>

                  <h3>Zona de trabajo</h3>
                  <select
                    value={formData.zona}
                    onChange={(e) => setFormData({...formData, zona: e.target.value})}
                  >
                    <option value="">Selecciona una zona...</option>
                    {zonas.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                {/* Columna Derecha - Ratings */}
                <div className="form-column">
                  <h3><FaStar className="star-icon" /> Calificaciones</h3>
                  <div className="ratings-container">
                    {[
                      { key: 'puntualidad' as const, label: 'Puntualidad', icon: <FaClock /> },
                      { key: 'limpieza' as const, label: 'Limpieza', icon: <FaBroom /> },
                      { key: 'personalidad' as const, label: 'Personalidad', icon: <FaSmile /> },
                      { key: 'calidad' as const, label: 'Calidad', icon: <FaBullseye /> }
                    ].map((rating) => (
                      <div key={rating.key} className="rating-row">
                        <span className="rating-label">
                          <span className="rating-emoji">{rating.icon}</span>
                          <span>{rating.label}</span>
                        </span>
                        <div className="star-container">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div key={star} className="star-wrapper">
                              <button
                                type="button"
                                className="star-button"
                                onClick={() => handleRatingClick(rating.key, star)}
                                style={{
                                  color: star <= formData.ratings[rating.key] ? '#33b398' : '#d1d5db'
                                }}
                              >
                                <FaStar />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="description-section">
                <h3>Descripción adicional</h3>
                <textarea
                  placeholder="Experiencia, referencia, reporte de problemas, etc."
                  rows={4}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>

              {mensajeRegistro && (
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginTop: '16px',
                  background: mensajeRegistro.includes('✓') ? '#d1fae5' : '#fee2e2',
                  color: mensajeRegistro.includes('✓') ? '#065f46' : '#991b1b',
                  textAlign: 'center',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <ToastMsg texto={mensajeRegistro} />
                </div>
              )}

              <div className="submit-section">
                <button 
                  onClick={handleSubmit} 
                  className="submit-button"
                  disabled={enviandoRegistro}
                  style={{ opacity: enviandoRegistro ? 0.6 : 1 }}
                >
                  {enviandoRegistro ? 'ENVIANDO...' : <><FaCheck /> REGISTRAR EMPLEADO</>}
                </button>
              </div>
            </>
          )}

          {selectedCard === 'buscar-servicio' && (
            <>
              <h2>Buscar Servicio</h2>
              <p style={{ marginTop: '4px', marginBottom: '28px', color: 'rgb(71, 85, 105)', fontSize: '15px' }}>
                Filtrar por categoría y encontrar diferentes proveedores.
              </p>
              
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                  <FaSearch style={{ position: 'absolute', top: '12px', left: '12px', width: '20px', height: '20px', color: 'rgb(100, 116, 139)' }} />
                  <input
                    aria-label="Buscar servicio" placeholder="Buscar servicio"
                    value={buscarServicioTexto}
                    onChange={(e) => setBuscarServicioTexto(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '14px 16px 14px 40px', 
                      borderRadius: '12px', 
                      border: '2px solid rgb(229, 231, 235)', 
                      background: 'rgb(255, 255, 255)', 
                      fontSize: '15px', 
                      outline: 'none', 
                      transition: '0.2s', 
                      fontFamily: 'inherit' 
                    }}
                  />
                </div>
                <select
                  value={categoriaServicio}
                  onChange={(e) => setCategoriaServicio(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px', 
                    borderRadius: '12px', 
                    border: '2px solid rgb(229, 231, 235)', 
                    background: 'rgb(255, 255, 255)', 
                    fontSize: '15px', 
                    outline: 'none', 
                    transition: '0.2s', 
                    fontFamily: 'inherit', 
                    flex: '1 1 200px', 
                    maxWidth: '240px' 
                  }}
                >
                  <option value="">Todas las categorías</option>
                  {servicios.map(s => (
                    <option key={s.value} value={s.value}>{s.value}</option>
                  ))}
                </select>
              </div>

              <div className="servicios-grid">
                {servicios
                  .filter(s => !categoriaServicio || s.value === categoriaServicio)
                  .filter(s => !buscarServicioTexto || s.value.toLowerCase().includes(buscarServicioTexto.toLowerCase()))
                  .map((servicio, idx) => {
                    const gradients = [
                      'linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%)',
                      'linear-gradient(135deg, rgb(240, 147, 251) 0%, rgb(245, 87, 108) 100%)',
                      'linear-gradient(135deg, rgb(79, 172, 254) 0%, rgb(0, 242, 254) 100%)',
                      'linear-gradient(135deg, rgb(67, 233, 123) 0%, rgb(56, 249, 215) 100%)',
                      'linear-gradient(135deg, rgb(250, 112, 154) 0%, rgb(254, 225, 64) 100%)',
                      'linear-gradient(135deg, rgb(168, 237, 234) 0%, rgb(254, 214, 227) 100%)',
                      'linear-gradient(135deg, rgb(255, 154, 158) 0%, rgb(254, 207, 239) 100%)',
                      'linear-gradient(135deg, rgb(161, 140, 209) 0%, rgb(251, 194, 235) 100%)',
                    ];
                    const gradient = gradients[idx % gradients.length];
                    
                    return (
                      <div 
                        key={servicio.value}
                        className="service-card"
                        style={{ background: gradient }}
                      >
                        <div className="service-card-inner">
                          <div className="service-icon" style={{ background: gradient }}>{servicio.icon}</div>
                          <h4>{servicio.value}</h4>
                          <p>{getServiceDescription(servicio.value)}</p>
                          <button 
                            style={{ background: gradient }}
                            onClick={() => navigate('/empleados')}
                          >
                            Ver Proveedores
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}

          {selectedCard === 'reportar' && (
            <>
              <h2>Reportar Problema</h2>
              <p style={{ marginTop: '4px', marginBottom: '28px', color: 'rgb(71, 85, 105)', fontSize: '15px' }}>
                Registrar incidentes, robos, conflictos o comportamientos inadecuados.
              </p>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                  <FaSearch style={{ position: 'absolute', top: '12px', left: '12px', width: '20px', height: '20px', color: 'rgb(100, 116, 139)' }} />
                  <input
                    aria-label="Buscar empleado por CURP o nombre" placeholder="Buscar empleado (CURP o nombre)"
                    value={reporteData.empleadoBusqueda}
                    onChange={(e) => setReporteData({...reporteData, empleadoBusqueda: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '14px 16px 14px 40px', 
                      borderRadius: '12px', 
                      border: '2px solid rgb(229, 231, 235)', 
                      background: 'rgb(255, 255, 255)', 
                      fontSize: '15px', 
                      outline: 'none', 
                      transition: '0.2s', 
                      fontFamily: 'inherit' 
                    }}
                  />
                </div>

                <select
                  value={reporteData.tipoProblema}
                  onChange={(e) => setReporteData({...reporteData, tipoProblema: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px', 
                    borderRadius: '12px', 
                    border: '2px solid rgb(229, 231, 235)', 
                    background: 'rgb(255, 255, 255)', 
                    fontSize: '15px', 
                    outline: 'none', 
                    transition: '0.2s', 
                    fontFamily: 'inherit', 
                    flex: '1 1 180px', 
                    maxWidth: '220px' 
                  }}
                >
                  <option value="">Tipo de problema</option>
                  <option value="incidente">Incidente</option>
                  <option value="robo">Robo</option>
                  <option value="comportamiento">Comportamiento</option>
                  <option value="otro">Otro</option>
                </select>

                <select
                  value={reporteData.zona}
                  onChange={(e) => setReporteData({...reporteData, zona: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px', 
                    borderRadius: '12px', 
                    border: '2px solid rgb(229, 231, 235)', 
                    background: 'rgb(255, 255, 255)', 
                    fontSize: '15px', 
                    outline: 'none', 
                    transition: '0.2s', 
                    fontFamily: 'inherit', 
                    flex: '1 1 160px', 
                    maxWidth: '200px' 
                  }}
                >
                  <option value="">Zona</option>
                  {zonas.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <textarea
                rows={5}
                placeholder="Describir el incidente con la mayor precisión posible"
                value={reporteData.descripcion}
                onChange={(e) => setReporteData({...reporteData, descripcion: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  border: '2px solid rgb(229, 231, 235)', 
                  background: 'rgb(255, 255, 255)', 
                  fontSize: '15px', 
                  outline: 'none', 
                  transition: '0.2s', 
                  fontFamily: 'inherit', 
                  resize: 'vertical' 
                }}
              />

              {mensajeReporte && (
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginTop: '16px',
                  background: mensajeReporte.includes('✓') ? '#d1fae5' : '#fee2e2',
                  color: mensajeReporte.includes('✓') ? '#065f46' : '#991b1b',
                  textAlign: 'center',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <ToastMsg texto={mensajeReporte} />
                </div>
              )}

              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button
                  onClick={handleReporteSubmit}
                  disabled={enviandoReporte}
                  style={{ 
                    background: 'rgb(51, 179, 152)', 
                    border: 'none', 
                    color: 'rgb(255, 255, 255)', 
                    padding: '12px 30px', 
                    borderRadius: '14px', 
                    fontSize: '15px', 
                    fontWeight: '600', 
                    cursor: 'pointer', 
                    boxShadow: 'rgba(51, 179, 152, 0.35) 0px 8px 22px',
                    opacity: enviandoReporte ? 0.6 : 1
                  }}
                >
                  {enviandoReporte ? 'ENVIANDO...' : 'ENVIAR'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Inicio;
