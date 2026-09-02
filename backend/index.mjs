// Entrypoint del servicio "backend" en Vercel (framework express).
// ESM con export default explícito — el builder necesita ver el export
// de la app (con CJS module.exports no lo detecta). Sin dotenv aquí: en
// Vercel las env vars vienen inyectadas y el bundler no resuelve el
// subpath 'dotenv/config'; para local, src/server.js ya lo carga.
import app from './src/app.js';

export default app;
