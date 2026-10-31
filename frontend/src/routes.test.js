import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';

jest.mock('./pages/Login', () => () => 'login screen');
jest.mock('./pages/Signup', () => () => 'signup screen');
jest.mock('./pages/AdminDashboard', () => () => 'admin dashboard');
jest.mock('./pages/FacultyDashboard', () => () => 'faculty dashboard');
jest.mock('./pages/StudentDashboard', () => () => 'student dashboard');
jest.mock('./pages/StudentProfile', () => () => 'student profile');
jest.mock('./pages/FacultyProfile', () => () => 'faculty profile');
jest.mock('./pages/AdminProfile', () => () => 'admin profile');
jest.mock('./pages/AssignTasks', () => () => 'assign tasks');
jest.mock('./pages/UploadFiles', () => () => 'upload files');
jest.mock('./pages/Progress', () => () => 'progress');

function renderRoute(path, role) {
  sessionStorage.setItem('student-portal-session', JSON.stringify({
    identifier: `${role}-user`,
    role,
    token: `${role}-token`
  }));

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>
  );
}

afterEach(() => {
  sessionStorage.clear();
});

test.each([
  ['/student', 'student', 'student dashboard'],
  ['/faculty', 'faculty', 'faculty dashboard'],
  ['/admin', 'admin', 'admin dashboard']
])('allows the %s route for the %s role', (path, role, expectedText) => {
  renderRoute(path, role);
  expect(screen.getByText(expectedText)).toBeInTheDocument();
});

test.each([
  ['/student', 'faculty'],
  ['/faculty', 'admin'],
  ['/admin', 'student']
])('redirects %s when the session role is %s', (path, role) => {
  renderRoute(path, role);
  expect(screen.getByText('login screen')).toBeInTheDocument();
});
