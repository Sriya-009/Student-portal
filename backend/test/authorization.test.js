process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-authorization-tests';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../index');

function token(identifier, role) {
  return jwt.sign(
    { sub: identifier, role, email: `${identifier}@test.local`, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

test('rejects private user data without authentication', async () => {
  const response = await request(app).get('/api/users');
  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { ok: false, error: 'Authentication required.' });
});

test('rejects student access to administrator user listing', async () => {
  const response = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${token('STU001', 'student')}`);
  assert.equal(response.status, 403);
});

test('rejects faculty access to administrator assignment mutations', async () => {
  const response = await request(app)
    .post('/api/admin/assign-student-faculty')
    .set('Authorization', `Bearer ${token('FAC001', 'faculty')}`)
    .send({ studentIdentifier: 'STU001', facultyIdentifier: 'FAC002' });
  assert.equal(response.status, 403);
});

test('rejects public attempts to create privileged accounts', async () => {
  const response = await request(app)
    .post('/api/auth/signup')
    .send({
      name: 'Attempted Admin',
      email: 'attempted-admin@test.local',
      password: 'StrongPassword1!',
      role: 'admin'
    });
  assert.equal(response.status, 403);
});

test('rejects cross-user profile reads and updates', async () => {
  const authorization = `Bearer ${token('STU001', 'student')}`;
  const readResponse = await request(app)
    .get('/api/profile/STU002')
    .set('Authorization', authorization);
  const updateResponse = await request(app)
    .patch('/api/profile/STU002')
    .set('Authorization', authorization)
    .send({ name: 'Unauthorized change' });

  assert.equal(readResponse.status, 403);
  assert.equal(updateResponse.status, 403);
});

test('rejects student attempts to modify administrative profile fields', async () => {
  const response = await request(app)
    .patch('/api/profile/STU001')
    .set('Authorization', `Bearer ${token('STU001', 'student')}`)
    .send({ permissions: ['users.manage'] });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'No valid profile fields provided');
});

test('rejects unsigned profile-photo capability URLs', async () => {
  const response = await request(app).get('/uploads/profile-photos/example.png');
  assert.equal(response.status, 401);
});
