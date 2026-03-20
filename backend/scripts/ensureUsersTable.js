require('dotenv').config();

const { getPool } = require('../db');

async function ensureUsersTable() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      identifier VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      role ENUM('student','faculty','admin') NOT NULL,
      department VARCHAR(120) NULL,
      phone VARCHAR(30) NULL,
      registration_no VARCHAR(80) NULL,
      semester VARCHAR(20) NULL,
      section VARCHAR(20) NULL,
      batch_year VARCHAR(10) NULL,
      date_of_birth DATE NULL,
      guardian_name VARCHAR(120) NULL,
      guardian_phone VARCHAR(30) NULL,
      address VARCHAR(255) NULL,
      employee_id VARCHAR(80) NULL,
      designation VARCHAR(120) NULL,
      specialization VARCHAR(120) NULL,
      qualification VARCHAR(160) NULL,
      office_location VARCHAR(120) NULL,
      office_hours VARCHAR(120) NULL,
      joining_date DATE NULL,
      bio TEXT NULL,
      access_level VARCHAR(80) NULL,
      permissions_json JSON NULL,
      emergency_contact VARCHAR(30) NULL,
      two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      must_reset_password TINYINT(1) NOT NULL DEFAULT 0,
      photo_url VARCHAR(255) NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [tables] = await pool.query('SHOW TABLES');
  console.log('users table ensured. Current tables:', tables);
}

ensureUsersTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to ensure users table:', error.message);
    process.exit(1);
  });
