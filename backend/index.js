// Entrypoint del servicio "backend" en Vercel (framework express):
// exporta la app; Vercel rutea todo el tráfico del servicio a través de
// ella. El listen local sigue viviendo en src/server.js.
require('dotenv').config();
module.exports = require('./src/app');
