const pool = require('../config/db');

exports.createReporte = async (req, res) => {
  try {
    const { empleada_id, tipo_reporte, titulo, descripcion } = req.body;
    if (!empleada_id || !tipo_reporte || !titulo || !descripcion) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    const { rows } = await pool.query(
      'INSERT INTO reportes (empleado_id, propietario_id, tipo_reporte, titulo, descripcion) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [empleada_id, req.user.id, tipo_reporte, titulo, descripcion]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear reporte', error: error.message });
  }
};

exports.listReportes = async (req, res) => {
  try {
    const { empleada_id } = req.query;
    let sql = `
      SELECT r.*,
        e.nombre_completo as empleado_nombre, e.dni,
        u.nombre_completo as propietario_nombre
      FROM reportes r
      LEFT JOIN empleados e ON e.id = r.empleado_id
      LEFT JOIN users u ON u.id = r.propietario_id
    `;
    const params = [];
    if (empleada_id) {
      sql += ' WHERE r.empleado_id = $1';
      params.push(empleada_id);
    }
    sql += ' ORDER BY r.created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar reportes', error: error.message });
  }
};

exports.moderarReporte = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_moderacion } = req.body;
    const { rows } = await pool.query(
      'UPDATE reportes SET estado_moderacion=$1, moderado_por=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [estado_moderacion, req.user.id, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Reporte no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al moderar reporte', error: error.message });
  }
};
