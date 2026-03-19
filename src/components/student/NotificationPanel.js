import { useEffect, useState } from 'react';
import { getPendingNotifications, markEventAsNotified } from '../../services/notificationService';
import '../../styles/notifications.css';

function NotificationPanel({ events, studentId, phoneNumber, studentName }) {
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Update notifications periodically
  useEffect(() => {
    if (!events || !studentId) return;

    const updateNotifications = () => {
      const pending = getPendingNotifications(events, studentId);
      // Filter out dismissed notifications
      const active = pending.filter(notif => !dismissedIds.includes(notif.id));
      setNotifications(active);
    };

    updateNotifications();
    // Check for new notifications every minute
    const interval = setInterval(updateNotifications, 60000);

    return () => clearInterval(interval);
  }, [events, studentId, dismissedIds]);

  // Auto-dismiss and trigger SMS when notification appears
  useEffect(() => {
    notifications.forEach((notif) => {
      // Mark as notified to prevent duplicate
      markEventAsNotified(notif.eventKey, studentId);

      // Send phone notification (mock - logs to console and localStorage)
      if (phoneNumber) {
        sendPhoneNotification(phoneNumber, notif, studentName);
      }
    });
  }, [notifications, studentId, phoneNumber, studentName]);

  const handleDismiss = (notificationId) => {
    setDismissedIds((prev) => [...prev, notificationId]);
  };

  const handleDismissAll = () => {
    const allIds = notifications.map((n) => n.id);
    setDismissedIds((prev) => [...prev, ...allIds]);
  };

  // Mock SMS sending function
  const sendPhoneNotification = (phoneNumber, notification, name) => {
    const message = `Hi ${name}, your ${notification.type} "${notification.title}" is due in ${notification.timeRemaining}. Please submit before the deadline.`;
    console.log(`📱 SMS to ${phoneNumber}: ${message}`);

    // Store in localStorage for demo/debug purposes
    const logs = JSON.parse(localStorage.getItem('portal-sms-logs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      phoneNumber,
      studentName: name,
      message,
      notification
    });
    if (logs.length > 20) logs.shift();
    localStorage.setItem('portal-sms-logs', JSON.stringify(logs));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="notification-panel" role="alert">
      <div className="notification-header">
        <button
          className="notification-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand notifications' : 'Collapse notifications'}
        >
          {isCollapsed ? '▶' : '▼'} Upcoming Due Dates ({notifications.length})
        </button>
        {!isCollapsed && (
          <button
            className="notification-dismiss-all-btn"
            onClick={handleDismissAll}
            title="Dismiss all notifications"
          >
            ✕
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="notification-list">
          {notifications.map((notif) => (
            <div key={notif.id} className="notification-item">
              <div className="notification-icon">
                <span className="icon-type">{getIconForType(notif.type)}</span>
              </div>
              <div className="notification-content">
                <h4 className="notification-title">{notif.title}</h4>
                {notif.description && (
                  <p className="notification-description">{notif.description}</p>
                )}
                <p className="notification-time">
                  <strong>Due in:</strong> <span className="time-highlight">{notif.timeRemaining}</span>
                </p>
              </div>
              <button
                className="notification-dismiss-btn"
                onClick={() => handleDismiss(notif.id)}
                title="Dismiss notification"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="notification-footer">
        <p className="notification-phone">📱 SMS notifications sent to: {phoneNumber}</p>
      </div>
    </div>
  );
}

function getIconForType(type) {
  const icons = {
    assignment: '📋',
    deadline: '⏰',
    quiz: '❓',
    exam: '📝',
    submission: '📤',
    default: '🔔'
  };
  return icons[type] || icons.default;
}

export default NotificationPanel;
