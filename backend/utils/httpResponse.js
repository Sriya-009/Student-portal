function sendServerError(res, _error) {
  // Database and provider errors can contain query/configuration details.
  // Keep logs credential-safe and send the same generic response contract.
  console.error('Request failed.');
  return res.status(500).json({ ok: false, error: 'An unexpected server error occurred.' });
}

module.exports = { sendServerError };
