import { BASE_URL as API_BASE_URL } from '../config/api';

export const AUTH_EXPIRED_EVENT = 'student-portal:auth-expired';

function matchesStoredSessionToken(failedToken) {
  if (!failedToken || sessionStorage.getItem('student-portal-token') !== failedToken) {
    return false;
  }
  try {
    const session = JSON.parse(sessionStorage.getItem('student-portal-session') || 'null');
    return session?.token === failedToken;
  } catch (_error) {
    return false;
  }
}

export function handleExpiredAuthentication(failedToken) {
  if (!matchesStoredSessionToken(failedToken)) return false;
  sessionStorage.removeItem('student-portal-session');
  sessionStorage.removeItem('student-portal-token');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return true;
}

function toNetworkError(error) {
  if (error instanceof TypeError) {
    return new Error(`Cannot reach API server at ${API_BASE_URL}. Start backend with "npm run dev" from project root.`);
  }
  return error;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function authFetch(url, options = {}) {
  const token = sessionStorage.getItem('student-portal-token');
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }).then((response) => {
    if (response.status === 401) handleExpiredAuthentication(token);
    return response;
  });
}

async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    return parseResponse(response);
  } catch (error) {
    if (error instanceof TypeError) {
      await wait(1200);
      try {
        const retryResponse = await fetch(`${API_BASE_URL}${path}`, options);
        return parseResponse(retryResponse);
      } catch (retryError) {
        throw toNetworkError(retryError);
      }
    }
    throw error;
  }
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

export async function loginUser(identifier, password) {
  const payload = await apiRequest('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ identifier, password })
  });

  if (payload.requiresOtp) {
    return {
      requiresOtp: true,
      otpSessionId: payload.otpSessionId,
      maskedPhone: payload.maskedPhone,
      role: payload.role,
      expiresAt: payload.expiresAt
    };
  }

  return {
    ...payload.user,
    token: payload.token
  };
}

export async function verifyStaffOtp(otpSessionId, otpCode) {
  const payload = await apiRequest('/api/auth/verify-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otpSessionId, otpCode })
  });
  return {
    ...payload.user,
    token: payload.token
  };
}

export async function resendOtp(otpSessionId) {
  const payload = await apiRequest('/api/auth/resend-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ otpSessionId })
  });
  return {
    otpSent: payload.otpSent,
    maskedPhone: payload.maskedPhone,
    expiresAt: payload.expiresAt,
    resendCount: payload.resendCount,
    remainingAttempts: payload.remainingAttempts
  };
}

export async function requestPasswordReset(identifier) {
  const payload = await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ identifier })
  });
  return {
    success: payload.success,
    message: payload.message
  };
}

export async function signupUser(identifier, name, email, password, role = 'student') {
  const response = await authFetch(`${API_BASE_URL}/api/auth/signup`, {
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
  const tokenBeingVerified = String(token || '').trim();
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenBeingVerified })
  });
  if (response.status === 401) handleExpiredAuthentication(tokenBeingVerified);

  const payload = await parseResponse(response);
  return payload.decoded;
}

export async function getUserProfile(identifier) {
  const response = await authFetch(`${API_BASE_URL}/api/profile/${encodeURIComponent(identifier)}`);
  const payload = await parseResponse(response);
  return payload.user;
}

export async function updateUserProfile(identifier, profilePatch) {
  const response = await authFetch(`${API_BASE_URL}/api/profile/${encodeURIComponent(identifier)}`, {
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
  const response = await authFetch(`${API_BASE_URL}/api/auth/reset-initial-password`, {
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
  const randomBytes = new Uint32Array(16);
  window.crypto.getRandomValues(randomBytes);
  const defaultPassword = Array.from(randomBytes, (value) => (value % 36).toString(36)).join('')
    .slice(0, 12) + 'A1!';

  const response = await authFetch(`${API_BASE_URL}/api/users`, {
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

  const response = await authFetch(`${API_BASE_URL}/api/upload/profile-photo/${encodeURIComponent(identifier)}`, {
    method: 'POST',
    body: formData
  });

  const payload = await parseResponse(response);
  return payload.photoUrl;
}

export async function getProfilePhotoUrl(identifier) {
  const response = await authFetch(`${API_BASE_URL}/api/profile-photo/${encodeURIComponent(identifier)}`);
  const payload = await parseResponse(response);
  return payload.photoUrl;
}

export async function deleteProfilePhoto(identifier) {
  const response = await authFetch(`${API_BASE_URL}/api/profile-photo/${encodeURIComponent(identifier)}`, {
    method: 'DELETE'
  });

  const payload = await parseResponse(response);
  return payload.message;
}

export async function getAllUsers() {
  const response = await authFetch(`${API_BASE_URL}/api/users`);
  const payload = await parseResponse(response);
  return payload.users || [];
}

export async function getAllProjects() {
  const response = await authFetch(`${API_BASE_URL}/api/projects`);
  const payload = await parseResponse(response);
  return payload.projects || [];
}

export async function createStudentProject({ name, description, deadline, ownerIdentifier, department }) {
  const response = await authFetch(`${API_BASE_URL}/api/projects`, {
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
  const response = await authFetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, {
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
  const response = await authFetch(`${API_BASE_URL}/api/admin/assign-student-faculty`, {
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
  const response = await authFetch(`${API_BASE_URL}/api/admin/student-faculty-assignments`);
  const payload = await parseResponse(response);
  return payload.assignments || [];
}

export async function getProjectTasks(projectId) {
  const response = await authFetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/tasks`);
  const payload = await parseResponse(response);
  return payload.tasks || [];
}

export async function saveProjectTasks(projectId, tasks) {
  const response = await authFetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/tasks`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tasks })
  });

  const payload = await parseResponse(response);
  return payload.tasks || [];
}

export async function getProjectFiles(projectId) {
  const response = await authFetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/files`);
  const payload = await parseResponse(response);
  return payload.files || [];
}

export async function saveProjectFiles(projectId, files) {
  const response = await authFetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/files`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files })
  });

  const payload = await parseResponse(response);
  return payload.files || [];
}

export async function uploadProjectFile(projectId, fileId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await authFetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}/content`, {
    method: 'POST',
    body: formData
  });
  await parseResponse(response);
}

export async function downloadProjectFile(projectId, fileId, fileName) {
  const response = await authFetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}/content`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Unable to download file.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function getProjectFeedbackCorrections(projectId) {
  const response = await authFetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/feedback-corrections`);
  const payload = await parseResponse(response);
  return payload.corrections || [];
}

export async function addProjectFeedbackCorrection(projectId, studentIdentifier, note) {
  const response = await authFetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/feedback-corrections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ studentIdentifier, note })
  });

  const payload = await parseResponse(response);
  return payload.correction;
}
