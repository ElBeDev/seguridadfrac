const express = require('express');
const router = express.Router();
const { verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// Notificaciones derivadas de la actividad real del sistema (no hay tabla
// propia: se construyen al vuelo desde empleados/reportes). El estado
// leída/no-leída vive en el cliente (localStorage) porque es por-dispositivo.
router.get('/', verifyPropietario, async (req, res) => {
  try {
    const esAdmin = req.user.rol === 'admin';
    const items = [];

    // Altas de empleados de los últimos 30 días
    const { rows: nuevos } = await pool.query(`
      SELECT id, nombre_completo, servicio, created_at
      FROM empleados
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    for (const e of nuevos) {
      items.push({
        id: `empleado-${e.id}`,
        tipo: 'success',
        mensaje: `Nuevo empleado registrado: ${e.nombre_completo}${e.servicio ? ` (${e.servicio})` : ''}`,
        fecha: e.created_at,
      });
    }

    if (esAdmin) {
      // Admin: reportes pendientes de moderación
      const { rows: pendientes } = await pool.query(`
        SELECT r.id, r.titulo, r.created_at, e.nombre_completo
        FROM reportes r LEFT JOIN empleados e ON e.id = r.empleado_id
        WHERE r.estado_moderacion = 'pendiente'
        ORDER BY r.created_at DESC
        LIMIT 10
      `);
      for (const r of pendientes) {
        items.push({
          id: `reporte-pendiente-${r.id}`,
          tipo: 'warning',
          mensaje: `Reporte pendiente de moderación: "${r.titulo}"${r.nombre_completo ? ` sobre ${r.nombre_completo}` : ''}`,
          fecha: r.created_at,
        });
      }
    } else {
      // Propietario: resultado de moderación de SUS reportes
      const { rows: moderados } = await pool.query(`
        SELECT r.id, r.titulo, r.estado_moderacion, r.updated_at
        FROM reportes r
        WHERE r.propietario_id = $1 AND r.estado_moderacion != 'pendiente'
        ORDER BY r.updated_at DESC
        LIMIT 10
      `, [req.user.id]);
      for (const r of moderados) {
        items.push({
          id: `reporte-moderado-${r.id}`,
          tipo: r.estado_moderacion === 'aprobado' ? 'info' : 'warning',
          mensaje: `Tu reporte "${r.titulo}" fue ${r.estado_moderacion}`,
          fecha: r.updated_at,
        });
      }
    }

    // Avisos de los últimos 14 días (todos los roles)
    const { rows: avisos } = await pool.query(`
      SELECT id, titulo, prioridad, created_at
      FROM avisos
      WHERE created_at >= NOW() - INTERVAL '14 days'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    for (const a of avisos) {
      items.push({
        id: `aviso-${a.id}`,
        tipo: a.prioridad === 'urgente' ? 'warning' : 'info',
        mensaje: `Nuevo aviso${a.prioridad !== 'normal' ? ` (${a.prioridad})` : ''}: "${a.titulo}"`,
        fecha: a.created_at,
      });
    }

    if (esAdmin) {
      // Admin: solicitudes abiertas de los vecinos
      const { rows: abiertas } = await pool.query(`
        SELECT s.id, s.titulo, s.created_at, u.nombre_completo
        FROM solicitudes_admin s LEFT JOIN users u ON u.id = s.propietario_id
        WHERE s.estado = 'abierta'
        ORDER BY s.created_at DESC
        LIMIT 5
      `);
      for (const s of abiertas) {
        items.push({
          id: `solicitud-${s.id}`,
          tipo: 'warning',
          mensaje: `Solicitud abierta de ${s.nombre_completo}: "${s.titulo}"`,
          fecha: s.created_at,
        });
      }
    } else {
      // Propietario: paquetes esperando en caseta
      const { rows: paquetes } = await pool.query(`
        SELECT id, descripcion, paqueteria, created_at
        FROM paquetes
        WHERE propietario_id = $1 AND estado = 'en_caseta'
        ORDER BY created_at DESC
        LIMIT 5
      `, [req.user.id]);
      for (const p of paquetes) {
        items.push({
          id: `paquete-${p.id}`,
          tipo: 'info',
          mensaje: `Tienes un paquete en caseta: ${p.descripcion}${p.paqueteria ? ` (${p.paqueteria})` : ''}`,
          fecha: p.created_at,
        });
      }

      // Propietario: cuotas pendientes vencidas o por vencer en 7 días
      const { rows: cuotas } = await pool.query(`
        SELECT id, concepto, monto, vence
        FROM cuotas
        WHERE propietario_id = $1 AND estado = 'pendiente' AND vence <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY vence ASC
        LIMIT 5
      `, [req.user.id]);
      for (const c of cuotas) {
        const vencida = new Date(c.vence) < new Date();
        items.push({
          id: `cuota-${c.id}`,
          tipo: 'warning',
          mensaje: `Cuota ${vencida ? 'vencida' : 'por vencer'}: ${c.concepto} ($${Number(c.monto).toLocaleString('es-MX')})`,
          fecha: c.vence,
        });
      }

      // Propietario: sus reportes moderados (ya existente) + visitas que ingresaron hoy
      const { rows: visitasHoy } = await pool.query(`
        SELECT id, nombre_visitante, entrada_at
        FROM visitas
        WHERE propietario_id = $1 AND estado = 'ingresada' AND entrada_at >= CURRENT_DATE
        ORDER BY entrada_at DESC
        LIMIT 5
      `, [req.user.id]);
      for (const v of visitasHoy) {
        items.push({
          id: `visita-${v.id}`,
          tipo: 'success',
          mensaje: `Tu visitante ${v.nombre_visitante} ingresó al fraccionamiento`,
          fecha: v.entrada_at,
        });
      }
    }

    // Empleados sin ninguna calificación (resumen, una sola notificación)
    const { rows: [{ sin_rating }] } = await pool.query(`
      SELECT COUNT(*)::int AS sin_rating
      FROM empleados e
      WHERE NOT EXISTS (SELECT 1 FROM ratings r WHERE r.empleado_id = e.id)
    `);
    if (sin_rating > 0) {
      items.push({
        id: 'sin-rating',
        tipo: 'info',
        mensaje: `${sin_rating} empleado${sin_rating === 1 ? '' : 's'} sin calificaciones — ayuda a tu comunidad calificándolos`,
        fecha: new Date().toISOString(),
      });
    }

    items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json(items.slice(0, 20));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener notificaciones', error: error.message });
  }
});

module.exports = router;
