const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middlewares/auth');
const pool = require('../config/db');

// Listar todos los empleados (solo admin)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM empleados ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar empleados', error: error.message });
  }
});

// Editar empleado (solo admin)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { nombre_completo, telefono, email, zona, estado_actual, motivo, servicio } = req.body;
    const { rows } = await pool.query(
      'UPDATE empleados SET nombre_completo=COALESCE($1,nombre_completo), telefono=COALESCE($2,telefono), email=COALESCE($3,email), zona=COALESCE($4,zona), estado_actual=COALESCE($5,estado_actual), motivo=COALESCE($6,motivo), servicio=COALESCE($7,servicio), updated_at=NOW() WHERE id=$8 RETURNING *',
      [nombre_completo, telefono, email, zona, estado_actual, motivo, servicio, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al editar empleado', error: error.message });
  }
});

module.exports = router;
