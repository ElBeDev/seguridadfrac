const pool = require('../config/db');

exports.listUsuarios = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nombre_completo, email, telefono, direccion, estado, rol, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar usuarios', error: error.message });
  }
};

exports.verificarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const { rows } = await pool.query(
      'UPDATE users SET estado=$1, verificado_por=$2, updated_at=NOW() WHERE id=$3 RETURNING id, nombre_completo, email, estado, rol',
      [estado, req.user.id, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar usuario', error: error.message });
  }
};

exports.editarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, telefono, direccion } = req.body;
    const { rows } = await pool.query(
      'UPDATE users SET nombre_completo=COALESCE($1,nombre_completo), telefono=COALESCE($2,telefono), direccion=COALESCE($3,direccion), updated_at=NOW() WHERE id=$4 RETURNING id, nombre_completo, email, estado, rol',
      [nombre_completo, telefono, direccion, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al editar usuario', error: error.message });
  }
};

exports.suspenderUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const { rows } = await pool.query(
      'UPDATE users SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING id, nombre_completo, email, estado, rol',
      [estado, id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
  }
};
