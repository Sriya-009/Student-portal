function createChatController({ requestChatCompletion }) {
  return async function chatController(req, res) {
    const { message, history } = req.body || {};
    if (typeof message !== 'string' || !message.trim() || message.length > 2000) {
      return res.status(400).json({ ok: false, error: 'message must be a non-empty string under 2000 characters.' });
    }
    if (history !== undefined && !Array.isArray(history)) {
      return res.status(400).json({ ok: false, error: 'history must be an array.' });
    }
    if (JSON.stringify({ message, history }).length > 32000) {
      return res.status(413).json({ ok: false, error: 'Chat request is too large.' });
    }

    try {
      const response = await requestChatCompletion(message.trim(), history);
      return res.json({ ok: true, message: response });
    } catch (error) {
      if (error.code === 'INVALID_CHAT_HISTORY') {
        return res.status(400).json({ ok: false, error: 'history contains invalid messages.' });
      }
      if (error.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({ ok: false, error: 'The assistant is not configured yet.' });
      }
      if (error.code === 'AI_TIMEOUT') {
        return res.status(504).json({ ok: false, error: 'The assistant took too long to respond. Please try again.' });
      }
      if (error.code === 'AI_RATE_LIMITED') {
        return res.status(429).json({ ok: false, error: 'The assistant usage limit has been reached. Please try again later.' });
      }
      if (error.code === 'AI_INVALID_REQUEST') {
        return res.status(502).json({ ok: false, code: error.code, error: 'The assistant provider rejected the request as invalid.' });
      }
      if (error.code === 'AI_INVALID_API_KEY') {
        return res.status(502).json({ ok: false, code: error.code, error: 'The assistant provider authentication is invalid.' });
      }
      if (error.code === 'AI_FORBIDDEN') {
        return res.status(502).json({ ok: false, code: error.code, error: 'The assistant provider denied this request.' });
      }
      if (error.code === 'AI_MODEL_OR_ENDPOINT_NOT_FOUND') {
        return res.status(502).json({ ok: false, code: error.code, error: 'The assistant model or endpoint was not found.' });
      }
      if (error.code === 'AI_PROVIDER_UNAVAILABLE') {
        return res.status(503).json({ ok: false, code: error.code, error: 'The assistant provider is temporarily unavailable.' });
      }
      if (error.code === 'AI_PROVIDER_ERROR') {
        return res.status(502).json({ ok: false, error: 'The assistant returned an invalid response. Please try again.' });
      }
      console.error('Chat provider request failed:', error.message);
      return res.status(502).json({ ok: false, error: 'The assistant is temporarily unavailable.' });
    }
  };
}

module.exports = { createChatController };
