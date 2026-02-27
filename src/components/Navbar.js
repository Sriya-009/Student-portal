import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark'
  );

  const handleThemeToggle = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    document.body.classList.toggle('dark-mode', nextMode);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  };

  return (
    <header className="navbar">
      <h2>Student Project Manager</h2>
      <div className="navbar-right">
        <button type="button" onClick={handleThemeToggle} className="btn secondary-btn">
          {isDarkMode ? 'Light Mode' : 'Night Mode'}
        </button>
        {user ? <span>{user.name} ({user.role})</span> : null}
        {user ? (
          <button type="button" onClick={logout} className="btn">
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}

export default Navbar;
