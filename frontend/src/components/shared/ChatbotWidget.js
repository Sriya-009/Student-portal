import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPredefinedChatAnswer, topics } from '../../services/chatKnowledge';
import './ChatbotWidget.css';

function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can provide general guidance about using the Student Portal.' }
  ]);

  if (!user) {
    return null;
  }

  const sendContent = (content) => {
    if (!content) {
      return;
    }

    setInput('');
    setMessages((current) => [
      ...current,
      { role: 'user', content },
      { role: 'assistant', content: getPredefinedChatAnswer(content) }
    ]);
  };

  const submitMessage = async (event) => {
    event?.preventDefault();
    const content = input.trim();
    setInput('');
    sendContent(content);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      submitMessage(event);
    }
  };

  return (
    <div className={`chatbot ${open ? 'chatbot-open' : ''}`}>
      {open ? (
        <section className="chatbot-panel" aria-label="Student Portal assistant">
          <header className="chatbot-header">
            <div>
              <strong>Portal Assistant</strong>
              <small>Guidance only</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chatbot">×</button>
          </header>
          <div className="chatbot-messages" aria-live="polite">
            {messages.map((item, index) => (
              <p className={`chatbot-message chatbot-message-${item.role}`} key={`${item.role}-${index}`}>
                {item.content}
              </p>
            ))}
            <div className="chatbot-suggestions">
              {topics.filter(({ question }) => question).map(({ question }) => (
                <button type="button" key={question} onClick={() => sendContent(question)}>
                  {question}
                </button>
              ))}
            </div>
          </div>
          <form className="chatbot-form" onSubmit={submitMessage}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the portal..."
              rows={2}
              maxLength={2000}
              aria-label="Chat message"
            />
            <div className="chatbot-actions">
              <button type="button" onClick={() => setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help?' }])}>
                Clear
              </button>
              <button type="submit" disabled={!input.trim()}>Send</button>
            </div>
          </form>
        </section>
      ) : null}
      <button className="chatbot-toggle" type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? 'Close chatbot' : 'Open chatbot'}>
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}

export default ChatbotWidget;
