import { useState } from 'react';

function CommunicationPanel({ facultyId, activeAction }) {
  const [message, setMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [notificationText, setNotificationText] = useState('');
  const [guidanceText, setGuidanceText] = useState('');
  const [discussionText, setDiscussionText] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [guidanceNotes, setGuidanceNotes] = useState([]);
  const [discussionPosts, setDiscussionPosts] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: '1',
      from: 'STU001',
      to: facultyId,
      fromName: 'Emma Johnson',
      text: 'Can I submit my project files by the extended deadline?',
      timestamp: '2026-03-19T14:30:00Z',
      read: true
    },
    {
      id: '2',
      from: 'STU002',
      to: facultyId,
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
        to: selectedStudent,
        fromName: 'You (Faculty)',
        text: message,
        timestamp: new Date().toISOString(),
        read: true
      };
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  const handleSendNotification = () => {
    if (!notificationText.trim()) return;
    setNotifications((prev) => [
      { id: Date.now(), text: notificationText.trim(), time: new Date().toLocaleString() },
      ...prev
    ]);
    setNotificationText('');
  };

  const handleAddGuidance = () => {
    if (!guidanceText.trim()) return;
    setGuidanceNotes((prev) => [
      { id: Date.now(), text: guidanceText.trim(), time: new Date().toLocaleString() },
      ...prev
    ]);
    setGuidanceText('');
  };

  const handleAddDiscussionPost = () => {
    if (!discussionText.trim()) return;
    setDiscussionPosts((prev) => [
      { id: Date.now(), text: discussionText.trim(), by: 'Faculty', time: new Date().toLocaleString() },
      ...prev
    ]);
    setDiscussionText('');
  };

  const unreadCount = messages.filter((m) => !m.read).length;
  const activeConversations = Array.from(new Set(messages.map((m) => (m.from === facultyId ? m.to : m.from)).filter(Boolean)));
  const filteredConversations = activeConversations.filter((studentId) => {
    const query = chatSearch.trim().toLowerCase();
    if (!query) return true;

    const lastMsg = messages
      .filter((m) => m.from === studentId || m.to === studentId)
      .slice(-1)[0];

    return (
      studentId.toLowerCase().includes(query)
      || (lastMsg?.fromName || '').toLowerCase().includes(query)
      || (lastMsg?.text || '').toLowerCase().includes(query)
    );
  });

  const showNotifications = activeAction === 'communicate-notify';
  const showGuidance = activeAction === 'communicate-guidance';
  const showDiscussion = activeAction === 'communicate-forum';
  const showHistory = activeAction === 'communicate-history';
  const showMessages = !activeAction || activeAction === 'communication-overview' || activeAction === 'communicate-message';

  const chatMessagesForSelected = messages.filter((msg) => {
    if (!selectedStudent) return false;
    return (msg.from === selectedStudent && msg.to === facultyId) || (msg.from === facultyId && msg.to === selectedStudent);
  });

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
          <p className="stat-value">{activeConversations.length}</p>
        </div>
      </div>

      <div className="panel-content">
        {showMessages && (
          <div className="communication-layout">
            <div className="chat-list">
              <h3>Conversations</h3>
              <input
                type="text"
                className="form-input"
                placeholder="Search by student ID or message"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                style={{ marginBottom: '10px' }}
              />
              <div className="chat-items">
                {filteredConversations.length === 0 ? (
                  <p className="empty-state">No conversations found for this search.</p>
                ) : filteredConversations.map((studentId) => {
                  const lastMsg = messages
                    .filter((m) => m.from === studentId || m.to === studentId)
                    .slice(-1)[0];
                  const isUnread = lastMsg ? !lastMsg.read : false;
                  return (
                    <button
                      key={studentId}
                      className={`chat-item ${isUnread ? 'unread' : ''} ${selectedStudent === studentId ? 'active' : ''}`}
                      onClick={() => setSelectedStudent(studentId)}
                    >
                      <div className="chat-name">{studentId}</div>
                      <div className="chat-preview">{lastMsg?.text?.substring(0, 40) || 'No messages yet'}...</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="chat-window">
              {selectedStudent ? (
                <>
                  <div className="message-area">
                    {chatMessagesForSelected.map((msg) => (
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
        )}

        {showNotifications && (
          <>
            <h3>Send Notifications</h3>
            <textarea
              value={notificationText}
              onChange={(e) => setNotificationText(e.target.value)}
              placeholder="Write notification for students"
              rows="3"
              className="form-textarea"
            />
            <button className="btn-primary" onClick={handleSendNotification}>Send Notification</button>
            <div className="suggestions-list" style={{ marginTop: '12px' }}>
              {notifications.length === 0 ? <p className="empty-state">No notifications sent yet.</p> : notifications.map((entry) => (
                <div className="suggestion-item" key={entry.id}>
                  <p>{entry.text}</p>
                  <p className="suggestion-meta">{entry.time}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {showGuidance && (
          <>
            <h3>Guidance Notes</h3>
            <textarea
              value={guidanceText}
              onChange={(e) => setGuidanceText(e.target.value)}
              placeholder="Add guidance note for students"
              rows="3"
              className="form-textarea"
            />
            <button className="btn-primary" onClick={handleAddGuidance}>Add Guidance Note</button>
            <div className="suggestions-list" style={{ marginTop: '12px' }}>
              {guidanceNotes.length === 0 ? <p className="empty-state">No guidance notes added yet.</p> : guidanceNotes.map((entry) => (
                <div className="suggestion-item" key={entry.id}>
                  <p>{entry.text}</p>
                  <p className="suggestion-meta">{entry.time}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {showDiscussion && (
          <>
            <h3>Discussion Board</h3>
            <textarea
              value={discussionText}
              onChange={(e) => setDiscussionText(e.target.value)}
              placeholder="Post to the faculty discussion board"
              rows="3"
              className="form-textarea"
            />
            <button className="btn-primary" onClick={handleAddDiscussionPost}>Post Discussion</button>
            <div className="suggestions-list" style={{ marginTop: '12px' }}>
              {discussionPosts.length === 0 ? <p className="empty-state">No discussion posts yet.</p> : discussionPosts.map((entry) => (
                <div className="suggestion-item" key={entry.id}>
                  <p>{entry.text}</p>
                  <p className="suggestion-meta">{entry.by} | {entry.time}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {showHistory && (
          <>
            <h3>Chat History</h3>
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.from}</td>
                    <td>{entry.to || 'N/A'}</td>
                    <td>{entry.text}</td>
                    <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}

export default CommunicationPanel;
