import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sendChatMessage } from '../../services/chatService';
import './ChatbotWidget.css';

const suggestions = [
  'How do I use the Student Achievement Portal?',
  'How can I submit an assignment?',
  'How do I check project updates?',
  'How can I view feedback?',
  'How do I update my profile?'
];
const MAX_HISTORY_MESSAGES = 10;

function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can help answer questions about the Student Achievement Portal.' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryMessage, setRetryMessage] = useState('');
  const requestInFlight = useRef(false);

  if (!user) {
    return null;
  }

  const requestAnswer = async (content, history) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await sendChatMessage(content, history);
      setMessages((current) => [...current, { role: 'assistant', content: response }]);
      setRetryMessage('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to contact the assistant.');
      setRetryMessage(content);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const sendContent = async (content) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || requestInFlight.current) {
      return;
    }

    setInput('');
    const history = messages.slice(-MAX_HISTORY_MESSAGES);
    setMessages((current) => [...current, { role: 'user', content: trimmedContent }]);
    await requestAnswer(trimmedContent, history);
  };

  const submitMessage = async (event) => {
    event?.preventDefault();
    await sendContent(input);
  };

  const retryLastMessage = async () => {
    if (!retryMessage || requestInFlight.current) {
      return;
    }
    const lastMessage = messages[messages.length - 1];
    const history = lastMessage?.role === 'user' && lastMessage.content === retryMessage
      ? messages.slice(0, -1)
      : messages;
    await requestAnswer(retryMessage, history.slice(-MAX_HISTORY_MESSAGES));
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
              {suggestions.map((suggestion) => (
                <button type="button" key={suggestion} onClick={() => sendContent(suggestion)} disabled={loading}>
                  {suggestion}
                </button>
              ))}
            </div>
            {loading ? <p className="chatbot-status">Thinking…</p> : null}
            {error ? (
              <div className="chatbot-error">
                <span>{error}</span>
                <span>
                  {retryMessage ? <button type="button" onClick={retryLastMessage} disabled={loading}>Retry</button> : null}
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
              placeholder="Ask anything about the portal..."
              rows={2}
              maxLength={2000}
              disabled={loading}
              aria-label="Chat message"
            />
            <div className="chatbot-actions">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help?' }]);
                  setError('');
                  setRetryMessage('');
                }}
              >
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
