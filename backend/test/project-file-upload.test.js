process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-project-file-upload-tests';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, __test } = require('../index');

const testIdentities = new Map();
__test.setAuthIdentityProvider(async (identifier) => testIdentities.get(String(identifier).toLowerCase()) || null);

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'project-files');
const contentDirectory = __test.getProjectFileContentDir();

function authorization(role = 'admin', identifier = 'ADMIN001') {
  testIdentities.set(identifier.toLowerCase(), { identifier, role, is_active: 1 });
  const token = jwt.sign(
    { sub: identifier, role, email: `${identifier}@test.local`, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  return `Bearer ${token}`;
}

function pdf(contents = 'test pdf') {
  const header = `%PDF-1.7\n% ${contents.replace(/[\r\n]/g, ' ')}\n`;
  const objectOffset = Buffer.byteLength(header);
  const object = '1 0 obj\n<< /Type /Catalog >>\nendobj\n';
  const xrefOffset = objectOffset + Buffer.byteLength(object);
  const xref = `xref\n0 2\n0000000000 65535 f \n${String(objectOffset).padStart(10, '0')} 00000 n \n`;
  return Buffer.from(`${header}${object}${xref}trailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
}

function zipWithEntries(names) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entryName of names) {
    const name = Buffer.from(entryName, 'utf8');
    const data = Buffer.from('<content/>');
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, name);
    localOffset += localHeader.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(names.length, 8);
  endRecord.writeUInt16LE(names.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function recordKey(projectId, fileId) {
  return `${projectId}\u0000${fileId}`;
}

function uniqueContentKey() {
  return crypto.createHash('sha256').update(`${Date.now()}-${crypto.randomBytes(16).toString('hex')}`).digest('hex');
}

function makeFileRecord(projectId, fileId, contentKey = null, fileName = 'report.pdf') {
  return {
    id: fileId,
    project_id: projectId,
    content_key: contentKey,
    file_name: fileName,
    file_size: 12,
    file_type: 'document',
    mime_type: 'text/html',
    uploaded_by: 'STU001',
    uploaded_by_name: 'Student',
    uploaded_date: '2026-10-30',
    version: 1,
    description: '',
    download_count: 0,
    is_submitted: 0,
    submitted_date: null,
    updated_date: null
  };
}

function makeProjectFilePool({
  projectId = 'PROJECT-1',
  ownerIdentifier = 'STU001',
  assignedFacultyIdentifier = 'FAC001',
  initialFiles = [],
  failAuthorization = false,
  failInsert = false,
  failCommit = false
} = {}) {
  let committed = new Map(initialFiles.map((row) => [recordKey(row.project_id, row.id), { ...row }]));

  const pool = {
    async query(sql, values = []) {
      const statement = String(sql).replace(/\s+/g, ' ').trim();
      if (statement.startsWith('SELECT p.owner_identifier')) {
        if (failAuthorization) throw new Error('simulated authorization database failure');
        return [[{ owner_identifier: ownerIdentifier, assigned_faculty_identifier: assignedFacultyIdentifier }], []];
      }
      if (statement.startsWith('SELECT file_name, content_key FROM project_files')) {
        const row = committed.get(recordKey(values[0], values[1]));
        return [row ? [{ ...row }] : [], []];
      }
      if (statement.startsWith('UPDATE project_files SET download_count')) {
        const row = committed.get(recordKey(values[0], values[1]));
        if (row) row.download_count += 1;
        return [{ affectedRows: row ? 1 : 0 }, []];
      }
      if (statement.startsWith('SELECT content_key FROM project_files WHERE content_key IS NOT NULL')) {
        return [[...committed.values()].filter((row) => row.content_key).map((row) => ({ content_key: row.content_key })), []];
      }
      throw new Error(`Unexpected pool query in test: ${statement}`);
    },

    async getConnection() {
      const working = new Map([...committed.entries()].map(([key, row]) => [key, { ...row }]));
      return {
        async beginTransaction() {},
        async query(sql, values = []) {
          const statement = String(sql).replace(/\s+/g, ' ').trim();
          if (statement.startsWith('SELECT id FROM projects')) return [[{ id: projectId }], []];
          if (statement.startsWith('SELECT id, content_key FROM project_files')) {
            return [[...working.values()]
              .filter((row) => row.project_id === values[0])
              .map(({ id, content_key }) => ({ id, content_key })), []];
          }
          if (statement.startsWith('DELETE FROM project_files')) {
            for (const [key, row] of working) {
              if (row.project_id === values[0]) working.delete(key);
            }
            return [{ affectedRows: 1 }, []];
          }
          if (statement.startsWith('INSERT INTO project_files')) {
            if (failInsert) throw new Error('simulated metadata insert failure');
            const [
              id, fileProjectId, content_key, file_name, file_size, file_type, mime_type,
              uploaded_by, uploaded_by_name, uploaded_date, version, description,
              download_count, is_submitted, submitted_date, updated_date
            ] = values;
            const row = {
              id, project_id: fileProjectId, content_key, file_name, file_size, file_type,
              mime_type, uploaded_by, uploaded_by_name, uploaded_date, version, description,
              download_count, is_submitted, submitted_date, updated_date
            };
            working.set(recordKey(fileProjectId, id), row);
            return [{ affectedRows: 1 }, []];
          }
          if (statement.startsWith('SELECT * FROM project_files')) {
            return [[...working.values()].filter((row) => row.project_id === values[0]), []];
          }
          throw new Error(`Unexpected connection query in test: ${statement}`);
        },
        async commit() {
          if (failCommit) throw new Error('simulated ambiguous commit failure');
          committed = new Map([...working.entries()].map(([key, row]) => [key, { ...row }]));
        },
        async rollback() {},
        release() {}
      };
    },

    getFiles() {
      return [...committed.values()].map((row) => ({ ...row }));
    },

    seedFile(row) {
      committed.set(recordKey(row.project_id, row.id), { ...row });
    }
  };
  return pool;
}

function installPool(pool) {
  return __test.setProjectFilePoolProvider(() => pool);
}

async function postProjectFile(projectId, fileId, content, filename = 'report.pdf', contentType = 'application/pdf', role = 'admin', identifier = 'ADMIN001') {
  return request(app)
    .post(`/api/projects/${projectId}/files/${fileId}/content`)
    .set('Authorization', authorization(role, identifier))
    .attach('file', content, { filename, contentType });
}

async function saveProjectFiles(projectId, files, role = 'admin', identifier = 'ADMIN001') {
  return request(app)
    .put(`/api/projects/${projectId}/files`)
    .set('Authorization', authorization(role, identifier))
    .send({ files });
}

function listUploadTemps() {
  return fs.readdirSync(contentDirectory).filter((filename) => /^upload-[a-f0-9]{32}\.tmp$/.test(filename));
}

function stagedFiles(projectId, fileId) {
  return __test.listPendingProjectFiles(projectId, fileId);
}

test('project access middleware rejects users outside the project and permits its members', async () => {
  const pool = {
    query: async () => [[{ owner_identifier: 'STU001', assigned_faculty_identifier: 'FAC001' }], []]
  };
  const middleware = __test.createProjectAccessMiddleware(() => pool);
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  let continued = false;

  await middleware(
    { params: { projectId: 'PROJECT-1' }, auth: { sub: 'STU999', role: 'student' } },
    response,
    () => { continued = true; }
  );
  assert.equal(response.statusCode, 403);
  assert.equal(continued, false);

  for (const auth of [
    { sub: 'STU001', role: 'student' },
    { sub: 'FAC001', role: 'faculty' }
  ]) {
    let memberContinued = false;
    await middleware(
      { params: { projectId: 'PROJECT-1' }, auth },
      { status() { return this; }, json(body) { throw new Error(body.error); } },
      () => { memberContinued = true; }
    );
    assert.equal(memberContinued, true);
  }
});

test('rejects unauthenticated and invalid uploads without leaving temporary files', async () => {
  const restorePool = installPool(makeProjectFilePool({ projectId: 'PROJECT-VALID' }));
  const before = new Set(listUploadTemps());
  try {
    const unauthenticated = await request(app)
      .post('/api/projects/PROJECT-UNAUTH/files/FILE-UNAUTH/content')
      .attach('file', pdf(), { filename: 'report.pdf', contentType: 'application/pdf' });
    const invalidUploads = [
      ['wrong extension', await postProjectFile('PROJECT-VALID', 'FILE-EXT', Buffer.from('data'), 'program.exe', 'application/octet-stream')],
      ['wrong MIME type', await postProjectFile('PROJECT-VALID', 'FILE-MIME', pdf(), 'report.pdf', 'text/plain')],
      ['malformed PDF', await postProjectFile('PROJECT-VALID', 'FILE-PDF', Buffer.from('%PDF-1.7\nno end marker'), 'report.pdf')],
      ['malformed DOCX', await postProjectFile('PROJECT-VALID', 'FILE-DOCX', Buffer.from('PK\u0003\u0004short'), 'report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')],
      ['malformed DOC', await postProjectFile('PROJECT-VALID', 'FILE-DOC', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), 'report.doc', 'application/msword')],
      ['malformed RAR', await postProjectFile('PROJECT-VALID', 'FILE-RAR', Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]), 'report.rar', 'application/vnd.rar')],
      ['malformed 7z', await postProjectFile('PROJECT-VALID', 'FILE-7Z', Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]), 'report.7z', 'application/x-7z-compressed')],
      ['binary content renamed as text', await postProjectFile('PROJECT-VALID', 'FILE-TEXT-MISMATCH', pdf('renamed as text'), 'report.txt', 'text/plain')]
    ];

    assert.equal(unauthenticated.status, 401);
    for (const [description, response] of invalidUploads) {
      assert.equal(response.status, 400, `${description} should be rejected as a bad request`);
    }
    assert.deepEqual(listUploadTemps().filter((filename) => !before.has(filename)), []);
    for (const fileId of ['FILE-EXT', 'FILE-MIME', 'FILE-PDF', 'FILE-DOCX', 'FILE-DOC', 'FILE-RAR', 'FILE-7Z', 'FILE-TEXT-MISMATCH']) {
      assert.deepEqual(stagedFiles('PROJECT-VALID', fileId), []);
    }
  } finally {
    restorePool();
  }
});

test('validates full ZIP structure and required Office document entries', () => {
  const fixturePath = path.join(contentDirectory, `fixture-${uniqueContentKey()}`);
  const validDocx = zipWithEntries(['[Content_Types].xml', 'word/document.xml']);
  fs.writeFileSync(fixturePath, validDocx);
  try {
    assert.equal(__test.isValidProjectFile({
      path: fixturePath,
      originalname: 'report.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: validDocx.length
    }), true);

    const malformed = Buffer.from('PK\u0003\u0004not a zip');
    fs.writeFileSync(fixturePath, malformed);
    assert.equal(__test.isValidProjectFile({
      path: fixturePath,
      originalname: 'report.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: malformed.length
    }), false);
  } finally {
    fs.rmSync(fixturePath, { force: true });
  }
});

test('Multer removes partial files and returns HTTP 413 after uploads exceed the size limit', async () => {
  const restorePool = installPool(makeProjectFilePool({ projectId: 'PROJECT-VALID' }));
  const before = new Set(listUploadTemps());
  const oversizedFile = Buffer.alloc((50 * 1024 * 1024) + 1, 0x41);
  try {
    const response = await postProjectFile('PROJECT-VALID', 'FILE-LARGE', oversizedFile, 'report.txt', 'text/plain');

    assert.equal(response.status, 413);
    assert.match(response.body.error, /File too large/i);
    assert.deepEqual(listUploadTemps().filter((filename) => !before.has(filename)), []);
  } finally {
    restorePool();
  }
});

test('keeps concurrent uploads with an identical project/file ID isolated until metadata commit', async () => {
  const projectId = `PROJECT-CONCURRENT-${Date.now()}`;
  const fileId = `FILE-CONCURRENT-${Date.now()}`;
  const pool = makeProjectFilePool({ projectId });
  const restorePool = installPool(pool);
  const firstContent = pdf('first upload');
  const secondContent = pdf('second upload');

  try {
    const [first, second] = await Promise.all([
      postProjectFile(projectId, fileId, firstContent),
      postProjectFile(projectId, fileId, secondContent)
    ]);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);

    const staged = stagedFiles(projectId, fileId);
    assert.equal(staged.length, 2);
    assert.notEqual(staged[0].path, staged[1].path);
    assert.equal(__test.resolveProjectFilePath(projectId, fileId), null);
    const expectedContent = fs.readFileSync(staged[0].path);
    const committed = await saveProjectFiles(projectId, [{ id: fileId, fileName: 'report.pdf', mimeType: 'text/html' }]);

    assert.equal(committed.status, 200);
    const row = pool.getFiles().find((file) => file.id === fileId);
    const expected = staged[0];
    const committedPath = __test.getProjectFileContentPath(row.content_key);
    assert.equal(row.content_key, expected.contentKey);
    assert.deepEqual(fs.readFileSync(committedPath), expectedContent);
    assert.equal(stagedFiles(projectId, fileId).length, 0);
    assert.equal(Object.hasOwn(committed.body.files[0], 'contentKey'), false);
  } finally {
    const row = pool.getFiles().find((file) => file.id === fileId);
    if (row?.content_key) fs.rmSync(__test.getProjectFileContentPath(row.content_key), { force: true });
    for (const staged of stagedFiles(projectId, fileId)) fs.rmSync(staged.path, { force: true });
    restorePool();
  }
});

test('file metadata failure rolls back the database and leaves existing content intact', async () => {
  const projectId = `PROJECT-DB-FAIL-${Date.now()}`;
  const fileId = `FILE-DB-FAIL-${Date.now()}`;
  const oldKey = uniqueContentKey();
  const oldPath = __test.getProjectFileContentPath(oldKey);
  const oldContent = pdf('old committed content');
  fs.writeFileSync(oldPath, oldContent);
  const pool = makeProjectFilePool({
    projectId,
    initialFiles: [makeFileRecord(projectId, fileId, oldKey)],
    failInsert: true
  });
  const restorePool = installPool(pool);
  const beforeTemps = new Set(listUploadTemps());

  try {
    const upload = await postProjectFile(projectId, fileId, pdf('new staged content'));
    assert.equal(upload.status, 200);
    const pending = stagedFiles(projectId, fileId);
    assert.equal(pending.length, 1);
    const newKey = pending[0].contentKey;
    const failedSave = await saveProjectFiles(projectId, [{ id: fileId, fileName: 'report.pdf' }]);

    assert.equal(failedSave.status, 500);
    assert.equal(pool.getFiles()[0].content_key, oldKey);
    assert.deepEqual(fs.readFileSync(oldPath), oldContent);
    assert.equal(fs.existsSync(__test.getProjectFileContentPath(newKey)), false);
    assert.equal(stagedFiles(projectId, fileId).length, 0);
    assert.deepEqual(listUploadTemps().filter((filename) => !beforeTemps.has(filename)), []);
  } finally {
    fs.rmSync(oldPath, { force: true });
    restorePool();
  }
});

test('database authorization failures clean previously staged upload files', async () => {
  const projectId = `PROJECT-AUTH-DB-FAIL-${Date.now()}`;
  const fileId = `FILE-AUTH-DB-FAIL-${Date.now()}`;
  const pool = makeProjectFilePool({ projectId, failAuthorization: true });
  const restorePool = installPool(pool);
  const beforeTemps = new Set(listUploadTemps());

  try {
    const rejectedUpload = await postProjectFile(projectId, fileId, pdf('authorization database unavailable'), 'report.pdf', 'application/pdf', 'student', 'STU001');
    assert.equal(rejectedUpload.status, 500);
    assert.deepEqual(listUploadTemps().filter((filename) => !beforeTemps.has(filename)), []);
    assert.equal((await postProjectFile(projectId, fileId, pdf('staged before DB outage'))).status, 200);
    assert.equal(stagedFiles(projectId, fileId).length, 1);
    const response = await saveProjectFiles(projectId, [{ id: fileId, fileName: 'report.pdf' }], 'student', 'STU001');
    assert.equal(response.status, 500);
    assert.equal(stagedFiles(projectId, fileId).length, 0);
  } finally {
    restorePool();
  }
});

test('recovers content left by an ambiguous database commit result', async () => {
  const projectId = `PROJECT-COMMIT-FAIL-${Date.now()}`;
  const fileId = `FILE-COMMIT-FAIL-${Date.now()}`;
  const oldKey = uniqueContentKey();
  const oldPath = __test.getProjectFileContentPath(oldKey);
  const oldContent = pdf('still committed');
  fs.writeFileSync(oldPath, oldContent);
  const pool = makeProjectFilePool({
    projectId,
    initialFiles: [makeFileRecord(projectId, fileId, oldKey)],
    failCommit: true
  });
  const restorePool = installPool(pool);

  try {
    assert.equal((await postProjectFile(projectId, fileId, pdf('possibly committed'))).status, 200);
    const pending = stagedFiles(projectId, fileId)[0];
    const failedSave = await saveProjectFiles(projectId, [{ id: fileId, fileName: 'report.pdf' }]);
    assert.equal(failedSave.status, 500);
    assert.equal(pool.getFiles()[0].content_key, oldKey);
    assert.deepEqual(fs.readFileSync(oldPath), oldContent);
    assert.equal(fs.existsSync(__test.getProjectFileContentPath(pending.contentKey)), true);
    assert.equal(stagedFiles(projectId, fileId).length, 0);

    const markerPath = __test.getProjectFileTransactionMarkerPath(pending.contentKey);
    const abandonedDate = new Date(Date.now() - (48 * 60 * 60 * 1000));
    fs.utimesSync(markerPath, abandonedDate, abandonedDate);
    await __test.recoverProjectFileContent();
    assert.equal(fs.existsSync(__test.getProjectFileContentPath(pending.contentKey)), false);
    assert.equal(fs.existsSync(__test.getProjectFileTransactionMarkerPath(pending.contentKey)), false);
  } finally {
    fs.rmSync(oldPath, { force: true });
    restorePool();
  }
});

test('concurrent project ID collisions are isolated and legacy files remain downloadable', async () => {
  const fileId = `FILE-SHARED-${Date.now()}`;
  const firstProject = `PROJECT-A-${Date.now()}`;
  const secondProject = `PROJECT-B-${Date.now()}`;
  const pool = makeProjectFilePool();
  const restorePool = installPool(pool);
  const firstContent = pdf('first project');
  const secondContent = pdf('second project');
  const legacyFileId = `FILE-LEGACY-${Date.now()}`;
  const legacyPath = __test.getLegacyProjectFilePath(legacyFileId);
  const legacyContent = pdf('legacy bytes');

  try {
    const uploads = await Promise.all([
      postProjectFile(firstProject, fileId, firstContent),
      postProjectFile(secondProject, fileId, secondContent)
    ]);
    assert.deepEqual(uploads.map((response) => response.status), [200, 200]);
    assert.notEqual(stagedFiles(firstProject, fileId)[0].path, stagedFiles(secondProject, fileId)[0].path);

    await saveProjectFiles(firstProject, [{ id: fileId, fileName: 'a.pdf' }]);
    await saveProjectFiles(secondProject, [{ id: fileId, fileName: 'b.pdf' }]);
    const firstRow = pool.getFiles().find((file) => file.project_id === firstProject);
    const secondRow = pool.getFiles().find((file) => file.project_id === secondProject);
    assert.notEqual(firstRow.content_key, secondRow.content_key);
    assert.deepEqual(fs.readFileSync(__test.getProjectFileContentPath(firstRow.content_key)), firstContent);
    assert.deepEqual(fs.readFileSync(__test.getProjectFileContentPath(secondRow.content_key)), secondContent);

    fs.writeFileSync(legacyPath, legacyContent);
    pool.seedFile(makeFileRecord('PROJECT-1', legacyFileId, null, 'legacy.pdf'));
    const legacy = await request(app)
      .get(`/api/projects/PROJECT-1/files/${legacyFileId}/content`)
      .set('Authorization', authorization('student', 'STU001'));
    assert.equal(legacy.status, 200);
    assert.deepEqual(legacy.body, legacyContent);
  } finally {
    for (const row of pool.getFiles()) {
      if (row.content_key) fs.rmSync(__test.getProjectFileContentPath(row.content_key), { force: true });
    }
    fs.rmSync(legacyPath, { force: true });
    restorePool();
  }
});

test('downloads enforce project access and return safe attachment headers', async () => {
  const projectId = `PROJECT-DOWNLOAD-${Date.now()}`;
  const fileId = `FILE-DOWNLOAD-${Date.now()}`;
  const contentKey = uniqueContentKey();
  const contentPath = __test.getProjectFileContentPath(contentKey);
  const content = pdf('download bytes');
  fs.writeFileSync(contentPath, content);
  const pool = makeProjectFilePool({
    projectId,
    ownerIdentifier: 'STU001',
    assignedFacultyIdentifier: 'FAC001',
    initialFiles: [makeFileRecord(projectId, fileId, contentKey)]
  });
  const restorePool = installPool(pool);

  try {
    const authorized = await request(app)
      .get(`/api/projects/${projectId}/files/${fileId}/content`)
      .set('Authorization', authorization('student', 'STU001'));
    const unauthorized = await request(app)
      .get(`/api/projects/${projectId}/files/${fileId}/content`)
      .set('Authorization', authorization('student', 'STU999'));

    assert.equal(authorized.status, 200);
    assert.deepEqual(authorized.body, content);
    assert.equal(authorized.headers['content-type'], 'application/octet-stream');
    assert.match(authorized.headers['content-disposition'], /^attachment;/i);
    assert.equal(authorized.headers['x-content-type-options'], 'nosniff');
    assert.equal(authorized.headers['cache-control'], 'private, no-store, max-age=0');
    assert.equal(unauthorized.status, 403);
  } finally {
    fs.rmSync(contentPath, { force: true });
    restorePool();
  }
});

test('filesystem promotion failure cleans staged content without disturbing the current version', async () => {
  const projectId = `PROJECT-FS-FAIL-${Date.now()}`;
  const fileId = `FILE-FS-FAIL-${Date.now()}`;
  const oldKey = uniqueContentKey();
  const oldPath = __test.getProjectFileContentPath(oldKey);
  const oldContent = pdf('current version');
  fs.writeFileSync(oldPath, oldContent);
  const pool = makeProjectFilePool({
    projectId,
    initialFiles: [makeFileRecord(projectId, fileId, oldKey)]
  });
  const restorePool = installPool(pool);
  const originalRename = fs.promises.rename;

  try {
    assert.equal((await postProjectFile(projectId, fileId, pdf('replacement'))).status, 200);
    const staged = stagedFiles(projectId, fileId);
    fs.promises.rename = async (from, to) => {
      if (String(from).endsWith('.stage')) throw new Error('simulated storage promotion failure');
      return originalRename(from, to);
    };
    const failedSave = await saveProjectFiles(projectId, [{ id: fileId, fileName: 'report.pdf' }]);

    assert.equal(failedSave.status, 500);
    assert.equal(pool.getFiles()[0].content_key, oldKey);
    assert.deepEqual(fs.readFileSync(oldPath), oldContent);
    assert.equal(fs.existsSync(staged[0].path), false);
  } finally {
    fs.promises.rename = originalRename;
    fs.rmSync(oldPath, { force: true });
    restorePool();
  }
});

test('startup recovery removes abandoned transaction markers but preserves live and unmanaged content', async () => {
  const orphanKey = uniqueContentKey();
  const committedKey = uniqueContentKey();
  const unmanagedOrphanKey = uniqueContentKey();
  const liveMarkerKey = uniqueContentKey();
  const orphanPath = __test.getProjectFileContentPath(orphanKey);
  const committedPath = __test.getProjectFileContentPath(committedKey);
  const unmanagedOrphanPath = __test.getProjectFileContentPath(unmanagedOrphanKey);
  const orphanMarker = __test.getProjectFileTransactionMarkerPath(orphanKey);
  const committedMarker = __test.getProjectFileTransactionMarkerPath(committedKey);
  const livePath = __test.getProjectFileContentPath(liveMarkerKey);
  const liveMarker = __test.getProjectFileTransactionMarkerPath(liveMarkerKey);
  const stalePendingPath = path.join(contentDirectory, `pending-${uniqueContentKey()}-${uniqueContentKey()}.stage`);
  fs.writeFileSync(orphanPath, 'orphan');
  fs.writeFileSync(committedPath, 'committed');
  fs.writeFileSync(unmanagedOrphanPath, 'unmarked file');
  fs.writeFileSync(livePath, 'content owned by another live process');
  fs.writeFileSync(orphanMarker, 'prepared');
  fs.writeFileSync(committedMarker, 'prepared');
  fs.writeFileSync(liveMarker, 'prepared');
  fs.writeFileSync(stalePendingPath, 'stale temporary upload');
  const oldDate = new Date(Date.now() - (48 * 60 * 60 * 1000));
  fs.utimesSync(stalePendingPath, oldDate, oldDate);
  fs.utimesSync(orphanMarker, oldDate, oldDate);
  fs.utimesSync(committedMarker, oldDate, oldDate);
  const pool = makeProjectFilePool({
    initialFiles: [makeFileRecord('PROJECT-1', 'FILE-1', committedKey)]
  });
  const restorePool = installPool(pool);

  try {
    await __test.recoverProjectFileContent();
    assert.equal(fs.existsSync(orphanPath), false);
    assert.equal(fs.existsSync(committedPath), true);
    assert.equal(fs.existsSync(unmanagedOrphanPath), true);
    assert.equal(fs.existsSync(livePath), true);
    assert.equal(fs.existsSync(liveMarker), true);
    assert.equal(fs.existsSync(orphanMarker), false);
    assert.equal(fs.existsSync(committedMarker), false);
    assert.equal(fs.existsSync(stalePendingPath), false);
  } finally {
    fs.rmSync(orphanPath, { force: true });
    fs.rmSync(committedPath, { force: true });
    fs.rmSync(unmanagedOrphanPath, { force: true });
    fs.rmSync(livePath, { force: true });
    fs.rmSync(orphanMarker, { force: true });
    fs.rmSync(committedMarker, { force: true });
    fs.rmSync(liveMarker, { force: true });
    fs.rmSync(stalePendingPath, { force: true });
    restorePool();
  }
});
