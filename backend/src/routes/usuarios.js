const express = require('express');
const router = express.Router();
const { listUsuarios, suspenderUsuario, editarUsuario, verificarUsuario } = require('../controllers/userController');
const { verifyAdmin } = require('../middlewares/auth');

// Listar todos los usuarios (solo admin)
router.get('/', verifyAdmin, listUsuarios);



// Verificar o rechazar propietario (solo admin)
router.patch('/:id/verificar', verifyAdmin, verificarUsuario);

// Editar usuario (solo admin)
router.put('/:id', verifyAdmin, editarUsuario);

// Suspender o reactivar usuario (solo admin)
router.patch('/:id/suspender', verifyAdmin, suspenderUsuario);

module.exports = router;
