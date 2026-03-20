const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

export async function loginUser(identifier, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ identifier, password })
  });

  const payload = await parseResponse(response);

  if (payload.requiresOtp) {
    return {
      requiresOtp: true,
      otpSessionId: payload.otpSessionId,
      maskedPhone: payload.maskedPhone,
      role: payload.role,
      demoOtp: payload.demoOtp,
      expiresAt: payload.expiresAt
    };
  }

  return {
    ...payload.user,
    token: payload.token
  };
}

export async function verifyStaffOtp(otpSessionId, otpCode) {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otpSessionId, otpCode })
  });

  const payload = await parseResponse(response);
  return {
    ...payload.user,
    token: payload.token
  };
}

export async function resendOtp(otpSessionId) {
  const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otpSessionId })
  });

  const payload = await parseResponse(response);
  return {
    otpSent: payload.otpSent,
    maskedPhone: payload.maskedPhone,
    demoOtp: payload.demoOtp,
    expiresAt: payload.expiresAt,
    resendCount: payload.resendCount,
    remainingAttempts: payload.remainingAttempts
  };
}

export async function requestPasswordReset(identifier) {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ identifier })
  });

  const payload = await parseResponse(response);
  return {
    success: payload.success,
    message: payload.message
  };
}

export async function signupUser(identifier, name, email, password, role = 'student') {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ identifier, name, email, password, role })
  });

  const payload = await parseResponse(response);
  return {
    ...payload.user,
    token: payload.token
  };
}

export async function verifyToken(token) {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  });

  const payload = await parseResponse(response);
  return payload.decoded;
}

export async function registerAdminCreatedUser({ identifier, name, email, department, role, phone }) {
  const defaultPassword = String(role || '').toLowerCase() === 'student' ? 'student123' : 'faculty123';

  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      identifier,
      name,
      email,
      role,
      department,
      phone,
      password: defaultPassword
    })
  });

  const payload = await parseResponse(response);
  return {
    identifier: payload.user.identifier,
    email: payload.user.email,
    role: payload.user.role,
    password: defaultPassword
  };
}
