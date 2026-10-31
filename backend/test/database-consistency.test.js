process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-database-consistency';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { getConfig, withTransaction } = require('../db');
const { app, __test } = require('../index');

function transactionPool({ commitError = null } = {}) {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() {
      calls.push('commit');
      if (commitError) throw commitError;
    },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); }
  };
  return { calls, pool: { async getConnection() { calls.push('acquire'); return connection; } } };
}

test('uses bounded database connection settings and falls back from invalid values', () => {
  const original = {
    limit: process.env.DB_CONNECTION_LIMIT,
    queue: process.env.DB_QUEUE_LIMIT,
    timeout: process.env.DB_CONNECT_TIMEOUT_MS
  };
  process.env.DB_CONNECTION_LIMIT = 'not-a-number';
  process.env.DB_QUEUE_LIMIT = '0';
  process.env.DB_CONNECT_TIMEOUT_MS = '2500';

  try {
    const config = getConfig();
    assert.equal(config.connectionLimit, 10);
    assert.equal(config.queueLimit, 100);
    assert.equal(config.connectTimeout, 2500);
  } finally {
    if (original.limit === undefined) delete process.env.DB_CONNECTION_LIMIT;
    else process.env.DB_CONNECTION_LIMIT = original.limit;
    if (original.queue === undefined) delete process.env.DB_QUEUE_LIMIT;
    else process.env.DB_QUEUE_LIMIT = original.queue;
    if (original.timeout === undefined) delete process.env.DB_CONNECT_TIMEOUT_MS;
    else process.env.DB_CONNECT_TIMEOUT_MS = original.timeout;
  }
});

test('commits successful database work and always releases its connection', async () => {
  const { pool, calls } = transactionPool();
  const result = await withTransaction(pool, async (connection) => {
    assert.ok(connection);
    calls.push('work');
    return 'saved';
  });

  assert.equal(result, 'saved');
  assert.deepEqual(calls, ['acquire', 'begin', 'work', 'commit', 'release']);
});

test('rolls back failed database work and releases its connection', async () => {
  const { pool, calls } = transactionPool();
  const failure = new Error('role table write failed');

  await assert.rejects(withTransaction(pool, async () => {
    calls.push('write-primary-row');
    throw failure;
  }), failure);

  assert.deepEqual(calls, ['acquire', 'begin', 'write-primary-row', 'rollback', 'release']);
});

test('attempts rollback after a failed commit and releases its connection', async () => {
  const failure = new Error('commit failed');
  const { pool, calls } = transactionPool({ commitError: failure });

  await assert.rejects(withTransaction(pool, async () => 'written'), failure);
  assert.deepEqual(calls, ['acquire', 'begin', 'commit', 'rollback', 'release']);
});

test('locks the project before replacing tasks and rolls back a failed replacement', async () => {
  const calls = [];
  let tasksDeleted = false;
  const identityRestore = __test.setAuthIdentityProvider(async () => ({
    identifier: 'FAC001', role: 'faculty', is_active: 1
  }));
  const token = jwt.sign(
    { sub: 'FAC001', role: 'faculty', type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async query(sql) {
      const statement = String(sql).replace(/\s+/g, ' ').trim();
      if (statement.includes('FROM projects WHERE id = ? LIMIT 1 FOR UPDATE')) {
        calls.push('lock-project');
        return [[{ id: 'PRJ-1' }], []];
      }
      if (statement.includes('FROM projects p') && statement.includes('assigned_faculty_identifier')) {
        calls.push('check-project-access');
        return [[{ owner_identifier: 'STU001', assigned_faculty_identifier: 'FAC001' }], []];
      }
      if (statement.startsWith('DELETE FROM project_tasks')) {
        calls.push('delete-old-tasks');
        tasksDeleted = true;
        return [{ affectedRows: 1 }, []];
      }
      if (statement.startsWith('INSERT INTO project_tasks')) {
        calls.push('insert-new-task');
        throw new Error('simulated task insert failure');
      }
      throw new Error(`Unexpected task replacement query: ${statement}`);
    },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); tasksDeleted = false; },
    release() { calls.push('release'); }
  };
  const pool = { async getConnection() { calls.push('acquire'); return connection; } };
  const poolRestore = __test.setDatabasePoolProvider(() => pool);

  try {
    const response = await request(app)
      .put('/api/projects/PRJ-1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ tasks: [{ id: 'TSK-1', title: 'Task' }] });

    assert.equal(response.status, 500);
    assert.equal(tasksDeleted, false);
    assert.ok(calls.indexOf('lock-project') < calls.indexOf('delete-old-tasks'));
    assert.deepEqual(calls.slice(-2), ['rollback', 'release']);
  } finally {
    poolRestore();
    identityRestore();
  }
});
