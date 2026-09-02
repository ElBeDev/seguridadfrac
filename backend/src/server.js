require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 4000;

pool.query('SELECT 1')
  .then(() => {
    console.log('Conectado a PostgreSQL');
    app.listen(PORT, () => {
      console.log(`Servidor backend escuchando en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error de conexión a PostgreSQL:', err);
    process.exit(1);
  });
