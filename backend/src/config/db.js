const { Pool } = require('pg');

// Postgres hosteado (Neon/Supabase/RDS) exige TLS; local no lo usa.
const connectionString = process.env.DATABASE_URL || '';
const necesitaSSL = /sslmode=require/.test(connectionString) || process.env.PGSSL === 'require';

const pool = new Pool({
  connectionString,
  ssl: necesitaSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

module.exports = pool;
