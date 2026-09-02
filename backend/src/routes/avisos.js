const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { verifyAdmin, verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');

// Adjuntos: PDF o imagen, máx 5MB, servidos en /api/uploads.
const { UPLOADS_DIR } = require('../config/uploads');

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo se aceptan PDF o imágenes (png/jpg/webp)'), ok);
  },
});

// Feed de comunicados (cualquier usuario autenticado)
router.get('/', verifyPropietario, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.nombre_completo AS autor
      FROM avisos a LEFT JOIN users u ON u.id = a.creado_por
      ORDER BY a.created_at DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar avisos', error: error.message });
  }
});

// Publicar aviso (solo admin) — multipart opcional con campo "adjunto"
router.post('/', verifyAdmin, (req, res) => {
  upload.single('adjunto')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    try {
      const { titulo, cuerpo, prioridad } = req.body;
      if (!titulo || !cuerpo) return res.status(400).json({ message: 'Título y cuerpo son requeridos' });
      const { rows } = await pool.query(
        'INSERT INTO avisos (titulo, cuerpo, prioridad, adjunto, adjunto_nombre, creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [
          titulo, cuerpo, prioridad || 'normal',
          req.file ? `/api/uploads/${req.file.filename}` : null,
          req.file ? req.file.originalname : null,
          req.user.id,
        ]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      res.status(400).json({ message: 'Error al crear aviso', error: error.message });
    }
  });
});

// Eliminar aviso (solo admin)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM avisos WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Aviso no encontrado' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar aviso', error: error.message });
  }
});

module.exports = router;
