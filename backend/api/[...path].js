// Catch-all serverless para Vercel: cualquier /api/* cae aquí y lo
// resuelve la app de Express (que ya rutea por prefijo /api/...).
require('dotenv').config();
module.exports = require('../src/app');
