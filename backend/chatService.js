const SYSTEM_PROMPT = [
  'You are the Student Achievement Portal Assistant.',
  'Help users understand this specific portal and answer general questions when useful.',
  'Use only portal features you can support from the conversation and do not invent routes, capabilities, or outcomes.',
  'Do not claim to access private student records, perform actions, change records, or send messages.',
  'When portal-specific details are uncertain, say so and direct the user to the relevant faculty or administrator.'
].join(' ');

const DEFAULT_TIMEOUT_MS = 60000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 2000;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 250;

function sanitizeProviderMessage(value, apiKey) {
  return String(value || 'Provider returned an error.')
    .replace(new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]')
    .replace(/bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[-_ ]?key|token|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

function getProviderErrorMessage(payload, response) {
  return payload?.error?.message
    || payload?.error
    || payload?.message
    || response.statusText
    || 'Provider returned an error.';
}

function createProviderError(status, message) {
  const error = new Error(`AI provider returned HTTP ${status}.`);
  error.status = status;
  if (status === 400) {
    error.code = 'AI_INVALID_REQUEST';
  } else if (status === 401) {
    error.code = 'AI_INVALID_API_KEY';
  } else if (status === 403) {
    error.code = 'AI_FORBIDDEN';
  } else if (status === 404) {
    error.code = 'AI_MODEL_OR_ENDPOINT_NOT_FOUND';
  } else if (status === 429) {
    error.code = 'AI_RATE_LIMITED';
  } else if (status === 408) {
    error.code = 'AI_TIMEOUT';
  } else if (status >= 500 && status <= 599) {
    error.code = 'AI_PROVIDER_UNAVAILABLE';
  } else {
    error.code = 'AI_PROVIDER_ERROR';
  }
  error.providerMessage = message;
  return error;
}

function getRetryConfig() {
  const attempts = Number(process.env.AI_RETRY_ATTEMPTS || DEFAULT_RETRY_ATTEMPTS);
  const delayMs = Number(process.env.AI_RETRY_DELAY_MS || DEFAULT_RETRY_DELAY_MS);
  return {
    attempts: Number.isInteger(attempts) && attempts >= 0 ? Math.min(attempts, 3) : DEFAULT_RETRY_ATTEMPTS,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? Math.min(delayMs, 5000) : DEFAULT_RETRY_DELAY_MS
  };
}

function waitForRetry(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isRetryableNetworkError(error) {
  return error?.name === 'TypeError'
    || ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH'].includes(error?.code);
}

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
  const configuredTimeoutMs = Number(process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? Math.min(configuredTimeoutMs, 120000)
    : DEFAULT_TIMEOUT_MS;
  const retryConfig = getRetryConfig();

  for (let attempt = 0; attempt <= retryConfig.attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model, messages }),
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeout);
      if (controller.signal.aborted || error.name === 'AbortError') {
        const timeoutError = new Error('AI provider request timed out.');
        timeoutError.code = 'AI_TIMEOUT';
        throw timeoutError;
      }
      if (isRetryableNetworkError(error) && attempt < retryConfig.attempts) {
        await waitForRetry(retryConfig.delayMs * (2 ** attempt));
        continue;
      }
      throw error;
    }

    let payload;
    try {
      payload = await response.json().catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') {
          const timeoutError = new Error('AI provider request timed out.');
          timeoutError.code = 'AI_TIMEOUT';
          throw timeoutError;
        }
        return {};
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.ok) {
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        const error = new Error('AI provider returned an invalid response.');
        error.code = 'AI_PROVIDER_ERROR';
        throw error;
      }
      return content.trim();
    }

    const retryableStatus = (response.status >= 500 && response.status <= 599) || response.status === 408;
    if (retryableStatus && attempt < retryConfig.attempts) {
      await waitForRetry(retryConfig.delayMs * (2 ** attempt));
      continue;
    }

    const providerMessage = sanitizeProviderMessage(getProviderErrorMessage(payload, response), apiKey);
    const error = createProviderError(response.status, providerMessage);
    console.error(`Gemini provider HTTP ${response.status} (${error.code}).`);
    throw error;
  }

  const unavailableError = new Error('AI provider is temporarily unavailable.');
  unavailableError.code = 'AI_PROVIDER_UNAVAILABLE';
  throw unavailableError;
}

module.exports = { requestChatCompletion, SYSTEM_PROMPT };
