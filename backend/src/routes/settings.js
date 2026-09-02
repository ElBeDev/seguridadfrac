const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middlewares/auth');
const pool = require('../config/db');

// Claves permitidas del panel "Configuración del Sistema"
const ALLOWED_KEYS = ['maintenance_mode', 'email_notifications', 'auto_backup'];
const DEFAULTS = {
  maintenance_mode: 'false',
  email_notifications: 'true',
  auto_backup: 'true',
};

// Leer configuración (solo admin)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM system_settings');
    const settings = { ...DEFAULTS };
    for (const row of rows) {
      if (ALLOWED_KEYS.includes(row.key)) settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error al leer configuración', error: error.message });
  }
});

// Actualizar configuración (solo admin) — acepta un objeto parcial
router.put('/', verifyAdmin, async (req, res) => {
  try {
    const entries = Object.entries(req.body || {}).filter(([k]) => ALLOWED_KEYS.includes(k));
    if (entries.length === 0) {
      return res.status(400).json({ message: 'Ninguna clave válida en el body' });
    }
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
    }
    const { rows } = await pool.query('SELECT key, value FROM system_settings');
    const settings = { ...DEFAULTS };
    for (const row of rows) {
      if (ALLOWED_KEYS.includes(row.key)) settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar configuración', error: error.message });
  }
});

module.exports = router;
