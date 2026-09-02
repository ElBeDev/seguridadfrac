const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');
const { verifyAdmin, verifyPropietario } = require('../middlewares/auth');

// Registrar nuevo empleo (solo propietario autenticado)
router.post('/', verifyPropietario, historialController.registrarEmpleo);

// Finalizar empleo (solo propietario autenticado)
router.put('/:id/finalizar', verifyPropietario, historialController.finalizarEmpleo);

// Consultar historial laboral de una empleada (admin y propietario)
router.get('/empleada/:empleada_id', historialController.obtenerHistorialPorEmpleada);

// Consultar historial laboral de un propietario (solo propietario autenticado)
router.get('/propietario/:propietario_id', verifyPropietario, historialController.obtenerHistorialPorPropietario);

module.exports = router;
