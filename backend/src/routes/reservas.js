const express = require('express');
const router = express.Router();
const { verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// Catálogo de amenidades activas
router.get('/amenidades', verifyPropietario, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM amenidades WHERE activa ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar amenidades', error: error.message });
  }
});

// Reservas confirmadas (visibles para toda la comunidad; filtros opcionales)
router.get('/', verifyPropietario, async (req, res) => {
  try {
    const condiciones = ["r.estado = 'confirmada'", "r.fecha >= CURRENT_DATE - INTERVAL '1 day'"];
    const params = [];
    if (req.query.amenidad_id) {
      params.push(req.query.amenidad_id);
      condiciones.push(`r.amenidad_id = $${params.length}`);
    }
    if (req.query.fecha) {
      params.push(req.query.fecha);
      condiciones.push(`r.fecha = $${params.length}`);
    }
    const { rows } = await pool.query(`
      SELECT r.*, a.nombre AS amenidad_nombre, u.nombre_completo AS propietario_nombre
      FROM reservas r
      JOIN amenidades a ON a.id = r.amenidad_id
      LEFT JOIN users u ON u.id = r.propietario_id
      WHERE ${condiciones.join(' AND ')}
      ORDER BY r.fecha ASC, r.hora_inicio ASC
      LIMIT 100
    `, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar reservas', error: error.message });
  }
});

// Crear reserva con chequeo de traslape
router.post('/', verifyPropietario, async (req, res) => {
  try {
    const { amenidad_id, fecha, hora_inicio, hora_fin, notas } = req.body;
    if (!amenidad_id || !fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({ message: 'Amenidad, fecha y horario son requeridos' });
    }
    if (hora_fin <= hora_inicio) {
      return res.status(400).json({ message: 'La hora de fin debe ser posterior a la de inicio' });
    }
    const { rows: conflictos } = await pool.query(`
      SELECT r.id, u.nombre_completo
      FROM reservas r LEFT JOIN users u ON u.id = r.propietario_id
      WHERE r.amenidad_id = $1 AND r.fecha = $2 AND r.estado = 'confirmada'
        AND NOT (r.hora_fin <= $3 OR r.hora_inicio >= $4)
      LIMIT 1
    `, [amenidad_id, fecha, hora_inicio, hora_fin]);
    if (conflictos.length > 0) {
      return res.status(409).json({ message: 'Ese horario ya está reservado — elige otro' });
    }
    const { rows } = await pool.query(
      'INSERT INTO reservas (amenidad_id, propietario_id, fecha, hora_inicio, hora_fin, notas) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [amenidad_id, req.user.id, fecha, hora_inicio, hora_fin, notas || '']
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear reserva', error: error.message });
  }
});

// Cancelar (dueño de la reserva, o admin)
router.patch('/:id/cancelar', verifyPropietario, async (req, res) => {
  try {
    const esAdmin = req.user.rol === 'admin';
    const { rows } = await pool.query(
      `UPDATE reservas SET estado='cancelada' WHERE id=$1 AND estado='confirmada' ${esAdmin ? '' : 'AND propietario_id=$2'} RETURNING *`,
      esAdmin ? [req.params.id] : [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(400).json({ message: 'No se pudo cancelar (¿no es tuya o ya está cancelada?)' });
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al cancelar reserva', error: error.message });
  }
});

module.exports = router;
