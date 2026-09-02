const pool = require('../config/db');

exports.registrarEmpleo = async (req, res) => {
  try {
    const { empleada_id, fecha_inicio } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO historial_laboral (empleado_id, propietario_id, fecha_inicio) VALUES ($1,$2,$3) RETURNING *',
      [empleada_id, req.user.id, fecha_inicio]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.finalizarEmpleo = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_fin, motivo_finalizacion } = req.body;
    const { rows } = await pool.query(
      'UPDATE historial_laboral SET fecha_fin=$1, motivo_finalizacion=$2, estado=$3 WHERE id=$4 RETURNING *',
      [fecha_fin, motivo_finalizacion, 'finalizado', id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.obtenerHistorialPorEmpleada = async (req, res) => {
  try {
    const { empleada_id } = req.params;
    const { rows } = await pool.query(
      'SELECT h.*, u.nombre_completo as propietario_nombre FROM historial_laboral h LEFT JOIN users u ON u.id = h.propietario_id WHERE h.empleado_id=$1 ORDER BY h.fecha_inicio DESC',
      [empleada_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.obtenerHistorialPorPropietario = async (req, res) => {
  try {
    const { propietario_id } = req.params;
    const { rows } = await pool.query(
      'SELECT h.*, e.nombre_completo as empleado_nombre, e.dni FROM historial_laboral h LEFT JOIN empleados e ON e.id = h.empleado_id WHERE h.propietario_id=$1 ORDER BY h.fecha_inicio DESC',
      [propietario_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
