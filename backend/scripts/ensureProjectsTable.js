require('dotenv').config();

const { getPool } = require('../db');

async function ensureProjectsTable() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(60) PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      description TEXT NULL,
      department VARCHAR(120) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'ongoing',
      progress_percent INT NOT NULL DEFAULT 0,
      deadline DATE NULL,
      owner_identifier VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM projects');
  console.log('projects table ready, rowCount:', rows[0]?.count ?? 0);
}

ensureProjectsTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to ensure projects table:', error.message);
    process.exit(1);
  });
