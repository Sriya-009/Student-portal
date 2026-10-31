require('dotenv').config();

const { getPool } = require('../db');
const { syncUserIntoRoleTables } = require('../services/roleTableSync');

async function syncRoleTablesFromUsers(pool = getPool()) {
  const [users] = await pool.query('SELECT * FROM users');

  for (const user of users) {
    await syncUserIntoRoleTables(pool, user);
  }

  const [adminCount] = await pool.query('SELECT COUNT(*) AS count FROM admin');
  const [facultyCount] = await pool.query('SELECT COUNT(*) AS count FROM faculty');
  const [studentCount] = await pool.query('SELECT COUNT(*) AS count FROM student');
  return {
    admin: adminCount[0].count,
    faculty: facultyCount[0].count,
    student: studentCount[0].count
  };
}

if (require.main === module) {
  syncRoleTablesFromUsers()
    .then((counts) => {
      console.log(counts);
      process.exit(0);
    })
    .catch((_error) => {
      console.error('Role-table synchronization failed.');
      process.exit(1);
    });
}

module.exports = { syncRoleTablesFromUsers };
