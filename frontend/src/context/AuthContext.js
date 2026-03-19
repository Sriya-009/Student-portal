import { createContext, useContext, useMemo, useState } from 'react';
import { loginUser, signupUser, verifyStaffOtp, resendOtp, requestPasswordReset } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const loginResult = await loginUser(email, password);

    if (loginResult.requiresOtp) {
      return loginResult;
    }

    setUser(loginResult);
    return loginResult;
  };

  const verifyOtp = async (otpSessionId, otpCode) => {
    const loggedInStaff = await verifyStaffOtp(otpSessionId, otpCode);
    setUser(loggedInStaff);
    return loggedInStaff;
  };

  const signup = async (name, email, password, role) => {
    const createdUser = await signupUser(name, email, password, role);
    setUser(createdUser);
    return createdUser;
  };

  const logout = () => setUser(null);

  const resend = async (otpSessionId) => {
    return resendOtp(otpSessionId);
  };

  const forgotPassword = async (identifier) => {
    return requestPasswordReset(identifier);
  };

  const value = useMemo(
    () => ({
      user,
      login,
      verifyOtp,
      resendOtp: resend,
      forgotPassword,
      signup,
      logout
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
