const PUBLIC_API_PATHS = new Set([
  '/health',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/verify-token'
]);

function isAccountActive(user) {
  return user?.is_active === true || user?.is_active === 1 || String(user?.is_active) === '1';
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

function createAuthMiddleware({ verifyToken, loadIdentity }) {
  async function authenticateRequest(req, res, next) {
    if (PUBLIC_API_PATHS.has(req.path)) {
      return next();
    }

    const authorization = String(req.get('authorization') || '');
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!token) {
      return res.status(401).json({ ok: false, error: 'Authentication required.' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (_error) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
    }

    try {
      const currentUser = await loadIdentity(decoded.sub);
      const currentRole = String(currentUser?.role || '').trim().toLowerCase();
      if (!currentUser || !isAccountActive(currentUser)
        || currentRole !== String(decoded.role).toLowerCase()) {
        return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
      }
      if (!['student', 'faculty', 'admin'].includes(currentRole)) {
        return res.status(403).json({ ok: false, error: 'You are not authorized to perform this action.' });
      }

      req.auth = { ...decoded, sub: currentUser.identifier, role: currentRole };
      return next();
    } catch (_error) {
      return res.status(503).json({ ok: false, error: 'Authentication is temporarily unavailable.' });
    }
  }

  return { authenticateRequest, requireRoles, isSelfOrAdmin };
}

module.exports = {
  createAuthMiddleware,
  isAccountActive,
  requireRoles,
  isSelfOrAdmin
};
