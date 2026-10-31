process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-chat-tests';
process.env.AI_API_KEY = 'test-key';
process.env.AI_MODEL = 'gemini-3.8-flash';
process.env.AI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, __test } = require('../index');

const testIdentities = new Map();
__test.setAuthIdentityProvider(async (identifier) => testIdentities.get(String(identifier).toLowerCase()) || null);

function authorization(role = 'student') {
  const identifier = `${role}-001`;
  testIdentities.set(identifier.toLowerCase(), { identifier, role, is_active: 1 });
  const token = jwt.sign(
    { sub: identifier, role, email: `${role}@test.local`, type: 'access' },
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
    assert.equal(requestBody.model, 'gemini-3.8-flash');
    assert.equal(requestBody.messages[0].role, 'system');
    assert.equal(requestBody.messages.at(-1).content, 'Can you explain that again?');
  } finally {
    global.fetch = originalFetch;
  }
});

test('classifies provider request, authentication, model, quota, and server errors safely', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => ({ ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ error: { message: 'Invalid model' } }) });
    const invalidModel = await request(app).post('/api/chat').set('Authorization', authorization()).send({ message: 'Hello' });
    assert.equal(invalidModel.status, 502);
    assert.equal(invalidModel.body.error, 'The assistant provider rejected the request as invalid.');

    global.fetch = async () => ({ ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({ error: { message: 'Invalid API key' } }) });
    const invalidKey = await request(app).post('/api/chat').set('Authorization', authorization()).send({ message: 'Hello' });
    assert.equal(invalidKey.status, 502);
    assert.equal(invalidKey.body.error, 'The assistant provider authentication is invalid.');

    global.fetch = async () => ({ ok: false, status: 403, statusText: 'Forbidden', json: async () => ({ error: { message: 'Project is not permitted' } }) });
    const forbidden = await request(app).post('/api/chat').set('Authorization', authorization()).send({ message: 'Hello' });
    assert.equal(forbidden.status, 502);
    assert.equal(forbidden.body.error, 'The assistant provider denied this request.');

    global.fetch = async () => ({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({ error: { message: 'Model not found' } }) });
    const invalidModelEndpoint = await request(app).post('/api/chat').set('Authorization', authorization()).send({ message: 'Hello' });
    assert.equal(invalidModelEndpoint.status, 502);
    assert.equal(invalidModelEndpoint.body.error, 'The assistant model or endpoint was not found.');

    global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const failure = await request(app).post('/api/chat').set('Authorization', authorization()).send({ message: 'Hello' });
    assert.equal(failure.status, 503);
    assert.equal(failure.body.error, 'The assistant provider is temporarily unavailable.');

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

test('retries transient provider failures with exponential backoff but not invalid requests', async () => {
  const originalFetch = global.fetch;
  const originalAttempts = process.env.AI_RETRY_ATTEMPTS;
  const originalDelay = process.env.AI_RETRY_DELAY_MS;
  process.env.AI_RETRY_ATTEMPTS = '2';
  process.env.AI_RETRY_DELAY_MS = '0';
  let attempts = 0;

  try {
    global.fetch = async () => {
      attempts += 1;
      if (attempts < 3) {
        return { ok: false, status: 503, json: async () => ({ error: { message: 'temporary failure' } }) };
      }
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Recovered.' } }] }) };
    };
    const recovered = await request(app)
      .post('/api/chat')
      .set('Authorization', authorization())
      .send({ message: 'Hello' });
    assert.equal(recovered.status, 200);
    assert.equal(attempts, 3);

    attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      return { ok: false, status: 400, json: async () => ({ error: { message: 'invalid request' } }) };
    };
    const rejected = await request(app)
      .post('/api/chat')
      .set('Authorization', authorization())
      .send({ message: 'Hello' });
    assert.equal(rejected.status, 502);
    assert.equal(attempts, 1);
  } finally {
    global.fetch = originalFetch;
    if (originalAttempts === undefined) delete process.env.AI_RETRY_ATTEMPTS;
    else process.env.AI_RETRY_ATTEMPTS = originalAttempts;
    if (originalDelay === undefined) delete process.env.AI_RETRY_DELAY_MS;
    else process.env.AI_RETRY_DELAY_MS = originalDelay;
  }
});
