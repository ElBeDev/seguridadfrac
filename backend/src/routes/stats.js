const express = require('express');
const router = express.Router();
const { verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// Agregados para la página de Estadísticas. Solo números, sin datos
// personales, así que verifyPropietario (propietario verificado o admin) basta.
router.get('/', verifyPropietario, async (req, res) => {
  try {
    const [totales, ratings, porServicio, porMes, reportesPorTipo] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM empleados)::int AS empleados,
          (SELECT COUNT(*) FROM empleados WHERE estado_actual = 'disponible')::int AS disponibles,
          (SELECT COUNT(*) FROM empleados WHERE estado_actual = 'trabajando')::int AS trabajando,
          (SELECT COUNT(*) FROM empleados WHERE estado_actual = 'inactiva')::int AS inactivos,
          (SELECT COUNT(*) FROM users WHERE rol = 'propietario')::int AS propietarios,
          (SELECT COUNT(*) FROM reportes)::int AS reportes,
          (SELECT COUNT(*) FROM reportes WHERE estado_moderacion = 'pendiente')::int AS reportes_pendientes,
          (SELECT COUNT(*) FROM solicitudes_servicio)::int AS solicitudes
      `),
      pool.query(`
        SELECT
          ROUND(AVG(puntualidad)::numeric, 1) AS puntualidad,
          ROUND(AVG(limpieza)::numeric, 1) AS limpieza,
          ROUND(AVG(personalidad)::numeric, 1) AS personalidad,
          ROUND(AVG(calidad_servicio)::numeric, 1) AS calidad_servicio
        FROM ratings
      `),
      pool.query(`
        SELECT COALESCE(NULLIF(servicio, ''), 'Sin especificar') AS servicio, COUNT(*)::int AS total
        FROM empleados
        GROUP BY 1
        ORDER BY total DESC, servicio ASC
      `),
      pool.query(`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes, COUNT(*)::int AS total
        FROM empleados
        WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
        GROUP BY 1
        ORDER BY 1
      `),
      pool.query(`
        SELECT tipo_reporte, COUNT(*)::int AS total
        FROM reportes
        GROUP BY 1
      `),
    ]);

    res.json({
      totales: totales.rows[0],
      ratingPromedios: ratings.rows[0],
      porServicio: porServicio.rows,
      porMes: porMes.rows,
      reportesPorTipo: reportesPorTipo.rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al calcular estadísticas', error: error.message });
  }
});

module.exports = router;
