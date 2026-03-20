require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getPool, testConnection } = require('./db');

const app = express();
const PORT = Number(process.env.SERVER_PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || process.env.REACT_APP_JWT_SECRET || 'portal-dev-secret-key';
const JWT_EXPIRES_IN = '1h';
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const DEFAULT_ADMIN_IDENTIFIER = process.env.DEFAULT_ADMIN_IDENTIFIER || 'admin1';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin009';
const otpSessions = new Map();
const lastIssuedOtpByUser = new Map();
const USER_SELECT_FIELDS = [
  'id',
  'identifier',
  'name',
  'email',
  'password',
  'role',
  'department',
  'phone',
  'registration_no',
  'semester',
  'section',
  'batch_year',
  'date_of_birth',
  'guardian_name',
  'guardian_phone',
  'address',
  'employee_id',
  'designation',
  'specialization',
  'qualification',
  'office_location',
  'office_hours',
  'joining_date',
  'bio',
  'access_level',
  'permissions_json',
  'emergency_contact',
  'two_factor_enabled',
  'is_active',
  'must_reset_password',
  'assigned_faculty_identifier',
  'photo_url',
  'created_at',
  'updated_at'
].join(', ');
const PROFILE_FIELD_MAP = {
  name: 'name',
  email: 'email',
  department: 'department',
  phoneNumber: 'phone',
  registrationNo: 'registration_no',
  semester: 'semester',
  section: 'section',
  batchYear: 'batch_year',
  dateOfBirth: 'date_of_birth',
  guardianName: 'guardian_name',
  guardianPhone: 'guardian_phone',
  address: 'address',
  employeeId: 'employee_id',
  designation: 'designation',
  specialization: 'specialization',
  qualification: 'qualification',
  officeLocation: 'office_location',
  officeHours: 'office_hours',
  joiningDate: 'joining_date',
  bio: 'bio',
  accessLevel: 'access_level',
  permissions: 'permissions_json',
  emergencyContact: 'emergency_contact',
  twoFactorEnabled: 'two_factor_enabled',
  isActive: 'is_active'
};

// ========== SECURITY MIDDLEWARE ==========
app.use(helmet());

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// ========== FILE UPLOAD CONFIG ==========
const uploadsDir = path.join(__dirname, 'uploads', 'profile-photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

app.use(cors());
app.use(express.json());
app.use(apiRateLimiter);
app.use('/uploads/profile-photos', express.static(uploadsDir));

function maskPhone(phoneNumber) {
  const digits = (phoneNumber || '').replace(/\D/g, '');
  if (!digits) {
    return '*** *** ****';
  }
  return `*** *** ${digits.slice(-4)}`;
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueUniqueOtp(userKey, previousOtp = '') {
  let otpCode = generateOtpCode();
  const lastIssued = lastIssuedOtpByUser.get(userKey);

  while (otpCode === previousOtp || otpCode === lastIssued) {
    otpCode = generateOtpCode();
  }

  lastIssuedOtpByUser.set(userKey, otpCode);
  return otpCode;
}

function createAuthToken(user) {
  return jwt.sign(
    {
      sub: user.identifier,
      role: user.role,
      email: user.email,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyAuthToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special character (!@#$%^&*)');
  }
  return errors;
}

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function verifyPasswordAndMigrate(pool, user, plainPassword) {
  const storedPassword = String(user.password || '');

  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(String(plainPassword), storedPassword);
  }

  const isLegacyMatch = storedPassword === String(plainPassword);
  if (!isLegacyMatch) {
    return false;
  }

  const upgradedHash = await bcrypt.hash(String(plainPassword), BCRYPT_SALT_ROUNDS);
  await pool.query('UPDATE users SET password = ? WHERE id = ?', [upgradedHash, user.id]);
  user.password = upgradedHash;
  return true;
}

async function findUserByIdentifierOrEmail(pool, identifier) {
  const normalized = String(identifier || '').trim().toLowerCase();
  const [rows] = await pool.query(
    `SELECT ${USER_SELECT_FIELDS}
     FROM users
     WHERE LOWER(identifier) = ? OR LOWER(email) = ?
     LIMIT 1`,
    [normalized, normalized]
  );
  return rows[0] || null;
}

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function toDbPatchValue(inputKey, value) {
  if (value === undefined) {
    return undefined;
  }

  if (inputKey === 'permissions') {
    return JSON.stringify(Array.isArray(value) ? value : []);
  }

  if (inputKey === 'twoFactorEnabled' || inputKey === 'isActive') {
    return value ? 1 : 0;
  }

  const normalized = String(value || '').trim();
  return normalized || null;
}

function toSafeUser(user) {
  return {
    id: user.id,
    identifier: user.identifier,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || null,
    phoneNumber: user.phone || null,
    registrationNo: user.registration_no || null,
    semester: user.semester || null,
    section: user.section || null,
    batchYear: user.batch_year || null,
    dateOfBirth: user.date_of_birth || null,
    guardianName: user.guardian_name || null,
    guardianPhone: user.guardian_phone || null,
    address: user.address || null,
    employeeId: user.employee_id || null,
    designation: user.designation || null,
    specialization: user.specialization || null,
    qualification: user.qualification || null,
    officeLocation: user.office_location || null,
    officeHours: user.office_hours || null,
    joiningDate: user.joining_date || null,
    bio: user.bio || null,
    accessLevel: user.access_level || null,
    permissions: parseJsonArray(user.permissions_json),
    emergencyContact: user.emergency_contact || null,
    twoFactorEnabled: Boolean(user.two_factor_enabled),
    isActive: user.is_active === undefined ? true : Boolean(user.is_active),
    requiresPasswordReset: Boolean(user.must_reset_password),
    assignedFacultyIdentifier: user.assigned_faculty_identifier || null,
    photoUrl: user.photo_url || null,
    createdAt: user.created_at || null,
    updatedAt: user.updated_at || null
  };
}

function toSafeProject(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description || '',
    department: project.department || '',
    status: project.status || 'ongoing',
    progressPercent: Number(project.progress_percent || 0),
    deadline: project.deadline || 'NA',
    ownerIdentifier: project.owner_identifier || null,
    teamMembers: [],
    technologies: []
  };
}

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
}

async function ensureStudentFacultyAssignmentColumn() {
  const pool = getPool();
  const [rows] = await pool.query("SHOW COLUMNS FROM users LIKE 'assigned_faculty_identifier'");
  if (rows.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN assigned_faculty_identifier VARCHAR(50) NULL');
  }
}

async function ensureDefaultAdmin() {
  const pool = getPool();
  const normalizedIdentifier = String(DEFAULT_ADMIN_IDENTIFIER).trim().toLowerCase();

  if (!normalizedIdentifier) {
    return;
  }

  const [existingRows] = await pool.query(
    'SELECT id FROM users WHERE LOWER(identifier) = ? LIMIT 1',
    [normalizedIdentifier]
  );

  if (existingRows.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(String(DEFAULT_ADMIN_PASSWORD), BCRYPT_SALT_ROUNDS);
  await pool.query(
    `INSERT INTO users
     (identifier, name, email, role, department, access_level, is_active, must_reset_password, password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(DEFAULT_ADMIN_IDENTIFIER).trim(),
      'System Default Admin',
      `${String(DEFAULT_ADMIN_IDENTIFIER).trim().toLowerCase()}@portal.local`,
      'admin',
      'Administration',
      'Super Admin',
      1,
      0,
      passwordHash
    ]
  );
}

async function generateIdentifierForRole(pool, role) {
  const prefixMap = {
    student: 'STU',
    faculty: 'FAC',
    admin: 'ADM'
  };

  const prefix = prefixMap[role] || 'USR';
  const [rows] = await pool.query(
    `SELECT identifier
     FROM users
     WHERE identifier LIKE ?
     ORDER BY id DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  if (rows.length === 0) {
    return `${prefix}001`;
  }

  const lastIdentifier = String(rows[0].identifier || '');
  const match = lastIdentifier.match(/(\d+)$/);
  const nextNumber = match ? Number(match[1]) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

app.get('/api/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({
      ok: true,
      server: 'running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      server: 'running',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/users', async (_req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT ${USER_SELECT_FIELDS} FROM users ORDER BY id DESC LIMIT 100`
    );

    res.json({ ok: true, users: rows.map(toSafeUser) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/projects', async (_req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM projects ORDER BY updated_at DESC, created_at DESC LIMIT 200');

    return res.json({
      ok: true,
      projects: rows.map(toSafeProject)
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/admin/assign-student-faculty', async (req, res) => {
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

    await pool.query(
      'UPDATE users SET assigned_faculty_identifier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [faculty.identifier, student.id]
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
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/admin/student-faculty-assignments', async (_req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
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
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/profile/:identifier', async (req, res) => {
  const normalizedIdentifier = String(req.params.identifier || '').trim();
  if (!normalizedIdentifier) {
    return res.status(400).json({ ok: false, error: 'identifier is required' });
  }

  try {
    const pool = getPool();
    const user = await findUserByIdentifierOrEmail(pool, normalizedIdentifier);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User profile not found' });
    }

    return res.json({ ok: true, user: toSafeUser(user) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.patch('/api/profile/:identifier', async (req, res) => {
  const normalizedIdentifier = String(req.params.identifier || '').trim();
  if (!normalizedIdentifier) {
    return res.status(400).json({ ok: false, error: 'identifier is required' });
  }

  const updates = [];
  const params = [];

  Object.keys(req.body || {}).forEach((inputKey) => {
    const dbField = PROFILE_FIELD_MAP[inputKey];
    if (!dbField) {
      return;
    }

    const dbValue = toDbPatchValue(inputKey, req.body[inputKey]);
    if (dbValue === undefined) {
      return;
    }

    updates.push(`${dbField} = ?`);
    params.push(dbValue);
  });

  if (updates.length === 0) {
    return res.status(400).json({ ok: false, error: 'No valid profile fields provided' });
  }

  try {
    const pool = getPool();
    params.push(normalizedIdentifier);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE LOWER(identifier) = LOWER(?)`,
      params
    );

    const updatedUser = await findUserByIdentifierOrEmail(pool, normalizedIdentifier);
    if (!updatedUser) {
      return res.status(404).json({ ok: false, error: 'User profile not found after update' });
    }

    return res.json({ ok: true, user: toSafeUser(updatedUser) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ ok: false, error: 'identifier and password are required' });
  }

  try {
    const pool = getPool();
    const user = await findUserByIdentifierOrEmail(pool, identifier);

    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    const isPasswordValid = await verifyPasswordAndMigrate(pool, user, password);
    if (!isPasswordValid) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    if (user.role === 'faculty' || user.role === 'admin') {
      const userKey = `${user.role}-${user.identifier}`;
      const otpCode = issueUniqueOtp(userKey);
      const otpSessionId = `otp-${user.identifier}-${Date.now()}`;

      otpSessions.set(otpSessionId, {
        user,
        role: user.role,
        userKey,
        otpCode,
        expiresAt: Date.now() + (5 * 60 * 1000),
        resendCount: 0,
        lastResendTime: 0
      });

      return res.json({
        ok: true,
        requiresOtp: true,
        otpSessionId,
        maskedPhone: maskPhone(user.phone),
        role: user.role,
        demoOtp: otpCode,
        expiresAt: otpSessions.get(otpSessionId).expiresAt
      });
    }

    const token = createAuthToken(user);
    return res.json({
      ok: true,
      requiresOtp: false,
      token,
      user: toSafeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { otpSessionId, otpCode } = req.body;

  if (!otpSessionId || !otpCode) {
    return res.status(400).json({ ok: false, error: 'otpSessionId and otpCode are required' });
  }

  const session = otpSessions.get(otpSessionId);
  if (!session) {
    return res.status(400).json({ ok: false, error: 'OTP session expired. Please login again.' });
  }

  if (Date.now() > session.expiresAt) {
    otpSessions.delete(otpSessionId);
    return res.status(400).json({ ok: false, error: 'OTP expired. Please login again.' });
  }

  if (String(session.otpCode) !== String(otpCode).trim()) {
    return res.status(400).json({ ok: false, error: 'Invalid OTP code' });
  }

  otpSessions.delete(otpSessionId);
  const token = createAuthToken(session.user);

  return res.json({
    ok: true,
    token,
    user: toSafeUser(session.user)
  });
});

app.post('/api/auth/resend-otp', (req, res) => {
  const { otpSessionId } = req.body;

  if (!otpSessionId) {
    return res.status(400).json({ ok: false, error: 'otpSessionId is required' });
  }

  const session = otpSessions.get(otpSessionId);
  if (!session) {
    return res.status(400).json({ ok: false, error: 'OTP session expired. Please login again with credentials.' });
  }

  if (session.resendCount >= 3) {
    return res.status(400).json({ ok: false, error: 'Maximum resend attempts reached. Please login again.' });
  }

  const now = Date.now();
  if (session.lastResendTime && now - session.lastResendTime < 30000) {
    const secondsRemaining = Math.ceil((30000 - (now - session.lastResendTime)) / 1000);
    return res.status(400).json({ ok: false, error: `Please wait ${secondsRemaining} seconds before requesting another OTP.` });
  }

  const newOtpCode = issueUniqueOtp(session.userKey, session.otpCode);
  session.otpCode = newOtpCode;
  session.expiresAt = Date.now() + (5 * 60 * 1000);
  session.resendCount += 1;
  session.lastResendTime = Date.now();

  otpSessions.set(otpSessionId, session);

  return res.json({
    ok: true,
    otpSent: true,
    maskedPhone: maskPhone(session.user.phone),
    demoOtp: newOtpCode,
    expiresAt: session.expiresAt,
    resendCount: session.resendCount,
    remainingAttempts: 3 - session.resendCount
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  const normalizedIdentifier = String(identifier || '').trim();

  if (!normalizedIdentifier) {
    return res.status(400).json({ ok: false, error: 'Enter your identifier or email first.' });
  }

  try {
    const pool = getPool();
    const user = await findUserByIdentifierOrEmail(pool, normalizedIdentifier);

    if (!user) {
      return res.status(404).json({ ok: false, error: 'No account found for this identifier.' });
    }

    return res.json({
      ok: true,
      success: true,
      message: 'Password reset instructions sent to your registered contact.'
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/reset-initial-password', async (req, res) => {
  const { identifier, newPassword } = req.body;
  const normalizedIdentifier = String(identifier || '').trim();

  if (!normalizedIdentifier || !newPassword) {
    return res.status(400).json({ ok: false, error: 'identifier and newPassword are required' });
  }

  if (String(newPassword).trim().length < 6) {
    return res.status(400).json({ ok: false, error: 'New password must be at least 6 characters.' });
  }

  try {
    const pool = getPool();
    const user = await findUserByIdentifierOrEmail(pool, normalizedIdentifier);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), BCRYPT_SALT_ROUNDS);
    await pool.query(
      `UPDATE users
       SET password = ?, must_reset_password = 0, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [passwordHash, user.id]
    );

    const updatedUser = await findUserByIdentifierOrEmail(pool, normalizedIdentifier);
    return res.json({ ok: true, user: toSafeUser(updatedUser) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role = 'student', department, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: 'name, email and password are required' });
  }

  const normalizedRole = String(role).trim().toLowerCase();
  if (!['student', 'faculty', 'admin'].includes(normalizedRole)) {
    return res.status(400).json({ ok: false, error: 'role must be student, faculty or admin' });
  }

  try {
    const pool = getPool();
    const identifier = await generateIdentifierForRole(pool, normalizedRole);
    const passwordHash = await bcrypt.hash(String(password), BCRYPT_SALT_ROUNDS);

    await pool.query(
      `INSERT INTO users (identifier, name, email, role, department, phone, must_reset_password, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        identifier,
        String(name).trim(),
        String(email).trim().toLowerCase(),
        normalizedRole,
        String(department || '').trim() || null,
        String(phone || '').trim() || null,
        0,
        passwordHash
      ]
    );

    const createdUser = await findUserByIdentifierOrEmail(pool, identifier);
    const token = createAuthToken(createdUser);

    return res.status(201).json({
      ok: true,
      token,
      user: toSafeUser(createdUser)
    });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, error: 'User already exists with this identifier or email.' });
    }
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/verify-token', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ ok: false, error: 'Token is required.' });
  }

  try {
    const decoded = jwt.verify(String(token).trim(), JWT_SECRET);
    return res.json({ ok: true, decoded });
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
  }
});

app.post('/api/users', async (req, res) => {
  const { identifier, name, email, role, department, phone, password } = req.body;

  if (!identifier || !name || !email || !role || !password) {
    return res.status(400).json({
      ok: false,
      error: 'identifier, name, email, role and password are required'
    });
  }

  try {
    const pool = getPool();
    const passwordHash = await bcrypt.hash(String(password), BCRYPT_SALT_ROUNDS);
    await pool.query(
      `INSERT INTO users (identifier, name, email, role, department, phone, must_reset_password, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        String(identifier).trim().toUpperCase(),
        String(name).trim(),
        String(email).trim().toLowerCase(),
        String(role).trim().toLowerCase(),
        String(department || '').trim() || null,
        String(phone || '').trim() || null,
        1,
        passwordHash
      ]
    );

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
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, error: 'User already exists with this identifier or email.' });
    }
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== DASHBOARD STATS ENDPOINTS ==========
app.get('/api/stats/dashboard', async (_req, res) => {
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
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== FILE UPLOAD ENDPOINTS ==========
app.post('/api/upload/profile-photo/:identifier', uploadMiddleware.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    const { identifier } = req.params;
    if (!identifier) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ ok: false, error: 'Identifier is required' });
    }

    const pool = getPool();
    const photoUrl = `/uploads/profile-photos/${req.file.filename}`;

    // Update user with photo URL
    await pool.query(
      'UPDATE users SET photo_url = ?, updated_at = NOW() WHERE identifier = ?',
      [photoUrl, identifier]
    );

    return res.json({
      ok: true,
      message: 'Profile photo uploaded successfully',
      photoUrl
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/profile-photo/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const pool = getPool();

    const [rows] = await pool.query(
      'SELECT photo_url FROM users WHERE identifier = ?',
      [identifier]
    );

    if (!rows[0] || !rows[0].photo_url) {
      return res.status(404).json({ ok: false, error: 'Photo not found' });
    }

    return res.json({
      ok: true,
      photoUrl: rows[0].photo_url
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.delete('/api/profile-photo/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const pool = getPool();

    const [rows] = await pool.query(
      'SELECT photo_url FROM users WHERE identifier = ?',
      [identifier]
    );

    if (rows[0]?.photo_url) {
      const relativePhotoPath = String(rows[0].photo_url || '').replace(/^\//, '');
      const filePath = path.join(__dirname, relativePhotoPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await pool.query(
      'UPDATE users SET photo_url = NULL, updated_at = NOW() WHERE identifier = ?',
      [identifier]
    );

    return res.json({
      ok: true,
      message: 'Profile photo deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server running on http://localhost:${PORT}`);
});

ensureDefaultAdmin().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`Failed to ensure default admin: ${error.message}`);
});

ensureProjectsTable().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`Failed to ensure projects table: ${error.message}`);
});

ensureStudentFacultyAssignmentColumn().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`Failed to ensure student-faculty assignment column: ${error.message}`);
});
