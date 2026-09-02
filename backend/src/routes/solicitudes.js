const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyPropietario } = require('../middlewares/auth');

router.post('/', verifyPropietario, async (req, res) => {
  try {
    const { categoria, titulo, descripcion, ubicacion } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO solicitudes_servicio (propietario_id, categoria, titulo, descripcion, ubicacion) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, categoria, titulo, descripcion, ubicacion || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
