# Student Portal - System Exploration Report

## Executive Summary
This React-based student portal implements a role-based project management system with three user types: Students, Faculty/Mentors, and Admins. The system supports project proposals, team collaboration, file management, grading, and profile management with a sophisticated notification system.

---

## 1. Authentication Flow (Login/Logout Mechanism)

### Login Components & Flow

**File:** [src/pages/Login.js](src/pages/Login.js)

#### Login Process:
1. **Primary Login (Students & Faculty):**
   - User enters `identifier` (roll number, email, or faculty ID) + password
   - Credentials validated against `studentCredentials` or `facultyCredentials` in `portalData.js`
   - Returns `{ id, name, email, role, rollNumber/facultyId, ... }`

2. **Secondary OTP Authentication (Admin/Staff Only):**
   - Admin/Staff login triggers OTP requirement
   - OTP sent to registered phone (masked in UI)
   - User must verify 6-digit OTP before access granted
   - OTP valid for 5 minutes; max 3 resend attempts with 30-second cooldown

#### Key Features:
- Role-based routing after login:
  - `'admin'` → `/admin`
  - `'faculty'` → `/faculty`
  - `'student'` → `/student`
- **OTP Demo Mode:** Shows demo OTP on login page for testing
- **Forgot Password:** Password reset link generation (mock implementation)
- **Resend OTP:** With cooldown timer and attempt limiting

#### Login State Tracked by:
- `AuthContext` via `useAuth()` hook
- `otpSessions` Map in `authService.js` (in-memory storage)

---

## 2. Authentication Service

**File:** [src/services/authService.js](src/services/authService.js)

### Core Functions:

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `loginUser(identifier, password)` | Validates credentials & initiates login | roll/email/id + password | User object or OTP session |
| `verifyStaffOtp(otpSessionId, otpCode)` | Verifies OTP for staff access | session ID + 6-digit code | Authenticated user object |
| `resendOtp(otpSessionId)` | Resends OTP with rate limiting | session ID | New masked phone + demo OTP |
| `requestPasswordReset(identifier)` | Initiates password reset | email/roll/id | Success message (mock) |
| `signupUser(name, email, password, role)` | Creates new user account | credentials + role | New user object |

### Credential Storage:

**Students:**
```javascript
studentCredentials: [
  { rollNumber: 'STU001', password: 'student123' },
  { rollNumber: 'STU002', password: 'student123' },
  // ... more students
]
```

**Faculty:**
```javascript
facultyCredentials: [
  { facultyId: 'MENTOR-001', password: 'faculty123' },
  { facultyId: 'MENTOR-002', password: 'faculty123' },
  // ... more faculty
]
```

**Admin/Staff:**
```javascript
users: [
  { id: 1, name: 'Admin User', email: 'admin', password: 'admin123', 
    role: 'admin', phone: '+91 98765 12345' },
  { id: 2, name: 'Faculty User', email: 'faculty@school.com', 
    password: 'faculty123', role: 'faculty', phone: '+91 91234 56789' }
]
```

### Validation & Sanitization:
- **Input Sanitization:** `sanitizeText()` removes `<>` characters and trims whitespace
- **Case Handling:** All identifiers normalized to lowercase for matching
- **Password Storage:** Credentials stored in plaintext (not hashed - for demo purposes)
- **Phone Number Masking:** Masks all but last 4 digits for OTP display

---

## 3. Auth Context

**File:** [src/context/AuthContext.js](src/context/AuthContext.js)

### State Management:
```javascript
const [user, setUser] = useState(null);
```

### Memoized Context Methods:
```javascript
{
  user,                    // Current logged-in user
  login(identifier, password),
  verifyOtp(otpSessionId, otpCode),
  signup(name, email, password, role),
  logout(),
  resendOtp(otpSessionId),
  forgotPassword(identifier)
}
```

### Key Implementation:
- Uses React Context API for global auth state
- `useAuth()` hook for accessing auth methods throughout app
- Stateless logout (just clears user state)
- User persists in memory only (no localStorage)

---

## 4. User Data Structure

### Student Profile Fields:
```javascript
{
  id: 'STU001',
  rollNumber: 'STU001',
  name: 'Emma Johnson',
  email: 'emma.johnson@school.edu',
  department: 'Computer Science',
  grade: '10th Grade',
  initials: 'E',
  phoneNumber: '+1-555-0101'
}
```

**Current Students:** 4 (STU001 - STU004)

### Faculty/Mentor Profile Fields:
```javascript
{
  id: 'MENTOR-001',
  name: 'Dr. Michael Kumar',
  email: 'michael.kumar@school.edu',
  department: 'Engineering',
  specialization: 'Cloud Computing',
  initials: 'MK',
  phoneNumber: '+1-555-0200',
  assignedProjects: ['BTECH-PRJ-001', ...],
  assignedStudents: ['STU003', 'STU004']
}
```

**Current Mentors:** 3 (MENTOR-001 to MENTOR-003)

### Profile Update Request Data:
```javascript
{
  id: 'UPD-001',
  userId: 'STU001',
  userType: 'student',
  currentData: { name, email, phoneNumber },
  proposedData: { name, email, phoneNumber },
  status: 'pending' | 'approved' | 'rejected',
  reason: 'string',
  requestedDate: '2026-03-18',
  reviewedDate: null,
  reviewedBy: null,
  adminComment: ''
}
```

---

## 5. Profile Management

### Student Profile Page
**File:** [src/pages/StudentProfile.js](src/pages/StudentProfile.js)

#### Features:
- ✅ View profile in read-only mode
- ✅ Request profile updates (not immediate - requires admin approval)
- ✅ Cannot edit restricted fields: `id`, `rollNumber`, `grade`, `initials`
- ✅ Editable fields: `name`, `email`, `phoneNumber`
- ✅ Show pending update requests with status
- ✅ Validation: Must provide reason for update + detect actual changes

#### Workflow:
1. User clicks "Edit Profile"
2. Form opens with current data pre-filled
3. User modifies fields and provides reason
4. Submit → Creates `profileUpdateRequest` in pending state
5. Admin reviews and approves/rejects
6. User notified of decision

#### Current Pending Requests:
- STU001 has pending update: email & phone change

### Faculty Profile Page
**File:** [src/pages/FacultyProfile.js](src/pages/FacultyProfile.js)

#### Features:
- ✅ Same as student profile
- ✅ View: name, email, department, specialization, phone, assigned students
- ✅ Cannot edit: `id`, `assignedProjects`, `assignedStudents`, `initials`
- ✅ Editable: `name`, `email`, `phoneNumber`, `specialization`
- ✅ Display count of assigned students

---

## 6. Notification System

### Notification Service
**File:** [src/services/notificationService.js](src/services/notificationService.js)

#### Core Functionality:

**Notification Threshold:** 8 hours before deadline

#### Key Functions:

| Function | Purpose |
|----------|---------|
| `getPendingNotifications(events, studentId)` | Filters events due within 8 hours |
| `isWithinNotificationThreshold(dueDateTime)` | Checks if event in 8-hour window |
| `formatTimeRemaining(dueDateTime)` | Formats countdown text (e.g., "3 hours 45 minutes") |
| `markEventAsNotified(eventKey, studentId)` | Prevents duplicate notifications |
| `clearNotificationHistory(studentId)` | Resets notification tracking |
| `sendPhoneNotification(phoneNumber, notification)` | Mock SMS sender |
| `getNotificationLogs()` | Retrieves notification history |

### Duplicate Prevention:
- Uses localStorage keys: `portal-notified-events-{studentId}`
- Tracks unique event keys: `{eventId}-{studentId}`
- Once marked as notified, event won't trigger again unless cleared

### SMS Notification (Mock):
- **Logs to localStorage:** `portal-sms-logs` (max 20 entries)
- **Console output:** `📱 SMS to {number}: {message}`
- **Ready for integration:** Comments show how to integrate Twilio/AWS SNS

### Notification Object Structure:
```javascript
{
  id: 'event-id',
  eventKey: 'event-id-student-id',
  title: 'Task title',
  description: 'optional description',
  dueDate: 'ISO datetime string',
  timeRemaining: '3 hours 45 minutes',
  type: 'deadline' | 'submission' | 'task'
}
```

### Notification Panel Component
**File:** [src/components/student/NotificationPanel.js](src/components/student/NotificationPanel.js)

#### Features:
- ✅ Collapsible notification panel with badge count
- ✅ Dismiss individual notifications
- ✅ Dismiss all button
- ✅ Auto-triggers SMS on notification appearance
- ✅ Updates every 60 seconds
- ✅ Filters out dismissed notifications
- ✅ Shows time remaining in human-readable format

#### Props Required:
```javascript
{
  events: Array,          // Submission/task events with deadlines
  studentId: String,      // Student ID for notification tracking
  phoneNumber: String,    // For SMS (mock implementation)
  studentName: String     // For SMS message personalization
}
```

---

## 7. Existing Validation & Duplicate Checking

### Input Validation:

#### 1. **Text Sanitization** (authService.js & projectPortalService.js)
```javascript
function sanitizeText(text) {
  return String(text || '').replace(/[<>]/g, '').trim();
}
```
- Removes `<>` characters to prevent script injection
- Trims whitespace
- Applied to: names, emails, descriptions, titles, comments, grades

#### 2. **Login Validation**
- Roll number/email/ID normalized to lowercase
- Exact password match required
- User must be in active state
- OTP expiration: 5 minutes
- OTP attempt: max 6 digits

#### 3. **Profile Update Validation** (StudentProfile.js & FacultyProfile.js)
```javascript
const hasChanges = Object.keys(formData).some((key) => {
  return key !== 'id' && key !== 'rollNumber' && 
         key !== 'grade' && key !== 'initials' && 
         formData[key] !== currentStudent[key];
});
```
- Detects if user actually changed any data
- Prevents empty update submissions
- Requires reason/comment for audit trail

#### 4. **Duplicate Detection**
- **Email Uniqueness:** `projectPortalService.js` checks `findUserByEmail(email)` - throws error if exists
- **Roll Number Uniqueness:** Implied (matches against fixed `studentCredentials` array)
- **Notification Deduplication:** localStorage tracking prevents re-triggering same event

#### 5. **OTP Validation**
- Must be exactly 6 digits
- Case-insensitive (trimmed before comparison)
- Time-based expiration (300 seconds)
- Invalid OTP shows error; doesn't lock account

#### 6. **Password Reset Validation**
```javascript
export function requestPasswordReset(identifier) {
  const studentExists = studentCredentials.some(...) || students.some(...);
  const facultyExists = facultyCredentials.some(...) || mentors.some(...);
  const staffExists = users.some(...);
  
  if (!studentExists && !facultyExists && !staffExists) {
    throw new Error('No account found for this identifier.');
  }
  // ...
}
```
- Validates identifier exists in system before reset
- Returns generic success message (security: doesn't reveal if user exists)

### Authorization Checks:

**In projectPortalService.js:**
```javascript
function canManageProject(actor, project) {
  const role = normalizeRole(actor.role);
  if (role === 'admin') return true;
  if (role === 'mentor' && project.mentorId === actor.id) return true;
  if (role === 'student' && project.ownerId === actor.id) return true;
  return false;
}
```

---

## 8. Project & Task Management

### Projects Structure:
```javascript
{
  id: 'BTECH-PRJ-001',
  name: 'AI-Based Attendance System',
  description: 'Face recognition attendance system...',
  ownerId: 'STU001',
  projectLeadId: 'STU001',
  mentorId: null,
  teamMemberIds: ['STU001', 'STU002'],
  teamMembers: [{ id, name, role }, ...],
  status: 'ongoing' | 'completed' | 'on-hold',
  progressPercent: 65,
  createdDate: '2026-01-15',
  deadline: '2026-05-30',
  technologies: ['Python', 'OpenCV', 'TensorFlow']
}
```

### Tasks Structure:
```javascript
{
  id: 'TSK-001',
  projectId: 'BTECH-PRJ-001',
  title: 'Dataset Collection & Preprocessing',
  description: '...',
  assignedToId: 'STU001',
  assignedToName: 'Emma Johnson',
  createdByLeadId: 'STU001',
  deadline: '2026-04-15',
  status: 'in_progress' | 'pending' | 'completed',
  contributionPercent: 40,
  createdDate: '2026-03-15'
}
```

### Project Grades Structure:
```javascript
{
  id: 'GRADE-001',
  projectId: 'BTECH-PRJ-001',
  studentId: 'STU001',
  proposalMark: 18,
  progressMark: 0,
  implementationMark: 0,
  finalSubmissionMark: 0,
  totalMark: 18,
  maxMark: 100,
  status: 'in-progress' | 'completed',
  evaluatedBy: 'MENTOR-001',
  evaluationDate: '2026-03-15',
  comments: 'Good progress so far...'
}
```

---

## 9. File Management

### Files Structure:
```javascript
{
  id: 'FILE-001',
  projectId: 'BTECH-PRJ-001',
  fileName: 'Dataset_Preprocessing.zip',
  fileSize: 2048576,
  fileType: 'archive' | 'document' | 'code' | 'presentation',
  mimeType: 'application/zip',
  uploadedBy: 'STU001',
  uploadedByName: 'Emma Johnson',
  uploadedDate: '2026-03-15',
  version: 1,
  description: 'Cleaned facial dataset with 5000 images',
  downloadCount: 2,
  isSubmitted: false
}
```

**Current Files:** 5 uploaded (mixture of code, docs, presentations)

---

## 10. Test Credentials

### Student Login:
- **Roll Number:** STU001-STU004
- **Password:** `student123`

### Faculty Login:
- **Faculty ID:** MENTOR-001 to MENTOR-003
- **Password:** `faculty123`

### Admin/Staff Login:
- **Email:** `admin` or `faculty@school.com`
- **Password:** `admin123` or `faculty123`
- **Requires OTP:** Yes (demo OTP shown on login page)
- **Demo Phone:** `+91 98765 12345` (masked as `*** *** 2345`)

---

## 11. Current System State

### Active Users:
- **Students:** 4 (Emma Johnson, Liam Chen, Sophia Martinez, Noah Patel)
- **Faculty:** 3 (Dr. Michael Kumar, Dr. Priya Singh, Dr. Rachel Chen)
- **Admin:** 1 (Admin User)

### Active Projects:
- 4 ongoing projects (ranging from 20% to 65% complete)
- 4 project proposals (3 approved, 1 pending)

### Pending Tasks:
- 5 tasks across projects (mix of in_progress and pending)

### Pending Profile Updates:
- 1 pending (STU001 email & phone change)

### Notifications Ready:
- System monitors events with deadlines
- Triggers SMS + UI notification 8 hours before due date
- Prevents duplicate alerts using localStorage tracking

---

## 12. Architecture Summary

```
┌─ Authentication Layer ─────────────────────────┐
│                                               │
│  Login.js → AuthContext → authService.js     │
│                                               │
│  Storage: In-memory (auth state)             │
│  OTP Sessions: localStorage (5 min expiry)   │
└───────────────────────────────────────────────┘
                        ↓
┌─ User Profile Management ──────────────────────┐
│                                               │
│  StudentProfile.js / FacultyProfile.js       │
│  ↓                                           │
│  portalData.js (user records)               │
│  profileUpdateRequests (approval workflow)   │
│                                               │
└───────────────────────────────────────────────┘
                        ↓
┌─ Project Management ───────────────────────────┐
│                                               │
│  Dashboard Components                        │
│  ↓ ↓ ↓                                       │
│  Projects, Tasks, Files, Grades             │
│  ↓                                           │
│  projectPortalService.js                    │
│  (CRUD operations, authorization)           │
│                                               │
└───────────────────────────────────────────────┘
                        ↓
┌─ Notification System ──────────────────────────┐
│                                               │
│  NotificationPanel.js                        │
│  ↓                                           │
│  notificationService.js                      │
│  ↓                                           │
│  localStorage (SMS logs, notified events)   │
│                                               │
└───────────────────────────────────────────────┘
```

---

## 13. Key Observations & Notes

1. **Authentication:**
   - Simple in-memory OTP sessions (no backend required)
   - Passwords stored in plaintext (demo/dev only)
   - Role-based routing works smoothly

2. **Profile Management:**
   - Well-designed approval workflow for data changes
   - Prevents users from changing critical fields (roll number, grade, etc.)
   - Reason/comment required for audit trail

3. **Notifications:**
   - Clever duplicate prevention using event keys
   - Mock SMS ready for real integration
   - 8-hour threshold configurable
   - Decoupled from authentication (works independently)

4. **Data Validation:**
   - Input sanitization prevents XSS
   - Email uniqueness enforced at service level
   - Change detection prevents empty updates
   - OTP rate-limiting prevents brute force

5. **Limitations/Gaps:**
   - No persistent authentication (no JWT/session tokens)
   - Credentials in plaintext (not production-ready)
   - In-memory OTP storage (lost on page refresh)
   - No backend API (all client-side logic)
   - Profile updates not actually persisted (mock implementation)

---

## Ready for Feature Development

This exploration provides a complete picture of the current system. You now have:
- ✅ Full auth flow understanding
- ✅ User data structures mapped
- ✅ Validation & duplicate checking logic documented
- ✅ Notification system architecture
- ✅ Profile management workflow
- ✅ Test credentials for all roles

**Next Steps:** Ready to add new features, enhance validation, or integrate with backend services.
