require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool, testConnection } = require('./db');

const app = express();
const PORT = Number(process.env.SERVER_PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || process.env.REACT_APP_JWT_SECRET || 'portal-dev-secret-key';
const JWT_EXPIRES_IN = '1h';
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const otpSessions = new Map();
const lastIssuedOtpByUser = new Map();

app.use(cors());
app.use(express.json());

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
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
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
    `SELECT id, identifier, name, email, password, role, department, phone, created_at
     FROM users
     WHERE LOWER(identifier) = ? OR LOWER(email) = ?
     LIMIT 1`,
    [normalized, normalized]
  );
  return rows[0] || null;
}

function toSafeUser(user) {
  return {
    id: user.id,
    identifier: user.identifier,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || null,
    phone: user.phone || null,
    createdAt: user.created_at || null
  };
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
      'SELECT id, identifier, name, email, role, department, phone, created_at FROM users ORDER BY id DESC LIMIT 100'
    );

    res.json({ ok: true, users: rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
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
      `INSERT INTO users (identifier, name, email, role, department, phone, password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        identifier,
        String(name).trim(),
        String(email).trim().toLowerCase(),
        normalizedRole,
        String(department || '').trim() || null,
        String(phone || '').trim() || null,
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
      `INSERT INTO users (identifier, name, email, role, department, phone, password)
       VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [
        String(identifier).trim().toUpperCase(),
        String(name).trim(),
        String(email).trim().toLowerCase(),
        String(role).trim().toLowerCase(),
        String(department || '').trim() || null,
        String(phone || '').trim() || null,
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
        phone: String(phone || '').trim() || null
      }
    });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, error: 'User already exists with this identifier or email.' });
    }
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server running on http://localhost:${PORT}`);
});
