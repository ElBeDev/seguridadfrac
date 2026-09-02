const express = require('express');
const router = express.Router();
const { verifyAdmin, verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// Feed de comunicados (cualquier usuario autenticado)
router.get('/', verifyPropietario, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.nombre_completo AS autor
      FROM avisos a LEFT JOIN users u ON u.id = a.creado_por
      ORDER BY a.created_at DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar avisos', error: error.message });
  }
});

// Publicar aviso (solo admin)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { titulo, cuerpo, prioridad } = req.body;
    if (!titulo || !cuerpo) return res.status(400).json({ message: 'Título y cuerpo son requeridos' });
    const { rows } = await pool.query(
      'INSERT INTO avisos (titulo, cuerpo, prioridad, creado_por) VALUES ($1,$2,$3,$4) RETURNING *',
      [titulo, cuerpo, prioridad || 'normal', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear aviso', error: error.message });
  }
});

// Eliminar aviso (solo admin)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM avisos WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Aviso no encontrado' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar aviso', error: error.message });
  }
});

module.exports = router;
