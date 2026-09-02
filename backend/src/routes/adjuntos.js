const path = require('path');

// Sirve adjuntos guardados en Vercel Blob (store privado). Se monta ANTES
// del static de disco: si el blob no existe (o no hay store), hace next()
// y el static local resuelve — así dev local y prod usan la misma URL.
// Los nombres son 24 hex aleatorios: no adivinables, al nivel de una URL
// firmada para el caso de circulares de la comunidad.
async function servirAdjunto(req, res, next) {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return next();
  const nombre = path.basename(req.params.archivo || '');
  if (!/^[0-9a-f]{24}\.[a-z0-9]+$/.test(nombre)) return next();
  try {
    const { get } = require('@vercel/blob');
    const result = await get(`avisos/${nombre}`, { access: 'private' });
    if (!result || result.statusCode !== 200) return next();
    res.set({
      'Content-Type': result.blob.contentType || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    });
    const { Readable } = require('stream');
    Readable.fromWeb(result.stream).pipe(res);
  } catch (err) {
    console.error('Error sirviendo adjunto desde Blob:', err.message);
    next();
  }
}

module.exports = { servirAdjunto };
