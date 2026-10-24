import { downloadProjectFile } from './authService';

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
