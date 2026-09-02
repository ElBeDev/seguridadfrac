const express = require('express');
const router = express.Router();
const { verifyAdmin, verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// Calendario de eventos (cualquier usuario autenticado)
router.get('/', verifyPropietario, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, u.nombre_completo AS autor
      FROM eventos e LEFT JOIN users u ON u.id = e.creado_por
      WHERE e.fecha_inicio >= NOW() - INTERVAL '1 day'
      ORDER BY e.fecha_inicio ASC
      LIMIT 50
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar eventos', error: error.message });
  }
});

// Crear evento (solo admin)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { titulo, descripcion, lugar, fecha_inicio, fecha_fin } = req.body;
    if (!titulo || !fecha_inicio) return res.status(400).json({ message: 'Título y fecha de inicio son requeridos' });
    const { rows } = await pool.query(
      'INSERT INTO eventos (titulo, descripcion, lugar, fecha_inicio, fecha_fin, creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [titulo, descripcion || '', lugar || '', fecha_inicio, fecha_fin || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear evento', error: error.message });
  }
});

// Eliminar evento (solo admin)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM eventos WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Evento no encontrado' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar evento', error: error.message });
  }
});

module.exports = router;
