const express = require('express');
const router = express.Router();
const { verifyAdmin, verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// Listar: admin ve todas, propietario solo las suyas
router.get('/', verifyPropietario, async (req, res) => {
  try {
    const esAdmin = req.user.rol === 'admin';
    const { rows } = await pool.query(`
      SELECT s.*, u.nombre_completo AS propietario_nombre, u.direccion
      FROM solicitudes_admin s LEFT JOIN users u ON u.id = s.propietario_id
      ${esAdmin ? '' : 'WHERE s.propietario_id = $1'}
      ORDER BY s.created_at DESC
      LIMIT 100
    `, esAdmin ? [] : [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar solicitudes', error: error.message });
  }
});

// Crear solicitud (propietario)
router.post('/', verifyPropietario, async (req, res) => {
  try {
    const { categoria, titulo, descripcion } = req.body;
    if (!titulo || !descripcion) return res.status(400).json({ message: 'Título y descripción son requeridos' });
    const { rows } = await pool.query(
      'INSERT INTO solicitudes_admin (propietario_id, categoria, titulo, descripcion) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, categoria || 'general', titulo, descripcion]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear solicitud', error: error.message });
  }
});

// Responder / cambiar estado (solo admin)
router.patch('/:id', verifyAdmin, async (req, res) => {
  try {
    const { estado, respuesta } = req.body;
    const { rows } = await pool.query(
      'UPDATE solicitudes_admin SET estado=COALESCE($1,estado), respuesta=COALESCE($2,respuesta), updated_at=NOW() WHERE id=$3 RETURNING *',
      [estado, respuesta, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar solicitud', error: error.message });
  }
});

module.exports = router;
