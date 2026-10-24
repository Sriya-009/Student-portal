process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-auth-state-tests';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, __test } = require('../index');

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
