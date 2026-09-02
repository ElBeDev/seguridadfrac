// Entrypoint del servicio "backend" en Vercel (framework express).
// ESM con export default explícito — el builder de Vercel necesita ver
// el export de la app (con CJS module.exports no lo detecta). El listen
// local sigue viviendo en src/server.js.
import 'dotenv/config';
import app from './src/app.js';

export default app;
