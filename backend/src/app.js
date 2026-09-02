const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const rateLimit = require('express-rate-limit');
// dotenv se carga solo en local desde src/server.js — aquí no, porque el
// bundler de Vercel lo externaliza y truena en runtime.
const path = require('path');

const app = express();

// Activar trust proxy para entornos detrás de proxy (App Engine, Cloud Run, etc)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(cors());
// Configurar helmet con CSP personalizado
app.use(helmet({
  // Desactivar HSTS hasta tener SSL configurado
  strictTransportSecurity: false,
  // Desactivar headers que causan warnings en HTTP puro
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:4000", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      upgradeInsecureRequests: null,  // Desactivar: convierte HTTP→HTTPS automáticamente
    },
  },
}));
app.use(morgan('dev'));
// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: 'Demasiadas solicitudes, intenta más tarde.'
}));
// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));
// Rutas de autenticación
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);


// Rutas de empleados (propietario)
const empleadosRoutes = require('./routes/empleados');
app.use('/api/empleados', empleadosRoutes);

// Rutas de administración de usuarios
const usuariosRoutes = require('./routes/usuarios');
app.use('/api/usuarios', usuariosRoutes);


// Rutas de administración de empleados
const empleadosAdminRoutes = require('./routes/empleadosAdmin');
app.use('/api/admin/empleados', empleadosAdminRoutes);

// Rutas de reportes
const reportesRoutes = require('./routes/reportes');
app.use('/api/reportes', reportesRoutes);

// Rutas de historial laboral
const historialRoutes = require('./routes/historial');
app.use('/api/historial', historialRoutes);

// Rutas de solicitudes de servicio
const solicitudesRoutes = require('./routes/solicitudes');
app.use('/api/solicitudes-servicio', solicitudesRoutes);

// Estadísticas agregadas
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

// Notificaciones (derivadas de actividad real)
const notificacionesRoutes = require('./routes/notificaciones');
app.use('/api/notificaciones', notificacionesRoutes);

// Configuración del sistema (admin)
const settingsRoutes = require('./routes/settings');
app.use('/api/settings', settingsRoutes);

// ---- Módulos de comunidad (inspirados en Vivook) ----
app.use('/api/avisos', require('./routes/avisos'));
app.use('/api/eventos', require('./routes/eventos'));
app.use('/api/encuestas', require('./routes/encuestas'));
app.use('/api/solicitudes-admin', require('./routes/solicitudesAdmin'));
app.use('/api/finanzas', require('./routes/finanzas'));
app.use('/api/visitas', require('./routes/visitas'));
app.use('/api/paquetes', require('./routes/paquetes'));
app.use('/api/reservas', require('./routes/reservas'));

// Adjuntos de avisos (mismo dir que configura multer en routes/avisos.js).
// Se monta también bajo /api/uploads porque en Vercel solo /api/* llega
// al servicio de backend.
const { UPLOADS_DIR } = require('./config/uploads');
app.use(['/uploads', '/api/uploads'], express.static(UPLOADS_DIR));
// Rutas de catálogo de servicios
const servicesRoutes = require('./routes/services');
app.use('/api/services', servicesRoutes);


// Fallback para SPA (React Router) - pero NO para archivos de fuentes
app.get('*', (req, res, next) => {
  // Si es una petición de fuente, pasar al siguiente middleware (404)
  if (req.path.match(/\.(woff|woff2|ttf|eot)$/)) {
    return res.status(404).send('Font not found');
  }
  // Para todo lo demás, servir el HTML de la SPA
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

module.exports = app;
