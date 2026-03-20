import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/shared/ThemeToggle';
import FacultyWorkspaceSidebar from '../components/faculty/FacultyWorkspaceSidebar';
import ProjectApprovalPanel from '../components/faculty/ProjectApprovalPanel';
import ProjectMonitoringPanel from '../components/faculty/ProjectMonitoringPanel';
import TaskOversightPanel from '../components/faculty/TaskOversightPanel';
import FileReviewPanel from '../components/faculty/FileReviewPanel';
import CommunicationPanel from '../components/faculty/CommunicationPanel';
import FeedbackEvaluationPanel from '../components/faculty/FeedbackEvaluationPanel';
import GradingPanel from '../components/faculty/GradingPanel';
import ReportsAnalyticsPanel from '../components/faculty/ReportsAnalyticsPanel';
import FinalActionsPanel from '../components/faculty/FinalActionsPanel';
import StudentSearchPanel from '../components/faculty/StudentSearchPanel';
import { getAllProjects, getAllUsers } from '../services/authService';
import '../styles/dashboard.css';

function FacultyDashboard() {
  const [activeView, setActiveView] = useState('approval');
  const [activeAction, setActiveAction] = useState('approval-review');
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [registeredFaculty, setRegisteredFaculty] = useState([]);
  const [registeredProjects, setRegisteredProjects] = useState([]);
  const [studentSearchError, setStudentSearchError] = useState('');
  const [projectLoadError, setProjectLoadError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const facultyIdentifier = String(user?.identifier || user?.facultyId || '').trim().toLowerCase();

    getAllUsers()
      .then((users) => {
        if (!isMounted) return;

        const onlyStudents = users
          .filter((entry) => {
            if (String(entry.role || '').toLowerCase() !== 'student') {
              return false;
            }

            if (!facultyIdentifier) {
              return true;
            }

            return String(entry.assignedFacultyIdentifier || '').trim().toLowerCase() === facultyIdentifier;
          })
          .map((entry) => ({
            id: entry.id || entry.identifier,
            rollNumber: entry.identifier || '',
            name: entry.name || '',
            email: entry.email || '',
            department: entry.department || '',
            grade: entry.grade || 'NA',
            registrationNo: entry.registrationNo || ''
          }));

        setRegisteredStudents(onlyStudents);
        setRegisteredFaculty(
          users.filter((entry) => String(entry.role || '').toLowerCase() === 'faculty').map((entry) => ({
            id: entry.identifier,
            identifier: entry.identifier,
            name: entry.name,
            specialization: entry.specialization || ''
          }))
        );
        setStudentSearchError('');
      })
      .catch((error) => {
        if (!isMounted) return;
        setRegisteredStudents([]);
        setRegisteredFaculty([]);
        setStudentSearchError(error.message || 'Failed to load registered students');
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    getAllProjects()
      .then((projects) => {
        if (!isMounted) return;
        setRegisteredProjects(projects || []);
        setProjectLoadError('');
      })
      .catch((error) => {
        if (!isMounted) return;
        setRegisteredProjects([]);
        setProjectLoadError(error.message || 'Failed to load registered projects');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentFaculty = useMemo(() => {
    const name = user?.name || 'Faculty';
    return {
      id: user?.identifier || user?.facultyId || 'NA',
      name,
      department: user?.department || '',
      specialization: user?.specialization || '',
      initials: (name.charAt(0) || 'F').toUpperCase()
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'approval':
        return (
          <ProjectApprovalPanel
            proposals={[]}
            mentors={registeredFaculty}
            projects={registeredProjects}
            students={registeredStudents}
            activeAction={activeAction}
          />
        );
      case 'monitoring':
        return <ProjectMonitoringPanel projects={registeredProjects} tasks={[]} activeAction={activeAction} />;
      case 'tasks':
        return <TaskOversightPanel tasks={[]} studentsMap={getStudentMap()} activeAction={activeAction} />;
      case 'files':
        return <FileReviewPanel files={[]} projects={registeredProjects} activeAction={activeAction} />;
      case 'student-search':
        return <StudentSearchPanel students={registeredStudents} activeAction={activeAction} error={studentSearchError} />;
      case 'communication':
        return <CommunicationPanel facultyId={currentFaculty.id} activeAction={activeAction} />;
      case 'feedback':
        return <FeedbackEvaluationPanel grades={[]} facultyId={currentFaculty.id} activeAction={activeAction} />;
      case 'grading':
        return <GradingPanel grades={[]} projects={registeredProjects} />;
      case 'reports':
        return <ReportsAnalyticsPanel projects={registeredProjects} grades={[]} activeAction={activeAction} />;
      case 'final-actions':
        return <FinalActionsPanel projects={registeredProjects} activeAction={activeAction} />;
      default:
        return <ProjectApprovalPanel proposals={[]} mentors={registeredFaculty} projects={registeredProjects} students={registeredStudents} />;
    }
  };

  const getStudentMap = () => {
    return {};
  };

  return (
    <div className="portal-shell faculty-shell">
      <header className="portal-topbar">
        <div className="topbar-user">
          <span className="topbar-avatar">{currentFaculty.initials}</span>
          <div>
            <p className="topbar-name">{currentFaculty.name}</p>
            <p className="topbar-meta">{currentFaculty.department} • {currentFaculty.specialization}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <button type="button" className="outline-btn" onClick={() => navigate('/faculty/profile')}>
            My Profile
          </button>
          <button type="button" className="outline-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="portal-layout">
        <aside className="portal-sidebar">
          <FacultyWorkspaceSidebar
            onSectionSelect={(sectionId) => {
              setActiveView(sectionId);
              setActiveAction(`${sectionId}-overview`);
            }}
            onActionSelect={(actionId) => {
              setActiveAction(actionId);
              // Map action IDs to views
              if (actionId.includes('approval') || actionId.includes('approve')) {
                setActiveView('approval');
              } else if (actionId.includes('monitor') || actionId.includes('track')) {
                setActiveView('monitoring');
              } else if (actionId.includes('task')) {
                setActiveView('tasks');
              } else if (actionId.includes('file') || actionId.includes('submission')) {
                setActiveView('files');
              } else if (actionId.includes('student-search') || actionId.includes('student-id') || actionId.includes('student-dept')) {
                setActiveView('student-search');
              } else if (actionId.includes('communicate') || actionId.includes('message')) {
                setActiveView('communication');
              } else if (actionId.includes('feedback')) {
                setActiveView('feedback');
              } else if (actionId.includes('grade')) {
                setActiveView('grading');
              } else if (actionId.includes('report')) {
                setActiveView('reports');
              } else if (actionId.includes('final') || actionId.includes('archive')) {
                setActiveView('final-actions');
              }
            }}
          />
        </aside>

        <main className="portal-main">
          <section className="page-head">
            <h1>{getPageTitle(activeView)}</h1>
            <p>{getPageDescription(activeView)}</p>
            {projectLoadError ? <p className="error">{projectLoadError}</p> : null}
          </section>

          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

function getPageTitle(viewId) {
  const titles = {
    approval: 'Project Approval & Assignment',
    monitoring: 'Project Monitoring',
    tasks: 'Task Oversight',
    files: 'File & Submission Review',
    'student-search': 'Student Search',
    communication: 'Communication & Guidance',
    feedback: 'Feedback & Evaluation',
    grading: 'Grading & Evaluation',
    reports: 'Reports & Analytics',
    'final-actions': 'Project Closure'
  };
  return titles[viewId] || 'Faculty Dashboard';
}

function getPageDescription(viewId) {
  const descriptions = {
    approval: 'Review and approve student project proposals',
    monitoring: 'View projects, track progress, completion, deadlines, and status',
    tasks: 'Review tasks, distribution, suggestions, oversight, and analytics',
    files: 'Verify file submissions and track versions',
    'student-search': 'Search students by ID number or department',
    communication: 'Communicate with students and provide guidance',
    feedback: 'Provide feedback and evaluate student work',
    grading: 'Assign marks and update evaluation status',
    reports: 'Generate performance reports and analytics',
    'final-actions': 'Complete, publish, archive, and close project operations'
  };
  return descriptions[viewId] || 'Manage your assigned projects and students';
}

export default FacultyDashboard;
