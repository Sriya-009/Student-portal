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

export async function getUserProfile(identifier) {
  const response = await fetch(`${API_BASE_URL}/api/profile/${encodeURIComponent(identifier)}`);
  const payload = await parseResponse(response);
  return payload.user;
}

export async function updateUserProfile(identifier, profilePatch) {
  const response = await fetch(`${API_BASE_URL}/api/profile/${encodeURIComponent(identifier)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profilePatch)
  });

  const payload = await parseResponse(response);
  return payload.user;
}

export async function resetInitialPassword(identifier, newPassword) {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-initial-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ identifier, newPassword })
  });

  const payload = await parseResponse(response);
  return payload.user;
}

export async function registerAdminCreatedUser({ identifier, name, email, department, role, phone }) {
  const normalizedRole = String(role || '').toLowerCase();
  const defaultPassword = normalizedRole === 'student'
    ? 'student123'
    : normalizedRole === 'faculty'
      ? 'faculty123'
      : 'admin009';

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

export async function uploadProfilePhoto(identifier, file) {
  const formData = new FormData();
  formData.append('profilePhoto', file);

  const response = await fetch(`${API_BASE_URL}/api/upload/profile-photo/${encodeURIComponent(identifier)}`, {
    method: 'POST',
    body: formData
  });

  const payload = await parseResponse(response);
  return payload.photoUrl;
}

export async function getProfilePhotoUrl(identifier) {
  const response = await fetch(`${API_BASE_URL}/api/profile-photo/${encodeURIComponent(identifier)}`);
  const payload = await parseResponse(response);
  return payload.photoUrl;
}

export async function deleteProfilePhoto(identifier) {
  const response = await fetch(`${API_BASE_URL}/api/profile-photo/${encodeURIComponent(identifier)}`, {
    method: 'DELETE'
  });

  const payload = await parseResponse(response);
  return payload.message;
}

export async function getAllUsers() {
  const response = await fetch(`${API_BASE_URL}/api/users`);
  const payload = await parseResponse(response);
  return payload.users || [];
}

export async function getAllProjects() {
  const response = await fetch(`${API_BASE_URL}/api/projects`);
  const payload = await parseResponse(response);
  return payload.projects || [];
}

export async function createStudentProject({ name, description, deadline, ownerIdentifier, department }) {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      description,
      deadline,
      ownerIdentifier,
      department
    })
  });

  const payload = await parseResponse(response);
  return payload.project;
}

export async function deleteStudentProject(projectId, ownerIdentifier) {
  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ownerIdentifier })
  });

  const payload = await parseResponse(response);
  return payload.deletedProjectId;
}

export async function assignStudentToFaculty(studentIdentifier, facultyIdentifier) {
  const response = await fetch(`${API_BASE_URL}/api/admin/assign-student-faculty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ studentIdentifier, facultyIdentifier })
  });

  const payload = await parseResponse(response);
  return payload.assignment;
}

export async function getStudentFacultyAssignments() {
  const response = await fetch(`${API_BASE_URL}/api/admin/student-faculty-assignments`);
  const payload = await parseResponse(response);
  return payload.assignments || [];
}
