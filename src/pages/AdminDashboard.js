import { useNavigate } from 'react-router-dom';
import SubmissionCalendar from '../components/SubmissionCalendar';
import { useAuth } from '../context/AuthContext';
import { submissionEvents } from '../data/portalData';
import '../styles/dashboard.css';

function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-shell">
      <header className="portal-topbar admin-topbar">
        <div className="topbar-user">
          <span className="icon-badge">⚙</span>
          <div>
            <p className="topbar-name">Admin Dashboard</p>
            <p className="topbar-meta">Website control and submission date extension</p>
          </div>
        </div>
        <button type="button" className="outline-btn" onClick={handleLogout}>Logout</button>
      </header>

      <main className="portal-main">
        <section className="page-head">
          <h1>Submission Date Extension</h1>
          <p>Admin can only extend existing submission dates. Faculty controls event creation and scheduling.</p>
        </section>

        <SubmissionCalendar
          title="Admin Extension Calendar"
          events={submissionEvents}
          canExtendDeadlines
        />
      </main>
    </div>
  );
}

export default AdminDashboard;
