const express = require('express');
const router = express.Router();
const { createReporte, listReportes, moderarReporte } = require('../controllers/reporteController');
const { verifyPropietario, verifyAdmin } = require('../middlewares/auth');

// Crear reporte (solo propietarios verificados)
router.post('/', verifyPropietario, createReporte);

// Listar reportes (solo admin)
router.get('/', verifyAdmin, listReportes);

// Moderar reporte (solo admin)
router.patch('/:id/moderar', verifyAdmin, moderarReporte);

module.exports = router;
