import { sendChatMessage } from './chatService';

test('clears the session when an expired token is rejected by chat', async () => {
  sessionStorage.setItem('student-portal-token', 'expired-token');
  sessionStorage.setItem('student-portal-session', JSON.stringify({ token: 'expired-token' }));
  global.fetch = jest.fn().mockResolvedValue({
    status: 401,
    ok: false,
    json: async () => ({ error: 'Invalid or expired token.' })
  });

  await expect(sendChatMessage('hello', [])).rejects.toThrow('Invalid or expired token.');
  expect(sessionStorage.getItem('student-portal-token')).toBeNull();
  expect(sessionStorage.getItem('student-portal-session')).toBeNull();
});

test('limits sent history to the most recent ten messages', async () => {
  sessionStorage.setItem('student-portal-token', 'valid-token');
  global.fetch = jest.fn().mockResolvedValue({
    status: 200,
    ok: true,
    json: async () => ({ ok: true, message: 'Answer' })
  });
  const history = Array.from({ length: 14 }, (_value, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    content: `Message ${index}`
  }));

  await expect(sendChatMessage('Question', history)).resolves.toBe('Answer');
  const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(requestBody.history).toHaveLength(10);
  expect(requestBody.history[0].content).toBe('Message 4');
});

test('shows useful errors for rate limits and malformed assistant responses', async () => {
  sessionStorage.setItem('student-portal-token', 'valid-token');
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ status: 429, ok: false, json: async () => ({}) })
    .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ ok: true, message: ' ' }) });

  await expect(sendChatMessage('Question', [])).rejects.toThrow(/wait a moment/i);
  await expect(sendChatMessage('Question', [])).rejects.toThrow(/empty response/i);
});

test('reports network failures with a retryable user-facing message', async () => {
  sessionStorage.setItem('student-portal-token', 'valid-token');
  global.fetch = jest.fn().mockRejectedValue(new TypeError('internal network detail'));

  await expect(sendChatMessage('Question', [])).rejects.toThrow(/check your connection and try again/i);
});
