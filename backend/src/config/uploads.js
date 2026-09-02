const path = require('path');
const fs = require('fs');

// Directorio de adjuntos. En serverless (Vercel) el FS es read-only salvo
// /tmp, así que ahí el default es /tmp/uploads (efímero — para
// persistencia real usar Blob/S3, ver PLAN.md).
const UPLOADS_DIR =
  process.env.UPLOADS_DIR ||
  (process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../../uploads'));

try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (err) {
  console.error('No se pudo crear el directorio de uploads:', err.message);
}

module.exports = { UPLOADS_DIR };
