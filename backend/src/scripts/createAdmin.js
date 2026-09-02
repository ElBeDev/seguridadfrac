// Script para crear el usuario admin inicial.
// Uso: node src/scripts/createAdmin.js <email> <password> [nombre_completo]
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { SUPPORT_EMAIL } = require('../config/branding');

async function createAdmin() {
  const [, , emailArg, passwordArg, nombreArg] = process.argv;
  const email = emailArg || SUPPORT_EMAIL;
  const password = passwordArg || '123456';
  const nombre_completo = nombreArg || 'Administrador';

  const { rows } = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  if (rows.length > 0) {
    console.log(`Ya existe un usuario con el email ${email}.`);
    await pool.end();
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (nombre_completo, email, telefono, direccion, password, rol, estado) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [nombre_completo, email, '0000000000', 'N/A', hashedPassword, 'admin', 'verified']
  );

  console.log(`Usuario admin creado exitosamente: ${email} / ${password}`);
  console.log('Cambiá la contraseña por defecto después del primer login.');
  await pool.end();
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Error al crear el admin:', err);
  process.exit(1);
});
