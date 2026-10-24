import { fireEvent, render, screen } from '@testing-library/react';
import { AuthProvider } from '../../context/AuthContext';
import ChatbotWidget from './ChatbotWidget';
import { topics, unsupportedAnswer } from '../../services/chatKnowledge';

jest.mock('../../services/chatService', () => ({
  sendChatMessage: jest.fn(() => {
    throw new Error('The chatbot must not call the external chat service.');
  })
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

test('opens, closes, and displays all predefined questions', () => {
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));

  expect(screen.getByText('Portal Assistant')).toBeInTheDocument();
  topics.forEach(({ question }) => expect(screen.getByRole('button', { name: question })).toBeInTheDocument());

  fireEvent.click(screen.getAllByRole('button', { name: /close chatbot/i })[0]);
  expect(screen.queryByText('Portal Assistant')).not.toBeInTheDocument();
});

test('answers every predefined question locally and renders typed answers as text', () => {
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));

  topics.forEach(({ question, answer }) => {
    fireEvent.click(screen.getByRole('button', { name: question }));
    expect(screen.getByText(answer)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  });

  fireEvent.change(screen.getByLabelText(/chat message/i), { target: { value: 'What is the weather?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  expect(screen.getByText(unsupportedAnswer)).toBeInTheDocument();
});

test('clears local conversation history', () => {
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));
  fireEvent.click(screen.getByRole('button', { name: topics[0].question }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByText('Chat cleared. How can I help?')).toBeInTheDocument();
});
