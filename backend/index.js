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

function toSafeProjectTask(task) {
  return {
    id: task.id,
    projectId: task.project_id,
    title: task.title || '',
    description: task.description || '',
    assignedToId: task.assigned_to_id || '',
    assignedToName: task.assigned_to_name || '',
    status: task.status || 'pending',
    deadline: task.deadline || null,
    contributionPercent: Number(task.contribution_percent || 0)
  };
}

function toSafeProjectFile(file) {
  return {
    id: file.id,
    projectId: file.project_id,
    fileName: file.file_name || '',
    fileSize: Number(file.file_size || 0),
    fileType: file.file_type || 'other',
    mimeType: file.mime_type || '',
    uploadedBy: file.uploaded_by || '',
    uploadedByName: file.uploaded_by_name || '',
    uploadedDate: file.uploaded_date || null,
    version: Number(file.version || 1),
    description: file.description || '',
    downloadCount: Number(file.download_count || 0),
    isSubmitted: Boolean(file.is_submitted),
    submittedDate: file.submitted_date || null,
    updatedDate: file.updated_date || null
  };
}

function toSafeFeedbackCorrection(correction) {
  return {
    id: correction.id,
    projectId: correction.project_id,
    studentIdentifier: correction.student_identifier,
    note: correction.note || '',
    createdAt: correction.created_at
  };
}

function normalizeDateOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  return raw;
}

function generateProjectIdentifier() {
  const ts = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `PRJ-${ts}-${String(random).padStart(3, '0')}`;
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

async function ensureProjectWorkspaceTables() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id VARCHAR(80) PRIMARY KEY,
      project_id VARCHAR(60) NOT NULL,
      title VARCHAR(220) NOT NULL,
      description TEXT NULL,
      assigned_to_id VARCHAR(80) NULL,
      assigned_to_name VARCHAR(180) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      deadline DATE NULL,
      contribution_percent INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_project_tasks_project (project_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_files (
      id VARCHAR(80) PRIMARY KEY,
      project_id VARCHAR(60) NOT NULL,
      file_name VARCHAR(260) NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      file_type VARCHAR(60) NULL,
      mime_type VARCHAR(120) NULL,
      uploaded_by VARCHAR(80) NULL,
      uploaded_by_name VARCHAR(180) NULL,
      uploaded_date DATE NULL,
      version INT NOT NULL DEFAULT 1,
      description TEXT NULL,
      download_count INT NOT NULL DEFAULT 0,
      is_submitted TINYINT(1) NOT NULL DEFAULT 0,
      submitted_date DATE NULL,
      updated_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_project_files_project (project_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_feedback_corrections (
      id VARCHAR(80) PRIMARY KEY,
      project_id VARCHAR(60) NOT NULL,
      student_identifier VARCHAR(80) NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_project_feedback_project (project_id)
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

async function syncUserIntoRoleTables(pool, user) {
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const identifier = String(user?.identifier || '').trim();
  const email = String(user?.email || '').trim().toLowerCase();
  const name = String(user?.name || '').trim();
  const password = String(user?.password || '').trim();

  if (!normalizedRole || !identifier || !email || !name) {
    return;
  }

  // Ensure only one role table contains this account.
  await pool.query('DELETE FROM student WHERE LOWER(email) = LOWER(?) OR LOWER(registration_no) = LOWER(?)', [email, identifier]);
  await pool.query('DELETE FROM faculty WHERE LOWER(email) = LOWER(?) OR LOWER(employee_id) = LOWER(?)', [email, identifier]);
  await pool.query('DELETE FROM admin WHERE LOWER(email) = LOWER(?) OR LOWER(employee_id) = LOWER(?)', [email, identifier]);

  if (normalizedRole === 'student') {
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
        name,
        email,
        password || null,
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
    return;
  }

  if (normalizedRole === 'faculty') {
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
        name,
        email,
        password || null,
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
    return;
  }

  if (normalizedRole === 'admin') {
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
        name,
        email,
        password || null,
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

  const createdAdmin = await findUserByIdentifierOrEmail(pool, String(DEFAULT_ADMIN_IDENTIFIER).trim());
  if (createdAdmin) {
    await syncUserIntoRoleTables(pool, createdAdmin);
  }
}

async function ensureTempWorkspaceSeed() {
  const pool = getPool();
  const tempStudentIdentifier = 'TEMPSTU001';
  const tempFacultyIdentifier = 'TEMPFAC001';
  const tempProjectId = 'TEMP-PRJ-001';

  const ensureUser = async ({ identifier, name, email, role, department, password }) => {
    let existing = await findUserByIdentifierOrEmail(pool, identifier);
    if (existing) {
      return existing;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await pool.query(
      `INSERT INTO users
       (identifier, name, email, role, department, phone, is_active, must_reset_password, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        identifier,
        name,
        email,
        role,
        department,
        '+91 90000 00000',
        1,
        0,
        passwordHash
      ]
    );

    existing = await findUserByIdentifierOrEmail(pool, identifier);
    if (existing) {
      await syncUserIntoRoleTables(pool, existing);
    }
    return existing;
  };

  const tempStudent = await ensureUser({
    identifier: tempStudentIdentifier,
    name: 'Temp Student',
    email: 'temp.student@portal.local',
    role: 'student',
    department: 'Computer Science',
    password: 'student123'
  });

  const tempFaculty = await ensureUser({
    identifier: tempFacultyIdentifier,
    name: 'Temp Faculty',
    email: 'temp.faculty@portal.local',
    role: 'faculty',
    department: 'Computer Science',
    password: 'faculty123'
  });

  if (tempStudent && tempFaculty) {
    await pool.query(
      'UPDATE users SET assigned_faculty_identifier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [tempFaculty.identifier, tempStudent.id]
    );
  }

  const [projectRows] = await pool.query('SELECT id FROM projects WHERE id = ? LIMIT 1', [tempProjectId]);
  if (projectRows.length === 0 && tempStudent) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 14);
    const deadlineIso = deadline.toISOString().slice(0, 10);

    await pool.query(
      `INSERT INTO projects (id, name, description, department, status, progress_percent, deadline, owner_identifier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tempProjectId,
        'Temporary Full Workflow Project',
        'Seeded demo project for validating student, faculty, and admin operations.',
        tempStudent.department || 'Computer Science',
        'ongoing',
        45,
        deadlineIso,
        tempStudent.identifier
      ]
    );
  }
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

app.post('/api/projects', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const ownerIdentifier = String(req.body?.ownerIdentifier || '').trim();
  const department = String(req.body?.department || '').trim();
  const deadline = normalizeDateOrNull(req.body?.deadline);

  if (!name) {
    return res.status(400).json({ ok: false, error: 'Project name is required' });
  }

  if (!ownerIdentifier) {
    return res.status(400).json({ ok: false, error: 'ownerIdentifier is required' });
  }

  try {
    const pool = getPool();
    const owner = await findUserByIdentifierOrEmail(pool, ownerIdentifier);

    if (!owner || String(owner.role || '').toLowerCase() !== 'student') {
      return res.status(404).json({ ok: false, error: 'Student owner account not found' });
    }

    const projectId = generateProjectIdentifier();
    await pool.query(
      `INSERT INTO projects (id, name, description, department, status, progress_percent, deadline, owner_identifier)
       VALUES (?, ?, ?, ?, 'ongoing', 0, ?, ?)`,
      [
        projectId,
        name,
        description || null,
        department || owner.department || null,
        deadline,
        owner.identifier
      ]
    );

    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ? LIMIT 1', [projectId]);
    return res.status(201).json({ ok: true, project: toSafeProject(rows[0]) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.delete('/api/projects/:projectId', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  const ownerIdentifier = String(req.body?.ownerIdentifier || req.query?.ownerIdentifier || '').trim();

  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  if (!ownerIdentifier) {
    return res.status(400).json({ ok: false, error: 'ownerIdentifier is required' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ? LIMIT 1', [projectId]);
    const project = rows[0];

    if (!project) {
      return res.status(404).json({ ok: false, error: 'Project not found' });
    }

    if (String(project.owner_identifier || '').toLowerCase() !== ownerIdentifier.toLowerCase()) {
      return res.status(403).json({ ok: false, error: 'You can only delete your own projects' });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);
    return res.json({ ok: true, deletedProjectId: projectId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/projects/:projectId/tasks', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM project_tasks WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    return res.json({ ok: true, tasks: rows.map(toSafeProjectTask) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/api/projects/:projectId/tasks', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : null;

  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  if (!tasks) {
    return res.status(400).json({ ok: false, error: 'tasks array is required' });
  }

  try {
    const pool = getPool();
    await pool.query('DELETE FROM project_tasks WHERE project_id = ?', [projectId]);

    for (const task of tasks) {
      const taskId = String(task?.id || `TSK-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim();
      const title = String(task?.title || '').trim();
      if (!title) {
        // eslint-disable-next-line no-continue
        continue;
      }

      await pool.query(
        `INSERT INTO project_tasks
         (id, project_id, title, description, assigned_to_id, assigned_to_name, status, deadline, contribution_percent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          projectId,
          title,
          String(task?.description || '').trim() || null,
          String(task?.assignedToId || '').trim() || null,
          String(task?.assignedToName || '').trim() || null,
          String(task?.status || 'pending').trim() || 'pending',
          normalizeDateOrNull(task?.deadline),
          Math.min(100, Math.max(0, Number(task?.contributionPercent || 0)))
        ]
      );
    }

    const [rows] = await pool.query(
      'SELECT * FROM project_tasks WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    return res.json({ ok: true, tasks: rows.map(toSafeProjectTask) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/projects/:projectId/files', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    return res.json({ ok: true, files: rows.map(toSafeProjectFile) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.put('/api/projects/:projectId/files', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  const files = Array.isArray(req.body?.files) ? req.body.files : null;

  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  if (!files) {
    return res.status(400).json({ ok: false, error: 'files array is required' });
  }

  try {
    const pool = getPool();
    await pool.query('DELETE FROM project_files WHERE project_id = ?', [projectId]);

    for (const file of files) {
      const fileId = String(file?.id || `FILE-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim();
      const fileName = String(file?.fileName || '').trim();
      if (!fileName) {
        // eslint-disable-next-line no-continue
        continue;
      }

      await pool.query(
        `INSERT INTO project_files
         (id, project_id, file_name, file_size, file_type, mime_type, uploaded_by, uploaded_by_name, uploaded_date, version, description, download_count, is_submitted, submitted_date, updated_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileId,
          projectId,
          fileName,
          Number(file?.fileSize || 0),
          String(file?.fileType || 'other').trim() || 'other',
          String(file?.mimeType || '').trim() || null,
          String(file?.uploadedBy || '').trim() || null,
          String(file?.uploadedByName || '').trim() || null,
          normalizeDateOrNull(file?.uploadedDate),
          Math.max(1, Number(file?.version || 1)),
          String(file?.description || '').trim() || null,
          Math.max(0, Number(file?.downloadCount || 0)),
          file?.isSubmitted ? 1 : 0,
          normalizeDateOrNull(file?.submittedDate),
          normalizeDateOrNull(file?.updatedDate)
        ]
      );
    }

    const [rows] = await pool.query(
      'SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    return res.json({ ok: true, files: rows.map(toSafeProjectFile) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/projects/:projectId/feedback-corrections', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM project_feedback_corrections WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
    return res.json({ ok: true, corrections: rows.map(toSafeFeedbackCorrection) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/projects/:projectId/feedback-corrections', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  const studentIdentifier = String(req.body?.studentIdentifier || '').trim();
  const note = String(req.body?.note || '').trim();

  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  if (!note) {
    return res.status(400).json({ ok: false, error: 'note is required' });
  }

  try {
    const pool = getPool();
    const correctionId = `CORR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await pool.query(
      `INSERT INTO project_feedback_corrections (id, project_id, student_identifier, note)
       VALUES (?, ?, ?, ?)`,
      [correctionId, projectId, studentIdentifier || null, note]
    );

    const [rows] = await pool.query(
      'SELECT * FROM project_feedback_corrections WHERE id = ? LIMIT 1',
      [correctionId]
    );

    return res.status(201).json({ ok: true, correction: toSafeFeedbackCorrection(rows[0]) });
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

    await syncUserIntoRoleTables(pool, updatedUser);

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
    if (updatedUser) {
      await syncUserIntoRoleTables(pool, updatedUser);
    }
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
    if (createdUser) {
      await syncUserIntoRoleTables(pool, createdUser);
    }
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

    const createdUser = await findUserByIdentifierOrEmail(pool, String(identifier).trim().toUpperCase());
    if (createdUser) {
      await syncUserIntoRoleTables(pool, createdUser);
    }

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

app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});

async function bootstrapData() {
  await ensureProjectsTable();
  await ensureProjectWorkspaceTables();
  await ensureStudentFacultyAssignmentColumn();
  await ensureDefaultAdmin();
  await ensureTempWorkspaceSeed();
}

bootstrapData().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`Failed during bootstrap: ${error.message}`);
});
