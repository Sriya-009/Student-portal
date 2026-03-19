import { useNavigate } from 'react-router-dom';
import SubmissionCalendar from '../components/SubmissionCalendar';
import { useAuth } from '../context/AuthContext';
import { submissionEvents } from '../data/portalData';
import '../styles/dashboard.css';

const adminOperationGroups = [
  {
    title: 'User Management',
    items: [
      'Add or register students and faculty',
      'Approve or remove users',
      'Manage user roles (Student / Faculty)',
      'Update user details'
    ]
  },
  {
    title: 'System Management',
    items: [
      'Maintain overall system functionality',
      'Manage database records (store, update, delete)',
      'Ensure system security and access control'
    ]
  },
  {
    title: 'Project Management',
    items: [
      'View all projects in the system',
      'Approve or reject project creation',
      'Assign faculty or mentors to projects',
      'Monitor project status (ongoing/completed)'
    ]
  },
  {
    title: 'Monitoring & Control',
    items: [
      'Track user activities',
      'Monitor project progress',
      'Ensure deadlines are followed'
    ]
  },
  {
    title: 'Data & File Management',
    items: [
      'Manage uploaded files and documents',
      'Maintain project records',
      'Backup and restore data'
    ]
  },
  {
    title: 'Reports & Analytics',
    items: [
      'Generate system-wide reports',
      'Analyze student and project performance',
      'View completion and pending work statistics'
    ]
  },
  {
    title: 'Notifications & Communication',
    items: [
      'Send announcements to users',
      'Notify users about deadlines and updates'
    ]
  },
  {
    title: 'Security Management',
    items: [
      'Handle authentication and authorization',
      'Protect data privacy',
      'Manage access permissions'
    ]
  },
  {
    title: 'Maintenance & Final Actions',
    items: [
      'Fix system issues',
      'Update platform features',
      'Archive completed projects and maintain history',
      'Oversee overall system operations'
    ]
  }
];

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
          <h1>Admin Control Center</h1>
          <p>System-wide responsibilities are centralized here, while Faculty and Students use simplified focused workspaces.</p>
        </section>

        <section className="role-summary-card">
          <h2>Role Separation</h2>
          <p>
            Admin manages the platform, approvals, security, and records.
            Faculty manages mentoring, grading, and project supervision.
            Students manage project execution and submissions.
          </p>
        </section>

        <section className="admin-operations-grid">
          {adminOperationGroups.map((group) => (
            <article key={group.title} className="admin-operation-card">
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="page-head">
          <h2>Deadline Extension</h2>
          <p>Quickly extend existing submission dates when needed.</p>
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
