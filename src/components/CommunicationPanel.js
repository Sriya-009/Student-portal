import { useState } from 'react';

function CommunicationPanel({ facultyId }) {
  const [message, setMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '1',
      from: 'STU001',
      fromName: 'Emma Johnson',
      text: 'Can I submit my project files by the extended deadline?',
      timestamp: '2026-03-19T14:30:00Z',
      read: true
    },
    {
      id: '2',
      from: 'STU002',
      fromName: 'Liam Chen',
      text: 'Need clarification on task requirements',
      timestamp: '2026-03-19T13:15:00Z',
      read: false
    }
  ]);

  const handleSendMessage = () => {
    if (message.trim() && selectedStudent) {
      const newMessage = {
        id: String(messages.length + 1),
        from: facultyId,
        fromName: 'You (Faculty)',
        text: message,
        timestamp: new Date().toISOString(),
        read: true
      };
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <section className="faculty-panel communication-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Unread Messages</h3>
          <p className="stat-value">{unreadCount}</p>
        </div>
        <div className="stat-card">
          <h3>Total Messages</h3>
          <p className="stat-value">{messages.length}</p>
        </div>
        <div className="stat-card">
          <h3>Active Chats</h3>
          <p className="stat-value">{new Set(messages.map((m) => m.from)).size}</p>
        </div>
      </div>

      <div className="panel-content">
        <div className="communication-layout">
          <div className="chat-list">
            <h3>Conversations</h3>
            <div className="chat-items">
              {Array.from(new Set(messages.map((m) => m.from))).map((studentId) => {
                const lastMsg = messages.filter((m) => m.from === studentId).slice(-1)[0];
                const isUnread = !lastMsg.read;
                return (
                  <button
                    key={studentId}
                    className={`chat-item ${isUnread ? 'unread' : ''} ${selectedStudent === studentId ? 'active' : ''}`}
                    onClick={() => setSelectedStudent(studentId)}
                  >
                    <div className="chat-name">{lastMsg.fromName}</div>
                    <div className="chat-preview">{lastMsg.text.substring(0, 40)}...</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="chat-window">
            {selectedStudent ? (
              <>
                <div className="message-area">
                  {messages
                    .filter((m) => m.from === selectedStudent)
                    .map((msg) => (
                      <div key={msg.id} className={`message ${msg.from === facultyId ? 'sent' : 'received'}`}>
                        <p className="message-text">{msg.text}</p>
                        <p className="message-time">{new Date(msg.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                </div>

                <div className="message-input">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows="3"
                    className="form-textarea"
                  />
                  <button className="btn-primary" onClick={handleSendMessage}>
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">Select a student to start conversation</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CommunicationPanel;
