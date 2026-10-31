const express = require('express');
const crypto = require('crypto');

function createAuthRouter(dependencies) {
  const {
    loginRateLimiter,
    sensitiveAuthRateLimiter,
    getPool,
    findUserByIdentifierOrEmail,
    isAccountActive,
    verifyPasswordAndMigrate,
    issueUniqueOtp,
    otpSessionTtlMs,
    deliverOtp,
    otpSessions,
    maskPhone,
    createAuthToken,
    toSafeUser,
    sendServerError,
    maxOtpAttempts,
    deliverPasswordReset,
    passwordResetTokens,
    validatePasswordStrength,
    isSelfOrAdmin,
    bcrypt,
    bcryptSaltRounds,
    withTransaction,
    syncUserIntoRoleTables,
    updateRoleTablePassword,
    takePasswordResetToken,
    generateIdentifierForRole,
    verifyAuthToken,
    loadAuthIdentity
  } = dependencies;
  const OTP_SESSION_TTL_MS = otpSessionTtlMs;
  const MAX_OTP_ATTEMPTS = maxOtpAttempts;
  const BCRYPT_SALT_ROUNDS = bcryptSaltRounds;
  const authIdentityProvider = loadAuthIdentity;

  async function updateAccountPassword(queryClient, user, passwordHash, mustResetPassword) {
    if (user?.accountSource === 'role_table') {
      return updateRoleTablePassword(queryClient, user, passwordHash, mustResetPassword);
    }

    const userId = Number(user?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new Error('Canonical users account is required for this password update.');
    }
    return queryClient.query(
      `UPDATE users
       SET password = ?, must_reset_password = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [passwordHash, mustResetPassword ? 1 : 0, userId]
    );
  }
  const router = express.Router();
router.post('/login', loginRateLimiter, async (req, res) => {
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
    if (!isAccountActive(user)) {
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

router.post('/verify-otp', sensitiveAuthRateLimiter, async (req, res) => {
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

  if (session.pendingOperation) {
    return res.status(400).json({ ok: false, error: 'OTP session expired. Please login again.' });
  }

  session.attempts += 1;
  if (String(session.otpCode) !== String(otpCode).trim()) {
    if (session.attempts >= MAX_OTP_ATTEMPTS) {
      otpSessions.delete(otpSessionId);
      return res.status(400).json({ ok: false, error: 'Too many invalid OTP attempts. Please login again.' });
    }
    return res.status(400).json({ ok: false, error: 'Invalid OTP code' });
  }

  // Claim this OTP synchronously before the account lookup yields control.
  // Concurrent verify/resend requests then cannot consume or replace it.
  session.pendingOperation = 'verify';
  try {
    const currentUser = await findUserByIdentifierOrEmail(getPool(), session.user.identifier);
    if (!currentUser || !isAccountActive(currentUser)
      || String(currentUser.role || '').toLowerCase() !== String(session.role || session.user.role || '').toLowerCase()) {
      otpSessions.delete(otpSessionId);
      return res.status(400).json({ ok: false, error: 'OTP session expired. Please login again.' });
    }
    if (Date.now() > session.expiresAt) {
      otpSessions.delete(otpSessionId);
      return res.status(400).json({ ok: false, error: 'OTP expired. Please login again.' });
    }

    otpSessions.delete(otpSessionId);
    const token = createAuthToken(currentUser);
    return res.json({ ok: true, token, user: toSafeUser(currentUser) });
  } catch (_error) {
    // A transient lookup failure must not burn a valid OTP. Release the lock
    // and retain the original expiry so the user can retry safely.
    if (otpSessions.get(otpSessionId) === session && session.pendingOperation === 'verify') {
      delete session.pendingOperation;
    }
    return res.status(503).json({ ok: false, error: 'Authentication is temporarily unavailable.' });
  }
});

router.post('/resend-otp', sensitiveAuthRateLimiter, async (req, res) => {
  const { otpSessionId } = req.body;

  if (!otpSessionId) {
    return res.status(400).json({ ok: false, error: 'otpSessionId is required' });
  }

  const session = otpSessions.get(otpSessionId);
  if (!session) {
    return res.status(400).json({ ok: false, error: 'OTP session expired. Please login again with credentials.' });
  }

  if (Date.now() > session.expiresAt) {
    otpSessions.delete(otpSessionId);
    return res.status(400).json({ ok: false, error: 'OTP session expired. Please login again with credentials.' });
  }

  if (session.pendingOperation) {
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

  session.pendingOperation = 'resend';
  let currentUser;
  try {
    currentUser = await findUserByIdentifierOrEmail(getPool(), session.user.identifier);
  } catch (_error) {
    if (otpSessions.get(otpSessionId) === session && session.pendingOperation === 'resend') {
      delete session.pendingOperation;
    }
    return res.status(503).json({ ok: false, error: 'Authentication is temporarily unavailable.' });
  }
  if (!currentUser || !isAccountActive(currentUser)
    || String(currentUser.role || '').toLowerCase() !== String(session.role || session.user.role || '').toLowerCase()) {
    otpSessions.delete(otpSessionId);
    return res.status(400).json({ ok: false, error: 'OTP session expired. Please login again with credentials.' });
  }
  session.user = currentUser;

  const newOtpCode = issueUniqueOtp(session.userKey, session.otpCode);
  const expiresAt = Date.now() + OTP_SESSION_TTL_MS;
  if (!await deliverOtp(session.user, newOtpCode, expiresAt)) {
    if (otpSessions.get(otpSessionId) === session && session.pendingOperation === 'resend') {
      delete session.pendingOperation;
    }
    return res.status(503).json({
      ok: false,
      error: 'Multi-factor authentication is temporarily unavailable.'
    });
  }
  session.otpCode = newOtpCode;
  session.expiresAt = expiresAt;
  session.resendCount += 1;
  session.lastResendTime = Date.now();
  delete session.pendingOperation;

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

router.post('/forgot-password', sensitiveAuthRateLimiter, async (req, res) => {
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
        accountSource: user.accountSource || 'users',
        userId: user.accountSource === 'role_table' ? null : user.id,
        identifier: user.identifier,
        email: user.email || null,
        role: user.role,
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

router.post('/reset-initial-password', async (req, res) => {
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
    const updatedUser = await withTransaction(pool, async (connection) => {
      await updateAccountPassword(connection, user, passwordHash, 0);
      const nextUser = await findUserByIdentifierOrEmail(connection, normalizedIdentifier);
      if (nextUser) await syncUserIntoRoleTables(connection, nextUser);
      return nextUser;
    });
    return res.json({ ok: true, user: toSafeUser(updatedUser) });
  } catch (error) {
    return sendServerError(res, error);
  }
});

router.post('/reset-password', sensitiveAuthRateLimiter, async (req, res) => {
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
    if (tokenRecord.accountSource === 'role_table') {
      await updateRoleTablePassword(pool, {
        accountSource: 'role_table',
        identifier: tokenRecord.identifier,
        email: tokenRecord.email,
        role: tokenRecord.role
      }, passwordHash, 0);
    } else {
      const userId = Number(tokenRecord.userId);
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new Error('Canonical users account is required for this password update.');
      }
      await pool.query(
        'UPDATE users SET password = ?, must_reset_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, userId]
      );
    }
    return res.json({ ok: true, message: 'Password reset successfully.' });
  } catch (error) {
    return sendServerError(res, error);
  }
});

router.post('/signup', async (req, res) => {
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

    const createdUser = await withTransaction(pool, async (connection) => {
      await connection.query(
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

      const user = await findUserByIdentifierOrEmail(connection, identifier);
      if (!user) throw new Error('Created account could not be loaded.');
      await syncUserIntoRoleTables(connection, user);
      return user;
    });
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

router.post('/verify-token', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ ok: false, error: 'Token is required.' });
  }

  let decoded;
  try {
    decoded = verifyAuthToken(String(token).trim());
  } catch (_error) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
  }

  try {
    const currentUser = await authIdentityProvider(decoded.sub);
    const currentRole = String(currentUser?.role || '').trim().toLowerCase();
    if (!currentUser || !isAccountActive(currentUser)
      || currentRole !== String(decoded.role).toLowerCase()) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
    }
    if (!['student', 'faculty', 'admin'].includes(currentRole)) {
      return res.status(403).json({ ok: false, error: 'You are not authorized to perform this action.' });
    }
    return res.json({ ok: true, decoded });
  } catch (_error) {
    return res.status(503).json({ ok: false, error: 'Authentication is temporarily unavailable.' });
  }
});

  return router;
}

module.exports = { createAuthRouter };
