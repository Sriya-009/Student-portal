const CHAT_SYSTEM_PROMPT = [
  'You are the Student Portal guidance assistant.',
  'Answer questions about using the portal clearly and briefly.',
  'Use only general guidance from the supplied conversation; do not invent portal features or policies.',
  'Do not claim to submit assignments, change records, access private data, or perform actions.',
  'Refuse requests for unauthorized private data and direct the user to the appropriate portal role or administrator.'
].join(' ');

function getChatConfig() {
  return {
    apiKey: String(process.env.AI_API_KEY || '').trim(),
    model: String(process.env.AI_MODEL || '').trim(),
    baseUrl: String(process.env.AI_API_BASE_URL || '').trim()
  };
}

function validateHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  const recentHistory = history.slice(-8);
  const isValid = recentHistory.every((item) => item
    && ['user', 'assistant'].includes(item.role)
    && typeof item.content === 'string'
    && item.content.trim()
    && item.content.length <= 4000);
  if (!isValid) {
    const error = new Error('Invalid chat history.');
    error.code = 'INVALID_CHAT_HISTORY';
    throw error;
  }
  return recentHistory.map((item) => ({ role: item.role, content: item.content.trim() }));
}

async function requestChatCompletion(message, history = []) {
  const normalizedHistory = validateHistory(history);
  const config = getChatConfig();
  if (!config.apiKey || !config.model || !config.baseUrl) {
    const error = new Error('AI assistant is not configured yet.');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  let endpoint;
  try {
    endpoint = new URL(config.baseUrl);
  } catch (_error) {
    const error = new Error('AI assistant is not configured yet.');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  if (!['http:', 'https:'].includes(endpoint.protocol)) {
    const error = new Error('AI assistant is not configured yet.');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...normalizedHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.2,
      max_tokens: 400
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    throw new Error(`AI provider returned status ${response.status}.`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI provider returned an invalid response.');
  }

  return content.trim();
}

module.exports = { requestChatCompletion, validateHistory };
