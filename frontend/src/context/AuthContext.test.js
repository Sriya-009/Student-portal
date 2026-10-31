import { act, render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { AUTH_EXPIRED_EVENT } from '../services/authService';

function SessionStatus() {
  const { user } = useAuth();
  return <div>{user?.identifier || 'signed out'}</div>;
}

test('clears the in-memory session when the API reports an expired token', () => {
  sessionStorage.setItem('student-portal-session', JSON.stringify({
    identifier: 'STU001',
    role: 'student',
    token: 'expired-token'
  }));

  render(
    <AuthProvider>
      <SessionStatus />
    </AuthProvider>
  );

  expect(screen.getByText('STU001')).toBeInTheDocument();
  act(() => window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)));

  expect(screen.getByText('signed out')).toBeInTheDocument();
  expect(sessionStorage.getItem('student-portal-session')).toBeNull();
  expect(sessionStorage.getItem('student-portal-token')).toBeNull();
});
