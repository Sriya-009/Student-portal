require('dotenv').config();

const { getPool } = require('../db');

async function syncRoleTablesFromUsers() {
  const pool = getPool();

  const [users] = await pool.query('SELECT * FROM users');

  for (const user of users) {
    const role = String(user.role || '').toLowerCase();
    const identifier = String(user.identifier || '').trim();
    const email = String(user.email || '').trim().toLowerCase();

    if (!role || !identifier || !email) {
      continue;
    }

    await pool.query('DELETE FROM student WHERE LOWER(email)=LOWER(?) OR LOWER(registration_no)=LOWER(?)', [email, identifier]);
    await pool.query('DELETE FROM faculty WHERE LOWER(email)=LOWER(?) OR LOWER(employee_id)=LOWER(?)', [email, identifier]);
    await pool.query('DELETE FROM admin WHERE LOWER(email)=LOWER(?) OR LOWER(employee_id)=LOWER(?)', [email, identifier]);

    if (role === 'student') {
      await pool.query(
        `INSERT INTO student
         (registration_no, name, email, password, course, semester, section, batch_year, date_of_birth, guardian_name, guardian_phone, address, profile_photo_url, is_active, must_reset_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           email = VALUES(email),
           password = VALUES(password),
           course = VALUES(course),
           semester = VALUES(semester),
           section = VALUES(section),
           batch_year = VALUES(batch_year),
           date_of_birth = VALUES(date_of_birth),
           guardian_name = VALUES(guardian_name),
           guardian_phone = VALUES(guardian_phone),
           address = VALUES(address),
           profile_photo_url = VALUES(profile_photo_url),
           is_active = VALUES(is_active),
           must_reset_password = VALUES(must_reset_password),
           updated_at = CURRENT_TIMESTAMP`,
        [
          identifier,
          user.name,
          email,
          user.password || null,
          user.department || null,
          user.semester || null,
          user.section || null,
          user.batch_year || null,
          user.date_of_birth || null,
          user.guardian_name || null,
          user.guardian_phone || null,
          user.address || null,
          user.photo_url || null,
          user.is_active === undefined ? 1 : (user.is_active ? 1 : 0),
          user.must_reset_password ? 1 : 0
        ]
      );
      continue;
    }

    if (role === 'faculty') {
      await pool.query(
        `INSERT INTO faculty
         (employee_id, name, email, password, department, designation, specialization, qualification, office_location, office_hours, joining_date, bio, profile_photo_url, is_active, must_reset_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           email = VALUES(email),
           password = VALUES(password),
           department = VALUES(department),
           designation = VALUES(designation),
           specialization = VALUES(specialization),
           qualification = VALUES(qualification),
           office_location = VALUES(office_location),
           office_hours = VALUES(office_hours),
           joining_date = VALUES(joining_date),
           bio = VALUES(bio),
           profile_photo_url = VALUES(profile_photo_url),
           is_active = VALUES(is_active),
           must_reset_password = VALUES(must_reset_password),
           updated_at = CURRENT_TIMESTAMP`,
        [
          identifier,
          user.name,
          email,
          user.password || null,
          user.department || null,
          user.designation || null,
          user.specialization || null,
          user.qualification || null,
          user.office_location || null,
          user.office_hours || null,
          user.joining_date || null,
          user.bio || null,
          user.photo_url || null,
          user.is_active === undefined ? 1 : (user.is_active ? 1 : 0),
          user.must_reset_password ? 1 : 0
        ]
      );
      continue;
    }

    if (role === 'admin') {
      const parsedAccessLevel = Number(user.access_level);
      const normalizedAccessLevel = Number.isFinite(parsedAccessLevel) ? parsedAccessLevel : 1;
      await pool.query(
        `INSERT INTO admin
         (employee_id, name, email, password, role, access_level, permissions_json, two_factor_enabled, emergency_contact, is_active, must_reset_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           email = VALUES(email),
           password = VALUES(password),
           role = VALUES(role),
           access_level = VALUES(access_level),
           permissions_json = VALUES(permissions_json),
           two_factor_enabled = VALUES(two_factor_enabled),
           emergency_contact = VALUES(emergency_contact),
           is_active = VALUES(is_active),
           must_reset_password = VALUES(must_reset_password),
           updated_at = CURRENT_TIMESTAMP`,
        [
          identifier,
          user.name,
          email,
          user.password || null,
          'admin',
          normalizedAccessLevel,
          user.permissions_json || null,
          user.two_factor_enabled ? 1 : 0,
          user.emergency_contact || null,
          user.is_active === undefined ? 1 : (user.is_active ? 1 : 0),
          user.must_reset_password ? 1 : 0
        ]
      );
    }
  }

  const [adminCount] = await pool.query('SELECT COUNT(*) AS count FROM admin');
  const [facultyCount] = await pool.query('SELECT COUNT(*) AS count FROM faculty');
  const [studentCount] = await pool.query('SELECT COUNT(*) AS count FROM student');
  console.log({ admin: adminCount[0].count, faculty: facultyCount[0].count, student: studentCount[0].count });
}

syncRoleTablesFromUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Sync failed:', error.message);
    process.exit(1);
  });
