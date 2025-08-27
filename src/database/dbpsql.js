const { Pool } = require('pg');

const client = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

client.connect((err, conn, release) => {
  if (err) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', err.stack);
    process.exit(1);
  } else {
    console.log('✅ Conectado ao PostgreSQL com sucesso.');
    release();
  }
});
client.on('error', (err) => {
  console.error('⚠️ Erro inesperado no pool de conexões:', err);
});

module.exports = client;