import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSession, setOtpSession] = useState(null);
  const [error, setError] = useState('');
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const routeByRole = (role) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'faculty') navigate('/faculty');
    else navigate('/student');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    try {
      if (otpSession) {
        const verifiedUser = verifyOtp(otpSession.otpSessionId, otpCode);
        routeByRole(verifiedUser.role);
        return;
      }

      const loggedInUser = login(identifier, password);

      if (loggedInUser.requiresOtp) {
        setOtpSession(loggedInUser);
        setOtpCode('');
        return;
      }

      routeByRole(loggedInUser.role);
    } catch (loginError) {
      setError(loginError.message);
    }
  };

  const resetOtpStep = () => {
    setOtpSession(null);
    setOtpCode('');
    setError('');
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
        <p className="auth-subtext">
          {otpSession
            ? `OTP sent to registered phone ${otpSession.maskedPhone}`
            : 'Sign in with your credentials and role will be identified automatically'}
        </p>

        {otpSession ? (
          <>
            <label htmlFor="otpCode">Enter OTP</label>
            <input
              id="otpCode"
              type="text"
              placeholder="6-digit OTP"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              required
            />
            <p className="auth-subtext">For demo: OTP is {otpSession.demoOtp}</p>
          </>
        ) : (
          <>
            <label htmlFor="identifier">Roll Number / Email / Admin ID</label>
            <input
              id="identifier"
              type="text"
              placeholder="Enter roll number, faculty email, or admin id"
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
          </>
        )}

        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn auth-submit">
          {otpSession ? 'Verify OTP' : 'Sign In'}
        </button>

        {otpSession ? (
          <button type="button" className="btn secondary-btn" onClick={resetOtpStep}>
            Use Different Credentials
          </button>
        ) : null}

        <div className="demo-box">
          <p>Demo Credentials:</p>
          <p><strong>Student Roll Number:</strong> STU001, STU002, STU003, or STU004<br /><strong>Password:</strong> student123</p>
          <p><strong>Faculty Email:</strong> faculty@school.com<br /><strong>Password:</strong> faculty123</p>
          <p><strong>Admin ID:</strong> admin<br /><strong>Password:</strong> admin123</p>
        </div>
      </form>
    </main>
  );
}

export default Login;
