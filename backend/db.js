const mysql = require('mysql2/promise');

let pool;

function getConfig() {
  const schemaName = String(process.env.DB_NAME || '').trim();
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0
  };

  if (schemaName) {
    config.database = schemaName;
  }

  return config;
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getConfig());
  }
  return pool;
}

async function testConnection() {
  const activePool = getPool();
  const connection = await activePool.getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

module.exports = {
  getPool,
  testConnection
};
