process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-upload-security-tests';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, __test } = require('../index');

__test.setAuthIdentityProvider(async (identifier) => (
  String(identifier).toLowerCase() === 'stu001'
    ? { identifier: 'STU001', role: 'student', is_active: 1 }
    : null
));

function authorization() {
  const token = jwt.sign(
    { sub: 'STU001', role: 'student', email: 'student@test.local', type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  return `Bearer ${token}`;
}

test('rejects profile-photo uploads without authentication', async () => {
  const response = await request(app)
    .post('/api/upload/profile-photo/STU001')
    .attach('profilePhoto', Buffer.from('not an image'), 'profile.png');

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { ok: false, error: 'Authentication required.' });
});

test('rejects image files with invalid contents', async () => {
  const response = await request(app)
    .post('/api/upload/profile-photo/STU001')
    .set('Authorization', authorization())
    .attach('profilePhoto', Buffer.from('not an image'), 'profile.png');

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'The uploaded file is not a valid image.');
});

test('rejects oversized profile-photo uploads', async () => {
  const oversizedFile = Buffer.alloc((5 * 1024 * 1024) + 1, 0);
  const response = await request(app)
    .post('/api/upload/profile-photo/STU001')
    .set('Authorization', authorization())
    .attach('profilePhoto', oversizedFile, 'profile.png');

  assert.equal(response.status, 413);
  assert.match(response.body.error, /File too large/i);
});
