process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'role-table-compatibility-test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { app, __test } = require('../index');
const {
  getRoleTableDefinition,
  normalizeRoleTableUser,
  syncUserIntoRoleTables,
  updateRoleTablePassword
} = require('../services/roleTableSync');
const { syncRoleTablesFromUsers } = require('../scripts/syncRoleTablesFromUsers');
const { createAdminControllers } = require('../controllers/adminController');

function makeRoleOnlyAccountPool(role, row, unrelatedUser) {
  const statements = [];
  const tableNames = ['admin', 'faculty', 'student'];
  const pool = {
    async query(sql, values = []) {
      const statement = String(sql).replace(/\s+/g, ' ').trim();
      statements.push({ statement, values });
      if (/\bFROM users\b/i.test(statement) && /^SELECT/i.test(statement)) return [[], []];
      const selectRole = /^SELECT \* FROM (admin|faculty|student)\b/i.exec(statement);
      if (selectRole) {
        const table = selectRole[1];
        return [table === role ? [{ ...row }] : [], []];
      }
      const updateRole = /^UPDATE (admin|faculty|student)\b/i.exec(statement);
      if (updateRole) {
        if (updateRole[1] !== role) throw new Error('Wrong role table was selected for password update.');
        row.password = values[0];
        row.must_reset_password = values[1];
        return [{ affectedRows: 1 }, []];
      }
      if (/^UPDATE users\b/i.test(statement)) {
        const targetId = Number(values.at(-1));
        if (targetId === unrelatedUser.id) unrelatedUser.password = values[0];
        return [{ affectedRows: targetId === unrelatedUser.id ? 1 : 0 }, []];
      }
      if (/^INSERT INTO (admin|faculty|student)\b/i.test(statement)) return [{ affectedRows: 0 }, []];
      if (/^SELECT COUNT\(\*\)/i.test(statement)) return [[{ count: 1 }], []];
      throw new Error(`Unexpected role-only test query: ${statement}`);
    },
    async getConnection() {
      return {
        query: (...args) => pool.query(...args),
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {}
      };
    }
  };
  assert.ok(tableNames.includes(role));
  return { pool, statements };
}

test('role-table startup creates missing mirrors without clearing existing passwords', async () => {
  const statements = [];
  const restorePool = __test.setDatabasePoolProvider(() => ({
    async query(sql) {
      statements.push(String(sql));
      return [{ affectedRows: 0 }, []];
    }
  }));

  try {
    await __test.ensureRoleTables();
  } finally {
    restorePool();
  }

  assert.equal(statements.length, 3);
  assert.ok(statements.every((sql) => /^\s*CREATE TABLE IF NOT EXISTS/i.test(sql)));
  assert.ok(statements.every((sql) => !/^\s*(?:UPDATE|DELETE|TRUNCATE|DROP)\b/i.test(sql)));
  assert.ok(statements.every((sql) => !/password\s*=\s*NULL/i.test(sql)));
});

test('workspace startup only creates missing tables and does not reset existing tables', async () => {
  const statements = [];
  const restorePool = __test.setDatabasePoolProvider(() => ({
    async query(sql) {
      statements.push(String(sql));
      return [{ affectedRows: 0 }, []];
    }
  }));

  try {
    await __test.ensureProjectWorkspaceTables();
  } finally {
    restorePool();
  }

  assert.equal(statements.length, 3);
  assert.ok(statements.every((sql) => /^\s*CREATE TABLE IF NOT EXISTS/i.test(sql)));
  assert.ok(statements.every((sql) => !/^\s*(?:DROP|TRUNCATE|DELETE|UPDATE)\b/i.test(sql)));
  assert.match(statements[1], /content_key VARCHAR\(64\) NULL/i);
});

test('content_key startup adds a nullable key only when missing and rejects too-small existing types', async () => {
  const statements = [];
  let columnType = 'varchar(64)';
  let duplicateColumnRace = false;
  const restorePool = __test.setDatabasePoolProvider(() => ({
    async query(sql) {
      const statement = String(sql);
      statements.push(statement);
      if (statement.startsWith('SHOW COLUMNS')) {
        return [columnType ? [{ Field: 'content_key', Type: columnType }] : [], []];
      }
      if (duplicateColumnRace && /^ALTER TABLE/i.test(statement)) {
        const error = new Error('column added by a concurrent startup');
        error.code = 'ER_DUP_FIELDNAME';
        throw error;
      }
      return [{ affectedRows: 0 }, []];
    }
  }));

  try {
    await __test.ensureProjectFileContentKeyColumn();
    assert.equal(statements.some((sql) => /^ALTER TABLE/i.test(sql)), false);

    statements.length = 0;
    columnType = null;
    await __test.ensureProjectFileContentKeyColumn();
    assert.equal(statements.filter((sql) => /^ALTER TABLE/i.test(sql)).length, 1);
    assert.match(statements[1], /ADD COLUMN content_key VARCHAR\(64\) NULL/i);

    statements.length = 0;
    columnType = 'varchar(32)';
    await assert.rejects(__test.ensureProjectFileContentKeyColumn(), /manual schema review/i);
    assert.equal(statements.some((sql) => /^ALTER TABLE/i.test(sql)), false);

    statements.length = 0;
    columnType = null;
    duplicateColumnRace = true;
    await __test.ensureProjectFileContentKeyColumn();
    assert.equal(statements.filter((sql) => /^ALTER TABLE/i.test(sql)).length, 1);
  } finally {
    restorePool();
  }
});

test('default-admin provisioning reuses a legacy admin-table identity', async () => {
  const statements = [];
  let committed = false;
  const pool = {
    async getConnection() {
      return {
        async beginTransaction() {},
        async commit() { committed = true; },
        async rollback() {},
        release() {},
        async query(sql) {
          const statement = String(sql).replace(/\s+/g, ' ').trim();
          statements.push(statement);
          if (statement.startsWith('SELECT id FROM users')) return [[], []];
          if (statement.startsWith('SELECT employee_id FROM admin')) return [[{ employee_id: 'ADM014' }], []];
          throw new Error(`Unexpected default-admin query: ${statement}`);
        }
      };
    }
  };
  const restorePool = __test.setDatabasePoolProvider(() => pool);

  try {
    await __test.ensureDefaultAdmin('ADM014', 'Only-used-to-exercise-the-mock');
  } finally {
    restorePool();
  }

  assert.equal(committed, true);
  assert.ok(statements.some((sql) => sql.startsWith('SELECT employee_id FROM admin')));
  assert.ok(statements.every((sql) => !sql.startsWith('INSERT INTO')));
});

test('role-table synchronization leaves existing IDs, account data and hashes untouched', async () => {
  const passwordHash = await bcrypt.hash('ExistingAdminPassword1!', 4);

  for (const role of ['student', 'faculty', 'admin']) {
    const definition = getRoleTableDefinition(role);
    const identifier = role === 'student' ? 'STU010' : role === 'faculty' ? 'FAC010' : 'ADM010';
    const existing = {
      [definition.identifierColumn]: identifier,
      name: `Existing ${role}`,
      email: `${role}@test.local`,
      password: passwordHash,
      role,
      department: 'Existing Department',
      is_active: 0,
      must_reset_password: 1,
      record_id: 712
    };
    const before = structuredClone(existing);
    let captured = null;
    const mockConnection = {
      async query(sql, values) {
        captured = { sql: String(sql), values };
        // Simulate MySQL finding the existing primary or unique email key. The
        // duplicate clause deliberately performs only a self-assignment.
        return [{ affectedRows: 0 }, []];
      }
    };

    await syncUserIntoRoleTables(mockConnection, {
      id: 999,
      identifier,
      name: 'Changed name must not replace existing data',
      email: `${role}@test.local`,
      role,
      department: 'Changed Department',
      password: '',
      is_active: 1
    });

    assert.deepEqual(existing, before);
    assert.match(captured.sql, /ON DUPLICATE KEY UPDATE/i);
    assert.match(captured.sql, new RegExp(`UPDATE ${definition.identifierColumn} = ${definition.identifierColumn}$`, 'i'));
    assert.doesNotMatch(captured.sql, /\b(?:DELETE|UPDATE\s+\w+\s+SET)\b/i);
    assert.doesNotMatch(captured.sql, /password\s*=\s*(?:NULL|VALUES\()/i);
    assert.equal(captured.values[3], null, 'blank source hash is never used in a duplicate update');
  }
});

test('role-table synchronization copies a hash only as an insert value and never updates it', async () => {
  const passwordHash = await bcrypt.hash('ExistingUserPassword1!', 4);
  let captured;
  await syncUserIntoRoleTables({
    async query(sql, values) {
      captured = { sql: String(sql), values };
      return [{ affectedRows: 1 }, []];
    }
  }, {
    identifier: 'ADM011',
    name: 'Admin Mirror',
    email: 'adm011@test.local',
    role: 'admin',
    password: passwordHash,
    is_active: 1
  });

  assert.equal(captured.values[3], passwordHash);
  assert.match(captured.sql, /INSERT INTO admin/);
  assert.doesNotMatch(captured.sql.split(/ON DUPLICATE KEY UPDATE/i)[1], /password/i);
});

test('role-table synchronization never mirrors plaintext or malformed password values', async () => {
  let captured;
  await syncUserIntoRoleTables({
    async query(sql, values) {
      captured = { sql: String(sql), values };
      return [{ affectedRows: 1 }, []];
    }
  }, {
    identifier: 'STU015',
    name: 'Legacy Student',
    email: 'stu015@test.local',
    role: 'student',
    password: 'old-plaintext-value'
  });

  assert.equal(captured.values[3], null);
  assert.doesNotMatch(captured.sql.split(/ON DUPLICATE KEY UPDATE/i)[1], /password/i);
});

test('role-table sync maps student semester and year to legacy numeric types and allows null unique email', async () => {
  let captured;
  const mockPool = {
    async query(sql, values) {
      captured = { sql: String(sql), values };
      return [{ affectedRows: 1 }, []];
    }
  };
  const valid = await syncUserIntoRoleTables(mockPool, {
    identifier: 'STU016',
    name: 'Student Sixteen',
    email: null,
    role: 'student',
    semester: '5',
    batch_year: '2025'
  });

  assert.equal(valid, true);
  assert.equal(captured.values[2], null);
  assert.equal(captured.values[5], 5);
  assert.equal(captured.values[7], 2025);

  captured = null;
  const invalid = await syncUserIntoRoleTables(mockPool, {
    identifier: 'STU017',
    name: 'Student Seventeen',
    email: 'student17@test.local',
    role: 'student',
    semester: 'fifth',
    batch_year: '1899'
  });
  assert.equal(invalid, false);
  assert.equal(captured, null);
});

test('role-table sync skips values outside legacy widths and does not downgrade named admin access levels', async () => {
  let writeCount = 0;
  let adminValues;
  const mockPool = {
    async query(sql, values) {
      writeCount += 1;
      if (String(sql).includes('INSERT INTO admin')) adminValues = values;
      return [{ affectedRows: 1 }, []];
    }
  };
  const tooLong = await syncUserIntoRoleTables(mockPool, {
    identifier: 'FAC018', name: 'F'.repeat(101), email: 'f18@test.local', role: 'faculty'
  });
  const namedAccess = await syncUserIntoRoleTables(mockPool, {
    identifier: 'ADM018', name: 'Administrator', email: 'a18@test.local',
    role: 'admin', access_level: 'Super Admin'
  });
  const numericAccess = await syncUserIntoRoleTables(mockPool, {
    identifier: 'ADM019A', name: 'Numeric Administrator', email: 'a19a@test.local',
    role: 'admin', access_level: '7'
  });
  assert.equal(tooLong, false);
  assert.equal(namedAccess, false);
  assert.equal(numericAccess, true);
  assert.equal(adminValues[5], 7);
  assert.equal(writeCount, 1);
});

test('role-table password updates target the role identifier and email, never users.id', async () => {
  let captured;
  const roleUser = normalizeRoleTableUser({
    id: 6,
    employee_id: 'ADM019',
    email: 'admin19@test.local',
    password: 'old-hash',
    is_active: 1
  }, 'admin');
  assert.equal(roleUser.id, null);
  assert.equal(roleUser.roleTableId, 6);

  await updateRoleTablePassword({
    async query(sql, values) {
      captured = { sql: String(sql), values };
      return [{ affectedRows: 1 }, []];
    }
  }, roleUser, '$2b$10$replacement-hash', 0);

  assert.match(captured.sql, /^\s*UPDATE admin/i);
  assert.match(captured.sql, /WHERE employee_id = \? AND email <=> \?/i);
  assert.doesNotMatch(captured.sql, /UPDATE users|WHERE id\s*=/i);
  assert.deepEqual(captured.values.slice(2), ['ADM019', 'admin19@test.local']);
});

test('faculty assignment refuses a role-table-only student without using its table-local ID', async () => {
  let writes = 0;
  let responseStatus = 200;
  let responseBody;
  const controllers = createAdminControllers({
    getPool: () => ({
      async query() {
        writes += 1;
        return [{ affectedRows: 1 }, []];
      }
    }),
    findUserByIdentifierOrEmail: async (identifier) => identifier === 'STU023'
      ? { id: null, roleTableId: 3, accountSource: 'role_table', identifier, role: 'student', name: 'Legacy Student' }
      : { id: null, roleTableId: 9, accountSource: 'role_table', identifier, role: 'faculty', name: 'Legacy Faculty' },
    sendServerError: (_res, error) => { throw error; }
  });
  const res = {
    status(code) { responseStatus = code; return this; },
    json(body) { responseBody = body; return this; }
  };

  await controllers.assignStudentFaculty({
    body: { studentIdentifier: 'STU023', facultyIdentifier: 'FAC023' }
  }, res);

  assert.equal(responseStatus, 404);
  assert.equal(responseBody.error, 'Student account not found');
  assert.equal(writes, 0);
});

test('role-only initial password reset cannot update an unrelated users row with the same numeric ID', async () => {
  const oldHash = await bcrypt.hash('OldStudentPassword1!', 4);
  const row = {
    id: 4,
    registration_no: 'STU020',
    name: 'Legacy Student',
    email: 'student20@test.local',
    password: oldHash,
    is_active: 1,
    must_reset_password: 1
  };
  const unrelatedUser = { id: row.id, password: 'unrelated-existing-hash' };
  const { pool, statements } = makeRoleOnlyAccountPool('student', row, unrelatedUser);
  const restorePool = __test.setDatabasePoolProvider(() => pool);
  const token = jwt.sign(
    { sub: row.registration_no, role: 'student', type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '5m', algorithm: 'HS256' }
  );

  try {
    const response = await request(app)
      .post('/api/auth/reset-initial-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ identifier: row.registration_no, newPassword: 'NewStudentPassword1!' });

    assert.equal(response.status, 200);
    assert.notEqual(row.password, oldHash);
    assert.equal(unrelatedUser.password, 'unrelated-existing-hash');
    assert.ok(statements.some(({ statement }) => /^UPDATE student\b/i.test(statement)));
    assert.equal(statements.some(({ statement }) => /^UPDATE users\b/i.test(statement)), false);
  } finally {
    restorePool();
  }
});

test('canonical users password reset continues to update its own users.id', async () => {
  const oldHash = await bcrypt.hash('OldCanonicalPassword1!', 4);
  const user = {
    id: 42,
    identifier: 'STU042',
    name: 'Canonical Student',
    email: 'student42@test.local',
    role: 'student',
    password: oldHash,
    is_active: 1,
    must_reset_password: 1
  };
  const statements = [];
  const pool = {
    async query(sql, values = []) {
      const statement = String(sql).replace(/\s+/g, ' ').trim();
      statements.push({ statement, values });
      if (/^SELECT .* FROM users\b/i.test(statement)) return [[{ ...user }], []];
      if (/^UPDATE users\b/i.test(statement)) {
        assert.equal(Number(values[2]), user.id);
        user.password = values[0];
        user.must_reset_password = values[1];
        return [{ affectedRows: 1 }, []];
      }
      if (/^INSERT INTO student\b/i.test(statement)) return [{ affectedRows: 0 }, []];
      throw new Error(`Unexpected canonical reset query: ${statement}`);
    },
    async getConnection() {
      return {
        query: (...args) => pool.query(...args),
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {}
      };
    }
  };
  const restorePool = __test.setDatabasePoolProvider(() => pool);
  const token = jwt.sign(
    { sub: user.identifier, role: 'student', type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '5m', algorithm: 'HS256' }
  );

  try {
    const response = await request(app)
      .post('/api/auth/reset-initial-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ identifier: user.identifier, newPassword: 'NewCanonicalPassword1!' });
    assert.equal(response.status, 200);
    assert.notEqual(user.password, oldHash);
    assert.equal(user.must_reset_password, 0);
    assert.ok(statements.some(({ statement }) => /^UPDATE users\b/i.test(statement)));
  } finally {
    restorePool();
  }
});

test('role-only forgotten-password reset updates only the matching role record', async () => {
  const oldHash = await bcrypt.hash('OldAdminPassword1!', 4);
  const row = {
    id: 3,
    employee_id: 'ADM021',
    name: 'Legacy Admin',
    email: 'admin21@test.local',
    password: oldHash,
    role: 'admin',
    is_active: 1,
    must_reset_password: 0
  };
  const unrelatedUser = { id: row.id, password: 'unrelated-existing-hash' };
  const { pool, statements } = makeRoleOnlyAccountPool('admin', row, unrelatedUser);
  const restorePool = __test.setDatabasePoolProvider(() => pool);
  const originalFetch = global.fetch;
  const env = {
    mode: process.env.RESET_TOKEN_DELIVERY,
    url: process.env.RESET_PROVIDER_URL,
    key: process.env.RESET_PROVIDER_API_KEY
  };
  let deliveredToken = null;
  process.env.RESET_TOKEN_DELIVERY = 'webhook';
  process.env.RESET_PROVIDER_URL = 'https://reset.test.local/send';
  process.env.RESET_PROVIDER_API_KEY = 'test-only-key';
  global.fetch = async (_url, options) => {
    deliveredToken = JSON.parse(options.body).code;
    return { ok: true, status: 200 };
  };

  try {
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ identifier: row.employee_id });
    assert.equal(forgot.status, 200);
    assert.ok(deliveredToken);

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: deliveredToken, newPassword: 'NewAdminPassword1!' });
    assert.equal(reset.status, 200);
    assert.notEqual(row.password, oldHash);
    assert.equal(unrelatedUser.password, 'unrelated-existing-hash');
    assert.ok(statements.some(({ statement }) => /^UPDATE admin\b/i.test(statement)));
    assert.equal(statements.some(({ statement }) => /^UPDATE users\b/i.test(statement)), false);
  } finally {
    restorePool();
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries({
      RESET_TOKEN_DELIVERY: env.mode,
      RESET_PROVIDER_URL: env.url,
      RESET_PROVIDER_API_KEY: env.key
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('role-only legacy password migration rejects non-bcrypt credentials without updating users', async () => {
  const row = {
    id: 8,
    registration_no: 'STU022',
    name: 'Legacy Student',
    email: 'student22@test.local',
    password: 'legacy-non-bcrypt-value',
    is_active: 1
  };
  const unrelatedUser = { id: row.id, password: 'unrelated-existing-hash' };
  const { pool, statements } = makeRoleOnlyAccountPool('student', row, unrelatedUser);
  const restorePool = __test.setDatabasePoolProvider(() => pool);

  try {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: row.registration_no, password: 'legacy-non-bcrypt-value' });
    assert.equal(response.status, 401);
    assert.equal(unrelatedUser.password, 'unrelated-existing-hash');
    assert.equal(statements.some(({ statement }) => /^UPDATE users\b/i.test(statement)), false);
    assert.equal(statements.some(({ statement }) => /^UPDATE student\b/i.test(statement)), false);
  } finally {
    restorePool();
  }
});

test('role-table accounts with NULL is_active fail closed while canonical active users remain active', async () => {
  const { isAccountActive } = require('../middleware/auth');
  const row = {
    id: 12,
    registration_no: 'STU024',
    name: 'Legacy Student',
    email: 'student24@test.local',
    password: await bcrypt.hash('StudentPassword1!', 4),
    is_active: null
  };
  const unrelatedUser = { id: row.id, password: 'unrelated-existing-hash' };
  const { pool, statements } = makeRoleOnlyAccountPool('student', row, unrelatedUser);
  const restorePool = __test.setDatabasePoolProvider(() => pool);

  try {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: row.registration_no, password: 'StudentPassword1!' });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'This account is inactive.');
    assert.equal(unrelatedUser.password, 'unrelated-existing-hash');
    assert.equal(statements.some(({ statement }) => /^UPDATE /i.test(statement)), false);
    assert.equal(isAccountActive({ id: 25, is_active: 1 }), true);
  } finally {
    restorePool();
  }
});

test('standalone role sync is mockable and contains no delete or password-clearing operations', async () => {
  const statements = [];
  const users = [
    { identifier: 'ADM012', name: 'Existing Admin', email: 'adm012@test.local', role: 'admin', password: '$2b$10$preserved-hash' },
    { identifier: 'FAC012', name: 'Existing Faculty', email: 'fac012@test.local', role: 'faculty', password: '$2b$10$preserved-hash' },
    { identifier: 'STU012', name: 'Existing Student', email: 'stu012@test.local', role: 'student', password: '$2b$10$preserved-hash' }
  ];
  const pool = {
    async query(sql) {
      const statement = String(sql).replace(/\s+/g, ' ').trim();
      statements.push(statement);
      if (statement === 'SELECT * FROM users') return [users, []];
      if (statement === 'SELECT COUNT(*) AS count FROM admin') return [[{ count: 1 }], []];
      if (statement === 'SELECT COUNT(*) AS count FROM faculty') return [[{ count: 1 }], []];
      if (statement === 'SELECT COUNT(*) AS count FROM student') return [[{ count: 1 }], []];
      return [{ affectedRows: 1 }, []];
    }
  };

  const counts = await syncRoleTablesFromUsers(pool);
  assert.deepEqual(counts, { admin: 1, faculty: 1, student: 1 });
  assert.equal(statements.filter((sql) => sql.startsWith('INSERT INTO ')).length, 3);
  assert.ok(statements.every((sql) => !/\b(?:DELETE|TRUNCATE|DROP)\b/i.test(sql)));
  assert.ok(statements.every((sql) => !/password\s*=\s*NULL/i.test(sql)));
});

test('legacy role-table administrator can complete the existing OTP login workflow', async () => {
  const passwordHash = await bcrypt.hash('LegacyAdminPassword1!', 4);
  const adminRecord = {
    employee_id: 'ADM013',
    name: 'Legacy Administrator',
    email: 'legacy.admin@test.local',
    password: passwordHash,
    role: 'admin',
    is_active: 1,
    must_reset_password: 0,
    phone: '+1 555 0100'
  };
  const statements = [];
  const pool = {
    async query(sql) {
      const statement = String(sql).replace(/\s+/g, ' ').trim();
      statements.push(statement);
      if (statement.includes('FROM users') && statement.includes('WHERE LOWER(identifier) = ?')) return [[], []];
      if (statement.includes('FROM admin')) return [[{ ...adminRecord }], []];
      if (statement.includes('FROM faculty') || statement.includes('FROM student')) return [[], []];
      throw new Error(`Unexpected mocked auth query: ${statement}`);
    }
  };
  const restorePool = __test.setDatabasePoolProvider(() => pool);
  const originalFetch = global.fetch;
  const env = {
    delivery: process.env.OTP_DELIVERY,
    url: process.env.OTP_PROVIDER_URL,
    apiKey: process.env.OTP_PROVIDER_API_KEY
  };
  let deliveredCode = null;
  process.env.OTP_DELIVERY = 'webhook';
  process.env.OTP_PROVIDER_URL = 'https://otp.test.local/send';
  process.env.OTP_PROVIDER_API_KEY = 'test-only-key';
  global.fetch = async (_url, options) => {
    deliveredCode = JSON.parse(options.body).code;
    return { ok: true, status: 200 };
  };

  try {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'ADM013', password: 'LegacyAdminPassword1!' });
    assert.equal(login.status, 200);
    assert.equal(login.body.requiresOtp, true);
    assert.ok(deliveredCode);

    const verification = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otpSessionId: login.body.otpSessionId, otpCode: deliveredCode });
    assert.equal(verification.status, 200);
    assert.ok(verification.body.token);
    assert.equal(verification.body.user.identifier, 'ADM013');
    const protectedProfile = await request(app)
      .get('/api/profile/ADM013')
      .set('Authorization', `Bearer ${verification.body.token}`);
    assert.equal(protectedProfile.status, 200);
    assert.equal(protectedProfile.body.user.role, 'admin');
    assert.ok(statements.every((sql) => !/^\s*(?:UPDATE|DELETE|TRUNCATE|DROP)\b/i.test(sql)));
  } finally {
    restorePool();
    global.fetch = originalFetch;
    if (env.delivery === undefined) delete process.env.OTP_DELIVERY;
    else process.env.OTP_DELIVERY = env.delivery;
    if (env.url === undefined) delete process.env.OTP_PROVIDER_URL;
    else process.env.OTP_PROVIDER_URL = env.url;
    if (env.apiKey === undefined) delete process.env.OTP_PROVIDER_API_KEY;
    else process.env.OTP_PROVIDER_API_KEY = env.apiKey;
  }
});
