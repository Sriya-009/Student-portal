/**
 * Notification Service
 * Checks for upcoming due dates within 8 hours and prepares notifications
 */

const NOTIFICATION_THRESHOLD_HOURS = 8;
const LOCAL_STORAGE_KEY_NOTIFIED = 'portal-notified-events';

/**
 * Check if a due date is within the notification threshold (8 hours)
 * @param {string} dueDateTime - ISO datetime string or date string
 * @returns {boolean}
 */
export function isWithinNotificationThreshold(dueDateTime) {
  if (!dueDateTime) return false;

  const dueDate = new Date(dueDateTime);
  const now = new Date();
  const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

  return hoursUntilDue > 0 && hoursUntilDue <= NOTIFICATION_THRESHOLD_HOURS;
}

/**
 * Format time remaining until due date
 * @param {string} dueDateTime - ISO datetime string or date string
 * @returns {string}
 */
export function formatTimeRemaining(dueDateTime) {
  const dueDate = new Date(dueDateTime);
  const now = new Date();
  const diffMs = dueDate - now;

  if (diffMs < 0) return 'Overdue';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return `${minutes} minutes`;
  }
  if (hours === 1) {
    return `${hours} hour ${minutes} minutes`;
  }
  return `${hours} hours ${minutes} minutes`;
}

/**
 * Get pending notifications for a student
 * @param {Array} events - Array of submission/task events
 * @param {string} studentId - Student ID
 * @returns {Array}
 */
export function getPendingNotifications(events, studentId) {
  if (!events || events.length === 0) return [];

  const notifiedEvents = getNotifiedEvents(studentId);
  const pendingNotifications = [];

  events.forEach((event) => {
    if (!event.dueDate && !event.deadline) return;

    const dueDateTime = event.dueDate || event.deadline;
    const eventKey = `${event.id}-${studentId}`;

    // Check if already notified
    if (notifiedEvents.includes(eventKey)) return;

    // Check if within threshold
    if (isWithinNotificationThreshold(dueDateTime)) {
      pendingNotifications.push({
        id: event.id,
        eventKey,
        title: event.title,
        description: event.description || '',
        dueDate: dueDateTime,
        timeRemaining: formatTimeRemaining(dueDateTime),
        type: event.type || 'deadline'
      });
    }
  });

  return pendingNotifications;
}

/**
 * Mark event as notified to prevent duplicate notifications
 * @param {string} eventKey - Unique event key (event-id + student-id)
 * @param {string} studentId - Student ID
 */
export function markEventAsNotified(eventKey, studentId) {
  const notifiedEvents = getNotifiedEvents(studentId);
  if (!notifiedEvents.includes(eventKey)) {
    notifiedEvents.push(eventKey);
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY_NOTIFIED}-${studentId}`,
      JSON.stringify(notifiedEvents)
    );
  }
}

/**
 * Get list of already notified events for a student
 * @param {string} studentId - Student ID
 * @returns {Array}
 */
function getNotifiedEvents(studentId) {
  const stored = localStorage.getItem(`${LOCAL_STORAGE_KEY_NOTIFIED}-${studentId}`);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Clear all notified events for a student
 * @param {string} studentId - Student ID
 */
export function clearNotificationHistory(studentId) {
  localStorage.removeItem(`${LOCAL_STORAGE_KEY_NOTIFIED}-${studentId}`);
}

/**
 * Send notification to phone number
 * Mock function - replace with actual SMS service integration
 * @param {string} phoneNumber - Phone number to send to
 * @param {Object} notification - Notification object
 * @returns {Promise}
 */
export async function sendPhoneNotification(phoneNumber, notification) {
  try {
    // Mock implementation - replace with actual SMS API call
    console.log(`📱 SMS Notification to ${phoneNumber}:`, {
      title: notification.title,
      timeRemaining: notification.timeRemaining,
      message: `Your ${notification.type} "${notification.title}" is due in ${notification.timeRemaining}`
    });

    // Example: You would integrate with services like:
    // - Twilio
    // - AWS SNS
    // - Firebase Cloud Messaging
    // - Your custom SMS backend

    // const response = await fetch('/api/send-sms', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     phoneNumber,
    //     message: `Your ${notification.type} "${notification.title}" is due in ${notification.timeRemaining}`
    //   })
    // });
    // return response.json();

    // For demo purposes, we'll store in localStorage
    storeNotificationLog({
      phoneNumber,
      notification,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: 'Notification sent' };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store notification log for debugging
 * @param {Object} log - Notification log entry
 */
function storeNotificationLog(log) {
  const key = 'portal-notification-logs';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push(log);
  // Keep only last 50 logs
  if (existing.length > 50) {
    existing.shift();
  }
  localStorage.setItem(key, JSON.stringify(existing));
}

/**
 * Get all notification logs
 * @returns {Array}
 */
export function getNotificationLogs() {
  const key = 'portal-notification-logs';
  return JSON.parse(localStorage.getItem(key) || '[]');
}
