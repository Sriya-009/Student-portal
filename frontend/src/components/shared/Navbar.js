import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (user?.role === 'student') {
      navigate('/student/profile');
    } else if (user?.role === 'faculty') {
      navigate('/faculty/profile');
    }
  };

  return (
    <header className="navbar">
      <h2>Student Project Manager</h2>
      <div className="navbar-right">
        <ThemeToggle/>
        {user ? (
          <>
            <button 
              type="button" 
              onClick={handleProfileClick}
              className="btn"
              title="View profile"
            >
              👤 {user.name}
            </button>
            <span>({user.role})</span>
          </>
        ) : null}
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
