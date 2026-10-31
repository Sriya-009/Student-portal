process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-auth-state-tests';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { app, __test } = require('../index');

function makeAccessToken({ sub = 'STU001', role = 'student', type = 'access', expiresIn = '5m', algorithm = 'HS256', noTimestamp = false } = {}) {
  return jwt.sign(
    { sub, role, type, ...(!noTimestamp ? {} : { iat: undefined }) },
    process.env.JWT_SECRET,
    { ...(expiresIn === null ? {} : { expiresIn }), algorithm, ...(noTimestamp ? { noTimestamp: true } : {}) }
  );
}

function staffUser() {
  return {
    id: 1,
    identifier: 'FAC001',
    name: 'Test Faculty',
    email: 'faculty@test.local',
    role: 'faculty',
    is_active: 1
  };
}

function otpSession(user = staffUser(), overrides = {}) {
  return {
    user,
    role: user.role,
    userKey: `${user.role}-${user.identifier}`,
    otpCode: '123456',
    expiresAt: Date.now() + 60000,
    attempts: 0,
    resendCount: 0,
    lastResendTime: 0,
    ...overrides
  };
}

function authLookupPool(user, queryHandler = null) {
  return {
    async query(sql, values = []) {
      if (String(sql).includes('FROM users') && String(sql).includes('WHERE LOWER(identifier)')) {
        if (queryHandler) return queryHandler(user, sql, values);
        return [user ? [{ ...user }] : [], []];
      }
      if (/FROM (?:admin|faculty|student)\b/i.test(String(sql))) return [[], []];
      throw new Error(`Unexpected auth lookup query: ${sql}`);
    }
  };
}

test('rejects expired OTP sessions', async () => {
  __test.otpSessions.set('expired-otp', {
    user: staffUser(),
    otpCode: '123456',
    expiresAt: Date.now() - 1,
    attempts: 0
  });

  const response = await request(app)
    .post('/api/auth/verify-otp')
    .send({ otpSessionId: 'expired-otp', otpCode: '123456' });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'OTP expired. Please login again.');
  assert.equal(__test.otpSessions.has('expired-otp'), false);
});

test('invalid OTP attempts expire the session after the limit', async () => {
  __test.otpSessions.set('attempt-limit-otp', {
    user: staffUser(),
    otpCode: '123456',
    expiresAt: Date.now() + 60000,
    attempts: 0
  });

  for (let attempt = 1; attempt < 5; attempt += 1) {
    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: 'attempt-limit-otp', otpCode: '000000' });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Invalid OTP code');
  }

  const finalResponse = await request(app)
    .post('/api/auth/verify-otp')
    .send({ otpSessionId: 'attempt-limit-otp', otpCode: '000000' });

  assert.equal(finalResponse.status, 400);
  assert.equal(finalResponse.body.error, 'Too many invalid OTP attempts. Please login again.');
  assert.equal(__test.otpSessions.has('attempt-limit-otp'), false);
});

test('OTP verification is single-use under concurrent requests and rejects later reuse', async () => {
  const user = staffUser();
  let releaseLookup;
  let lookupStarted;
  const lookupStartedPromise = new Promise((resolve) => { lookupStarted = resolve; });
  const lookupGate = new Promise((resolve) => { releaseLookup = resolve; });
  let lookupCount = 0;
  const pool = authLookupPool(user, async () => {
    lookupCount += 1;
    lookupStarted();
    await lookupGate;
    return [[{ ...user }], []];
  });
  const restorePool = __test.setDatabasePoolProvider(() => pool);
  __test.otpSessions.set('concurrent-otp', otpSession(user));

  try {
    const firstVerification = request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: 'concurrent-otp', otpCode: '123456' })
      .then((response) => response);
    await lookupStartedPromise;

    const concurrentVerification = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: 'concurrent-otp', otpCode: '123456' });
    assert.equal(concurrentVerification.status, 400);

    releaseLookup();
    const firstResponse = await firstVerification;
    assert.equal(firstResponse.status, 200);
    assert.ok(firstResponse.body.token);

    const reuse = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: 'concurrent-otp', otpCode: '123456' });
    assert.equal(reuse.status, 400);
    assert.equal(__test.otpSessions.has('concurrent-otp'), false);
    assert.equal(lookupCount, 1);
  } finally {
    releaseLookup();
    restorePool();
  }
});

test('releases an OTP verification claim after a database failure so the user can retry', async () => {
  const user = staffUser();
  let shouldFail = true;
  const pool = authLookupPool(user, async () => {
    if (shouldFail) {
      shouldFail = false;
      throw new Error('temporary account lookup failure');
    }
    return [[{ ...user }], []];
  });
  const restorePool = __test.setDatabasePoolProvider(() => pool);
  const session = otpSession(user);
  __test.otpSessions.set('recoverable-otp', session);

  try {
    const unavailable = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: 'recoverable-otp', otpCode: '123456' });
    assert.equal(unavailable.status, 503);
    assert.equal(__test.otpSessions.get('recoverable-otp'), session);
    assert.equal(session.pendingOperation, undefined);

    const retry = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: 'recoverable-otp', otpCode: '123456' });
    assert.equal(retry.status, 200);
    assert.ok(retry.body.token);
    assert.equal(__test.otpSessions.has('recoverable-otp'), false);
  } finally {
    restorePool();
  }
});

test('rejects disabled accounts during OTP verification and resend', async () => {
  const disabledUser = { ...staffUser(), is_active: 0 };
  const restorePool = __test.setDatabasePoolProvider(() => authLookupPool(disabledUser));
  __test.otpSessions.set('disabled-verify-otp', otpSession(disabledUser));
  __test.otpSessions.set('disabled-resend-otp', otpSession(disabledUser));

  try {
    const verification = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: 'disabled-verify-otp', otpCode: '123456' });
    const resend = await request(app)
      .post('/api/auth/resend-otp')
      .send({ otpSessionId: 'disabled-resend-otp' });

    assert.equal(verification.status, 400);
    assert.equal(resend.status, 400);
    assert.equal(__test.otpSessions.has('disabled-verify-otp'), false);
    assert.equal(__test.otpSessions.has('disabled-resend-otp'), false);
  } finally {
    restorePool();
  }
});

test('successfully resends an OTP and verifies the replacement code', async () => {
  const originalFetch = global.fetch;
  const originalDelivery = process.env.OTP_DELIVERY;
  const originalUrl = process.env.OTP_PROVIDER_URL;
  const originalKey = process.env.OTP_PROVIDER_API_KEY;
  const user = staffUser();
  const restorePool = __test.setDatabasePoolProvider(() => authLookupPool(user));
  const session = otpSession(user);
  __test.otpSessions.set('resend-otp', session);
  process.env.OTP_DELIVERY = 'webhook';
  process.env.OTP_PROVIDER_URL = 'https://otp-provider.test/send';
  process.env.OTP_PROVIDER_API_KEY = 'test-provider-key';
  let deliveredCode;
  global.fetch = async (_url, options) => {
    deliveredCode = JSON.parse(options.body).code;
    return { ok: true };
  };

  try {
    const resend = await request(app)
      .post('/api/auth/resend-otp')
      .send({ otpSessionId: 'resend-otp' });
    assert.equal(resend.status, 200);
    assert.equal(resend.body.otpSent, true);
    assert.equal(resend.body.resendCount, 1);
    assert.equal(resend.body.remainingAttempts, 2);
    assert.ok(deliveredCode);
    assert.notEqual(deliveredCode, '123456');
    assert.equal(session.otpCode, deliveredCode);
    assert.equal(session.pendingOperation, undefined);

    const verification = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: 'resend-otp', otpCode: deliveredCode });
    assert.equal(verification.status, 200);
    assert.ok(verification.body.token);
  } finally {
    global.fetch = originalFetch;
    process.env.OTP_DELIVERY = originalDelivery;
    process.env.OTP_PROVIDER_URL = originalUrl;
    process.env.OTP_PROVIDER_API_KEY = originalKey;
    restorePool();
  }
});

test('password-reset tokens are single-use even before database work', () => {
  __test.passwordResetTokens.set('single-use-token', {
    userId: 1,
    expiresAt: Date.now() + 60000
  });

  const tokenRecord = __test.takePasswordResetToken('single-use-token');
  assert.equal(tokenRecord.userId, 1);
  assert.equal(typeof tokenRecord.expiresAt, 'number');
  assert.equal(__test.takePasswordResetToken('single-use-token'), null);
});

test('rejects invalid webhook configuration without making a request', async () => {
  const result = await __test.deliverWebhookMessage({
    url: 'file:///not-a-webhook',
    apiKey: 'placeholder',
    event: 'test',
    recipient: 'test@example.com',
    code: '123456',
    expiresAt: Date.now() + 60000
  });

  assert.equal(result, false);
});

test('delivers faculty OTP through the configured provider without exposing the OTP', async () => {
  const originalFetch = global.fetch;
  const originalDelivery = process.env.OTP_DELIVERY;
  const originalUrl = process.env.OTP_PROVIDER_URL;
  const originalKey = process.env.OTP_PROVIDER_API_KEY;
  let requestBody;

  process.env.OTP_DELIVERY = 'webhook';
  process.env.OTP_PROVIDER_URL = 'https://otp-provider.test/send';
  process.env.OTP_PROVIDER_API_KEY = 'test-provider-key';
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true };
  };

  try {
    const result = await __test.deliverOtp(
      { role: 'faculty', identifier: 'FAC001', email: 'faculty@test.local' },
      '123456',
      Date.now() + 300000
    );
    assert.equal(result, true);
    assert.equal(requestBody.event, 'student-portal.otp');
    assert.equal(requestBody.recipient, 'faculty@test.local');
    assert.equal(requestBody.code, '123456');
  } finally {
    global.fetch = originalFetch;
    process.env.OTP_DELIVERY = originalDelivery;
    process.env.OTP_PROVIDER_URL = originalUrl;
    process.env.OTP_PROVIDER_API_KEY = originalKey;
  }
});

test('reports unavailable MFA delivery when the provider is not configured or fails', async () => {
  const originalFetch = global.fetch;
  const originalDelivery = process.env.OTP_DELIVERY;
  const originalUrl = process.env.OTP_PROVIDER_URL;
  const originalKey = process.env.OTP_PROVIDER_API_KEY;
  delete process.env.OTP_DELIVERY;
  delete process.env.OTP_PROVIDER_URL;
  delete process.env.OTP_PROVIDER_API_KEY;

  try {
    assert.equal(await __test.deliverOtp({ email: 'faculty@test.local' }, '123456', Date.now() + 300000), false);
    process.env.OTP_DELIVERY = 'webhook';
    process.env.OTP_PROVIDER_URL = 'https://otp-provider.test/send';
    process.env.OTP_PROVIDER_API_KEY = 'test-provider-key';
    global.fetch = async () => {
      throw new Error('provider unavailable');
    };
    assert.equal(await __test.deliverOtp({ email: 'faculty@test.local' }, '123456', Date.now() + 300000), false);
  } finally {
    global.fetch = originalFetch;
    process.env.OTP_DELIVERY = originalDelivery;
    process.env.OTP_PROVIDER_URL = originalUrl;
    process.env.OTP_PROVIDER_API_KEY = originalKey;
  }
});

test('requires authentication for protected routes with missing and invalid tokens', async () => {
  const missing = await request(app).get('/api/users');
  const invalid = await request(app)
    .get('/api/users')
    .set('Authorization', 'Bearer invalid-token');
  const expiredToken = jwt.sign(
    { sub: 'STU001', role: 'student', type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: -1 }
  );
  const expired = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${expiredToken}`);

  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.equal(expired.status, 401);
});

test('rejects malformed, wrong-algorithm, missing-expiration, and wrong-type access tokens safely', async () => {
  const wrongAlgorithm = makeAccessToken({ algorithm: 'HS512' });
  const missingExpiration = makeAccessToken({ expiresIn: null });
  const wrongType = makeAccessToken({ type: 'reset' });
  const responses = await Promise.all([
    request(app).post('/api/chat').set('Authorization', 'Bearer not.a.jwt').send({ message: 'hello' }),
    request(app).post('/api/chat').set('Authorization', `Bearer ${wrongAlgorithm}`).send({ message: 'hello' }),
    request(app).post('/api/chat').set('Authorization', `Bearer ${missingExpiration}`).send({ message: 'hello' }),
    request(app).post('/api/chat').set('Authorization', `Bearer ${wrongType}`).send({ message: 'hello' }),
    request(app).post('/api/auth/verify-token').send({ token: wrongType })
  ]);

  for (const response of responses) {
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { ok: false, error: 'Invalid or expired token.' });
  }
});

test('rejects a JWT whose signed role claim was changed without recomputing its signature', async () => {
  const validToken = makeAccessToken({ sub: 'STU001', role: 'student' });
  const [header, payload, signature] = validToken.split('.');
  const tamperedClaims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  tamperedClaims.role = 'admin';
  const tamperedToken = [
    header,
    Buffer.from(JSON.stringify(tamperedClaims)).toString('base64url'),
    signature
  ].join('.');

  const response = await request(app)
    .post('/api/chat')
    .set('Authorization', `Bearer ${tamperedToken}`)
    .send({ message: 'hello' });

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { ok: false, error: 'Invalid or expired token.' });
});

test('returns a generic service error when current-account validation fails', async () => {
  const restoreIdentityProvider = __test.setAuthIdentityProvider(async () => {
    throw new Error('database secret connection string');
  });
  try {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${makeAccessToken()}`)
      .send({ message: 'hello' });
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { ok: false, error: 'Authentication is temporarily unavailable.' });
    assert.equal(JSON.stringify(response.body).includes('secret'), false);
  } finally {
    restoreIdentityProvider();
  }
});

test('enforces current account activity and role and denies unauthorized roles', async () => {
  let identity = { identifier: 'STU001', role: 'student', is_active: 1 };
  const restoreIdentityProvider = __test.setAuthIdentityProvider(async () => identity);
  try {
    const studentToken = makeAccessToken();
    const unauthorizedRole = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(unauthorizedRole.status, 403);

    identity = { ...identity, is_active: '0' };
    const disabled = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'hello' });
    assert.equal(disabled.status, 401);
    assert.deepEqual(disabled.body, { ok: false, error: 'Invalid or expired token.' });

    identity = { ...identity, role: 'admin', is_active: 1 };
    const staleRole = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'hello' });
    assert.equal(staleRole.status, 401);
    assert.deepEqual(staleRole.body, { ok: false, error: 'Invalid or expired token.' });
  } finally {
    restoreIdentityProvider();
  }
});

test('preserves student login and faculty OTP verification with current-account checks', async () => {
  const originalFetch = global.fetch;
  const originalDelivery = process.env.OTP_DELIVERY;
  const originalUrl = process.env.OTP_PROVIDER_URL;
  const originalKey = process.env.OTP_PROVIDER_API_KEY;
  const passwords = new Map([
    ['STU001', 'StudentPassword1!'],
    ['FAC001', 'FacultyPassword1!']
  ]);
  const users = new Map();
  for (const [identifier, password] of passwords) {
    const role = identifier.startsWith('FAC') ? 'faculty' : 'student';
    users.set(identifier.toLowerCase(), {
      id: identifier === 'STU001' ? 1 : 2,
      identifier,
      name: `${role} test user`,
      email: `${identifier.toLowerCase()}@test.local`,
      role,
      password: await bcrypt.hash(password, 4),
      is_active: 1,
      two_factor_enabled: role === 'faculty' ? 1 : 0
    });
  }
  const fakePool = {
    async query(sql, values = []) {
      if (String(sql).includes('FROM users') && String(sql).includes('WHERE LOWER(identifier)')) {
        const search = String(values[0] || values[1] || '').toLowerCase();
        const user = [...users.values()].find((record) => record.identifier.toLowerCase() === search || record.email.toLowerCase() === search);
        return [user ? [{ ...user }] : [], []];
      }
      throw new Error(`Unexpected auth test query: ${sql}`);
    }
  };
  const restorePool = __test.setDatabasePoolProvider(() => fakePool);
  process.env.OTP_DELIVERY = 'webhook';
  process.env.OTP_PROVIDER_URL = 'https://otp-provider.test/send';
  process.env.OTP_PROVIDER_API_KEY = 'test-provider-key';
  let deliveredOtp;
  global.fetch = async (_url, options) => {
    deliveredOtp = JSON.parse(options.body).code;
    return { ok: true };
  };

  try {
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'STU001', password: passwords.get('STU001') });
    assert.equal(studentLogin.status, 200);
    assert.equal(studentLogin.body.requiresOtp, false);
    assert.ok(studentLogin.body.token);
    const studentProtectedRequest = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${studentLogin.body.token}`)
      .send({ message: ' ' });
    assert.equal(studentProtectedRequest.status, 400);

    const facultyLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'FAC001', password: passwords.get('FAC001') });
    assert.equal(facultyLogin.status, 200);
    assert.equal(facultyLogin.body.requiresOtp, true);
    assert.ok(deliveredOtp);

    const otpVerification = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: facultyLogin.body.otpSessionId, otpCode: deliveredOtp });
    assert.equal(otpVerification.status, 200);
    assert.ok(otpVerification.body.token);
    assert.equal(otpVerification.body.user.role, 'faculty');

    const verifiedToken = await request(app)
      .post('/api/auth/verify-token')
      .send({ token: otpVerification.body.token });
    assert.equal(verifiedToken.status, 200);
    assert.equal(verifiedToken.body.decoded.type, 'access');

    const inactiveStudent = users.get('stu001');
    users.set('stu001', { ...inactiveStudent, is_active: 0 });
    const inactiveLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'STU001', password: passwords.get('STU001') });
    assert.equal(inactiveLogin.status, 403);
    users.set('stu001', inactiveStudent);

    const staleOtpLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'FAC001', password: passwords.get('FAC001') });
    assert.equal(staleOtpLogin.status, 200);
    const facultyRecord = users.get('fac001');
    users.set('fac001', { ...facultyRecord, role: 'student' });
    const staleOtpVerification = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: staleOtpLogin.body.otpSessionId, otpCode: deliveredOtp });
    assert.equal(staleOtpVerification.status, 400);
    assert.equal(__test.otpSessions.has(staleOtpLogin.body.otpSessionId), false);
  } finally {
    global.fetch = originalFetch;
    process.env.OTP_DELIVERY = originalDelivery;
    process.env.OTP_PROVIDER_URL = originalUrl;
    process.env.OTP_PROVIDER_API_KEY = originalKey;
    restorePool();
  }
});

test('preserves successful student registration and its issued access token', async () => {
  let registeredUser = null;
  const pool = {
    async query(sql, values = []) {
      const statement = String(sql).replace(/\s+/g, ' ').trim();
      if (statement.startsWith('SELECT identifier FROM users') && statement.includes('LIKE ?')) {
        return [[], []];
      }
      if (statement.startsWith('INSERT INTO users')) {
        const [identifier, name, email, role, department, phone, mustResetPassword, password] = values;
        registeredUser = {
          id: 44,
          identifier,
          name,
          email,
          role,
          department,
          phone,
          must_reset_password: mustResetPassword,
          password,
          is_active: 1
        };
        return [{ insertId: 44 }, []];
      }
      if (statement.startsWith('SELECT identifier, role, is_active FROM users')) {
        return [registeredUser ? [{
          identifier: registeredUser.identifier,
          role: registeredUser.role,
          is_active: registeredUser.is_active
        }] : [], []];
      }
      if (statement.includes('FROM users') && statement.includes('WHERE LOWER(identifier) = ? OR LOWER(email) = ?')) {
        return [registeredUser ? [{ ...registeredUser }] : [], []];
      }
      if (statement.startsWith('INSERT INTO student')) {
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Unexpected registration test query: ${statement}`);
    },
    async getConnection() {
      return {
        query: (...args) => pool.query(...args),
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {}
      };
    }
  };
  const restorePool = __test.setDatabasePoolProvider(() => pool);

  try {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Registered Student',
        email: 'registered.student@test.local',
        password: 'StrongPassword1!',
        role: 'student'
      });
    assert.equal(response.status, 201);
    assert.equal(response.body.user.identifier, 'STU001');
    assert.equal(response.body.user.role, 'student');
    assert.ok(response.body.token);
    assert.equal(Object.hasOwn(response.body.user, 'password'), false);

    const verifiedToken = await request(app)
      .post('/api/auth/verify-token')
      .send({ token: response.body.token });
    assert.equal(verifiedToken.status, 200);
    assert.equal(verifiedToken.body.decoded.sub, 'STU001');
  } finally {
    restorePool();
  }
});

test('failed login with an unsupported legacy password never overwrites the stored credential', async () => {
  const user = {
    id: 734,
    identifier: 'STU-LEGACY-734',
    name: 'Legacy Student',
    email: 'legacy734@test.local',
    role: 'student',
    is_active: 1,
    password: 'legacy-non-bcrypt-value'
  };
  const statements = [];
  let connectionsRequested = 0;
  const pool = {
    async query(sql, values = []) {
      statements.push({ sql: String(sql), values });
      if (/\bFROM users\b/i.test(String(sql))) return [[{ ...user }], []];
      if (/\bFROM (?:admin|faculty|student)\b/i.test(String(sql))) return [[], []];
      throw new Error(`Unexpected query in legacy-credential regression: ${sql}`);
    },
    async getConnection() {
      connectionsRequested += 1;
      return {
        async beginTransaction() {},
        async query(sql, values = []) {
          statements.push({ sql: String(sql), values });
          return [{ affectedRows: 1 }, []];
        },
        async commit() {},
        async rollback() {},
        release() {}
      };
    }
  };
  const restorePool = __test.setDatabasePoolProvider(() => pool);

  try {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: user.identifier, password: 'attacker-controlled-value' });

    assert.equal(response.status, 401);
    assert.equal(user.password, 'legacy-non-bcrypt-value');
    assert.equal(connectionsRequested, 0);
    assert.equal(statements.some(({ sql }) => /^\s*UPDATE\s+users\b/i.test(sql)), false);
  } finally {
    restorePool();
  }
});

test('rolls back account creation when the role-table mirror write fails', async () => {
  let userInserted = false;
  let rolledBack = false;
  const user = {
    id: 45,
    identifier: 'STU001',
    name: 'Registration Failure',
    email: 'registration.failure@test.local',
    role: 'student',
    is_active: 1
  };
  const runQuery = async (sql) => {
    const statement = String(sql).replace(/\s+/g, ' ').trim();
    if (statement.startsWith('SELECT identifier FROM users') && statement.includes('LIKE ?')) return [[], []];
    if (statement.startsWith('INSERT INTO users')) { userInserted = true; return [{ insertId: 45 }, []]; }
    if (statement.includes('FROM users') && statement.includes('WHERE LOWER(identifier) = ? OR LOWER(email) = ?')) {
      return [userInserted ? [user] : [], []];
    }
    if (/FROM (?:admin|faculty|student)\b/i.test(statement) && statement.startsWith('SELECT')) return [[], []];
    if (statement.startsWith('INSERT INTO student')) throw new Error('simulated role-table failure');
    throw new Error(`Unexpected transaction test query: ${statement}`);
  };
  const pool = {
    query: runQuery,
    async getConnection() {
      return {
        query: runQuery,
        async beginTransaction() {},
        async commit() {},
        async rollback() { rolledBack = true; userInserted = false; },
        release() {}
      };
    }
  };
  const restorePool = __test.setDatabasePoolProvider(() => pool);

  try {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({ name: user.name, email: user.email, password: 'StrongPassword1!', role: 'student' });

    assert.equal(response.status, 500);
    assert.equal(response.body.error, 'An unexpected server error occurred.');
    assert.equal(rolledBack, true);
    assert.equal(userInserted, false);
  } finally {
    restorePool();
  }
});
