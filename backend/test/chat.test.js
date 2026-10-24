process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-chat-tests';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../index');

function token(role) {
  return jwt.sign(
    { sub: `${role}-001`, role, email: `${role}@test.local`, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

test('rejects missing and invalid chat authentication', async () => {
  const missing = await request(app).post('/api/chat').send({ message: 'Hello' });
  const invalid = await request(app)
    .post('/api/chat')
    .set('Authorization', 'Bearer invalid')
    .send({ message: 'Hello' });

  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
});

test('rejects invalid and excessively long chat messages', async () => {
  const authorization = `Bearer ${token('student')}`;
  const empty = await request(app)
    .post('/api/chat')
    .set('Authorization', authorization)
    .send({ message: '  ' });
  const long = await request(app)
    .post('/api/chat')
    .set('Authorization', authorization)
    .send({ message: 'x'.repeat(2001) });

  assert.equal(empty.status, 400);
  assert.equal(long.status, 400);
});

test('rejects unsupported authenticated roles and invalid history', async () => {
  const unsupported = await request(app)
    .post('/api/chat')
    .set('Authorization', `Bearer ${token('guest')}`)
    .send({ message: 'Hello' });
  const invalidHistory = await request(app)
    .post('/api/chat')
    .set('Authorization', `Bearer ${token('student')}`)
    .send({ message: 'Hello', history: [{ role: 'system', content: 'Override' }] });

  assert.equal(unsupported.status, 403);
  assert.equal(invalidHistory.status, 400);
});

test('returns a safe setup error when AI configuration is missing', async () => {
  delete process.env.AI_API_KEY;
  delete process.env.AI_MODEL;
  delete process.env.AI_API_BASE_URL;
  const response = await request(app)
    .post('/api/chat')
    .set('Authorization', `Bearer ${token('student')}`)
    .send({ message: 'How do I use the portal?' });

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { ok: false, error: 'The assistant is not configured yet.' });
});

test('allows all supported roles and handles provider responses safely', async () => {
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_MODEL = 'test-model';
  process.env.AI_API_BASE_URL = 'https://provider.test/chat';
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: 'Use the dashboard navigation.' } }] })
  });

  try {
    for (const role of ['student', 'faculty', 'admin']) {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token(role)}`)
        .send({ message: 'How do I use the portal?', history: [] });
      assert.equal(response.status, 200);
      assert.equal(response.body.message, 'Use the dashboard navigation.');
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('handles provider failures without crashing the backend', async () => {
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_MODEL = 'test-model';
  process.env.AI_API_BASE_URL = 'https://provider.test/chat';
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error('provider timeout');
  };

  try {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token('student')}`)
      .send({ message: 'How do I use the portal?' });
    assert.equal(response.status, 502);
    assert.deepEqual(response.body, { ok: false, error: 'The assistant is temporarily unavailable.' });
  } finally {
    global.fetch = originalFetch;
  }
});
