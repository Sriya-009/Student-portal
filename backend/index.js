require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getPool, testConnection } = require('./db');
const { requestChatCompletion } = require('./chatService');

const app = express();
// Render places the app behind one reverse proxy; trust only that hop for client IPs.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const DEFAULT_ADMIN_IDENTIFIER = process.env.DEFAULT_ADMIN_IDENTIFIER || '';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || '';
const OTP_SESSION_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const otpSessions = new Map();
const lastIssuedOtpByUser = new Map();
const passwordResetTokens = new Map();
const PHOTO_URL_TTL_SECONDS = 5 * 60;
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

const sensitiveAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many chat requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// ========== FILE UPLOAD CONFIG ==========
const uploadsDir = path.join(__dirname, 'uploads', 'profile-photos');
const projectFilesDir = path.join(__dirname, 'uploads', 'project-files');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(projectFilesDir)) {
  fs.mkdirSync(projectFilesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`;
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

const projectFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, projectFilesDir),
    filename: (req, _file, cb) => cb(null, path.basename(String(req.params.fileId || '')))
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
});

function safeUnlink(filePath) {
  if (!filePath) {
    return;
  }
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to remove file ${path.basename(filePath)}:`, error.message);
  }
}

function hasValidImageSignature(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 12);
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isGif = header.subarray(0, 6).toString('ascii') === 'GIF87a'
    || header.subarray(0, 6).toString('ascii') === 'GIF89a';
  const isWebp = header.subarray(0, 4).toString('ascii') === 'RIFF'
    && header.subarray(8, 12).toString('ascii') === 'WEBP';
  return isJpeg || isPng || isGif || isWebp;
}

function createPhotoUrl(photoPath) {
  if (!JWT_SECRET) {
    return null;
  }
  const filename = path.basename(String(photoPath || ''));
  if (!filename) {
    return null;
  }
  const expires = Math.floor(Date.now() / 1000) + PHOTO_URL_TTL_SECONDS;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${filename}:${expires}`)
    .digest('hex');
  return `/uploads/profile-photos/${encodeURIComponent(filename)}?expires=${expires}&signature=${signature}`;
}

function isValidPhotoSignature(filename, expires, signature) {
  if (!JWT_SECRET) {
    return false;
  }
  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${filename}:${expiresAt}`)
    .digest('hex');
  return typeof signature === 'string'
    && signature.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

const allowedOrigins = String(process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin: allowedOrigins,
  credentials: false
}));
app.use(express.json());
app.use(apiRateLimiter);
app.get('/uploads/profile-photos/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!isValidPhotoSignature(filename, req.query.expires, req.query.signature)) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired photo URL.' });
  }
  return res.sendFile(path.join(uploadsDir, filename));
});
app.use('/api', authenticateRequest);

app.post('/api/chat', requireRoles('student', 'faculty', 'admin'), chatRateLimiter, async (req, res) => {
  const { message, history } = req.body || {};
  if (typeof message !== 'string' || !message.trim() || message.length > 2000) {
    return res.status(400).json({ ok: false, error: 'message must be a non-empty string under 2000 characters.' });
  }
  if (history !== undefined && !Array.isArray(history)) {
    return res.status(400).json({ ok: false, error: 'history must be an array.' });
  }
  if (JSON.stringify({ message, history }).length > 32000) {
    return res.status(413).json({ ok: false, error: 'Chat request is too large.' });
  }

  try {
    const response = await requestChatCompletion(message.trim(), history);
    return res.json({ ok: true, message: response });
  } catch (error) {
    if (error.code === 'INVALID_CHAT_HISTORY') {
      return res.status(400).json({ ok: false, error: 'history contains invalid messages.' });
    }
    if (error.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({ ok: false, error: 'The assistant is not configured yet.' });
    }
    if (error.code === 'AI_TIMEOUT') {
      return res.status(504).json({ ok: false, error: 'The assistant took too long to respond. Please try again.' });
    }
    if (error.code === 'AI_RATE_LIMITED') {
      return res.status(429).json({ ok: false, error: 'The assistant usage limit has been reached. Please try again later.' });
    }
    console.error('Chat provider request failed:', error.message);
    return res.status(502).json({ ok: false, error: 'The assistant is temporarily unavailable.' });
  }
});

function maskPhone(phoneNumber) {
  const digits = (phoneNumber || '').replace(/\D/g, '');
  if (!digits) {
    return '*** *** ****';
  }
  return `*** *** ${digits.slice(-4)}`;
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
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

  // Legacy plaintext credentials must not be accepted or retained.
  const unusableHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_SALT_ROUNDS);
  await pool.query(
    'UPDATE users SET password = ?, must_reset_password = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [unusableHash, user.id]
  );
  user.password = unusableHash;
  user.must_reset_password = 1;
  await syncUserIntoRoleTables(pool, user);
  return false;
}

async function deliverWebhookMessage({ url, apiKey, event, recipient, code, expiresAt }) {
  let providerUrl;
  try {
    providerUrl = new URL(String(url || ''));
  } catch (_error) {
    console.error(`Webhook delivery unavailable for ${event || 'unknown event'}: provider URL is missing or invalid.`);
    return false;
  }

  if (!['http:', 'https:'].includes(providerUrl.protocol)
    || !String(apiKey || '').trim()
    || !String(event || '').trim()
    || !String(recipient || '').trim()
    || !String(code || '').trim()
    || !Number.isFinite(Number(expiresAt))) {
    console.error(`Webhook delivery unavailable for ${event || 'unknown event'}: provider configuration is incomplete.`);
    return false;
  }

  try {
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ event, recipient, code, expiresAt }),
      signal: AbortSignal.timeout(10000)
    });
    return response.ok;
  } catch (error) {
    console.error(`Webhook delivery failed for ${event}:`, error.message);
    return false;
  }
}

async function deliverOtp(user, otpCode, expiresAt) {
  if (String(process.env.OTP_DELIVERY || '').toLowerCase() !== 'webhook') {
    return false;
  }
  return deliverWebhookMessage({
    url: process.env.OTP_PROVIDER_URL,
    apiKey: process.env.OTP_PROVIDER_API_KEY,
    event: 'student-portal.otp',
    recipient: user.phone || user.email,
    code: otpCode,
    expiresAt
  });
}

async function deliverPasswordReset(user, resetToken, expiresAt) {
  if (String(process.env.RESET_TOKEN_DELIVERY || '').toLowerCase() !== 'webhook') {
    return false;
  }
  return deliverWebhookMessage({
    url: process.env.RESET_PROVIDER_URL,
    apiKey: process.env.RESET_PROVIDER_API_KEY,
    event: 'student-portal.password-reset',
    recipient: user.email,
    code: resetToken,
    expiresAt
  });
}

function takePasswordResetToken(resetToken) {
  const normalizedToken = String(resetToken || '').trim();
  const tokenRecord = passwordResetTokens.get(normalizedToken);
  passwordResetTokens.delete(normalizedToken);
  if (!tokenRecord || Date.now() > tokenRecord.expiresAt) {
    return null;
  }
  return tokenRecord;
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

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ ok: false, error: 'An unexpected server error occurred.' });
}

function authenticateRequest(req, res, next) {
  const publicPaths = new Set([
    '/health',
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-otp',
    '/auth/resend-otp',
    '/auth/verify-token'
  ]);

  if (publicPaths.has(req.path)) {
    return next();
  }

  const authorization = String(req.get('authorization') || '');
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }

  try {
    const decoded = verifyAuthToken(token);
    req.auth = decoded;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(String(req.auth.role || '').toLowerCase())) {
      return res.status(403).json({ ok: false, error: 'You are not authorized to perform this action.' });
    }
    return next();
  };
}

function isSelfOrAdmin(req, identifier) {
  return String(req.auth?.role).toLowerCase() === 'admin'
    || String(req.auth?.sub || '').toLowerCase() === String(identifier || '').toLowerCase();
}

async function canAccessProject(pool, req, projectId) {
  if (String(req.auth?.role).toLowerCase() === 'admin') {
    return true;
  }

  const [rows] = await pool.query(
    `SELECT p.owner_identifier, s.assigned_faculty_identifier
     FROM projects p
     LEFT JOIN users s ON s.identifier = p.owner_identifier
     WHERE p.id = ? LIMIT 1`,
    [projectId]
  );
  const project = rows[0];
  if (!project) {
    return false;
  }

  const actor = String(req.auth?.sub || '').toLowerCase();
  return String(project.owner_identifier || '').toLowerCase() === actor
    || String(project.assigned_faculty_identifier || '').toLowerCase() === actor;
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
    photoUrl: createPhotoUrl(user.photo_url),
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

async function ensureRoleTables() {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student (
        registration_no VARCHAR(80) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NULL,
        course VARCHAR(120) NULL,
        semester VARCHAR(20) NULL,
        section VARCHAR(20) NULL,
        batch_year VARCHAR(10) NULL,
        date_of_birth DATE NULL,
        guardian_name VARCHAR(120) NULL,
        guardian_phone VARCHAR(30) NULL,
        address VARCHAR(255) NULL,
        profile_photo_url VARCHAR(255) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        must_reset_password TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculty (
        employee_id VARCHAR(80) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NULL,
        department VARCHAR(120) NULL,
        designation VARCHAR(120) NULL,
        specialization VARCHAR(120) NULL,
        qualification VARCHAR(160) NULL,
        office_location VARCHAR(120) NULL,
        office_hours VARCHAR(120) NULL,
        joining_date DATE NULL,
        bio TEXT NULL,
        profile_photo_url VARCHAR(255) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        must_reset_password TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        employee_id VARCHAR(80) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        access_level INT NOT NULL DEFAULT 1,
        permissions_json JSON NULL,
        two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
        emergency_contact VARCHAR(30) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        must_reset_password TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query('UPDATE student SET password = NULL');
    await pool.query('UPDATE faculty SET password = NULL');
    await pool.query('UPDATE admin SET password = NULL');
}

async function syncUserIntoRoleTables(pool, user) {
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const identifier = String(user?.identifier || '').trim();
  const email = String(user?.email || '').trim().toLowerCase();
  const name = String(user?.name || '').trim();

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
        null,
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
        null,
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
        null,
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

  if (!normalizedIdentifier || !DEFAULT_ADMIN_PASSWORD) {
    console.warn('Default admin provisioning skipped; set DEFAULT_ADMIN_IDENTIFIER and DEFAULT_ADMIN_PASSWORD explicitly.');
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
  if (process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }
  if (!process.env.DEMO_STUDENT_PASSWORD || !process.env.DEMO_FACULTY_PASSWORD) {
    console.warn('Demo workspace seed skipped; set DEMO_STUDENT_PASSWORD and DEMO_FACULTY_PASSWORD explicitly.');
    return;
  }
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
    password: process.env.DEMO_STUDENT_PASSWORD
  });

  const tempFaculty = await ensureUser({
    identifier: tempFacultyIdentifier,
    name: 'Temp Faculty',
    email: 'temp.faculty@portal.local',
    role: 'faculty',
    department: 'Computer Science',
    password: process.env.DEMO_FACULTY_PASSWORD
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
      error: 'Database connection failed.',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/', (_req, res) => {
  res.status(200).send('Student Portal API is running. Use /api/health for status.');
});

app.get('/api/users', requireRoles('admin'), async (_req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT ${USER_SELECT_FIELDS} FROM users ORDER BY id DESC LIMIT 100`
    );

    res.json({ ok: true, users: rows.map(toSafeUser) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const pool = getPool();
    let query = 'SELECT * FROM projects ORDER BY updated_at DESC, created_at DESC LIMIT 200';
    let params = [];
    if (String(req.auth.role).toLowerCase() === 'student') {
      query = 'SELECT * FROM projects WHERE owner_identifier = ? ORDER BY updated_at DESC, created_at DESC LIMIT 200';
      params = [req.auth.sub];
    } else if (String(req.auth.role).toLowerCase() === 'faculty') {
      query = `SELECT p.*
        FROM projects p
        INNER JOIN users s ON s.identifier = p.owner_identifier
        WHERE s.assigned_faculty_identifier = ?
        ORDER BY p.updated_at DESC, p.created_at DESC LIMIT 200`;
      params = [req.auth.sub];
    }
    const [rows] = await pool.query(query, params);

    return res.json({
      ok: true,
      projects: rows.map(toSafeProject)
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.post('/api/projects', requireRoles('student'), async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const ownerIdentifier = String(req.auth.sub || '').trim();
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
    return sendServerError(res, error);
  }
});

app.delete('/api/projects/:projectId', requireRoles('student', 'admin'), async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  const ownerIdentifier = String(req.auth.sub || '').trim();

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

    if (String(req.auth.role).toLowerCase() !== 'admin'
      && String(project.owner_identifier || '').toLowerCase() !== ownerIdentifier.toLowerCase()) {
      return res.status(403).json({ ok: false, error: 'You can only delete your own projects' });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);
    return res.json({ ok: true, deletedProjectId: projectId });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.get('/api/projects/:projectId/tasks', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  try {
    const pool = getPool();
    if (!await canAccessProject(pool, req, projectId)) {
      return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
    }
    const [rows] = await pool.query(
      'SELECT * FROM project_tasks WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    return res.json({ ok: true, tasks: rows.map(toSafeProjectTask) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.put('/api/projects/:projectId/tasks', requireRoles('faculty', 'admin'), async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : null;

  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  if (!tasks) {
    return res.status(400).json({ ok: false, error: 'tasks array is required' });
  }

  let connection;
  try {
    const pool = getPool();
    if (!await canAccessProject(pool, req, projectId)) {
      return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query('DELETE FROM project_tasks WHERE project_id = ?', [projectId]);

    for (const task of tasks) {
      const taskId = String(task?.id || `TSK-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim();
      const title = String(task?.title || '').trim();
      if (!title) {
        // eslint-disable-next-line no-continue
        continue;
      }

      await connection.query(
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

    const [rows] = await connection.query(
      'SELECT * FROM project_tasks WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    await connection.commit();
    connection.release();
    return res.json({ ok: true, tasks: rows.map(toSafeProjectTask) });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
      connection.release();
    }
    return sendServerError(res, error);
  }
});

app.get('/api/projects/:projectId/files', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  try {
    const pool = getPool();
    if (!await canAccessProject(pool, req, projectId)) {
      return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
    }
    const [rows] = await pool.query(
      'SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    return res.json({ ok: true, files: rows.map(toSafeProjectFile) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.post('/api/projects/:projectId/files/:fileId/content', requireRoles('student', 'faculty', 'admin'), projectFileUpload.single('file'), async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  const fileId = String(req.params.fileId || '').trim();
  if (!projectId || !fileId || !req.file) {
    if (req.file?.path) safeUnlink(req.file.path);
    return res.status(400).json({ ok: false, error: 'projectId, fileId, and file are required.' });
  }

  try {
    const pool = getPool();
    if (!await canAccessProject(pool, req, projectId)) {
      safeUnlink(req.file.path);
      return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
    }
    return res.json({ ok: true });
  } catch (error) {
    safeUnlink(req.file.path);
    return sendServerError(res, error);
  }
});

app.get('/api/projects/:projectId/files/:fileId/content', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  const fileId = String(req.params.fileId || '').trim();
  try {
    const pool = getPool();
    if (!await canAccessProject(pool, req, projectId)) {
      return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
    }
    const [rows] = await pool.query(
      'SELECT file_name, mime_type FROM project_files WHERE project_id = ? AND id = ? LIMIT 1',
      [projectId, fileId]
    );
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'File metadata was not found.' });
    }
    const filePath = path.join(projectFilesDir, fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'File content is not available.' });
    }
    await pool.query(
      'UPDATE project_files SET download_count = download_count + 1 WHERE project_id = ? AND id = ?',
      [projectId, fileId]
    );
    res.type(rows[0].mime_type || 'application/octet-stream');
    return res.download(filePath, path.basename(rows[0].file_name));
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.put('/api/projects/:projectId/files', requireRoles('student', 'faculty', 'admin'), async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  const files = Array.isArray(req.body?.files) ? req.body.files : null;

  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  if (!files) {
    return res.status(400).json({ ok: false, error: 'files array is required' });
  }

  let connection;
  try {
    const pool = getPool();
    if (!await canAccessProject(pool, req, projectId)) {
      return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query('DELETE FROM project_files WHERE project_id = ?', [projectId]);

    for (const file of files) {
      const fileId = String(file?.id || `FILE-${Date.now()}-${Math.floor(Math.random() * 1000)}`).trim();
      const fileName = String(file?.fileName || '').trim();
      if (!fileName) {
        // eslint-disable-next-line no-continue
        continue;
      }

      await connection.query(
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

    const [rows] = await connection.query(
      'SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at ASC',
      [projectId]
    );
    await connection.commit();
    connection.release();
    return res.json({ ok: true, files: rows.map(toSafeProjectFile) });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
      connection.release();
    }
    return sendServerError(res, error);
  }
});

app.get('/api/projects/:projectId/feedback-corrections', async (req, res) => {
  const projectId = String(req.params.projectId || '').trim();
  if (!projectId) {
    return res.status(400).json({ ok: false, error: 'projectId is required' });
  }

  try {
    const pool = getPool();
    if (!await canAccessProject(pool, req, projectId)) {
      return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
    }
    const [rows] = await pool.query(
      'SELECT * FROM project_feedback_corrections WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
    return res.json({ ok: true, corrections: rows.map(toSafeFeedbackCorrection) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.post('/api/projects/:projectId/feedback-corrections', requireRoles('faculty', 'admin'), async (req, res) => {
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
    if (!await canAccessProject(pool, req, projectId)) {
      return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
    }
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
    return sendServerError(res, error);
  }
});

app.post('/api/admin/assign-student-faculty', requireRoles('admin'), async (req, res) => {
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
    return sendServerError(res, error);
  }
});

app.get('/api/admin/student-faculty-assignments', requireRoles('admin'), async (_req, res) => {
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
    return sendServerError(res, error);
  }
});

app.get('/api/profile/:identifier', async (req, res) => {
  const normalizedIdentifier = String(req.params.identifier || '').trim();
  if (!normalizedIdentifier) {
    return res.status(400).json({ ok: false, error: 'identifier is required' });
  }
  if (!isSelfOrAdmin(req, normalizedIdentifier)) {
    return res.status(403).json({ ok: false, error: 'You can only view your own profile.' });
  }

  try {
    const pool = getPool();
    const user = await findUserByIdentifierOrEmail(pool, normalizedIdentifier);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User profile not found' });
    }

    return res.json({ ok: true, user: toSafeUser(user) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.patch('/api/profile/:identifier', async (req, res) => {
  const normalizedIdentifier = String(req.params.identifier || '').trim();
  if (!normalizedIdentifier) {
    return res.status(400).json({ ok: false, error: 'identifier is required' });
  }
  if (!isSelfOrAdmin(req, normalizedIdentifier)) {
    return res.status(403).json({ ok: false, error: 'You can only update your own profile.' });
  }

  const updates = [];
  const params = [];
  const adminOnlyFields = new Set([
    'accessLevel',
    'permissions',
    'isActive',
    'twoFactorEnabled',
    'emergencyContact'
  ]);

  Object.keys(req.body || {}).forEach((inputKey) => {
    const dbField = PROFILE_FIELD_MAP[inputKey];
    if (!dbField || (adminOnlyFields.has(inputKey) && String(req.auth.role).toLowerCase() !== 'admin')) {
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
    return sendServerError(res, error);
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
    if (!user.is_active) {
      return res.status(403).json({ ok: false, error: 'This account is inactive.' });
    }

    const isPasswordValid = await verifyPasswordAndMigrate(pool, user, password);
    if (!isPasswordValid) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    if (user.role === 'faculty' || user.role === 'admin') {
      const userKey = `${user.role}-${user.identifier}`;
      const otpCode = issueUniqueOtp(userKey);
      const otpSessionId = `otp-${user.identifier}-${Date.now()}`;
      const expiresAt = Date.now() + OTP_SESSION_TTL_MS;
      if (!await deliverOtp(user, otpCode, expiresAt)) {
        return res.status(503).json({
          ok: false,
          error: 'Multi-factor authentication is temporarily unavailable.'
        });
      }

      otpSessions.set(otpSessionId, {
        user,
        role: user.role,
        userKey,
        otpCode,
        expiresAt,
        attempts: 0,
        resendCount: 0,
        lastResendTime: 0
      });

      return res.json({
        ok: true,
        requiresOtp: true,
        otpSessionId,
        maskedPhone: maskPhone(user.phone),
        role: user.role,
        expiresAt
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
    return sendServerError(res, error);
  }
});

app.post('/api/auth/verify-otp', sensitiveAuthRateLimiter, (req, res) => {
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

  session.attempts += 1;
  if (String(session.otpCode) !== String(otpCode).trim()) {
    if (session.attempts >= MAX_OTP_ATTEMPTS) {
      otpSessions.delete(otpSessionId);
      return res.status(400).json({ ok: false, error: 'Too many invalid OTP attempts. Please login again.' });
    }
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

app.post('/api/auth/resend-otp', sensitiveAuthRateLimiter, async (req, res) => {
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
  const expiresAt = Date.now() + OTP_SESSION_TTL_MS;
  if (!await deliverOtp(session.user, newOtpCode, expiresAt)) {
    return res.status(503).json({
      ok: false,
      error: 'Multi-factor authentication is temporarily unavailable.'
    });
  }
  session.otpCode = newOtpCode;
  session.expiresAt = expiresAt;
  session.resendCount += 1;
  session.lastResendTime = Date.now();

  otpSessions.set(otpSessionId, session);

  return res.json({
    ok: true,
    otpSent: true,
    maskedPhone: maskPhone(session.user.phone),
    expiresAt: session.expiresAt,
    resendCount: session.resendCount,
    remainingAttempts: 3 - session.resendCount
  });
});

app.post('/api/auth/forgot-password', sensitiveAuthRateLimiter, async (req, res) => {
  const { identifier } = req.body;
  const normalizedIdentifier = String(identifier || '').trim();

  if (!normalizedIdentifier) {
    return res.status(400).json({ ok: false, error: 'Enter your identifier or email first.' });
  }

  try {
    const pool = getPool();
    const user = await findUserByIdentifierOrEmail(pool, normalizedIdentifier);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + (15 * 60 * 1000);
      if (!await deliverPasswordReset(user, resetToken, expiresAt)) {
        console.error('Password reset delivery is unavailable.');
        return res.json({
          ok: true,
          success: true,
          message: 'If the account exists, password reset instructions have been sent.'
        });
      }
      passwordResetTokens.set(resetToken, {
        userId: user.id,
        expiresAt
      });
      return res.json({
        ok: true,
        success: true,
        message: 'If the account exists, password reset instructions have been sent.'
      });
    }

    return res.json({
      ok: true,
      success: true,
      message: 'If the account exists, password reset instructions have been sent.'
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.post('/api/auth/reset-initial-password', async (req, res) => {
  const { identifier, newPassword } = req.body;
  const normalizedIdentifier = String(identifier || '').trim();

  if (!normalizedIdentifier || !newPassword) {
    return res.status(400).json({ ok: false, error: 'identifier and newPassword are required' });
  }

  const passwordErrors = validatePasswordStrength(String(newPassword));
  if (passwordErrors.length > 0) {
    return res.status(400).json({ ok: false, error: passwordErrors.join('. ') });
  }

  try {
    const pool = getPool();
    if (!isSelfOrAdmin(req, normalizedIdentifier)) {
      return res.status(403).json({ ok: false, error: 'You can only reset your own password.' });
    }
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
    return sendServerError(res, error);
  }
});

app.post('/api/auth/reset-password', sensitiveAuthRateLimiter, async (req, res) => {
  const { resetToken, newPassword } = req.body || {};
  const passwordErrors = validatePasswordStrength(String(newPassword || ''));
  if (!resetToken || passwordErrors.length > 0) {
    return res.status(400).json({
      ok: false,
      error: passwordErrors.length > 0 ? passwordErrors.join('. ') : 'resetToken and newPassword are required'
    });
  }

  const tokenRecord = takePasswordResetToken(resetToken);
  if (!tokenRecord) {
    return res.status(400).json({ ok: false, error: 'Reset token is invalid or expired.' });
  }

  try {
    const pool = getPool();
    const passwordHash = await bcrypt.hash(String(newPassword), BCRYPT_SALT_ROUNDS);
    await pool.query(
      'UPDATE users SET password = ?, must_reset_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, tokenRecord.userId]
    );
    return res.json({ ok: true, message: 'Password reset successfully.' });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role = 'student', department, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ ok: false, error: 'name, email and password are required' });
  }

  const normalizedRole = String(role).trim().toLowerCase();
  if (normalizedRole !== 'student') {
    return res.status(403).json({ ok: false, error: 'Public signup is limited to student accounts.' });
  }
  const passwordErrors = validatePasswordStrength(String(password));
  if (passwordErrors.length > 0) {
    return res.status(400).json({ ok: false, error: passwordErrors.join('. ') });
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
    return sendServerError(res, error);
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

app.post('/api/users', requireRoles('admin'), async (req, res) => {
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
    const passwordHash = await bcrypt.hash(String(password), BCRYPT_SALT_ROUNDS);
    await pool.query(
      `INSERT INTO users (identifier, name, email, role, department, phone, must_reset_password, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
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
    return sendServerError(res, error);
  }
});

// ========== DASHBOARD STATS ENDPOINTS ==========
app.get('/api/stats/dashboard', requireRoles('admin'), async (_req, res) => {
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
});

// ========== FILE UPLOAD ENDPOINTS ==========
app.post('/api/upload/profile-photo/:identifier', uploadMiddleware.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file provided' });
    }

    const { identifier } = req.params;
    if (!identifier) {
      safeUnlink(req.file.path);
      return res.status(400).json({ ok: false, error: 'Identifier is required' });
    }
    if (!isSelfOrAdmin(req, identifier)) {
      safeUnlink(req.file.path);
      return res.status(403).json({ ok: false, error: 'You can only upload your own profile photo.' });
    }
    if (!hasValidImageSignature(req.file.path)) {
      safeUnlink(req.file.path);
      return res.status(400).json({ ok: false, error: 'The uploaded file is not a valid image.' });
    }

    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT photo_url FROM users WHERE LOWER(identifier) = LOWER(?) LIMIT 1',
      [identifier]
    );
    if (!rows[0]) {
      safeUnlink(req.file.path);
      return res.status(404).json({ ok: false, error: 'User profile not found.' });
    }
    const previousPhotoPath = rows[0].photo_url;
    const photoUrl = `/uploads/profile-photos/${req.file.filename}`;

    // Update user with photo URL
    await pool.query(
      'UPDATE users SET photo_url = ?, updated_at = NOW() WHERE identifier = ?',
      [photoUrl, identifier]
    );
    if (previousPhotoPath && path.basename(previousPhotoPath) !== req.file.filename) {
      safeUnlink(path.join(uploadsDir, path.basename(previousPhotoPath)));
    }

    return res.json({
      ok: true,
      message: 'Profile photo uploaded successfully',
      photoUrl: createPhotoUrl(photoUrl)
    });
  } catch (error) {
    if (req.file && req.file.path) {
      safeUnlink(req.file.path);
    }
    return sendServerError(res, error);
  }
});

app.get('/api/profile-photo/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!isSelfOrAdmin(req, identifier)) {
      return res.status(403).json({ ok: false, error: 'You can only view your own profile photo.' });
    }
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
      photoUrl: createPhotoUrl(rows[0].photo_url)
    });
  } catch (error) {
    return sendServerError(res, error);
  }
});

app.delete('/api/profile-photo/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!isSelfOrAdmin(req, identifier)) {
      return res.status(403).json({ ok: false, error: 'You can only delete your own profile photo.' });
    }
    const pool = getPool();

    const [rows] = await pool.query(
      'SELECT photo_url FROM users WHERE identifier = ?',
      [identifier]
    );

    if (rows[0]?.photo_url) {
      safeUnlink(path.join(uploadsDir, path.basename(String(rows[0].photo_url))));
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
    return sendServerError(res, error);
  }
});

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError || String(error.message || '').startsWith('Invalid file type')) {
    return res.status(400).json({ ok: false, error: error.message || 'Invalid upload.' });
  }
  console.error(error);
  return next(error);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ ok: false, error: 'An unexpected server error occurred.' });
});

async function bootstrapData() {
  await ensureRoleTables();
  await ensureProjectsTable();
  await ensureProjectWorkspaceTables();
  await ensureStudentFacultyAssignmentColumn();
  await ensureDefaultAdmin();
  await ensureTempWorkspaceSeed();
}

if (require.main === module) {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters before starting the server.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  bootstrapData().catch((error) => {
    console.error(`Failed during bootstrap: ${error.message}`);
  });
}

module.exports = {
  app,
  authenticateRequest,
  requireRoles,
  isSelfOrAdmin,
  __test: {
    otpSessions,
    passwordResetTokens,
    takePasswordResetToken,
    deliverWebhookMessage,
    deliverOtp
  }
};
