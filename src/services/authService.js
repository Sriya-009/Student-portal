import { studentCredentials, students, facultyCredentials, mentors } from '../data/portalData';

const users = [
  { id: 1, name: 'Admin User', email: 'admin', password: 'admin123', role: 'admin', phone: '+91 98765 12345' },
  { id: 2, name: 'Faculty User', email: 'faculty@school.com', password: 'faculty123', role: 'faculty', phone: '+91 91234 56789' }
];

const otpSessions = new Map();

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
  }

  // Check other staff users
  const staffUser = users.find(
    (item) => item.email.toLowerCase() === normalizedIdentifier && item.password === password
  );

  if (staffUser) {
    const otpCode = generateOtpCode();
    const otpSessionId = `otp-${staffUser.id}-${Date.now()}`;

    otpSessions.set(otpSessionId, {
      userId: staffUser.id,
      otpCode,
      expiresAt: Date.now() + (5 * 60 * 1000)
    });

    return {
      requiresOtp: true,
      otpSessionId,
      maskedPhone: maskPhone(staffUser.phone),
      role: staffUser.role,
      demoOtp: otpCode
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

  const newOtpCode = generateOtpCode();

  session.otpCode = newOtpCode;
  session.expiresAt = Date.now() + (5 * 60 * 1000);
  session.resendCount += 1;
  session.lastResendTime = Date.now();

  otpSessions.set(otpSessionId, session);

  const staffUser = users.find((item) => item.id === session.userId);
  if (!staffUser) {
    throw new Error('User not found for this session.');
  }

  return {
    otpSent: true,
    maskedPhone: maskPhone(staffUser.phone),
    demoOtp: newOtpCode,
    resendCount: session.resendCount,
    remainingAttempts: 3 - session.resendCount
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
