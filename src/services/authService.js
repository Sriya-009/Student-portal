import { studentCredentials, students, facultyCredentials, mentors } from '../data/portalData';

const users = [
  { id: 1, name: 'Admin User', email: 'admin', password: 'admin123', role: 'admin', phone: '+91 98765 12345' },
  { id: 2, name: 'Faculty User', email: 'faculty@school.com', password: 'faculty123', role: 'faculty', phone: '+91 91234 56789' }
];

const otpSessions = new Map();
const lastIssuedOtpByUser = new Map();

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueUniqueOtp(userKey, previousOtp = '') {
  let otpCode = generateOtpCode();
  const lastIssued = lastIssuedOtpByUser.get(userKey);

  while (otpCode === previousOtp || otpCode === lastIssued) {
    otpCode = generateOtpCode();
  }

  lastIssuedOtpByUser.set(userKey, otpCode);
  return otpCode;
}

function maskPhone(phoneNumber) {
  const digits = (phoneNumber || '').replace(/\D/g, '');
  if (!digits) {
    return '*** *** ****';
  }
  const lastFour = digits.slice(-4);
  return `*** *** ${lastFour}`;
}

export function loginUser(identifier, password) {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  // Check student credentials
  const studentCredential = studentCredentials.find(
    (item) => item.rollNumber.toLowerCase() === normalizedIdentifier && item.password === password
  );

  if (studentCredential) {
    const student = students.find((item) => item.rollNumber === studentCredential.rollNumber);

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student',
      rollNumber: student.rollNumber,
      grade: student.grade,
      initials: student.initials
    };
  }

  // Check faculty credentials
  const facultyCredential = facultyCredentials.find(
    (item) => item.facultyId.toLowerCase() === normalizedIdentifier && item.password === password
  );

  if (facultyCredential) {
    const mentor = mentors.find((item) => item.id === facultyCredential.facultyId);
    if (mentor) {
      const userKey = `faculty-${mentor.id}`;
      const otpCode = issueUniqueOtp(userKey);
      const otpSessionId = `otp-faculty-${mentor.id}-${Date.now()}`;
      
      otpSessions.set(otpSessionId, {
        userId: mentor.id,
        role: 'faculty',
        userKey,
        otpCode,
        expiresAt: Date.now() + (5 * 60 * 1000)
      });

      return {
        requiresOtp: true,
        otpSessionId,
        maskedPhone: maskPhone(mentor.phoneNumber || mentor.phone || ''),
        role: 'faculty',
        demoOtp: otpCode,
        expiresAt: otpSessions.get(otpSessionId).expiresAt
      };
    }
  }

  // Check other staff users
  const staffUser = users.find(
    (item) => item.email.toLowerCase() === normalizedIdentifier && item.password === password
  );

  if (staffUser) {
    const userKey = `staff-${staffUser.id}`;
    const otpCode = issueUniqueOtp(userKey);
    const otpSessionId = `otp-${staffUser.id}-${Date.now()}`;

    otpSessions.set(otpSessionId, {
      userId: staffUser.id,
      role: staffUser.role,
      userKey,
      otpCode,
      expiresAt: Date.now() + (5 * 60 * 1000)
    });

    return {
      requiresOtp: true,
      otpSessionId,
      maskedPhone: maskPhone(staffUser.phone),
      role: staffUser.role,
      demoOtp: otpCode,
      expiresAt: otpSessions.get(otpSessionId).expiresAt
    };
  }

  throw new Error('Invalid credentials');
}

export function verifyStaffOtp(otpSessionId, otpCode) {
  const session = otpSessions.get(otpSessionId);

  if (!session) {
    throw new Error('OTP session expired. Please login again.');
  }

  if (Date.now() > session.expiresAt) {
    otpSessions.delete(otpSessionId);
    throw new Error('OTP expired. Please login again.');
  }

  if (session.otpCode !== otpCode.trim()) {
    throw new Error('Invalid OTP code');
  }

  otpSessions.delete(otpSessionId);

  // Handle faculty OTP verification
  if (session.role === 'faculty') {
    const mentor = mentors.find((item) => item.id === session.userId);
    if (!mentor) {
      throw new Error('Faculty not found. Please login again.');
    }
    return {
      id: mentor.id,
      name: mentor.name,
      email: mentor.email,
      role: 'faculty',
      facultyId: mentor.id,
      department: mentor.department,
      specialization: mentor.specialization,
      initials: mentor.initials
    };
  }

  // Handle admin/staff OTP verification
  const staffUser = users.find((item) => item.id === session.userId);

  if (!staffUser) {
    throw new Error('Unable to complete login');
  }

  return {
    id: staffUser.id,
    name: staffUser.name,
    email: staffUser.email,
    role: staffUser.role
  };
}

export function resendOtp(otpSessionId) {
  const session = otpSessions.get(otpSessionId);

  if (!session) {
    throw new Error('OTP session expired. Please login again with credentials.');
  }

  if (!session.resendCount) {
    session.resendCount = 0;
  }

  if (session.resendCount >= 3) {
    throw new Error('Maximum resend attempts reached. Please login again.');
  }

  const now = Date.now();
  if (session.lastResendTime && now - session.lastResendTime < 30000) {
    const secondsRemaining = Math.ceil((30000 - (now - session.lastResendTime)) / 1000);
    throw new Error(`Please wait ${secondsRemaining} seconds before requesting another OTP.`);
  }

  const userKey = session.userKey || `${session.role || 'staff'}-${session.userId}`;
  const newOtpCode = issueUniqueOtp(userKey, session.otpCode);

  session.otpCode = newOtpCode;
  session.expiresAt = Date.now() + (5 * 60 * 1000);
  session.resendCount += 1;
  session.lastResendTime = Date.now();

  otpSessions.set(otpSessionId, session);

  if (session.role === 'faculty') {
    const mentor = mentors.find((item) => item.id === session.userId);
    if (!mentor) {
      throw new Error('User not found for this session.');
    }

    return {
      otpSent: true,
      maskedPhone: maskPhone(mentor.phoneNumber || mentor.phone || ''),
      demoOtp: newOtpCode,
      expiresAt: session.expiresAt,
      resendCount: session.resendCount,
      remainingAttempts: 3 - session.resendCount
    };
  }

  const staffUser = users.find((item) => item.id === session.userId);
  if (!staffUser) {
    throw new Error('User not found for this session.');
  }

  return {
    otpSent: true,
    maskedPhone: maskPhone(staffUser.phone),
    demoOtp: newOtpCode,
    expiresAt: session.expiresAt,
    resendCount: session.resendCount,
    remainingAttempts: 3 - session.resendCount
  };
}

export function requestPasswordReset(identifier) {
  const normalizedIdentifier = (identifier || '').trim().toLowerCase();

  if (!normalizedIdentifier) {
    throw new Error('Enter your roll number, email, or admin id first.');
  }

  const studentExists = studentCredentials.some(
    (item) => item.rollNumber.toLowerCase() === normalizedIdentifier
  ) || students.some((item) => item.email.toLowerCase() === normalizedIdentifier);

  const facultyExists = facultyCredentials.some(
    (item) => item.facultyId.toLowerCase() === normalizedIdentifier
  ) || mentors.some((item) => item.email.toLowerCase() === normalizedIdentifier);

  const staffExists = users.some((item) => item.email.toLowerCase() === normalizedIdentifier);

  if (!studentExists && !facultyExists && !staffExists) {
    throw new Error('No account found for this identifier.');
  }

  return {
    success: true,
    message: 'Password reset instructions sent to your registered contact.'
  };
}

export function signupUser(name, email, password, role = 'student') {
  if (role === 'student') {
    const nextId = students.length + 1;
    const rollNumber = `STU${String(nextId).padStart(3, '0')}`;
    users.push({
      id: users.length + 1,
      name,
      email,
      password,
      role: 'student'
    });

    return {
      id: rollNumber,
      name,
      email,
      role: 'student',
      rollNumber
    };
  }

  const alreadyExists = users.some((item) => item.email === email);

  if (alreadyExists) {
    throw new Error('User already exists with this email');
  }

  const newUser = {
    id: users.length + 1,
    name,
    email,
    password,
    role
  };

  users.push(newUser);

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role
  };
}
