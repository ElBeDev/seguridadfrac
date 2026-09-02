const express = require('express');
const router = express.Router();
const { verifyAdmin, verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// Listar encuestas con opciones, conteos y el voto del usuario actual
router.get('/', verifyPropietario, async (req, res) => {
  try {
    const { rows: encuestas } = await pool.query(`
      SELECT e.*, u.nombre_completo AS autor,
        (SELECT COUNT(*)::int FROM encuesta_votos v WHERE v.encuesta_id = e.id) AS total_votos,
        (SELECT v.opcion_id FROM encuesta_votos v WHERE v.encuesta_id = e.id AND v.propietario_id = $1) AS mi_voto
      FROM encuestas e LEFT JOIN users u ON u.id = e.creado_por
      ORDER BY e.created_at DESC
      LIMIT 30
    `, [req.user.id]);
    const { rows: opciones } = await pool.query(`
      SELECT o.id, o.encuesta_id, o.texto,
        (SELECT COUNT(*)::int FROM encuesta_votos v WHERE v.opcion_id = o.id) AS votos
      FROM encuesta_opciones o
      ORDER BY o.id
    `);
    res.json(encuestas.map(e => ({
      ...e,
      opciones: opciones.filter(o => o.encuesta_id === e.id),
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error al listar encuestas', error: error.message });
  }
});

// Crear encuesta con opciones (solo admin)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { pregunta, descripcion, opciones } = req.body;
    const limpias = (opciones || []).map(o => String(o).trim()).filter(Boolean);
    if (!pregunta || limpias.length < 2) {
      return res.status(400).json({ message: 'Se requiere pregunta y al menos 2 opciones' });
    }
    const { rows } = await pool.query(
      'INSERT INTO encuestas (pregunta, descripcion, creado_por) VALUES ($1,$2,$3) RETURNING *',
      [pregunta, descripcion || '', req.user.id]
    );
    const encuesta = rows[0];
    for (const texto of limpias) {
      await pool.query('INSERT INTO encuesta_opciones (encuesta_id, texto) VALUES ($1,$2)', [encuesta.id, texto]);
    }
    res.status(201).json(encuesta);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear encuesta', error: error.message });
  }
});

// Votar (un voto por usuario por encuesta)
router.post('/:id/votar', verifyPropietario, async (req, res) => {
  try {
    const { opcion_id } = req.body;
    const { rows: [encuesta] } = await pool.query('SELECT estado FROM encuestas WHERE id=$1', [req.params.id]);
    if (!encuesta) return res.status(404).json({ message: 'Encuesta no encontrada' });
    if (encuesta.estado !== 'abierta') return res.status(400).json({ message: 'La encuesta ya está cerrada' });
    const { rows: [opcion] } = await pool.query(
      'SELECT id FROM encuesta_opciones WHERE id=$1 AND encuesta_id=$2', [opcion_id, req.params.id]
    );
    if (!opcion) return res.status(400).json({ message: 'Opción inválida' });
    await pool.query(
      'INSERT INTO encuesta_votos (encuesta_id, opcion_id, propietario_id) VALUES ($1,$2,$3)',
      [req.params.id, opcion_id, req.user.id]
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Ya votaste en esta encuesta' });
    res.status(400).json({ message: 'Error al votar', error: error.message });
  }
});

// Cerrar encuesta (solo admin)
router.patch('/:id/cerrar', verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE encuestas SET estado='cerrada' WHERE id=$1 RETURNING *", [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Encuesta no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al cerrar encuesta', error: error.message });
  }
});

module.exports = router;
