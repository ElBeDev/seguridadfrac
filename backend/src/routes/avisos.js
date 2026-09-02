const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { verifyAdmin, verifyPropietario } = require('../middlewares/auth');
const pool = require('../config/db');
const { UPLOADS_DIR } = require('../config/uploads');

// Adjuntos: PDF o imagen. Con BLOB_READ_WRITE_TOKEN (Vercel Blob) van al
// blob store y la URL es permanente/CDN; sin token (dev local) caen a
// disco en UPLOADS_DIR servidos por /api/uploads. Límite 4MB: las
// funciones de Vercel capan el body a ~4.5MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Solo se aceptan PDF o imágenes (png/jpg/webp) de máximo 4MB'), ok);
  },
});

// El SDK autentica con BLOB_READ_WRITE_TOKEN (token clásico) o con
// OIDC + BLOB_STORE_ID (lo que inyecta la integración nueva de Vercel).
const hayBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

// El store es de acceso privado: el archivo vive en Blob como
// avisos/<nombre> y se sirve a través de GET /api/uploads/<nombre>
// (ver routes/adjuntos.js), así la URL guardada en la DB es la misma
// forma en local y en producción.
async function guardarAdjunto(file) {
  const nombre = `${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`;
  if (hayBlob()) {
    try {
      const { put } = require('@vercel/blob');
      await put(`avisos/${nombre}`, file.buffer, {
        access: 'private',
        contentType: file.mimetype,
      });
      return `/api/uploads/${nombre}`;
    } catch (err) {
      // En Vercel el disco es efímero: mejor fallar claro que degradar.
      // En local (env vars pulled sin OIDC válido) sí caemos a disco.
      if (process.env.VERCEL) throw err;
      console.error('Blob no disponible en local, usando disco:', err.message);
    }
  }
  fs.writeFileSync(path.join(UPLOADS_DIR, nombre), file.buffer);
  return `/api/uploads/${nombre}`;
}

async function borrarAdjunto(adjunto) {
  if (!adjunto) return;
  const nombre = path.basename(adjunto);
  if (hayBlob()) {
    try {
      const { del } = require('@vercel/blob');
      await del(`avisos/${nombre}`);
    } catch (err) {
      console.error('No se pudo borrar el blob:', err.message);
    }
  }
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, nombre));
  } catch {
    // no estaba en disco — normal cuando vivía en Blob
  }
}

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
      const adjunto = req.file ? await guardarAdjunto(req.file) : null;
      const { rows } = await pool.query(
        'INSERT INTO avisos (titulo, cuerpo, prioridad, adjunto, adjunto_nombre, creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [
          titulo, cuerpo, prioridad || 'normal',
          adjunto,
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

// Eliminar aviso (solo admin) — limpia también su adjunto
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM avisos WHERE id=$1 RETURNING adjunto', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Aviso no encontrado' });
    await borrarAdjunto(rows[0].adjunto);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar aviso', error: error.message });
  }
});

module.exports = router;
