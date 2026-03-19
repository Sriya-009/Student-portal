import { createContext, useContext, useMemo, useState } from 'react';
import { loginUser, signupUser, verifyStaffOtp, resendOtp } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (email, password) => {
    const loginResult = loginUser(email, password);

    if (loginResult.requiresOtp) {
      return loginResult;
    }

    setUser(loginResult);
    return loginResult;
  };

  const verifyOtp = (otpSessionId, otpCode) => {
    const loggedInStaff = verifyStaffOtp(otpSessionId, otpCode);
    setUser(loggedInStaff);
    return loggedInStaff;
  };

  const signup = (name, email, password, role) => {
    const createdUser = signupUser(name, email, password, role);
    setUser(createdUser);
    return createdUser;
  };

  const logout = () => setUser(null);

  const resend = (otpSessionId) => {
    return resendOtp(otpSessionId);
  };

  const value = useMemo(
    () => ({
      user,
      login,
      verifyOtp,
      resendOtp: resend,
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
