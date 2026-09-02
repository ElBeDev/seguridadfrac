// Entry serverless para Vercel: exporta la app de Express sin hacer listen.
// El listen local vive en src/server.js; aquí Vercel invoca la app por request.
require('dotenv').config();
module.exports = require('../src/app');
