import { downloadProjectFile, getAllUsers, verifyToken } from './authService';

test('downloads a successful file response as a Blob with the requested filename', async () => {
  const click = jest.fn();
  const remove = jest.fn();
  const link = { click, remove, href: '', download: '' };
  const originalCreateElement = document.createElement;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalAppendChild = document.body.appendChild;
  document.createElement = jest.fn(() => link);
  document.body.appendChild = jest.fn();
  URL.createObjectURL = jest.fn(() => 'blob:test-file');
  URL.revokeObjectURL = jest.fn();
  sessionStorage.setItem('student-portal-token', 'test-token');
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['real file contents'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  });

  try {
    await downloadProjectFile('PROJECT-1', 'FILE-1', 'STUDENT.docx');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/PROJECT-1/files/FILE-1/content'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' }
      })
    );
    expect(link.download).toBe('STUDENT.docx');
    expect(link.href).toBe('blob:test-file');
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-file');
  } finally {
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    sessionStorage.clear();
  }
});

test('reports backend download errors instead of creating a download', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'File content is not available.' })
  });

  await expect(downloadProjectFile('PROJECT-1', 'FILE-1', 'STUDENT.docx'))
    .rejects.toThrow('File content is not available.');
});

test('clears persisted credentials when an authenticated API request returns 401', async () => {
  sessionStorage.setItem('student-portal-token', 'expired-token');
  sessionStorage.setItem('student-portal-session', JSON.stringify({ token: 'expired-token', identifier: 'STU001' }));
  global.fetch = jest.fn().mockResolvedValue({
    status: 401,
    ok: false,
    json: async () => ({ error: 'Invalid or expired token.' })
  });

  await expect(getAllUsers()).rejects.toThrow('Invalid or expired token.');
  expect(sessionStorage.getItem('student-portal-token')).toBeNull();
  expect(sessionStorage.getItem('student-portal-session')).toBeNull();
});

test('does not clear the current session when verifyToken rejects a different token', async () => {
  sessionStorage.setItem('student-portal-token', 'current-session-token');
  sessionStorage.setItem('student-portal-session', JSON.stringify({ token: 'current-session-token', identifier: 'STU001' }));
  global.fetch = jest.fn().mockResolvedValue({
    status: 401,
    ok: false,
    json: async () => ({ error: 'Invalid or expired token.' })
  });

  await expect(verifyToken('unrelated-token')).rejects.toThrow('Invalid or expired token.');
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/auth/verify-token'),
    expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
  );
  expect(sessionStorage.getItem('student-portal-token')).toBe('current-session-token');
  expect(JSON.parse(sessionStorage.getItem('student-portal-session')).token).toBe('current-session-token');
});

test('does not clear a newer session when an in-flight request using an older token returns 401', async () => {
  sessionStorage.setItem('student-portal-token', 'old-session-token');
  sessionStorage.setItem('student-portal-session', JSON.stringify({ token: 'old-session-token', identifier: 'STU001' }));
  let rejectResponse;
  global.fetch = jest.fn(() => new Promise((resolve) => { rejectResponse = resolve; }));

  const pendingRequest = getAllUsers();
  sessionStorage.setItem('student-portal-token', 'new-session-token');
  sessionStorage.setItem('student-portal-session', JSON.stringify({ token: 'new-session-token', identifier: 'STU002' }));
  rejectResponse({
    status: 401,
    ok: false,
    json: async () => ({ error: 'Invalid or expired token.' })
  });

  await expect(pendingRequest).rejects.toThrow('Invalid or expired token.');
  expect(sessionStorage.getItem('student-portal-token')).toBe('new-session-token');
  expect(JSON.parse(sessionStorage.getItem('student-portal-session')).identifier).toBe('STU002');
});

test('clears the current session when verifyToken rejects that same stored token', async () => {
  sessionStorage.setItem('student-portal-token', 'expired-session-token');
  sessionStorage.setItem('student-portal-session', JSON.stringify({ token: 'expired-session-token', identifier: 'STU001' }));
  global.fetch = jest.fn().mockResolvedValue({
    status: 401,
    ok: false,
    json: async () => ({ error: 'Invalid or expired token.' })
  });

  await expect(verifyToken('expired-session-token')).rejects.toThrow('Invalid or expired token.');
  expect(sessionStorage.getItem('student-portal-token')).toBeNull();
  expect(sessionStorage.getItem('student-portal-session')).toBeNull();
});

test.each([400, 403, 500])('retains credentials after an unrelated HTTP %i response', async (status) => {
  sessionStorage.setItem('student-portal-token', 'current-session-token');
  sessionStorage.setItem('student-portal-session', JSON.stringify({ token: 'current-session-token', identifier: 'STU001' }));
  global.fetch = jest.fn().mockResolvedValue({
    status,
    ok: false,
    json: async () => ({ error: 'Request failed for another reason.' })
  });

  await expect(getAllUsers()).rejects.toThrow('Request failed for another reason.');
  expect(sessionStorage.getItem('student-portal-token')).toBe('current-session-token');
  expect(sessionStorage.getItem('student-portal-session')).not.toBeNull();
  sessionStorage.clear();
});
