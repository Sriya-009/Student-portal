import { BASE_URL } from '../config/api';

export async function sendChatMessage(message, history) {
  const token = sessionStorage.getItem('student-portal-token');
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ message, history })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || 'Unable to contact the assistant.');
  }
  return payload.message;
}
