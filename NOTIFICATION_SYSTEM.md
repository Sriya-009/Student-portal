# Notification System Implementation

## Overview
The notification system alerts students when their assignment/task due dates are within **8 hours**. Notifications are sent to students' registered phone numbers via SMS.

## What Changed

### 1. **Cleared Calendar Data**
- ✅ `submissionEvents` array is now cleared
- ✅ Calendar will show empty until new events are added

### 2. **Added Phone Numbers to Students**
All students now have registered phone numbers in `src/data/portalData.js`:
- Emma Johnson: `+1-555-0101`
- Liam Chen: `+1-555-0102`
- Sophia Martinez: `+1-555-0103`
- Noah Patel: `+1-555-0104`

### 3. **Created Notification Service** (`src/services/notificationService.js`)
Core functions for managing notifications:

- **`isWithinNotificationThreshold(dueDateTime)`**
  - Checks if a due date is within 8 hours
  - Returns `true/false`

- **`formatTimeRemaining(dueDateTime)`**
  - Formats remaining time (e.g., "2 hours 30 minutes")

- **`getPendingNotifications(events, studentId)`**
  - Gets all notifications for a student that are within 8-hour threshold
  - Prevents duplicate notifications using localStorage

- **`markEventAsNotified(eventKey, studentId)`**
  - Marks an event as notified to prevent duplicates

- **`sendPhoneNotification(phoneNumber, notification)`**
  - Mock SMS sending function (logs to console and localStorage)
  - Ready to integrate with SMS services like Twilio, AWS SNS, etc.

- **`getNotificationLogs()`**
  - Retrieves all sent notifications for debugging

### 4. **Created Notification Panel Component** (`src/components/NotificationPanel.js`)
Visual component displaying upcoming deadlines:

**Features:**
- Shows all notifications within 8-hour threshold
- Displays time remaining until deadline
- Collapsible interface to minimize screen space
- Dismiss individual or all notifications
- Shows registered phone number for verification
- Updates every minute to refresh time remaining
- Auto-sends SMS when notification appears

**Notification Types:**
- 📋 Assignment
- ⏰ Deadline
- ❓ Quiz
- 📝 Exam
- 📤 Submission

### 5. **Added Notification Styles** (`src/styles/notifications.css`)
- Warning/alert color scheme (orange gradient background)
- Dark mode support
- Responsive design for mobile/tablet
- Collapsible header with notification count
- Individual dismiss buttons
- Smooth animations and transitions

### 6. **Integrated into StudentDashboard**
- NotificationPanel displays at top of main content area
- Checks `submissionEvents` for upcoming deadlines
- Automatically sends SMS to registered phone number
- Prevents duplicate notifications using event keys

## How It Works

### **For Developers:**

1. **Add an event with a due date:**
```javascript
{
  id: 'TASK-001',
  title: 'Math Assignment',
  description: 'Chapter 5 problems',
  dueDate: '2026-03-20T15:00:00Z',  // ISO datetime string
  type: 'assignment'
}
```

2. **The system automatically:**
   - Calculates if due date is within 8 hours
   - Creates a notification entry
   - Sends SMS to student's phone
   - Prevents duplicate sending for same event

3. **Notifications persist** in `localStorage` under keys:
   - `portal-notified-events-{studentId}` - List of already-notified events
   - `portal-sms-logs` - History of SMS sent

### **For Students:**

1. When login to dashboard, NotificationPanel appears automatically
2. Shows all assignments/tasks due within 8 hours
3. SMS notification automatically sent to registered phone
4. Can dismiss individual notifications or collapse panel
5. Panel updates every minute with fresh countdown

## SMS Integration Ready

The current implementation **logs to console and localStorage** for demo purposes. To enable real SMS:

**Replace in `notificationService.js` (`sendPhoneNotification` function):**

### Option 1: Twilio Integration
```javascript
const twilio = require('twilio');
const client = twilio(accountSid, authToken);

client.messages.create({
  body: message,
  from: '+1XXXXXXXXXX',  // Your Twilio number
  to: phoneNumber
});
```

### Option 2: AWS SNS Integration
```javascript
const AWS = require('aws-sdk');
const sns = new AWS.SNS();

sns.publish({
  Message: message,
  PhoneNumber: phoneNumber
}).promise();
```

### Option 3: Firebase Cloud Messaging
```javascript
firebase.messaging().send({
  notification: { title, body: message },
  android: { priority: 'high' }
});
```

### Option 4: Custom Backend API
```javascript
fetch('/api/send-sms', {
  method: 'POST',
  body: JSON.stringify({ phoneNumber, message })
});
```

## Testing the System

### Current Setup:
- **Sample events** with due dates are pre-loaded (4-7 hours from now)
- **Phone numbers** already added to all students
- **Notifications panel** visible after login

To test:
1. Login as any student
2. Notification panel appears showing upcoming deadlines
3. SMS log appears in browser console and localStorage
4. Check `localStorage.getItem('portal-sms-logs')` to see sent notifications

## Data Structure

### Event Object (with notifications):
```javascript
{
  id: string,           // Unique ID
  title: string,        // Event title
  description?: string, // Optional
  dueDate: string,      // ISO datetime (critical for notifications)
  type: string,         // 'assignment', 'deadline', 'quiz', 'exam', 'submission'
  course?: string       // Optional course name
}
```

Note: Calendar uses `date` field (YYYY-MM-DD), notifications use `dueDate` field (ISO datetime).

## Notification Threshold
- **Default: 8 hours**
- Located in: `src/services/notificationService.js` line 4
- To change: `const NOTIFICATION_THRESHOLD_HOURS = X;`

## Files Modified/Created

| File | Change | Purpose |
|------|--------|---------|
| `src/data/portalData.js` | Added phoneNumber to students, cleared calendar, added sample events | Data source |
| `src/services/notificationService.js` | **NEW** | Notification logic & SMS integration |
| `src/components/NotificationPanel.js` | **NEW** | UI component for notifications |
| `src/styles/notifications.css` | **NEW** | Notification styling |
| `src/pages/StudentDashboard.js` | Added NotificationPanel import & render | Integration |

## Features Summary

✅ Clears calendar dates and dues  
✅ Detects deadlines within 8 hours  
✅ Sends SMS to registered phone numbers  
✅ Prevents duplicate notifications  
✅ Collapsible notification panel  
✅ Dark mode support  
✅ Responsive design  
✅ Persistent notification history  
✅ Ready for SMS service integration  
✅ Professional UI with icons and formatting  

---

**Build Status:** ✅ Compiled successfully  
**File Size:** 75.93 kB (JS) + 4.28 kB (CSS)
