-- Schema inicial para un nuevo fraccionamiento/cliente.
-- Uso: psql "$DATABASE_URL" -f sql/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nombre_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | verified | suspended | rejected
  rol VARCHAR(20) NOT NULL DEFAULT 'propietario', -- admin | propietario
  password VARCHAR(255) NOT NULL,
  verificado_por INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empleados (
  id SERIAL PRIMARY KEY,
  dni VARCHAR(50) UNIQUE NOT NULL, -- CURP en clientes de México; el nombre de columna queda igual entre clientes
  nombre_completo VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(255),
  zona VARCHAR(255) DEFAULT '',
  estado_actual VARCHAR(20) NOT NULL DEFAULT 'disponible', -- disponible | trabajando | inactiva
  empleador_actual INTEGER REFERENCES users(id),
  registrado_por INTEGER REFERENCES users(id),
  motivo TEXT DEFAULT '',
  servicio VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  puntualidad SMALLINT,
  limpieza SMALLINT,
  personalidad SMALLINT,
  calidad_servicio SMALLINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reportes (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  tipo_reporte VARCHAR(30) NOT NULL, -- advertencia_leve | advertencia_moderada | advertencia_grave
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  estado_moderacion VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente | aprobado | rechazado
  moderado_por INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historial_laboral (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id),
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  motivo_finalizacion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activo', -- activo | finalizado
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============ Módulos de comunidad (inspirados en Vivook) ============

CREATE TABLE IF NOT EXISTS avisos (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  cuerpo TEXT NOT NULL,
  prioridad VARCHAR(20) NOT NULL DEFAULT 'normal', -- normal | importante | urgente
  adjunto VARCHAR(500), -- ruta servida en /uploads
  adjunto_nombre VARCHAR(255), -- nombre original del archivo
  creado_por INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT DEFAULT '',
  lugar VARCHAR(255) DEFAULT '',
  fecha_inicio TIMESTAMP NOT NULL,
  fecha_fin TIMESTAMP,
  creado_por INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encuestas (
  id SERIAL PRIMARY KEY,
  pregunta VARCHAR(500) NOT NULL,
  descripcion TEXT DEFAULT '',
  estado VARCHAR(20) NOT NULL DEFAULT 'abierta', -- abierta | cerrada
  creado_por INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encuesta_opciones (
  id SERIAL PRIMARY KEY,
  encuesta_id INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  texto VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS encuesta_votos (
  id SERIAL PRIMARY KEY,
  encuesta_id INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  opcion_id INTEGER NOT NULL REFERENCES encuesta_opciones(id) ON DELETE CASCADE,
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (encuesta_id, propietario_id)
);

CREATE TABLE IF NOT EXISTS solicitudes_admin (
  id SERIAL PRIMARY KEY,
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  categoria VARCHAR(100) NOT NULL DEFAULT 'general', -- mantenimiento | queja | sugerencia | general
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierta', -- abierta | en_proceso | resuelta
  respuesta TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cuotas (
  id SERIAL PRIMARY KEY,
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  concepto VARCHAR(255) NOT NULL,
  periodo VARCHAR(20), -- ej. '2026-08'
  monto NUMERIC(12,2) NOT NULL,
  vence DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente | pagada
  pagada_at TIMESTAMP,
  metodo_pago VARCHAR(50),
  registrado_por INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS egresos (
  id SERIAL PRIMARY KEY,
  concepto VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) DEFAULT 'general', -- mantenimiento | seguridad | jardineria | administracion | general
  monto NUMERIC(12,2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT DEFAULT '',
  registrado_por INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visitas (
  id SERIAL PRIMARY KEY,
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  nombre_visitante VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'visita', -- visita | proveedor | evento
  codigo VARCHAR(12) UNIQUE NOT NULL,
  fecha_esperada DATE NOT NULL DEFAULT CURRENT_DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'esperada', -- esperada | ingresada | salida | cancelada
  entrada_at TIMESTAMP,
  salida_at TIMESTAMP,
  notas TEXT DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS amenidades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT DEFAULT '',
  capacidad INTEGER,
  activa BOOLEAN NOT NULL DEFAULT true
);

-- Amenidades de arranque (editar por cliente)
INSERT INTO amenidades (nombre, descripcion, capacidad) VALUES
  ('Casa club', 'Salón principal con cocina y terraza', 60),
  ('Área de asadores', 'Asadores y mesas al aire libre', 30),
  ('Cancha de usos múltiples', 'Fútbol rápido y básquetbol', 20)
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  amenidad_id INTEGER NOT NULL REFERENCES amenidades(id),
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'confirmada', -- confirmada | cancelada
  notas TEXT DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paquetes (
  id SERIAL PRIMARY KEY,
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  descripcion VARCHAR(255) NOT NULL,
  paqueteria VARCHAR(100) DEFAULT '',
  estado VARCHAR(20) NOT NULL DEFAULT 'en_caseta', -- en_caseta | entregado
  recibido_por INTEGER REFERENCES users(id),
  entregado_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitudes_servicio (
  id SERIAL PRIMARY KEY,
  propietario_id INTEGER NOT NULL REFERENCES users(id),
  categoria VARCHAR(255) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  ubicacion VARCHAR(255),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente | en_proceso | completado
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
