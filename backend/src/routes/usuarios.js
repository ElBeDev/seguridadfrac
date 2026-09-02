const express = require('express');
const router = express.Router();
const { listUsuarios, suspenderUsuario, editarUsuario, verificarUsuario } = require('../controllers/userController');
const { verifyAdmin, verifyCaseta } = require('../middlewares/auth');
const pool = require('../config/db');

// Listar todos los usuarios (solo admin)
router.get('/', verifyAdmin, listUsuarios);

// Lista mínima de propietarios verificados (admin o vigilancia) — para
// que caseta pueda registrar paquetes sin exponer emails/teléfonos.
router.get('/propietarios', verifyCaseta, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre_completo, direccion FROM users WHERE rol='propietario' AND estado='verified' ORDER BY nombre_completo"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar propietarios', error: error.message });
  }
});



// Verificar o rechazar propietario (solo admin)
router.patch('/:id/verificar', verifyAdmin, verificarUsuario);

// Editar usuario (solo admin)
router.put('/:id', verifyAdmin, editarUsuario);

// Suspender o reactivar usuario (solo admin)
router.patch('/:id/suspender', verifyAdmin, suspenderUsuario);

module.exports = router;
