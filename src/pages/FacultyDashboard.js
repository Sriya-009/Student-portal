import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import FacultyWorkspaceSidebar from '../components/FacultyWorkspaceSidebar';
import ProjectApprovalPanel from '../components/ProjectApprovalPanel';
import ProjectMonitoringPanel from '../components/ProjectMonitoringPanel';
import TaskOversightPanel from '../components/TaskOversightPanel';
import FileReviewPanel from '../components/FileReviewPanel';
import CommunicationPanel from '../components/CommunicationPanel';
import FeedbackEvaluationPanel from '../components/FeedbackEvaluationPanel';
import GradingPanel from '../components/GradingPanel';
import ReportsAnalyticsPanel from '../components/ReportsAnalyticsPanel';
import FinalActionsPanel from '../components/FinalActionsPanel';
import StudentSearchPanel from '../components/StudentSearchPanel';
import { mentors, students, projectProposals, bTechProjects, projectGrades, projectTasks, projectFiles } from '../data/portalData';
import '../styles/dashboard.css';

function FacultyDashboard() {
  const [activeView, setActiveView] = useState('approval');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const currentFaculty = useMemo(() => {
    if (user?.facultyId) {
      const byId = mentors.find((mentor) => mentor.id === user.facultyId);
      if (byId) return byId;
    }
    return mentors[0];
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'approval':
        return <ProjectApprovalPanel proposals={projectProposals} mentors={mentors} />;
      case 'monitoring':
        return <ProjectMonitoringPanel projects={bTechProjects} />;
      case 'tasks':
        return <TaskOversightPanel tasks={projectTasks} studentsMap={getStudentMap()} />;
      case 'files':
        return <FileReviewPanel files={projectFiles} projects={bTechProjects} />;
      case 'student-search':
        return <StudentSearchPanel students={students} />;
      case 'communication':
        return <CommunicationPanel facultyId={currentFaculty.id} />;
      case 'feedback':
        return <FeedbackEvaluationPanel grades={projectGrades} facultyId={currentFaculty.id} />;
      case 'grading':
        return <GradingPanel grades={projectGrades} projects={bTechProjects} />;
      case 'reports':
        return <ReportsAnalyticsPanel projects={bTechProjects} grades={projectGrades} />;
      case 'final-actions':
        return <FinalActionsPanel projects={bTechProjects} />;
      default:
        return <ProjectApprovalPanel proposals={projectProposals} mentors={mentors} />;
    }
  };

  const getStudentMap = () => {
    const map = {};
    projectTasks.forEach((task) => {
      map[task.assignedToId] = task.assignedToName;
    });
    return map;
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
          <button type="button" className="outline-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="portal-layout">
        <aside className="portal-sidebar">
          <FacultyWorkspaceSidebar
            onSectionSelect={(sectionId) => {
              setActiveView(sectionId);
            }}
            onActionSelect={(actionId) => {
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
    'final-actions': 'Final Actions'
  };
  return titles[viewId] || 'Faculty Dashboard';
}

function getPageDescription(viewId) {
  const descriptions = {
    approval: 'Review and approve student project proposals',
    monitoring: 'Track ongoing projects and monitor progress',
    tasks: 'Review and supervise task management',
    files: 'Verify file submissions and track versions',
    'student-search': 'Search students by ID number or department',
    communication: 'Communicate with students and provide guidance',
    feedback: 'Provide feedback and evaluate student work',
    grading: 'Assign marks and update evaluation status',
    reports: 'Generate performance reports and analytics',
    'final-actions': 'Mark projects complete and archive data'
  };
  return descriptions[viewId] || 'Manage your assigned projects and students';
}

export default FacultyDashboard;
