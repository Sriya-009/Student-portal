import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sendChatMessage } from '../../services/chatService';
import './ChatbotWidget.css';

const suggestions = [
  'How do I use the Student Portal?',
  'How can I submit an assignment?',
  'How do I check project updates?',
  'How can I view feedback?',
  'How do I update my profile?'
];

function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can provide general guidance about using the Student Portal.' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryMessage, setRetryMessage] = useState('');

  if (!user) {
    return null;
  }

  const sendContent = async (content) => {
    if (!content || loading) {
      return;
    }

    setError('');
    setInput('');
    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const response = await sendChatMessage(content, nextMessages);
      setMessages((current) => [...current, { role: 'assistant', content: response }]);
      setRetryMessage('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to contact the assistant.');
      setRetryMessage(content);
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = async (event) => {
    event?.preventDefault();
    const content = input.trim();
    setInput('');
    await sendContent(content);
  };

  const retryLastMessage = async () => {
    if (!retryMessage || loading) {
      return;
    }
    setError('');
    await sendContent(retryMessage);
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
            {!messages.some((item) => item.role === 'user') ? (
              <div className="chatbot-suggestions">
                {suggestions.map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => setInput(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            {loading ? <p className="chatbot-status">Thinking…</p> : null}
            {error ? (
              <div className="chatbot-error">
                <span>{error}</span>
                <span>
                  {retryMessage ? <button type="button" onClick={retryLastMessage}>Retry</button> : null}
                  <button type="button" onClick={() => setError('')}>Dismiss</button>
                </span>
              </div>
            ) : null}
          </div>
          <form className="chatbot-form" onSubmit={submitMessage}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the portal..."
              rows={2}
              maxLength={2000}
              disabled={loading}
              aria-label="Chat message"
            />
            <div className="chatbot-actions">
              <button type="button" onClick={() => setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help?' }])}>
                Clear
              </button>
              <button type="submit" disabled={loading || !input.trim()}>Send</button>
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
