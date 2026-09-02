const express = require('express');
const router = express.Router();
const { verifyAdmin, verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// ---- Cuotas ----

// Listar: admin ve todas, propietario solo las suyas.
// El estado "vencida" se calcula (pendiente + fecha vencida), no se guarda.
router.get('/cuotas', verifyPropietario, async (req, res) => {
  try {
    const esAdmin = req.user.rol === 'admin';
    const { rows } = await pool.query(`
      SELECT c.*, u.nombre_completo AS propietario_nombre, u.direccion,
        CASE WHEN c.estado = 'pendiente' AND c.vence < CURRENT_DATE THEN true ELSE false END AS vencida
      FROM cuotas c LEFT JOIN users u ON u.id = c.propietario_id
      ${esAdmin ? '' : 'WHERE c.propietario_id = $1'}
      ORDER BY c.vence DESC, c.id DESC
      LIMIT 200
    `, esAdmin ? [] : [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar cuotas', error: error.message });
  }
});

// Crear cargo (solo admin). propietario_id = null → cargo para TODOS los
// propietarios verificados (cuota general del periodo).
router.post('/cuotas', verifyAdmin, async (req, res) => {
  try {
    const { propietario_id, concepto, periodo, monto, vence } = req.body;
    if (!concepto || !monto || !vence) {
      return res.status(400).json({ message: 'Concepto, monto y vencimiento son requeridos' });
    }
    let destinatarios;
    if (propietario_id) {
      destinatarios = [propietario_id];
    } else {
      const { rows } = await pool.query(
        "SELECT id FROM users WHERE rol='propietario' AND estado='verified'"
      );
      destinatarios = rows.map(r => r.id);
      if (destinatarios.length === 0) return res.status(400).json({ message: 'No hay propietarios verificados' });
    }
    const creadas = [];
    for (const dest of destinatarios) {
      const { rows } = await pool.query(
        'INSERT INTO cuotas (propietario_id, concepto, periodo, monto, vence, registrado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [dest, concepto, periodo || null, monto, vence, req.user.id]
      );
      creadas.push(rows[0]);
    }
    res.status(201).json({ creadas: creadas.length, cuotas: creadas });
  } catch (error) {
    res.status(400).json({ message: 'Error al crear cuota', error: error.message });
  }
});

// Registrar pago (solo admin — no hay pasarela en línea todavía)
router.patch('/cuotas/:id/pagar', verifyAdmin, async (req, res) => {
  try {
    const { metodo_pago } = req.body;
    const { rows } = await pool.query(
      "UPDATE cuotas SET estado='pagada', pagada_at=NOW(), metodo_pago=$1 WHERE id=$2 AND estado='pendiente' RETURNING *",
      [metodo_pago || 'efectivo', req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Cuota no encontrada o ya pagada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al registrar pago', error: error.message });
  }
});

// ---- Egresos (solo admin) ----

router.get('/egresos', verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, u.nombre_completo AS registrado_por_nombre
      FROM egresos e LEFT JOIN users u ON u.id = e.registrado_por
      ORDER BY e.fecha DESC, e.id DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar egresos', error: error.message });
  }
});

router.post('/egresos', verifyAdmin, async (req, res) => {
  try {
    const { concepto, categoria, monto, fecha, notas } = req.body;
    if (!concepto || !monto) return res.status(400).json({ message: 'Concepto y monto son requeridos' });
    const { rows } = await pool.query(
      'INSERT INTO egresos (concepto, categoria, monto, fecha, notas, registrado_por) VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6) RETURNING *',
      [concepto, categoria || 'general', monto, fecha || null, notas || '', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ message: 'Error al registrar egreso', error: error.message });
  }
});

// ---- Resumen financiero (solo admin) ----

router.get('/resumen', verifyAdmin, async (req, res) => {
  try {
    const [totales, porMes, egresosPorCategoria] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COALESCE(SUM(monto),0) FROM cuotas WHERE estado='pagada') AS recaudado,
          (SELECT COALESCE(SUM(monto),0) FROM cuotas WHERE estado='pendiente') AS por_cobrar,
          (SELECT COALESCE(SUM(monto),0) FROM cuotas WHERE estado='pendiente' AND vence < CURRENT_DATE) AS vencido,
          (SELECT COALESCE(SUM(monto),0) FROM egresos) AS egresos
      `),
      pool.query(`
        SELECT mes, COALESCE(SUM(ingresos),0) AS ingresos, COALESCE(SUM(egresos),0) AS egresos FROM (
          SELECT to_char(date_trunc('month', pagada_at), 'YYYY-MM') AS mes, SUM(monto) AS ingresos, 0 AS egresos
          FROM cuotas WHERE estado='pagada' AND pagada_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
          GROUP BY 1
          UNION ALL
          SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS mes, 0 AS ingresos, SUM(monto) AS egresos
          FROM egresos WHERE fecha >= date_trunc('month', NOW()) - INTERVAL '5 months'
          GROUP BY 1
        ) t GROUP BY mes ORDER BY mes
      `),
      pool.query(`
        SELECT categoria, SUM(monto) AS total
        FROM egresos GROUP BY categoria ORDER BY total DESC
      `),
    ]);
    res.json({
      totales: totales.rows[0],
      porMes: porMes.rows,
      egresosPorCategoria: egresosPorCategoria.rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular resumen', error: error.message });
  }
});

module.exports = router;
