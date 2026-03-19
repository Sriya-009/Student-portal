import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    try {
      const loggedInUser = login(identifier, password, role);
      const userRole = loggedInUser.role;

      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'faculty') navigate('/faculty');
      else navigate('/student');
    } catch (loginError) {
      setError(loginError.message);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="auth-logo" aria-hidden="true">🎓</div>
        <h1>Student Achievement Portal</h1>
        <p>Track, Manage &amp; Showcase Extracurricular Excellence</p>
      </section>

      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Sign In</h2>
        <p className="auth-subtext">Choose your role to access the portal</p>

        <div className="role-toggle" role="tablist" aria-label="Select role">
          <button
            type="button"
            className={role === 'student' ? 'active' : ''}
            onClick={() => {
              setRole('student');
              setIdentifier('');
              setPassword('');
              setError('');
            }}
          >
            Student
          </button>
          <button
            type="button"
            className={role === 'faculty' ? 'active' : ''}
            onClick={() => {
              setRole('faculty');
              setIdentifier('');
              setPassword('');
              setError('');
            }}
          >
            Faculty
          </button>
          <button
            type="button"
            className={role === 'admin' ? 'active' : ''}
            onClick={() => {
              setRole('admin');
              setIdentifier('');
              setPassword('');
              setError('');
            }}
          >
            Admin
          </button>
        </div>

        <label htmlFor="identifier">{role === 'student' ? 'Roll Number' : 'Email or ID'}</label>
        <input
          id="identifier"
          type="text"
          placeholder={role === 'student' ? 'Enter your roll number' : 'Enter your login id'}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn auth-submit">
          {role === 'student' ? 'Sign In as Student' : role === 'faculty' ? 'Sign In as Faculty' : 'Sign In as Admin'}
        </button>

        <div className="demo-box">
          <p>Demo Credentials:</p>
          {role === 'student' ? (
            <p><strong>Roll Number:</strong> STU001, STU002, STU003, or STU004<br /><strong>Password:</strong> student123</p>
          ) : role === 'faculty' ? (
            <p><strong>Faculty Email:</strong> faculty@school.com<br /><strong>Password:</strong> faculty123</p>
          ) : (
            <p><strong>Admin ID:</strong> admin<br /><strong>Password:</strong> admin123</p>
          )}
        </div>
      </form>
    </main>
  );
}

export default Login;
