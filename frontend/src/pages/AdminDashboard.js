import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminControlCenter from '../components/admin/AdminControlCenter';
import AdminWorkspaceSidebar from '../components/admin/AdminWorkspaceSidebar';
import { useAuth } from '../context/AuthContext';
import { getAllProjects, getAllUsers } from '../services/authService';
import '../styles/dashboard.css';

function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('user-management');
  const [activeAction, setActiveAction] = useState('user-add-register');
  const [allUsers, setAllUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    Promise.all([getAllUsers(), getAllProjects()])
      .then(([users, projects]) => {
        if (!isMounted) return;
        setAllUsers(users || []);
        setAllProjects(projects || []);
      })
      .catch(() => {
        if (!isMounted) return;
        setAllUsers([]);
        setAllProjects([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const students = useMemo(
    () => allUsers.filter((entry) => String(entry.role || '').toLowerCase() === 'student'),
    [allUsers]
  );

  const mentors = useMemo(
    () => allUsers.filter((entry) => String(entry.role || '').toLowerCase() === 'faculty'),
    [allUsers]
  );

  const submissionEvents = useMemo(() => (
    allProjects
      .filter((project) => project.deadline)
      .map((project) => ({
        id: `EVT-${project.id}`,
        projectId: project.id,
        title: `${project.name} submission deadline`,
        dueDate: project.deadline
      }))
  ), [allProjects]);

  const projectFiles = useMemo(() => (
    allProjects.map((project, index) => ({
      id: `A-FILE-${project.id}`,
      projectId: project.id,
      fileName: `${String(project.name || 'project').replace(/\s+/g, '-').toLowerCase()}-artifact-${index + 1}.pdf`,
      isSubmitted: String(project.status || '').toLowerCase() === 'completed',
      uploadedDate: project.deadline || new Date().toISOString().slice(0, 10)
    }))
  ), [allProjects]);

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
            <p className="topbar-meta">Centralized control for users, operations, and records</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="outline-btn" onClick={() => navigate('/admin/profile')}>
            My Profile
          </button>
          <button type="button" className="outline-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="portal-layout">
        <aside className="portal-sidebar">
          <AdminWorkspaceSidebar
            onSectionSelect={(sectionId) => {
              setActiveSection(sectionId);
              setActiveAction(`${sectionId}-overview`);
            }}
            onActionSelect={(actionId) => {
              setActiveAction(actionId);
              if (actionId.startsWith('user-')) setActiveSection('user-management');
              else if (actionId.startsWith('system-')) setActiveSection('system-management');
              else if (actionId.startsWith('monitor-')) setActiveSection('monitoring-control');
              else if (actionId.startsWith('data-')) setActiveSection('data-file-management');
              else if (actionId.startsWith('report-')) setActiveSection('reports-analytics');
              else if (actionId.startsWith('notify-')) setActiveSection('notifications-communication');
              else if (actionId.startsWith('security-')) setActiveSection('security-management');
              else if (actionId.startsWith('maintenance-')) setActiveSection('maintenance');
              else if (actionId.startsWith('final-')) setActiveSection('final-actions');
            }}
          />
        </aside>

        <main className="portal-main">
          <section className="page-head">
            <h1>{getAdminTitle(activeSection)}</h1>
            <p>{getAdminDescription(activeSection)}</p>
          </section>

          <AdminControlCenter
            students={students}
            mentors={mentors}
            projects={allProjects}
            files={projectFiles}
            submissionEvents={submissionEvents}
            activeSection={activeSection}
            activeAction={activeAction}
          />
        </main>
      </div>
    </div>
  );
}

function getAdminTitle(sectionId) {
  const titles = {
    'user-management': 'User Management',
    'system-management': 'System Management',
    'monitoring-control': 'Operational Monitoring',
    'data-file-management': 'Data Governance & Records',
    'reports-analytics': 'Reports & Analytics',
    'notifications-communication': 'Notifications & Communication',
    'security-management': 'Security Management',
    maintenance: 'System Maintenance & Support',
    'final-actions': 'Project Closure & Archives'
  };
  return titles[sectionId] || 'Admin Dashboard';
}

function getAdminDescription(sectionId) {
  const descriptions = {
    'user-management': 'Add users, manage approvals, roles, and account details.',
    'system-management': 'Maintain system health, database operations, and access controls.',
    'monitoring-control': 'Audit activity, track project execution, and enforce timeline compliance.',
    'data-file-management': 'Govern institutional records, documents, backups, and recovery operations.',
    'reports-analytics': 'Generate reports and analyze completion and pending statistics.',
    'notifications-communication': 'Broadcast announcements and deadline updates to users.',
    'security-management': 'Configure authentication settings, manage permissions, and run security audits.',
    maintenance: 'Log system issues, schedule feature updates, and maintain system performance.',
    'final-actions': 'Archive completed projects and maintain historical operation records.'
  };
  return descriptions[sectionId] || 'Manage complete admin operations from one workspace.';
}

export default AdminDashboard;
