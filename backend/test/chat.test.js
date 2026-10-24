process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-chat-tests';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../index');

function authorization(role) {
  const token = jwt.sign(
    { sub: `${role}-001`, role, email: `${role}@test.local`, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  return `Bearer ${token}`;
}

test('rejects missing, invalid, and unsupported chat authentication', async () => {
  const missing = await request(app).post('/api/chat').send({ message: 'Hello' });
  const invalid = await request(app).post('/api/chat').set('Authorization', 'Bearer invalid').send({ message: 'Hello' });
  const unsupported = await request(app).post('/api/chat').set('Authorization', authorization('guest')).send({ message: 'Hello' });

  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.equal(unsupported.status, 403);
});

test('rejects invalid and excessively long chat messages', async () => {
  const auth = authorization('student');
  const empty = await request(app).post('/api/chat').set('Authorization', auth).send({ message: '  ' });
  const long = await request(app).post('/api/chat').set('Authorization', auth).send({ message: 'x'.repeat(2001) });

  assert.equal(empty.status, 400);
  assert.equal(long.status, 400);
});

test('returns predefined answers for every supported role without an external request', async () => {
  for (const role of ['student', 'faculty', 'admin']) {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', authorization(role))
      .send({ message: 'How do I check my attendance?' });

    assert.equal(response.status, 200);
    assert.match(response.body.message, /not currently available/);
  }
});

test('returns the exact fallback for unsupported questions', async () => {
  const response = await request(app)
    .post('/api/chat')
    .set('Authorization', authorization('student'))
    .send({ message: 'What is the weather today?' });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Sorry, I can only answer questions about the available Student Portal topics. Please choose one of the suggested questions.');
});
