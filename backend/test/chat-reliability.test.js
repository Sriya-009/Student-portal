process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-chat-reliability';
process.env.AI_API_KEY = 'test-key';
process.env.AI_MODEL = 'gemini-3.8-flash';
process.env.AI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, __test } = require('../index');

const identities = new Map();
__test.setAuthIdentityProvider(async (identifier) => identities.get(String(identifier).toLowerCase()) || null);
let ipSequence = 1;

function bearerFor(role) {
  const identifier = `${role.toUpperCase()}-RELIABILITY`;
  identities.set(identifier.toLowerCase(), { identifier, role, is_active: 1 });
  return jwt.sign(
    { sub: identifier, role, email: `${identifier.toLowerCase()}@test.local`, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

function chatRequest(role = 'student', ip = `203.0.113.${ipSequence++}`) {
  return request(app)
    .post('/api/chat')
    .set('Authorization', `Bearer ${bearerFor(role)}`)
    .set('X-Forwarded-For', ip)
    .send({ message: 'How can I use the portal?' });
}

function successResponse(message = 'Portal guidance.') {
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: message } }] }) };
}

test('retries a transient network failure within the configured attempt limit', async () => {
  const originalFetch = global.fetch;
  const originalAttempts = process.env.AI_RETRY_ATTEMPTS;
  const originalDelay = process.env.AI_RETRY_DELAY_MS;
  process.env.AI_RETRY_ATTEMPTS = '1';
  process.env.AI_RETRY_DELAY_MS = '0';
  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    if (attempts === 1) throw new TypeError('temporary network failure');
    return successResponse('Recovered after a network failure.');
  };

  try {
    const response = await chatRequest();
    assert.equal(response.status, 200);
    assert.equal(response.body.message, 'Recovered after a network failure.');
    assert.equal(attempts, 2);
  } finally {
    global.fetch = originalFetch;
    if (originalAttempts === undefined) delete process.env.AI_RETRY_ATTEMPTS;
    else process.env.AI_RETRY_ATTEMPTS = originalAttempts;
    if (originalDelay === undefined) delete process.env.AI_RETRY_DELAY_MS;
    else process.env.AI_RETRY_DELAY_MS = originalDelay;
  }
});

test('returns a safe timeout response when a provider attempt exceeds its deadline', async () => {
  const originalFetch = global.fetch;
  const originalTimeout = process.env.AI_TIMEOUT_MS;
  const originalAttempts = process.env.AI_RETRY_ATTEMPTS;
  process.env.AI_TIMEOUT_MS = '5';
  process.env.AI_RETRY_ATTEMPTS = '0';
  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });

  try {
    const response = await chatRequest();
    assert.equal(response.status, 504);
    assert.deepEqual(response.body, {
      ok: false,
      error: 'The assistant took too long to respond. Please try again.'
    });

    global.fetch = async (_url, options) => ({
      ok: true,
      status: 200,
      json: () => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })
    });
    const bodyTimeout = await chatRequest();
    assert.equal(bodyTimeout.status, 504);
  } finally {
    global.fetch = originalFetch;
    if (originalTimeout === undefined) delete process.env.AI_TIMEOUT_MS;
    else process.env.AI_TIMEOUT_MS = originalTimeout;
    if (originalAttempts === undefined) delete process.env.AI_RETRY_ATTEMPTS;
    else process.env.AI_RETRY_ATTEMPTS = originalAttempts;
  }
});

test('maps malformed, empty and non-JSON provider replies to safe errors', async () => {
  const originalFetch = global.fetch;
  const originalAttempts = process.env.AI_RETRY_ATTEMPTS;
  process.env.AI_RETRY_ATTEMPTS = '0';
  global.fetch = async () => successResponse('');
  try {
    const empty = await chatRequest();
    assert.equal(empty.status, 502);
    assert.equal(empty.body.error, 'The assistant returned an invalid response. Please try again.');

    global.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('invalid json'); } });
    const malformed = await chatRequest();
    assert.equal(malformed.status, 502);
    assert.equal(malformed.body.error, 'The assistant returned an invalid response. Please try again.');
    assert.equal(JSON.stringify(malformed.body).includes('invalid json'), false);
  } finally {
    global.fetch = originalFetch;
    if (originalAttempts === undefined) delete process.env.AI_RETRY_ATTEMPTS;
    else process.env.AI_RETRY_ATTEMPTS = originalAttempts;
  }
});

test('keeps provider rate limits prompt and does not retry them', async () => {
  const originalFetch = global.fetch;
  const originalAttempts = process.env.AI_RETRY_ATTEMPTS;
  process.env.AI_RETRY_ATTEMPTS = '2';
  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    return { ok: false, status: 429, statusText: 'Too Many Requests', json: async () => ({}) };
  };

  try {
    const response = await chatRequest();
    assert.equal(response.status, 429);
    assert.equal(response.body.error, 'The assistant usage limit has been reached. Please try again later.');
    assert.equal(attempts, 1);
  } finally {
    global.fetch = originalFetch;
    if (originalAttempts === undefined) delete process.env.AI_RETRY_ATTEMPTS;
    else process.env.AI_RETRY_ATTEMPTS = originalAttempts;
  }
});

test('does not expose provider error details or API keys to chat clients', async () => {
  const originalFetch = global.fetch;
  const originalAttempts = process.env.AI_RETRY_ATTEMPTS;
  process.env.AI_RETRY_ATTEMPTS = '0';
  global.fetch = async () => ({
    ok: false,
    status: 500,
    statusText: 'Provider failure',
    json: async () => ({ error: { message: 'Bearer test-key internal provider trace' } })
  });

  try {
    const response = await chatRequest();
    assert.equal(response.status, 503);
    assert.equal(response.body.error, 'The assistant provider is temporarily unavailable.');
    assert.equal(JSON.stringify(response.body).includes('test-key'), false);
    assert.equal(JSON.stringify(response.body).includes('internal provider trace'), false);
  } finally {
    global.fetch = originalFetch;
    if (originalAttempts === undefined) delete process.env.AI_RETRY_ATTEMPTS;
    else process.env.AI_RETRY_ATTEMPTS = originalAttempts;
  }
});

test('retries provider request-timeout responses once when configured', async () => {
  const originalFetch = global.fetch;
  const originalAttempts = process.env.AI_RETRY_ATTEMPTS;
  const originalDelay = process.env.AI_RETRY_DELAY_MS;
  process.env.AI_RETRY_ATTEMPTS = '1';
  process.env.AI_RETRY_DELAY_MS = '0';
  let attempts = 0;
  global.fetch = async () => {
    attempts += 1;
    if (attempts === 1) return { ok: false, status: 408, statusText: 'Request Timeout', json: async () => ({}) };
    return successResponse();
  };

  try {
    const response = await chatRequest();
    assert.equal(response.status, 200);
    assert.equal(attempts, 2);
  } finally {
    global.fetch = originalFetch;
    if (originalAttempts === undefined) delete process.env.AI_RETRY_ATTEMPTS;
    else process.env.AI_RETRY_ATTEMPTS = originalAttempts;
    if (originalDelay === undefined) delete process.env.AI_RETRY_DELAY_MS;
    else process.env.AI_RETRY_DELAY_MS = originalDelay;
  }
});

test('allows authenticated Student, Faculty and Admin users to use the assistant', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => successResponse();
  try {
    for (const role of ['student', 'faculty', 'admin']) {
      const response = await chatRequest(role);
      assert.equal(response.status, 200, `${role} should be authorized`);
      assert.equal(response.body.message, 'Portal guidance.');
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('enforces the per-client chat rate limit before contacting the provider', async () => {
  const originalFetch = global.fetch;
  let providerCalls = 0;
  global.fetch = async () => {
    providerCalls += 1;
    return successResponse();
  };
  const ip = '198.51.100.24';
  try {
    const responses = await Promise.all(Array.from({ length: 21 }, () => chatRequest('student', ip)));
    assert.equal(responses.filter((response) => response.status === 200).length, 20);
    assert.equal(responses.filter((response) => response.status === 429).length, 1);
    assert.equal(providerCalls, 20);
  } finally {
    global.fetch = originalFetch;
  }
});
