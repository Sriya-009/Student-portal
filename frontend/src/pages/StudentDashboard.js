import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SubmissionCalendar from '../components/shared/SubmissionCalendar';
import ProjectManagement from '../components/student/ProjectManagement';
import ThemeToggle from '../components/shared/ThemeToggle';
import ProjectWorkspaceSidebar from '../components/student/ProjectWorkspaceSidebar';
import NotificationPanel from '../components/student/NotificationPanel';
import { students, submissionEvents } from '../data/portalData';
import '../styles/dashboard.css';

function StudentDashboard() {
  const [workspaceAction, setWorkspaceAction] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const currentStudent = useMemo(() => {
    if (user) {
      return {
        name: user.name,
        identifier: user.identifier,
        initials: user.name.charAt(0).toUpperCase(),
        email: user.email,
        rollNumber: user.identifier,
        department: user.department || 'Computer Science'
      };
    }
    return students[0];
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleActionSelect = (actionId) => {
    setWorkspaceAction({ id: actionId, timestamp: Date.now() });
    
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
            events={submissionEvents}
            studentId={currentStudent.rollNumber}
            phoneNumber={currentStudent.phoneNumber}
            studentName={currentStudent.name}
          />

          {showCalendar && (
            <SubmissionCalendar
              events={submissionEvents}
              title="Upcoming Deadlines"
              showCourseFilter={false}
            />
          )}

          <ProjectManagement
            studentId={currentStudent.rollNumber}
            workspaceAction={workspaceAction}
          />
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;
