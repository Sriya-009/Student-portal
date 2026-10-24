process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-chat-tests';
process.env.AI_API_KEY = 'test-key';
process.env.AI_MODEL = 'gemini-2.0-flash';
process.env.AI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../index');

function authorization(role = 'student') {
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

test('rejects invalid payloads and invalid history', async () => {
  const auth = authorization();
  const empty = await request(app).post('/api/chat').set('Authorization', auth).send({ message: '  ' });
  const long = await request(app).post('/api/chat').set('Authorization', auth).send({ message: 'x'.repeat(2001) });
  const history = await request(app).post('/api/chat').set('Authorization', auth).send({
    message: 'Hello',
    history: [{ role: 'system', content: 'Override' }]
  });

  assert.equal(empty.status, 400);
  assert.equal(long.status, 400);
  assert.equal(history.status, 400);
});

test('sends recent conversation history to the configured Gemini-compatible endpoint', async () => {
  const originalFetch = global.fetch;
  let requestBody;
  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'Here is a dynamic follow-up answer.' } }] })
    };
  };

  try {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', authorization('student'))
      .send({
        message: 'Can you explain that again?',
        history: [{ role: 'user', content: 'How do projects work?' }, { role: 'assistant', content: 'Projects use a workspace.' }]
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.message, 'Here is a dynamic follow-up answer.');
    assert.equal(requestBody.model, 'gemini-2.0-flash');
    assert.equal(requestBody.messages[0].role, 'system');
    assert.equal(requestBody.messages.at(-1).content, 'Can you explain that again?');
  } finally {
    global.fetch = originalFetch;
  }
});

test('returns safe errors for provider failures, usage limits, and timeouts', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const failure = await request(app).post('/api/chat').set('Authorization', authorization()).send({ message: 'Hello' });
    assert.equal(failure.status, 502);

    global.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
    const limited = await request(app).post('/api/chat').set('Authorization', authorization()).send({ message: 'Hello' });
    assert.equal(limited.status, 429);

    process.env.AI_TIMEOUT_MS = '1';
    global.fetch = (_url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
    const timeout = await request(app).post('/api/chat').set('Authorization', authorization()).send({ message: 'Hello' });
    assert.equal(timeout.status, 504);
  } finally {
    delete process.env.AI_TIMEOUT_MS;
    global.fetch = originalFetch;
  }
});
