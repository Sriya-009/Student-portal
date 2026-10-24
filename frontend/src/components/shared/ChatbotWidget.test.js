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

test('opens, closes, and sends a message as plain text', async () => {
  sendChatMessage.mockResolvedValue('<script>not html</script>');
  renderWidget();

  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));
  expect(screen.getByText('Portal Assistant')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/chat message/i), {
    target: { value: 'How do I use the portal?' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));

  await waitFor(() => expect(screen.getByText('<script>not html</script>')).toBeInTheDocument());
  expect(sendChatMessage).toHaveBeenCalled();

  fireEvent.click(screen.getAllByRole('button', { name: /close chatbot/i })[0]);
  expect(screen.queryByText('Portal Assistant')).not.toBeInTheDocument();
});
