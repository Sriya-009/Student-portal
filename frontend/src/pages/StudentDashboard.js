import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SubmissionCalendar from '../components/shared/SubmissionCalendar';
import ThemeToggle from '../components/shared/ThemeToggle';
import ProjectWorkspaceSidebar from '../components/student/ProjectWorkspaceSidebar';
import NotificationPanel from '../components/student/NotificationPanel';
import ProjectCreateModal from '../components/student/ProjectCreateModal';
import TaskManagement from '../components/student/TaskManagement';
import FileManagement from '../components/student/FileManagement';
import {
  addProjectFeedbackCorrection,
  deleteStudentProject,
  getAllProjects,
  getProjectFeedbackCorrections,
  getProjectFiles,
  getProjectTasks,
  saveProjectFiles,
  saveProjectTasks
} from '../services/authService';
import '../styles/dashboard.css';

function StudentDashboard() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [workspaceNotice, setWorkspaceNotice] = useState('Select an action from Project Workspace to continue.');
  const [activeActionLabel, setActiveActionLabel] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState('default');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectFiles, setProjectFiles] = useState([]);
  const [teamMessages, setTeamMessages] = useState([]);
  const [newTeamMessage, setNewTeamMessage] = useState('');
  const [feedbackCorrection, setFeedbackCorrection] = useState('');
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [docNote, setDocNote] = useState('');
  const [docHistory, setDocHistory] = useState([]);
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

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId('');
      return;
    }

    const hasCurrent = projects.some((project) => project.id === selectedProjectId);
    if (!hasCurrent) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    let isMounted = true;

    if (!selectedProjectId) {
      setProjectTasks([]);
      setProjectFiles([]);
      setFeedbackHistory([]);
      return () => {
        isMounted = false;
      };
    }

    Promise.all([
      getProjectTasks(selectedProjectId),
      getProjectFiles(selectedProjectId),
      getProjectFeedbackCorrections(selectedProjectId)
    ])
      .then(([tasks, files, corrections]) => {
        if (!isMounted) {
          return;
        }
        setProjectTasks(tasks || []);
        setProjectFiles(files || []);
        setFeedbackHistory(corrections || []);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setProjectTasks([]);
        setProjectFiles([]);
        setFeedbackHistory([]);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

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
    setWorkspaceMode(actionId);
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

    if (actionId === 'task-create' || actionId === 'task-update') {
      setWorkspaceNotice('Task management opened. Use the controls below to manage project tasks.');
      return;
    }

    if (actionId === 'file-view-all' || actionId === 'file-edit' || actionId === 'file-remove') {
      setWorkspaceNotice('File management opened. Use the controls below to manage uploads and edits.');
      return;
    }

    if (actionId === 'team-add-join' || actionId === 'team-communicate' || actionId === 'team-coordinate-faculty') {
      setWorkspaceNotice('Team collaboration opened. Coordinate updates and communication below.');
      return;
    }

    if (actionId === 'feedback-view' || actionId === 'feedback-check' || actionId === 'feedback-corrections') {
      setWorkspaceNotice('Feedback workspace opened. Review guidance and add correction updates below.');
      return;
    }

    if (actionId === 'docs-maintain' || actionId === 'docs-prepare' || actionId === 'docs-organize') {
      setWorkspaceNotice('Documentation workspace opened. Maintain notes and track documentation readiness below.');
      return;
    }

    setWorkspaceNotice('Action selected. Use the project list below to continue.');
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

  const selectedProject = useMemo(() => (
    projects.find((project) => project.id === selectedProjectId) || null
  ), [projects, selectedProjectId]);

  const normalizedTeamMembers = useMemo(() => {
    if (!selectedProject) {
      return [{ id: currentStudent.identifier, name: currentStudent.name, role: 'Project Lead' }];
    }

    const rawMembers = Array.isArray(selectedProject.teamMembers) ? selectedProject.teamMembers : [];
    const mappedMembers = rawMembers
      .map((member, index) => {
        if (typeof member === 'string') {
          return { id: member, name: member, role: 'Member' };
        }

        const memberId = member?.id || member?.identifier || member?.email || `member-${index + 1}`;
        return {
          id: String(memberId),
          name: member?.name || String(memberId),
          role: member?.role || 'Member'
        };
      })
      .filter((member) => member.id);

    if (!mappedMembers.some((member) => member.id === currentStudent.identifier)) {
      mappedMembers.unshift({ id: currentStudent.identifier, name: currentStudent.name, role: 'Project Lead' });
    }

    return mappedMembers;
  }, [currentStudent.identifier, currentStudent.name, selectedProject]);

  const selectedProjectMessages = useMemo(() => (
    teamMessages.filter((message) => message.projectId === selectedProject?.id)
  ), [selectedProject?.id, teamMessages]);

  const isTeamAction = workspaceMode.startsWith('team-');
  const isTaskAction = workspaceMode.startsWith('task-');
  const isFileAction = workspaceMode.startsWith('file-') || workspaceMode === 'submit-final';
  const isFeedbackAction = workspaceMode.startsWith('feedback-');
  const isDocsAction = workspaceMode.startsWith('docs-');

  const handleSendTeamMessage = (event) => {
    event.preventDefault();
    if (!selectedProject || !newTeamMessage.trim()) {
      return;
    }

    setTeamMessages((prevMessages) => [
      ...prevMessages,
      {
        id: `MSG-${Date.now()}`,
        projectId: selectedProject.id,
        sender: currentStudent.name,
        text: newTeamMessage.trim(),
        createdAt: new Date().toLocaleString()
      }
    ]);
    setNewTeamMessage('');
  };

  const handleSubmitFeedbackCorrection = () => {
    if (!selectedProject || !feedbackCorrection.trim()) {
      return;
    }

    addProjectFeedbackCorrection(selectedProject.id, currentStudent.identifier, feedbackCorrection.trim())
      .then((savedCorrection) => {
        setFeedbackHistory((prevHistory) => [savedCorrection, ...prevHistory]);
        setFeedbackCorrection('');
      })
      .catch((error) => {
        setWorkspaceNotice(`Could not save correction: ${error.message}`);
      });
  };

  const handleSaveDocNote = () => {
    if (!selectedProject || !docNote.trim()) {
      return;
    }

    setDocHistory((prevHistory) => [
      {
        id: `DOC-${Date.now()}`,
        projectId: selectedProject.id,
        mode: workspaceMode,
        note: docNote.trim(),
        createdAt: new Date().toLocaleString()
      },
      ...prevHistory
    ]);
    setDocNote('');
  };

  const handleTasksUpdate = async (updatedTasks) => {
    setProjectTasks(updatedTasks);
    if (!selectedProjectId) {
      return;
    }

    try {
      const persistedTasks = await saveProjectTasks(selectedProjectId, updatedTasks);
      setProjectTasks(persistedTasks);
    } catch (error) {
      setWorkspaceNotice(`Could not save tasks: ${error.message}`);
    }
  };

  const handleFilesUpdate = async (updatedFiles) => {
    setProjectFiles(updatedFiles);
    if (!selectedProjectId) {
      return;
    }

    try {
      const persistedFiles = await saveProjectFiles(selectedProjectId, updatedFiles);
      setProjectFiles(persistedFiles);
    } catch (error) {
      setWorkspaceNotice(`Could not save files: ${error.message}`);
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

          {(isTeamAction || isTaskAction || isFileAction || isFeedbackAction || isDocsAction) && (
            <section className="faculty-panel">
              <h3>Workspace Actions</h3>
              {!selectedProject ? (
                <p className="empty-state">Create a project first to use workspace actions.</p>
              ) : (
                <>
                  <div className="proposal-meta" style={{ marginBlockEnd: '12px' }}>
                    <label htmlFor="workspaceProject" style={{ marginInlineEnd: '10px' }}>Active Project:</label>
                    <select
                      id="workspaceProject"
                      value={selectedProject.id}
                      onChange={(event) => setSelectedProjectId(event.target.value)}
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>

                  {isTaskAction && (
                    <TaskManagement
                      projectId={selectedProject.id}
                      projectLeadId={selectedProject.ownerIdentifier || currentStudent.identifier}
                      currentUserId={currentStudent.identifier}
                      teamMembers={normalizedTeamMembers}
                      projectTasks={projectTasks}
                      onTasksUpdate={handleTasksUpdate}
                      projectName={selectedProject.name}
                      actionMode={workspaceMode}
                    />
                  )}

                  {isFileAction && (
                    <FileManagement
                      projectId={selectedProject.id}
                      projectLeadId={selectedProject.ownerIdentifier || currentStudent.identifier}
                      currentUserId={currentStudent.identifier}
                      teamMembers={normalizedTeamMembers}
                      projectFiles={projectFiles}
                      onFilesUpdate={handleFilesUpdate}
                      projectName={selectedProject.name}
                      actionMode={workspaceMode}
                    />
                  )}

                  {isTeamAction && (
                    <div className="project-chat">
                      <h4>Team Collaboration</h4>
                      <p className="workspace-notice">Coordinate with team members for: <strong>{selectedProject.name}</strong></p>
                      <div className="chat-messages">
                        {selectedProjectMessages.length === 0 ? (
                          <p className="no-messages">No updates posted yet. Start with a quick status message.</p>
                        ) : (
                          selectedProjectMessages.map((message) => (
                            <div key={message.id} className="chat-message">
                              <strong>{message.sender}</strong>
                              <p>{message.text}</p>
                              <span className="message-time">{message.createdAt}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <form className="chat-input-form" onSubmit={handleSendTeamMessage}>
                        <input
                          type="text"
                          value={newTeamMessage}
                          onChange={(event) => setNewTeamMessage(event.target.value)}
                          placeholder="Post a team update"
                        />
                        <button type="submit" className="send-btn">Send</button>
                      </form>
                    </div>
                  )}

                  {isFeedbackAction && (
                    <div className="project-chat">
                      <h4>Feedback & Evaluation</h4>
                      {workspaceMode === 'feedback-view' && <p className="workspace-notice">View mentor feedback notes for this project.</p>}
                      {workspaceMode === 'feedback-check' && <p className="workspace-notice">Marks and grades will appear here when published.</p>}
                      {workspaceMode === 'feedback-corrections' && <p className="workspace-notice">Submit correction updates or clarifications.</p>}

                      <div className="info-section">
                        <h4>Mentor Notes</h4>
                        <p>No mentor notes have been synced yet for this project.</p>
                      </div>

                      <div className="info-section">
                        <h4>Submit Correction</h4>
                        <textarea
                          className="form-textarea"
                          rows="3"
                          value={feedbackCorrection}
                          onChange={(event) => setFeedbackCorrection(event.target.value)}
                          placeholder="Describe corrections or improvements"
                        />
                        <div className="button-group" style={{ marginBlockStart: '10px' }}>
                          <button type="button" className="btn-primary" onClick={handleSubmitFeedbackCorrection}>Submit Correction</button>
                        </div>
                      </div>

                      <div className="info-section">
                        <h4>Correction History</h4>
                        {feedbackHistory.filter((entry) => entry.projectId === selectedProject.id).length === 0 ? (
                          <p>No corrections submitted yet.</p>
                        ) : (
                          <div className="suggestions-list">
                            {feedbackHistory
                              .filter((entry) => entry.projectId === selectedProject.id)
                              .map((entry) => (
                                <div key={entry.id} className="suggestion-item">
                                  <p>{entry.note}</p>
                                  <p className="suggestion-meta">{entry.createdAt}</p>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isDocsAction && (
                    <div className="project-chat">
                      <h4>Documentation</h4>
                      {workspaceMode === 'docs-maintain' && <p className="workspace-notice">Maintain report and document notes.</p>}
                      {workspaceMode === 'docs-prepare' && <p className="workspace-notice">Prepare presentation drafts and key points.</p>}
                      {workspaceMode === 'docs-organize' && <p className="workspace-notice">Track documentation organization progress.</p>}

                      <div className="info-section">
                        <h4>Add Documentation Note</h4>
                        <textarea
                          className="form-textarea"
                          rows="3"
                          value={docNote}
                          onChange={(event) => setDocNote(event.target.value)}
                          placeholder="Add documentation updates"
                        />
                        <div className="button-group" style={{ marginBlockStart: '10px' }}>
                          <button type="button" className="btn-primary" onClick={handleSaveDocNote}>Save Note</button>
                        </div>
                      </div>

                      <div className="info-section">
                        <h4>Documentation History</h4>
                        {docHistory.filter((entry) => entry.projectId === selectedProject.id).length === 0 ? (
                          <p>No documentation notes added yet.</p>
                        ) : (
                          <div className="suggestions-list">
                            {docHistory
                              .filter((entry) => entry.projectId === selectedProject.id)
                              .map((entry) => (
                                <div key={entry.id} className="suggestion-item">
                                  <p>{entry.note}</p>
                                  <p className="suggestion-meta">{entry.mode} | {entry.createdAt}</p>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
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
                  <div
                    key={project.id}
                    className={`proposal-card ${selectedProjectId === project.id ? 'active' : ''}`}
                    onClick={() => setSelectedProjectId(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedProjectId(project.id);
                      }
                    }}
                  >
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
