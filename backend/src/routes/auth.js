const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Solo admin puede crear propietarios
const { verifyAdmin } = require('../middlewares/auth');
router.post('/create-propietario', verifyAdmin, authController.createPropietario);
router.post('/login', authController.login);
router.get('/verify', authController.verifyToken);

module.exports = router;
