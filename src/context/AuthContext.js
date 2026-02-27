import { createContext, useContext, useMemo, useState } from 'react';
import { loginUser, signupUser } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (email, password) => {
    const loggedInUser = loginUser(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const signup = (name, email, password, role) => {
    const createdUser = signupUser(name, email, password, role);
    setUser(createdUser);
    return createdUser;
  };

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({
      user,
      login,
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
