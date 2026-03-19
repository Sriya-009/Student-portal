import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Captcha from '../components/shared/Captcha';
import '../styles/auth.css';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSession, setOtpSession] = useState(null);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const { login, verifyOtp, resendOtp, forgotPassword } = useAuth();
  const navigate = useNavigate();

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!otpSession?.expiresAt) {
      setOtpTimeLeft(0);
      return;
    }

    const tick = () => {
      const seconds = Math.max(0, Math.ceil((otpSession.expiresAt - Date.now()) / 1000));
      setOtpTimeLeft(seconds);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [otpSession]);

  const formatSeconds = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const otpProgressPercent = otpSession
    ? Math.max(0, Math.min(100, Math.round((otpTimeLeft / 300) * 100)))
    : 0;

  const routeByRole = (role) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'faculty') navigate('/faculty');
    else navigate('/student');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResetMessage('');
    setShowForgotPassword(false);

    // CAPTCHA is required for all roles before credential login.
    if (!otpSession && !captchaVerified) {
      setError('Please verify CAPTCHA first');
      return;
    }

    try {
      if (otpSession) {
        const verifiedUser = await verifyOtp(otpSession.otpSessionId, otpCode);
        routeByRole(verifiedUser.role);
        return;
      }

      const loggedInUser = await login(identifier, password);

      if (loggedInUser.requiresOtp) {
        setOtpSession(loggedInUser);
        setOtpCode('');
        setCaptchaVerified(false);
        return;
      }

      routeByRole(loggedInUser.role);
      setCaptchaVerified(false);
    } catch (loginError) {
      setError(loginError.message);
      if (!otpSession) {
        setShowForgotPassword(true);
      }
      setCaptchaVerified(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetMessage('');
    setShowForgotPassword(false);
    try {
      const result = await forgotPassword(identifier);
      setResetMessage(result.message);
    } catch (forgotError) {
      setError(forgotError.message || 'Unable to process password reset.');
    }
  };

  const resetOtpStep = () => {
    setOtpSession(null);
    setOtpCode('');
    setOtpTimeLeft(0);
    setError('');
    setShowForgotPassword(false);
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const resendResult = await resendOtp(otpSession.otpSessionId);
      setOtpSession((prev) => ({
        ...prev,
        demoOtp: resendResult.demoOtp,
        expiresAt: resendResult.expiresAt
      }));
      setResendSuccess(true);
      setResendCooldown(30); // 30 second cooldown
      setTimeout(() => setResendSuccess(false), 3000); // Hide success message after 3s
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
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
        {otpSession ? (
          <p className="auth-subtext">OTP sent to registered phone {otpSession.maskedPhone}</p>
        ) : null}

        {otpSession ? (
          <>
            <label htmlFor="otpCode">Enter OTP</label>
            <input
              id="otpCode"
              type="text"
              placeholder="6-digit OTP"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              maxLength={6}
              inputMode="numeric"
              required
            />
            <p className={`otp-expiry ${otpTimeLeft === 0 ? 'otp-expired' : ''}`}>
              {otpTimeLeft > 0
                ? `OTP expires in ${formatSeconds(otpTimeLeft)}`
                : 'OTP expired. Please resend OTP.'}
            </p>
            <div className="otp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={otpProgressPercent}>
              <div className={`otp-progress-fill ${otpTimeLeft === 0 ? 'otp-progress-expired' : ''}`} style={{ width: `${otpProgressPercent}%` }} />
            </div>
            <p className="otp-demo">For demo: OTP is {otpSession.demoOtp}</p>
          </>
        ) : (
          <>
            <label htmlFor="identifier">Roll Number / Email / Admin ID</label>
            <input
              id="identifier"
              type="text"
              placeholder="Enter roll number, faculty email, or admin id"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                setCaptchaVerified(false);
              }}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setCaptchaVerified(false);
              }}
              required
            />

            <Captcha onVerify={setCaptchaVerified} />
          </>
        )}

        {error ? <p className="error">{error}</p> : null}

        {showForgotPassword && !otpSession ? (
          <div className="forgot-password-wrap">
            <button type="button" className="forgot-password-btn" onClick={handleForgotPassword}>
              Forgot Password?
            </button>
          </div>
        ) : null}

        {resetMessage ? <p className="success-message">{resetMessage}</p> : null}

        {resendSuccess ? <p className="success-message">OTP resent successfully.</p> : null}

        <button
          type="submit"
          className="btn auth-submit"
          disabled={Boolean(otpSession) && otpTimeLeft === 0}
        >
          {otpSession ? 'Verify OTP' : 'Sign In'}
        </button>

        {otpSession ? (
          <div className="otp-actions">
            <button type="button" className="btn secondary-btn" onClick={resetOtpStep}>
              Use Different Credentials
            </button>
            <button
              type="button"
              className="btn secondary-btn resend-btn"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || resendLoading}
            >
              {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
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
