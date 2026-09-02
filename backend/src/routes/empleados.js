const express = require('express');
const router = express.Router();
const { verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// Registrar nuevo empleado
router.post('/', verifyPropietario, async (req, res) => {
  try {
    const { dni, nombre_completo, telefono, email, zona, estado_actual, motivo, servicio, ratings } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO empleados (dni, nombre_completo, telefono, email, zona, estado_actual, registrado_por, motivo, servicio) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [dni, nombre_completo, telefono || null, email || null, zona || '', estado_actual || 'disponible', req.user.id, motivo || '', servicio || '']
    );
    const empleado = rows[0];
    // Guardar ratings si vienen
    if (ratings) {
      const { puntualidad, limpieza, personalidad, calidad_servicio } = ratings;
      if (puntualidad || limpieza || personalidad || calidad_servicio) {
        await pool.query(
          'INSERT INTO ratings (empleado_id, propietario_id, puntualidad, limpieza, personalidad, calidad_servicio) VALUES ($1,$2,$3,$4,$5,$6)',
          [empleado.id, req.user.id, puntualidad || null, limpieza || null, personalidad || null, calidad_servicio || null]
        );
      }
    }
    res.status(201).json(empleado);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'CURP ya registrado' });
    res.status(400).json({ message: 'Error al crear empleado', error: error.message });
  }
});

// Listar empleados con promedios de rating
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*,
        ROUND(AVG(r.puntualidad)::numeric, 1) as avg_puntualidad,
        ROUND(AVG(r.limpieza)::numeric, 1) as avg_limpieza,
        ROUND(AVG(r.personalidad)::numeric, 1) as avg_personalidad,
        ROUND(AVG(r.calidad_servicio)::numeric, 1) as avg_calidad_servicio
      FROM empleados e
      LEFT JOIN ratings r ON r.empleado_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar empleados', error: error.message });
  }
});

// Autocompletado por DNI o nombre
router.get('/buscar', verifyPropietario, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const { rows } = await pool.query(
      'SELECT * FROM empleados WHERE dni ILIKE $1 OR nombre_completo ILIKE $1 LIMIT 10',
      [`%${q}%`]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error en búsqueda', error: error.message });
  }
});

// Buscar empleado por DNI
router.get('/:dni', verifyPropietario, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*,
        ROUND(AVG(r.puntualidad)::numeric, 1) as avg_puntualidad,
        ROUND(AVG(r.limpieza)::numeric, 1) as avg_limpieza,
        ROUND(AVG(r.personalidad)::numeric, 1) as avg_personalidad,
        ROUND(AVG(r.calidad_servicio)::numeric, 1) as avg_calidad_servicio
      FROM empleados e
      LEFT JOIN ratings r ON r.empleado_id = e.id
      WHERE e.dni = $1
      GROUP BY e.id
    `, [req.params.dni]);
    if (rows.length === 0) return res.status(404).json({ message: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar empleado', error: error.message });
  }
});

module.exports = router;
