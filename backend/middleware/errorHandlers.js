function createErrorHandlers(MulterError) {
  const uploadErrorHandler = (error, _req, res, next) => {
    if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, error: error.message || 'File too large.' });
    }
    if (error instanceof MulterError || String(error.message || '').startsWith('Invalid file type')) {
      return res.status(400).json({ ok: false, error: error.message || 'Invalid upload.' });
    }
    console.error('Upload request failed.');
    return next(error);
  };

  const unexpectedErrorHandler = (error, _req, res, _next) => {
    console.error('Unhandled request failed.');
    return res.status(500).json({ ok: false, error: 'An unexpected server error occurred.' });
  };

  return [uploadErrorHandler, unexpectedErrorHandler];
}

module.exports = { createErrorHandlers };
