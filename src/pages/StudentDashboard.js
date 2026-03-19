import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SubmissionCalendar from '../components/SubmissionCalendar';
import ProjectManagement from '../components/ProjectManagement';
import ThemeToggle from '../components/ThemeToggle';
import ProjectWorkspaceSidebar from '../components/ProjectWorkspaceSidebar';
import NotificationPanel from '../components/NotificationPanel';
import { students, submissionEvents } from '../data/portalData';
import '../styles/dashboard.css';

function StudentDashboard() {
  const [activeView, setActiveView] = useState('projects');
  const [workspaceAction, setWorkspaceAction] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const currentStudent = useMemo(() => {
    if (user?.rollNumber) {
      const byRoll = students.find((student) => student.rollNumber === user.rollNumber);
      if (byRoll) return byRoll;
    }
    return students[0];
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-shell student-shell">
      <header className="portal-topbar">
        <div className="topbar-user">
          <span className="topbar-avatar">{currentStudent.initials}</span>
          <div>
            <p className="topbar-name">{currentStudent.name}</p>
            <p className="topbar-meta">{currentStudent.grade} • {currentStudent.rollNumber}</p>
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
            onSectionSelect={(sectionId) => {
              if (sectionId === 'my-projects') {
                setActiveView('projects');
              }
              if (sectionId === 'submission' || sectionId === 'team-collaboration' || sectionId === 'task-management' || sectionId === 'file-handling' || sectionId === 'feedback-evaluation' || sectionId === 'documentation') {
                setActiveView('projects');
              }
            }}
            onActionSelect={(actionId) => {
              setActiveView('projects');
              setWorkspaceAction({ id: actionId, timestamp: Date.now() });
            }}
          />
        </aside>

        <main className="portal-main">
          <section className="page-head">
            <h1>{activeView === 'projects' ? 'Student Workspace' : 'Submission Calendar'}</h1>
            <p>
              {activeView === 'projects'
                ? 'Focus on project execution while faculty and admin handle review and platform operations.'
                : 'Track all due dates and submission events in one place.'}
            </p>
          </section>

          <NotificationPanel 
            events={submissionEvents}
            studentId={currentStudent.rollNumber}
            phoneNumber={currentStudent.phoneNumber}
            studentName={currentStudent.name}
          />
          {activeView === 'projects' ? (
            <ProjectManagement
              studentId={currentStudent.rollNumber}
              workspaceAction={workspaceAction}
            />
          ) : (
            <>
              <SubmissionCalendar events={submissionEvents} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;
