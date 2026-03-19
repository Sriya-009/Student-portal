import { useNavigate } from 'react-router-dom';
import SubmissionCalendar from '../components/SubmissionCalendar';
import AdminControlCenter from '../components/AdminControlCenter';
import { useAuth } from '../context/AuthContext';
import { students, mentors, bTechProjects, projectProposals, projectFiles, submissionEvents } from '../data/portalData';
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
          <h1>Admin Dashboard</h1>
          <p>Manage users, system operations, projects, monitoring, reports, notifications, security, maintenance, and final actions.</p>
        </section>

        <AdminControlCenter
          students={students}
          mentors={mentors}
          projects={bTechProjects}
          projectProposals={projectProposals}
          files={projectFiles}
          submissionEvents={submissionEvents}
        />

        <section className="page-head">
          <h2>Deadline Management Calendar</h2>
          <p>Extend active submission deadlines when required.</p>
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
