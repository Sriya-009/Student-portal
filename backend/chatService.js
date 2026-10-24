const SYSTEM_PROMPT = [
  'You are the Student Achievement Portal Assistant.',
  'Help users understand this specific portal and answer general questions when useful.',
  'Use only portal features you can support from the conversation and do not invent routes, capabilities, or outcomes.',
  'Do not claim to access private student records, perform actions, change records, or send messages.',
  'When portal-specific details are uncertain, say so and direct the user to the relevant faculty or administrator.'
].join(' ');

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 2000;

function getProviderConfig() {
  const apiKey = String(process.env.AI_API_KEY || '').trim();
  const model = String(process.env.AI_MODEL || '').trim();
  const baseUrl = String(process.env.AI_API_BASE_URL || '').trim();
  if (!apiKey || !model || !baseUrl) {
    const error = new Error('AI provider is not configured.');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    const error = new Error('AI provider URL is invalid.');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    const error = new Error('AI provider URL must use HTTP or HTTPS.');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }
  return { apiKey, model, baseUrl };
}

function validateHistory(history) {
  if (history === undefined) {
    return [];
  }
  if (!Array.isArray(history)) {
    const error = new Error('Chat history must be an array.');
    error.code = 'INVALID_CHAT_HISTORY';
    throw error;
  }
  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  if (recent.some((item) => (
    !item
    || !['user', 'assistant'].includes(item.role)
    || typeof item.content !== 'string'
    || !item.content.trim()
    || item.content.length > MAX_MESSAGE_LENGTH
  ))) {
    const error = new Error('Chat history contains invalid messages.');
    error.code = 'INVALID_CHAT_HISTORY';
    throw error;
  }
  return recent.map(({ role, content }) => ({ role, content: content.trim() }));
}

async function requestChatCompletion(message, history = []) {
  const { apiKey, model, baseUrl } = getProviderConfig();
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...validateHistory(history),
    { role: 'user', content: message.trim() }
  ];
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages }),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const error = new Error('AI provider usage limit reached.');
      error.code = 'AI_RATE_LIMITED';
      throw error;
    }
    if (!response.ok) {
      const error = new Error('AI provider request failed.');
      error.code = 'AI_PROVIDER_ERROR';
      throw error;
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      const error = new Error('AI provider returned an invalid response.');
      error.code = 'AI_PROVIDER_ERROR';
      throw error;
    }
    return content.trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('AI provider request timed out.');
      timeoutError.code = 'AI_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { requestChatCompletion, SYSTEM_PROMPT };
