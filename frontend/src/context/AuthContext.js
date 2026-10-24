import { createContext, useContext, useState } from 'react';
import {
  loginUser,
  signupUser,
  verifyStaffOtp,
  resendOtp,
  requestPasswordReset,
  resetInitialPassword
} from '../services/authService';

const AuthContext = createContext(null);
const SESSION_KEY = 'student-portal-session';

function readStoredSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (session?.token) {
      sessionStorage.setItem('student-portal-token', session.token);
    }
    return session;
  } catch (_error) {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredSession);

  const storeUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser?.token) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
      sessionStorage.setItem('student-portal-token', nextUser.token);
    } else {
      sessionStorage.removeItem('student-portal-token');
    }
  };

  const login = async (email, password) => {
    const loginResult = await loginUser(email, password);

    if (loginResult.requiresOtp) {
      return loginResult;
    }

    storeUser(loginResult);
    return loginResult;
  };

  const verifyOtp = async (otpSessionId, otpCode) => {
    const loggedInStaff = await verifyStaffOtp(otpSessionId, otpCode);
    storeUser(loggedInStaff);
    return loggedInStaff;
  };

  const signup = async (identifier, name, email, password, role) => {
    const createdUser = await signupUser(identifier, name, email, password, role);
    storeUser(createdUser);
    return createdUser;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('student-portal-token');
    setUser(null);
  };

  const resend = async (otpSessionId) => {
    return resendOtp(otpSessionId);
  };

  const forgotPassword = async (identifier) => {
    return requestPasswordReset(identifier);
  };

  const resetFirstLoginPassword = async (identifier, newPassword) => {
    const updatedUser = await resetInitialPassword(identifier, newPassword);
    storeUser({ ...(user || {}), ...updatedUser });
    return updatedUser;
  };

  const value = {
    user,
    login,
    verifyOtp,
    resendOtp: resend,
    forgotPassword,
    resetFirstLoginPassword,
    signup,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
