const express = require('express');
const router = express.Router();
const { verifyCaseta, verifyAcceso } = require('../middlewares/auth');
const pool = require('../config/db');

// Listar: admin/vigilancia ven todos, propietario los suyos
router.get('/', verifyAcceso, async (req, res) => {
  try {
    const esCaseta = req.user.rol === 'admin' || req.user.rol === 'vigilancia';
    const { rows } = await pool.query(`
      SELECT p.*, u.nombre_completo AS propietario_nombre, u.direccion
      FROM paquetes p LEFT JOIN users u ON u.id = p.propietario_id
      ${esCaseta ? '' : 'WHERE p.propietario_id = $1'}
      ORDER BY p.created_at DESC
      LIMIT 100
    `, esCaseta ? [] : [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar paquetes', error: error.message });
  }
});

// Registrar paquete recibido en caseta (admin/vigilancia)
router.post('/', verifyCaseta, async (req, res) => {
  try {
    const { propietario_id, descripcion, paqueteria } = req.body;
    if (!propietario_id || !descripcion) {
      return res.status(400).json({ message: 'Propietario y descripción son requeridos' });
    }
    const { rows } = await pool.query(
      'INSERT INTO paquetes (propietario_id, descripcion, paqueteria, recibido_por) VALUES ($1,$2,$3,$4) RETURNING *',
      [propietario_id, descripcion, paqueteria || '', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al registrar paquete', error: error.message });
  }
});

// Marcar entregado (admin/vigilancia)
router.patch('/:id/entregar', verifyCaseta, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE paquetes SET estado='entregado', entregado_at=NOW() WHERE id=$1 AND estado='en_caseta' RETURNING *",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Paquete no encontrado o ya entregado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al marcar entregado', error: error.message });
  }
});

module.exports = router;
