const mysql = require('mysql2/promise');
const { assertApprovedDatabaseTarget } = require('./config/databasePreflight');

let pool;

function integerSetting(name, fallback, { min = 1, max = 1000 } = {}) {
  const rawValue = process.env[name];
  if (rawValue === undefined || String(rawValue).trim() === '') return fallback;
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function getConfig() {
  const schemaName = String(process.env.DB_NAME || '').trim();
  if (process.env.NODE_ENV === 'production'
    && (!schemaName || !process.env.DB_PASSWORD || !process.env.DB_HOST || !process.env.DB_USER)) {
    throw new Error('Production database configuration is incomplete.');
  }
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: integerSetting('DB_CONNECTION_LIMIT', 10, { min: 1, max: 100 }),
    // A bounded queue prevents a prolonged database outage from accumulating
    // an unbounded number of waiting requests in the application process.
    queueLimit: integerSetting('DB_QUEUE_LIMIT', 100, { min: 1, max: 10000 }),
    connectTimeout: integerSetting('DB_CONNECT_TIMEOUT_MS', 10000, { min: 1000, max: 120000 })
  };

  if (schemaName) {
    config.database = schemaName;
  }

  if (String(process.env.DB_SSL || '').toLowerCase() === 'true') {
    config.ssl = {
      rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() === 'true',
      ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {})
    };
  }

  return config;
}

function getPool() {
  assertApprovedDatabaseTarget(process.env);
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

async function withTransaction(activePool, operation) {
  const connection = await activePool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const result = await operation(connection);
    await connection.commit();
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback().catch(() => {});
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getPool,
  testConnection,
  withTransaction,
  getConfig
};
