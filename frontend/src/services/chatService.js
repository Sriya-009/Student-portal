import { BASE_URL } from '../config/api';
import { handleExpiredAuthentication } from './authService';

const MAX_HISTORY_MESSAGES = 10;

export async function sendChatMessage(message, history) {
  const token = sessionStorage.getItem('student-portal-token');
  let response;
  try {
    response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        message,
        history: Array.isArray(history) ? history.slice(-MAX_HISTORY_MESSAGES) : history
      })
    });
  } catch (_error) {
    throw new Error('Unable to reach the assistant. Check your connection and try again.');
  }
  if (response.status === 401) handleExpiredAuthentication(token);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    if (response.status === 429) {
      throw new Error('Too many chat requests. Please wait a moment and try again.');
    }
    if (response.status === 504) {
      throw new Error('The assistant took too long to respond. Please try again.');
    }
    throw new Error(payload.error || 'Unable to contact the assistant.');
  }
  if (typeof payload.message !== 'string' || !payload.message.trim()) {
    throw new Error('The assistant returned an empty response. Please try again.');
  }
  return payload.message;
}
