import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SubmissionCalendar from '../components/shared/SubmissionCalendar';
import ThemeToggle from '../components/shared/ThemeToggle';
import ProjectWorkspaceSidebar from '../components/student/ProjectWorkspaceSidebar';
import NotificationPanel from '../components/student/NotificationPanel';
import { getAllProjects } from '../services/authService';
import '../styles/dashboard.css';

function StudentDashboard() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [projects, setProjects] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const studentIdentifier = String(user?.identifier || '').trim().toLowerCase();

    getAllProjects()
      .then((allProjects) => {
        if (!isMounted) return;
        const mine = (allProjects || []).filter((project) => {
          const owner = String(project.ownerIdentifier || '').trim().toLowerCase();
          return owner && owner === studentIdentifier;
        });
        setProjects(mine);
      })
      .catch(() => {
        if (!isMounted) return;
        setProjects([]);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const currentStudent = useMemo(() => {
    const name = user?.name || 'Student';
    const identifier = user?.identifier || 'NA';
    return {
      name,
      identifier,
      initials: (name.charAt(0) || 'S').toUpperCase(),
      email: user?.email || '',
      rollNumber: identifier,
      department: user?.department || ''
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleActionSelect = (actionId) => {
    // Show calendar for deadline-related actions
    if (actionId?.includes('deadline') || actionId === 'view-upcoming') {
      setShowCalendar(true);
    }
  };

  return (
    <div className="portal-shell student-shell">
      <header className="portal-topbar">
        <div className="topbar-user">
          <span className="topbar-avatar">{currentStudent.initials}</span>
          <div>
            <p className="topbar-name">{currentStudent.name}</p>
            <p className="topbar-meta">Student ID: {currentStudent.rollNumber}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <button type="button" className="outline-btn" onClick={() => navigate('/student/profile')}>
            My Profile
          </button>
          <button type="button" className="outline-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="portal-layout">
        <aside className="portal-sidebar">
          <ProjectWorkspaceSidebar
            onSectionSelect={() => {}}
            onActionSelect={handleActionSelect}
          />
        </aside>

        <main className="portal-main">
          <section className="page-head">
            <h1>Student Workspace</h1>
            <p>Track deadlines and manage project work from one place.</p>
          </section>

          <NotificationPanel 
            events={[]}
            studentId={currentStudent.rollNumber}
            phoneNumber={currentStudent.phoneNumber}
            studentName={currentStudent.name}
          />

          {showCalendar && (
            <SubmissionCalendar
              events={[]}
              title="Upcoming Deadlines"
              showCourseFilter={false}
            />
          )}

          <section className="faculty-panel">
            <h3>My Projects</h3>
            {projects.length === 0 ? (
              <p className="empty-state">No projects available in the database for your account.</p>
            ) : (
              <div className="proposals-list">
                {projects.map((project) => (
                  <div key={project.id} className="proposal-card">
                    <h4>{project.name}</h4>
                    <p className="proposal-desc">{project.description || 'No description provided.'}</p>
                    <p className="proposal-meta">Status: <strong>{project.status || 'ongoing'}</strong></p>
                    <p className="proposal-meta">Deadline: <strong>{project.deadline || 'NA'}</strong></p>
                    <p className="proposal-meta">Progress: <strong>{project.progressPercent || 0}%</strong></p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;
