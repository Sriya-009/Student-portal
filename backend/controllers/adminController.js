function createAdminControllers(dependencies) {
  const {
    getPool,
    userSelectFields,
    toSafeUser,
    sendServerError,
    findUserByIdentifierOrEmail,
    validatePasswordStrength,
    bcrypt,
    saltRounds,
    withTransaction,
    syncUserIntoRoleTables
  } = dependencies;

  async function listUsers(_req, res) {
    try {
      const [rows] = await getPool().query(
        `SELECT ${userSelectFields} FROM users ORDER BY id DESC LIMIT 100`
      );
      return res.json({ ok: true, users: rows.map(toSafeUser) });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function assignStudentFaculty(req, res) {
    const studentIdentifier = String(req.body?.studentIdentifier || '').trim();
    const facultyIdentifier = String(req.body?.facultyIdentifier || '').trim();
    if (!studentIdentifier || !facultyIdentifier) {
      return res.status(400).json({ ok: false, error: 'studentIdentifier and facultyIdentifier are required' });
    }
    try {
      const pool = getPool();
      const student = await findUserByIdentifierOrEmail(pool, studentIdentifier);
      const faculty = await findUserByIdentifierOrEmail(pool, facultyIdentifier);
      if (!student || String(student.role || '').toLowerCase() !== 'student') {
        return res.status(404).json({ ok: false, error: 'Student account not found' });
      }
      if (!faculty || String(faculty.role || '').toLowerCase() !== 'faculty') {
        return res.status(404).json({ ok: false, error: 'Faculty account not found' });
      }
      if (student.accountSource === 'role_table') {
        return res.status(404).json({ ok: false, error: 'Student account not found' });
      }
      await pool.query(
        `UPDATE users
         SET assigned_faculty_identifier = ?, updated_at = CURRENT_TIMESTAMP
         WHERE LOWER(identifier) = LOWER(?) AND role = 'student'`,
        [faculty.identifier, student.identifier]
      );
      return res.json({
        ok: true,
        assignment: {
          studentIdentifier: student.identifier,
          studentName: student.name,
          facultyIdentifier: faculty.identifier,
          facultyName: faculty.name
        }
      });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function listStudentFacultyAssignments(_req, res) {
    try {
      const [rows] = await getPool().query(`
        SELECT
          s.identifier AS student_identifier,
          s.name AS student_name,
          s.assigned_faculty_identifier AS faculty_identifier,
          f.name AS faculty_name
        FROM users s
        LEFT JOIN users f ON s.assigned_faculty_identifier = f.identifier
        WHERE s.role = 'student'
        ORDER BY s.identifier ASC
      `);
      const assignments = rows
        .filter((row) => row.faculty_identifier)
        .map((row) => ({
          studentIdentifier: row.student_identifier,
          studentName: row.student_name,
          facultyIdentifier: row.faculty_identifier,
          facultyName: row.faculty_name || 'Unknown Faculty'
        }));
      return res.json({ ok: true, assignments });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  async function createUser(req, res) {
    const { identifier, name, email, role, department, phone, password } = req.body;
    if (!identifier || !name || !email || !role || !password) {
      return res.status(400).json({
        ok: false,
        error: 'identifier, name, email, role and password are required'
      });
    }
    const normalizedRole = String(role).trim().toLowerCase();
    if (!['student', 'faculty'].includes(normalizedRole)) {
      return res.status(400).json({ ok: false, error: 'Admin-created role must be student or faculty.' });
    }
    const passwordErrors = validatePasswordStrength(String(password));
    if (passwordErrors.length > 0) {
      return res.status(400).json({ ok: false, error: passwordErrors.join('. ') });
    }

    try {
      const pool = getPool();
      const passwordHash = await bcrypt.hash(String(password), saltRounds);
      await withTransaction(pool, async (connection) => {
        await connection.query(
          `INSERT INTO users (identifier, name, email, role, department, phone, must_reset_password, password)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(identifier).trim().toUpperCase(),
            String(name).trim(),
            String(email).trim().toLowerCase(),
            normalizedRole,
            String(department || '').trim() || null,
            String(phone || '').trim() || null,
            1,
            passwordHash
          ]
        );
        const createdUser = await findUserByIdentifierOrEmail(connection, String(identifier).trim().toUpperCase());
        if (!createdUser) throw new Error('Created account could not be loaded.');
        await syncUserIntoRoleTables(connection, createdUser);
      });

      return res.status(201).json({
        ok: true,
        message: 'User created in MySQL',
        user: {
          identifier: String(identifier).trim().toUpperCase(),
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          role: String(role).trim().toLowerCase(),
          department: String(department || '').trim() || null,
          phoneNumber: String(phone || '').trim() || null
        }
      });
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok: false, error: 'User already exists with this identifier or email.' });
      }
      return sendServerError(res, error);
    }
  }

  async function dashboardStats(_req, res) {
    try {
      const pool = getPool();
      const [studentCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['student']);
      const [facultyCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['faculty']);
      const [adminCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
      const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
      return res.json({
        ok: true,
        stats: {
          totalUsers: totalUsers[0]?.count || 0,
          students: studentCount[0]?.count || 0,
          faculty: facultyCount[0]?.count || 0,
          admins: adminCount[0]?.count || 0
        }
      });
    } catch (error) {
      return sendServerError(res, error);
    }
  }

  return { listUsers, assignStudentFaculty, listStudentFacultyAssignments, createUser, dashboardStats };
}

module.exports = { createAdminControllers };
