const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

const registerSchema = Joi.object({
  nombre_completo: Joi.string().required(),
  email: Joi.string().email().required(),
  telefono: Joi.string().required(),
  direccion: Joi.string().required(),
  password: Joi.string().min(6).required(),
  rol: Joi.string().valid('propietario', 'vigilancia').default('propietario'),
});

exports.createPropietario = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { nombre_completo, email, telefono, direccion, password, rol } = value;
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (rows.length > 0) return res.status(409).json({ error: 'Email ya registrado' });
    const hashedPassword = await bcrypt.hash(password, 10);
    // Vigilancia no pasa por verificación de vecino: queda activa de inmediato
    const estado = rol === 'vigilancia' ? 'verified' : 'pending';
    await pool.query(
      'INSERT INTO users (nombre_completo, email, telefono, direccion, password, rol, estado) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [nombre_completo, email, telefono, direccion, hashedPassword, rol, estado]
    );
    res.status(201).json({ message: `Usuario ${rol} creado exitosamente` });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
    // Modo mantenimiento (system_settings): solo el admin puede entrar
    if (user.rol !== 'admin') {
      const { rows: [setting] } = await pool.query(
        "SELECT value FROM system_settings WHERE key = 'maintenance_mode'"
      );
      if (setting && setting.value === 'true') {
        return res.status(503).json({ error: 'El sistema está en mantenimiento. Intenta más tarde.' });
      }
    }
    const token = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, nombre_completo: user.nombre_completo, email: user.email, rol: user.rol, estado: user.estado } });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en el login', details: err.message });
  }
};

exports.verifyToken = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT id, nombre_completo, email, rol, estado FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    res.json({ valid: true, user });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
