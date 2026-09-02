const express = require('express');
const router = express.Router();
const { verifyPropietario, verifyCaseta, verifyAcceso } = require('../middlewares/auth');
const pool = require('../config/db');

// Alfabeto sin caracteres ambiguos (0/O, 1/I/L)
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generarCodigo() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return `V-${s}`;
}

// Listar: admin/vigilancia ven todas, propietario las suyas. ?hoy=1 filtra a la fecha actual.
router.get('/', verifyAcceso, async (req, res) => {
  try {
    const esCaseta = req.user.rol === 'admin' || req.user.rol === 'vigilancia';
    const condiciones = [];
    const params = [];
    if (!esCaseta) {
      params.push(req.user.id);
      condiciones.push(`v.propietario_id = $${params.length}`);
    }
    if (req.query.hoy === '1') {
      condiciones.push("(v.fecha_esperada = CURRENT_DATE OR v.estado = 'ingresada')");
    }
    const { rows } = await pool.query(`
      SELECT v.*, u.nombre_completo AS propietario_nombre, u.direccion
      FROM visitas v LEFT JOIN users u ON u.id = v.propietario_id
      ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
      ORDER BY v.created_at DESC
      LIMIT 100
    `, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar visitas', error: error.message });
  }
});

// Pre-registrar visita (propietario) — genera el código de acceso
router.post('/', verifyPropietario, async (req, res) => {
  try {
    const { nombre_visitante, tipo, fecha_esperada, notas } = req.body;
    if (!nombre_visitante) return res.status(400).json({ message: 'El nombre del visitante es requerido' });
    // Reintenta si el código choca con uno existente
    for (let intento = 0; intento < 5; intento++) {
      try {
        const { rows } = await pool.query(
          'INSERT INTO visitas (propietario_id, nombre_visitante, tipo, codigo, fecha_esperada, notas) VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6) RETURNING *',
          [req.user.id, nombre_visitante, tipo || 'visita', generarCodigo(), fecha_esperada || null, notas || '']
        );
        return res.status(201).json(rows[0]);
      } catch (e) {
        if (e.code !== '23505') throw e;
      }
    }
    res.status(500).json({ message: 'No se pudo generar un código único' });
  } catch (error) {
    res.status(400).json({ message: 'Error al registrar visita', error: error.message });
  }
});

// Validar un código en caseta (admin/vigilancia) — devuelve la visita sin modificarla
router.get('/validar/:codigo', verifyCaseta, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT v.*, u.nombre_completo AS propietario_nombre, u.direccion
      FROM visitas v LEFT JOIN users u ON u.id = v.propietario_id
      WHERE UPPER(v.codigo) = UPPER($1)
    `, [req.params.codigo.trim()]);
    if (rows.length === 0) return res.status(404).json({ message: 'Código no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al validar código', error: error.message });
  }
});

// Registrar entrada (admin/vigilancia)
router.patch('/:id/entrada', verifyCaseta, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE visitas SET estado='ingresada', entrada_at=NOW() WHERE id=$1 AND estado='esperada' RETURNING *",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(400).json({ message: 'La visita no está en estado esperada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al registrar entrada', error: error.message });
  }
});

// Registrar salida (admin/vigilancia)
router.patch('/:id/salida', verifyCaseta, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE visitas SET estado='salida', salida_at=NOW() WHERE id=$1 AND estado='ingresada' RETURNING *",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(400).json({ message: 'La visita no está ingresada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al registrar salida', error: error.message });
  }
});

// Cancelar (el propietario dueño del pase, o admin)
router.patch('/:id/cancelar', verifyPropietario, async (req, res) => {
  try {
    const esAdmin = req.user.rol === 'admin';
    const { rows } = await pool.query(
      `UPDATE visitas SET estado='cancelada' WHERE id=$1 AND estado='esperada' ${esAdmin ? '' : 'AND propietario_id=$2'} RETURNING *`,
      esAdmin ? [req.params.id] : [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(400).json({ message: 'No se pudo cancelar (¿ya ingresó o no es tuya?)' });
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al cancelar visita', error: error.message });
  }
});

module.exports = router;
