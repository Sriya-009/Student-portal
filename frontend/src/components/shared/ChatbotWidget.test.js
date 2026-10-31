import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../context/AuthContext';
import ChatbotWidget from './ChatbotWidget';
import { sendChatMessage } from '../../services/chatService';

jest.mock('../../services/chatService', () => ({
  sendChatMessage: jest.fn()
}));

function renderWidget() {
  sessionStorage.setItem(
    'student-portal-session',
    JSON.stringify({ token: 'test-token', role: 'student', identifier: 'STU001' })
  );
  return render(
    <AuthProvider>
      <ChatbotWidget />
    </AuthProvider>
  );
}

afterEach(() => {
  sessionStorage.clear();
  jest.clearAllMocks();
});

test('sends a natural-language message and displays the dynamic response', async () => {
  sendChatMessage.mockResolvedValue('Dynamic answer from Gemini.');
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));
  fireEvent.change(screen.getByLabelText(/chat message/i), { target: { value: 'Tell me something new' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));

  await waitFor(() => expect(screen.getByText('Dynamic answer from Gemini.')).toBeInTheDocument());
  expect(sendChatMessage).toHaveBeenCalledWith('Tell me something new', [
    { role: 'assistant', content: 'Hi! I can help answer questions about the Student Achievement Portal.' }
  ]);
});

test('supports follow-up messages with conversation history', async () => {
  sendChatMessage
    .mockResolvedValueOnce('First answer.')
    .mockResolvedValueOnce('Follow-up answer.');
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));

  for (const message of ['First question', 'Please explain that further']) {
    fireEvent.change(screen.getByLabelText(/chat message/i), { target: { value: message } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalledTimes(message === 'First question' ? 1 : 2));
  }

  expect(screen.getByText('Follow-up answer.')).toBeInTheDocument();
  expect(sendChatMessage.mock.calls[1][1]).toEqual([
    { role: 'assistant', content: 'Hi! I can help answer questions about the Student Achievement Portal.' },
    { role: 'user', content: 'First question' },
    { role: 'assistant', content: 'First answer.' }
  ]);
});

test('shows provider errors with retry and dismiss controls', async () => {
  sendChatMessage.mockRejectedValueOnce(new Error('The assistant is temporarily unavailable.'));
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));
  fireEvent.change(screen.getByLabelText(/chat message/i), { target: { value: 'Try this' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));

  await waitFor(() => expect(screen.getByText('The assistant is temporarily unavailable.')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByText('The assistant is temporarily unavailable.')).not.toBeInTheDocument();
});

test('retries a failed user message without duplicating it in conversation history', async () => {
  sendChatMessage
    .mockRejectedValueOnce(new Error('The assistant is temporarily unavailable.'))
    .mockResolvedValueOnce('Recovered answer.');
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));
  fireEvent.change(screen.getByLabelText(/chat message/i), { target: { value: 'Retry this question' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.getByText('Recovered answer.')).toBeInTheDocument());

  expect(sendChatMessage).toHaveBeenCalledTimes(2);
  expect(sendChatMessage.mock.calls[1]).toEqual([
    'Retry this question',
    [{ role: 'assistant', content: 'Hi! I can help answer questions about the Student Achievement Portal.' }]
  ]);
  expect(screen.getAllByText('Retry this question')).toHaveLength(1);
});

test('ignores duplicate submissions while a chatbot request is in flight', async () => {
  let finishRequest;
  sendChatMessage.mockImplementation(() => new Promise((resolve) => { finishRequest = resolve; }));
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));
  fireEvent.change(screen.getByLabelText(/chat message/i), { target: { value: 'Only send once' } });
  const form = screen.getByLabelText(/chat message/i).closest('form');

  fireEvent.submit(form);
  fireEvent.submit(form);

  expect(sendChatMessage).toHaveBeenCalledTimes(1);
  expect(screen.getAllByText('Only send once')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

  finishRequest('Single response.');
  await waitFor(() => expect(screen.getByText('Single response.')).toBeInTheDocument());
});
