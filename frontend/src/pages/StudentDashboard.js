import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SubmissionCalendar from '../components/shared/SubmissionCalendar';
import ThemeToggle from '../components/shared/ThemeToggle';
import ProjectWorkspaceSidebar from '../components/student/ProjectWorkspaceSidebar';
import NotificationPanel from '../components/student/NotificationPanel';
import ProjectCreateModal from '../components/student/ProjectCreateModal';
import { deleteStudentProject, getAllProjects } from '../services/authService';
import '../styles/dashboard.css';

function StudentDashboard() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [workspaceNotice, setWorkspaceNotice] = useState('Select an action from Project Workspace to continue.');
  const [activeActionLabel, setActiveActionLabel] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const actionLabelMap = useMemo(() => ({
    'create-project': 'Create a new project',
    'delete-project': 'Delete project',
    'view-details': 'View project details',
    'filter-ongoing': 'Show ongoing projects',
    'filter-completed': 'Show completed projects',
    'team-add-join': 'Add or join team members',
    'team-communicate': 'Communicate with team members',
    'team-coordinate-faculty': 'Coordinate with faculty',
    'task-create': 'Create tasks',
    'task-update': 'Update task status',
    'task-track': 'Track project progress',
    'file-view-all': 'View uploaded files',
    'file-edit': 'Edit file',
    'file-remove': 'Remove file',
    'submit-final': 'Submit final project',
    'feedback-view': 'View mentor feedback',
    'feedback-check': 'Check grades',
    'feedback-corrections': 'Make corrections',
    'docs-maintain': 'Maintain reports/documents',
    'docs-prepare': 'Prepare presentations',
    'docs-organize': 'Organize project files'
  }), []);

  const loadStudentProjects = useCallback(async () => {
    const studentIdentifier = String(user?.identifier || '').trim().toLowerCase();
    if (!studentIdentifier) {
      setProjects([]);
      return;
    }

    const allProjects = await getAllProjects();
    const mine = (allProjects || []).filter((project) => {
      const owner = String(project.ownerIdentifier || '').trim().toLowerCase();
      return owner && owner === studentIdentifier;
    });
    setProjects(mine);
  }, [user?.identifier]);

  useEffect(() => {
    loadStudentProjects().catch(() => {
      setProjects([]);
    });
  }, [loadStudentProjects]);

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

  const handleActionSelect = async (actionId) => {
    setActiveActionLabel(actionLabelMap[actionId] || actionId);
    setShowCalendar(false);
    setProjectFilter('all');

    if (actionId === 'create-project') {
      setShowCreateModal(true);
      setWorkspaceNotice('Opening project creation form.');
      return;
    }

    if (actionId === 'delete-project') {
      if (projects.length === 0) {
        setWorkspaceNotice('No projects available to delete.');
        return;
      }

      const options = projects
        .map((project, index) => `${index + 1}. ${project.id} - ${project.name}`)
        .join('\n');
      const selectedInput = window.prompt(`Choose project to delete (number or ID):\n${options}`);

      if (selectedInput === null) {
        setWorkspaceNotice('Project deletion cancelled.');
        return;
      }

      const normalizedInput = String(selectedInput).trim();
      if (!normalizedInput) {
        setWorkspaceNotice('Enter a valid project number or project ID.');
        return;
      }

      const asNumber = Number(normalizedInput);
      const byNumber = Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= projects.length
        ? projects[asNumber - 1]
        : null;
      const byId = projects.find((project) => String(project.id).toLowerCase() === normalizedInput.toLowerCase());
      const selectedProject = byNumber || byId;

      if (!selectedProject) {
        setWorkspaceNotice('Project not found. Select a valid number or exact ID.');
        return;
      }

      const confirmed = window.confirm(`Delete project "${selectedProject.name}"? This cannot be undone.`);
      if (!confirmed) {
        setWorkspaceNotice('Project deletion cancelled.');
        return;
      }

      try {
        await deleteStudentProject(selectedProject.id, currentStudent.identifier);
        setProjects((prevProjects) => prevProjects.filter((project) => project.id !== selectedProject.id));
        setWorkspaceNotice(`Project "${selectedProject.name}" deleted from database.`);
      } catch (error) {
        setWorkspaceNotice(`Unable to delete project: ${error.message}`);
      }
      return;
    }

    if (actionId === 'filter-ongoing') {
      setProjectFilter('ongoing');
      setWorkspaceNotice('Showing only ongoing projects from database records.');
      return;
    }

    if (actionId === 'filter-completed') {
      setProjectFilter('completed');
      setWorkspaceNotice('Showing only completed projects from database records.');
      return;
    }

    if (actionId === 'view-details') {
      setWorkspaceNotice('Project cards below include title, description, status, deadline, and progress.');
      return;
    }

    if (actionId === 'task-track' || actionId === 'submit-final') {
      setShowCalendar(true);
      setWorkspaceNotice('Calendar opened for planning deadlines and submissions.');
      return;
    }

    setWorkspaceNotice('This action is selected, but its backend workflow is not enabled yet. You can still view all projects from the database below.');
  };

  const handleProjectCreated = (newProject) => {
    setProjects((prevProjects) => [newProject, ...prevProjects]);
    setWorkspaceNotice('Project created successfully and stored in database!');
  };

  const visibleProjects = useMemo(() => {
    if (projectFilter === 'all') {
      return projects;
    }

    return projects.filter((project) => String(project.status || '').trim().toLowerCase() === projectFilter);
  }, [projectFilter, projects]);

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

          <section className="workspace-notice">
            <strong>{activeActionLabel ? `Action: ${activeActionLabel}` : 'Action: None selected'}</strong>
            <p>{workspaceNotice}</p>
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
            {projectFilter !== 'all' ? (
              <p className="proposal-meta">Current filter: <strong>{projectFilter}</strong></p>
            ) : null}

            {visibleProjects.length === 0 ? (
              <p className="empty-state">No projects available in the database for your account.</p>
            ) : (
              <div className="proposals-list">
                {visibleProjects.map((project) => (
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

      <ProjectCreateModal
        isOpen={showCreateModal}
        ownerIdentifier={currentStudent.identifier}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
        department={currentStudent.department}
      />
    </div>
  );
}

export default StudentDashboard;
