import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <h2>Student Project Manager</h2>
      <div className="navbar-right">
        <ThemeToggle/>
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
