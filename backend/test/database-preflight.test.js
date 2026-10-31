const test = require('node:test');
const assert = require('node:assert/strict');
const { assertApprovedDatabaseTarget } = require('../config/databasePreflight');
const { getPool } = require('../db');
const { sendServerError } = require('../utils/httpResponse');

function approvedCloneEnv(overrides = {}) {
  return {
    DB_CLONE_VALIDATION: 'true',
    DB_NAME: 'student_management_clone_run_01',
    DB_HOST: '127.0.0.1',
    DB_PORT: '3307',
    DB_APPROVED_TEST_DATABASES: 'student_management_clone_run_01',
    DB_APPROVED_TEST_HOSTS: '127.0.0.1',
    DB_APPROVED_TEST_PORTS: '3307',
    DB_PASSWORD: 'test-only-secret-sentinel',
    ...overrides
  };
}

test('preflight accepts an explicitly approved test database and host', () => {
  assert.equal(assertApprovedDatabaseTarget(approvedCloneEnv()), true);
});

test('preflight always blocks the original student_management database', () => {
  const env = approvedCloneEnv({
    DB_NAME: 'student_management',
    DB_APPROVED_TEST_DATABASES: 'student_management'
  });
  assert.throws(() => assertApprovedDatabaseTarget(env), /clone-target preflight/i);
});

test('preflight blocks missing, wildcard, or mismatched database and host approvals', () => {
  const cases = [
    approvedCloneEnv({ DB_CLONE_VALIDATION: 'false' }),
    approvedCloneEnv({ DB_APPROVED_TEST_DATABASES: '' }),
    approvedCloneEnv({ DB_APPROVED_TEST_DATABASES: '*' }),
    approvedCloneEnv({ DB_APPROVED_TEST_DATABASES: 'some_other_clone' }),
    approvedCloneEnv({ DB_APPROVED_TEST_HOSTS: '' }),
    approvedCloneEnv({ DB_APPROVED_TEST_HOSTS: '*' }),
    approvedCloneEnv({ DB_APPROVED_TEST_HOSTS: 'other-host' }),
    approvedCloneEnv({ DB_APPROVED_TEST_PORTS: '' }),
    approvedCloneEnv({ DB_APPROVED_TEST_PORTS: '*' }),
    approvedCloneEnv({ DB_PORT: '3306' }),
    approvedCloneEnv({ DB_HOST: '' }),
    approvedCloneEnv({ DB_NAME: 'student_management_live' }),
    approvedCloneEnv({ DB_NAME: 'student_management_clone;DROP' })
  ];

  for (const env of cases) {
    assert.throws(() => assertApprovedDatabaseTarget(env), /clone-target preflight/i);
  }
});

test('preflight errors never include database credentials or configured target values', () => {
  const env = approvedCloneEnv({
    DB_NAME: 'secret_database_target',
    DB_HOST: 'secret-host.internal',
    DB_PASSWORD: 'test-only-secret-sentinel'
  });
  assert.throws(() => assertApprovedDatabaseTarget(env), (error) => {
    assert.equal(error.message.includes(env.DB_PASSWORD), false);
    assert.equal(error.message.includes(env.DB_NAME), false);
    assert.equal(error.message.includes(env.DB_HOST), false);
    return true;
  });
});

test('server error logging does not print database credential details', () => {
  const originalConsoleError = console.error;
  let logged = '';
  console.error = (...values) => { logged += values.join(' '); };
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };

  try {
    sendServerError(response, new Error('access denied using password test-only-secret-sentinel'));
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(logged.includes('test-only-secret-sentinel'), false);
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { ok: false, error: 'An unexpected server error occurred.' });
});

test('getPool refuses an unapproved target before creating a MySQL pool', () => {
  const names = [
    'DB_CLONE_VALIDATION', 'DB_NAME', 'DB_HOST', 'DB_PORT',
    'DB_APPROVED_TEST_DATABASES', 'DB_APPROVED_TEST_HOSTS', 'DB_APPROVED_TEST_PORTS', 'DB_PASSWORD'
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    DB_CLONE_VALIDATION: 'true',
    DB_NAME: 'student_management',
    DB_HOST: '127.0.0.1',
    DB_PORT: '3307',
    DB_APPROVED_TEST_DATABASES: 'student_management_clone_run_01',
    DB_APPROVED_TEST_HOSTS: '127.0.0.1',
    DB_APPROVED_TEST_PORTS: '3307',
    DB_PASSWORD: 'test-only-secret-sentinel'
  });

  try {
    assert.throws(() => getPool(), /clone-target preflight/i);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
