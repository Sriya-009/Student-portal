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
  topics.filter(({ question }) => question).forEach(({ question }) => {
    expect(screen.getByRole('button', { name: question })).toBeInTheDocument();
  });

  fireEvent.click(screen.getAllByRole('button', { name: /close chatbot/i })[0]);
  expect(screen.queryByText('Portal Assistant')).not.toBeInTheDocument();
});

test('keeps suggestions available after each answer and answers question variations locally', () => {
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));

  const variations = [
    ['How can I view feedback?', topics[0].answer],
    ['HOW TO ACCESS MY PROJECT FILES', topics[2].answer],
    ['where do I submit my files', topics[3].answer],
    ['How can I view my assignments?', topics[4].answer],
    ['how do i check my attendance', topics[5].answer],
    ['How can I view my grades?', topics[6].answer],
    ['how do i update my profile', topics[7].answer],
    ['how can i contact faculty', topics[9].answer],
    ['What should I do if I cannot log in?', topics[10].answer]
  ];

  variations.forEach(([question, answer]) => {
    fireEvent.change(screen.getByLabelText(/chat message/i), { target: { value: question } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByText(answer)).toBeInTheDocument();
    topics.filter(({ question: suggestedQuestion }) => suggestedQuestion).forEach(({ question: suggestedQuestion }) => {
      expect(screen.getByRole('button', { name: suggestedQuestion })).toBeInTheDocument();
    });
  });

  topics.filter(({ question }) => question).slice(0, 2).forEach(({ question, answer }) => {
    fireEvent.click(screen.getByRole('button', { name: question }));
    expect(screen.getAllByText(answer).length).toBeGreaterThan(0);
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

test('answers logout question variations locally', () => {
  renderWidget();
  fireEvent.click(screen.getByRole('button', { name: /open chatbot/i }));

  ['How do I logout?', 'How can I sign out?', 'Where is the logout button?'].forEach((question) => {
    fireEvent.change(screen.getByLabelText(/chat message/i), { target: { value: question } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  });

  expect(screen.getAllByText('Click the Logout button on the right side of the top navigation bar, next to your profile and role.')).toHaveLength(3);
});
