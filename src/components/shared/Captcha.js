import { useState, useEffect } from 'react';

function Captcha({ onVerify }) {
  const [captchaCode, setCaptchaCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  // Generate CAPTCHA on component mount and when user resets
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setUserInput('');
    setIsVerified(false);
    setError('');
  };

  const handleVerify = () => {
    if (userInput.toUpperCase() === captchaCode) {
      setIsVerified(true);
      setError('');
      onVerify(true);
    } else {
      setError('Incorrect CAPTCHA. Please try again.');
      setIsVerified(false);
      onVerify(false);
    }
  };

  const handleRefresh = () => {
    generateCaptcha();
  };

  return (
    <div className="captcha-container">
      <label htmlFor="captchaInput">Enter CAPTCHA</label>
      <div className="captcha-display">
        <div className="captcha-code" style={{
          fontSize: '24px',
          fontWeight: 'bold',
          letterSpacing: '8px',
          backgroundColor: '#f0f0f0',
          padding: '10px 15px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          textDecoration: 'line-through',
          textDecorationThickness: '2px',
          transform: 'none',
          userSelect: 'none'
        }}>
          {captchaCode}
        </div>
        <button 
          type="button" 
          onClick={handleRefresh}
          className="btn captcha-refresh"
          title="Refresh CAPTCHA"
        >
          🔄
        </button>
      </div>
      <input
        id="captchaInput"
        type="text"
        placeholder="Enter the text above"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        maxLength={6}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={handleVerify}
        className="btn captcha-verify"
      >
        Verify
      </button>
      {error && <p className="error captcha-error">{error}</p>}
      {isVerified && <p className="success-message">✓ CAPTCHA verified</p>}
    </div>
  );
}

export default Captcha;
