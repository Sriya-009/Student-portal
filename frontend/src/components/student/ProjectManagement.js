import { useState, useMemo, useEffect, useRef } from 'react';
import { bTechProjects, projectChats, projectTasks, projectFiles, projectProposals, projectGrades } from '../../data/portalData';
import TaskManagement from './TaskManagement';
import FileManagement from './FileManagement';

function ProjectManagement({ studentId, workspaceAction }) {
  const [projects, setProjects] = useState(bTechProjects);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState(projectTasks);
  const [files, setFiles] = useState(projectFiles);
  const [projectFilter, setProjectFilter] = useState('all');
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    technologies: '',
    deadline: ''
  });
  const [editProject, setEditProject] = useState(null);
  const [projectMessages, setProjectMessages] = useState(projectChats);
  const [newMessage, setNewMessage] = useState('');
  const [workspaceNotice, setWorkspaceNotice] = useState('');
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [newTeamMemberName, setNewTeamMemberName] = useState('');
  const [newTeamMemberStudentId, setNewTeamMemberStudentId] = useState('');
  const [newTeamMemberEmail, setNewTeamMemberEmail] = useState('');
  const [showEditSuggestion, setShowEditSuggestion] = useState(false);
  const [editSuggestion, setEditSuggestion] = useState({
    taskId: '',
    suggestion: ''
  });
  const [feedbackCorrections, setFeedbackCorrections] = useState('');
  const [correctionHistory, setCorrectionHistory] = useState([]);
  const [docNote, setDocNote] = useState('');
  const [docEntries, setDocEntries] = useState([]);
  const [docRecord, setDocRecord] = useState({
    title: '',
    category: 'report'
  });
  const [docRegistry, setDocRegistry] = useState([]);
  const [presentationDraft, setPresentationDraft] = useState({
    title: '',
    date: '',
    points: ''
  });
  const [presentationPlans, setPresentationPlans] = useState([]);
  const [organizeChecklist, setOrganizeChecklist] = useState({
    reports: false,
    presentation: false,
    sourceCode: false,
    references: false
  });
  const [workspaceMode, setWorkspaceMode] = useState('default');
  const lastHandledActionRef = useRef(null);

  const studentProjects = useMemo(
    () => {
      let filtered = projects.filter((p) => p.teamMemberIds.includes(studentId));
      if (projectFilter !== 'all') {
        filtered = filtered.filter((p) => p.status === projectFilter);
      }
      return filtered;
    },
    [projects, studentId, projectFilter]
  );

  const selectedProjectData = selectedProject ? projects.find((p) => p.id === selectedProject) : null;
  const selectedProjectChatMessages = selectedProject
    ? projectMessages.filter((msg) => msg.projectId === selectedProject).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    : [];
  const selectedProjectProposal = selectedProjectData
    ? projectProposals.find((proposal) => proposal.projectId === selectedProjectData.id && proposal.studentId === studentId)
    : null;
  const selectedProjectGrade = selectedProjectData
    ? projectGrades.find((grade) => grade.projectId === selectedProjectData.id && grade.studentId === studentId)
    : null;
  const selectedProjectFiles = selectedProjectData
    ? files.filter((file) => file.projectId === selectedProjectData.id)
    : [];

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      alert('Project name is required');
      return;
    }

    const createdProject = {
      id: `BTECH-PRJ-${String(projects.length + 1).padStart(3, '0')}`,
      name: newProject.name,
      description: newProject.description,
      ownerId: studentId,
      mentorId: null,
      teamMemberIds: [studentId],
      teamMembers: [
        { id: studentId, name: 'You', role: 'Lead Developer' }
      ],
      status: 'ongoing',
      progressPercent: 0,
      createdDate: new Date().toISOString().split('T')[0],
      deadline: newProject.deadline,
      technologies: newProject.technologies.split(',').map((t) => t.trim()).filter((t) => t)
    };

    setProjects([...projects, createdProject]);
    setNewProject({ name: '', description: '', technologies: '', deadline: '' });
    setShowCreateForm(false);
  };

  const handleEditProject = (e) => {
    e.preventDefault();
    if (!editProject.name.trim()) {
      alert('Project name is required');
      return;
    }

    setProjects(
      projects.map((p) => (p.id === editProject.id ? editProject : p))
    );
    setShowEditForm(false);
    setEditProject(null);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedProject) {
      return;
    }

    const message = {
      id: `CHAT-PRJ-${selectedProject}-MSG-${Date.now()}`,
      projectId: selectedProject,
      senderId: studentId,
      senderName: 'You',
      message: newMessage,
      timestamp: new Date().toISOString()
    };

    setProjectMessages([...projectMessages, message]);
    setNewMessage('');
  };

  const handleAddTeamMember = (e) => {
    e.preventDefault();
    if (!newTeamMemberName.trim() || !newTeamMemberStudentId.trim() || !newTeamMemberEmail.trim() || !selectedProject) {
      alert('Please enter team member name, student ID, and email');
      return;
    }

    const selected = projects.find((p) => p.id === selectedProject);
    const normalizedStudentId = newTeamMemberStudentId.trim().toUpperCase();
    const normalizedEmail = newTeamMemberEmail.trim().toLowerCase();

    const alreadyExists = selected?.teamMembers?.some(
      (member) => member.id.toLowerCase() === normalizedStudentId.toLowerCase() || (member.email || '').toLowerCase() === normalizedEmail
    );
    if (alreadyExists) {
      alert('Team member with this student ID or email already exists in this project.');
      return;
    }

    const updatedProjects = projects.map((p) => {
      if (p.id === selectedProject) {
        const newMemberId = normalizedStudentId;
        return {
          ...p,
          teamMemberIds: [...p.teamMemberIds, newMemberId],
          teamMembers: [
            ...p.teamMembers,
            {
              id: newMemberId,
              name: newTeamMemberName,
              role: 'Contributor',
              email: newTeamMemberEmail.trim()
            }
          ]
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    setNewTeamMemberName('');
    setNewTeamMemberStudentId('');
    setNewTeamMemberEmail('');
    setShowAddTeamMember(false);
    alert(`✓ ${newTeamMemberName} added to the project!`);
  };

  const handleRemoveTeamMember = (memberId) => {
    if (!selectedProject) return;

    const updatedProjects = projects.map((p) => {
      if (p.id === selectedProject) {
        return {
          ...p,
          teamMemberIds: p.teamMemberIds.filter((id) => id !== memberId),
          teamMembers: p.teamMembers.filter((m) => m.id !== memberId)
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    alert('✓ Team member removed from project.');
  };

  const handleSendEditSuggestion = (e) => {
    e.preventDefault();
    if (!editSuggestion.suggestion.trim() || !selectedProject) {
      alert('Please enter a suggestion');
      return;
    }

    const taskToEdit = tasks.find((t) => t.id === editSuggestion.taskId);
    if (!taskToEdit) {
      alert('Task not found');
      return;
    }

    alert(`✓ Suggestion sent: "${editSuggestion.suggestion}" for task "${taskToEdit.title}"`);
    setEditSuggestion({ taskId: '', suggestion: '' });
    setShowEditSuggestion(false);
  };

  useEffect(() => {
    if (!workspaceAction?.id) {
      return;
    }

    const actionKey = `${workspaceAction.id}-${workspaceAction.timestamp || ''}`;
    if (lastHandledActionRef.current === actionKey) {
      return;
    }
    lastHandledActionRef.current = actionKey;

    const allStudentProjects = projects.filter((p) => p.teamMemberIds.includes(studentId));
    const firstProject = allStudentProjects[0];
    const leadProject = allStudentProjects.find((p) => p.projectLeadId === studentId) || firstProject;

    const openProjectView = (project, tab) => {
      if (!project) {
        setWorkspaceNotice('No project found yet. Create your first project to continue.');
        return;
      }
      setSelectedProject(project.id);
      setActiveTab(tab);
    };

    switch (workspaceAction.id) {
      case 'create-project':
        setProjectFilter('all');
        setShowCreateForm(true);
        setWorkspaceNotice('Create a new project using the form.');
        break;
      case 'delete-project': {
        if (allStudentProjects.length === 0) {
          setWorkspaceNotice('No project found to delete.');
          break;
        }

        const projectOptions = allStudentProjects
          .map((project, index) => `${index + 1}. ${project.id} - ${project.name}`)
          .join('\n');

        const selectedInput = window.prompt(
          `Which project do you want to delete? Enter project number or ID:\n${projectOptions}`
        );

        if (selectedInput === null) {
          setWorkspaceNotice('Project deletion cancelled.');
          break;
        }

        const normalizedInput = selectedInput.trim();
        if (!normalizedInput) {
          setWorkspaceNotice('Please enter a valid project number or ID.');
          break;
        }

        const asNumber = Number(normalizedInput);
        const byNumber = Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= allStudentProjects.length
          ? allStudentProjects[asNumber - 1]
          : null;
        const byId = allStudentProjects.find(
          (project) => project.id.toLowerCase() === normalizedInput.toLowerCase()
        );
        const targetProject = byNumber || byId;

        if (!targetProject) {
          setWorkspaceNotice('Project not found. Enter a listed number or exact project ID.');
          break;
        }

        const confirmed = window.confirm(`Delete project "${targetProject.name}"? This cannot be undone.`);
        if (!confirmed) {
          setWorkspaceNotice('Project deletion cancelled.');
          break;
        }

        const remainingProjects = allStudentProjects.filter((project) => project.id !== targetProject.id);
        setProjects((prev) => prev.filter((p) => p.id !== targetProject.id));
        setSelectedProject((prev) => {
          if (prev !== targetProject.id) return prev;
          return remainingProjects[0]?.id || null;
        });
        setWorkspaceNotice(`Project deleted: ${targetProject.name}`);
        break;
      }
      case 'view-assigned':
        setProjectFilter('all');
        setWorkspaceNotice('Showing all assigned projects.');
        break;
      case 'view-details':
        setProjectFilter('all');
        openProjectView(firstProject, 'overview');
        setWorkspaceNotice('Showing project details.');
        break;
      case 'filter-ongoing':
        setProjectFilter('ongoing');
        setWorkspaceNotice('Filtered to ongoing projects.');
        break;
      case 'filter-completed':
        setProjectFilter('completed');
        setWorkspaceNotice('Filtered to completed projects.');
        break;
      case 'team-add-join':
        openProjectView(firstProject, 'overview');
        if (firstProject && firstProject.ownerId === studentId) {
          setShowAddTeamMember(true);
          setWorkspaceNotice('Add team members to your project.');
        } else {
          setWorkspaceNotice('Only project owners can add team members.');
        }
        break;
      case 'team-communicate':
        openProjectView(firstProject, 'chat');
        setWorkspaceNotice('Team collaboration opened in project chat.');
        break;
      case 'team-coordinate-faculty':
        openProjectView(firstProject, 'feedback');
        setWorkspaceMode('feedback-view');
        setWorkspaceNotice('Faculty coordination opened in Feedback & Evaluation.');
        break;
      case 'task-create':
      case 'task-assign':
      case 'task-view':
      case 'task-update':
      case 'task-track':
        openProjectView(leadProject, 'tasks');
        if (leadProject?.projectLeadId !== studentId) {
          setWorkspaceNotice('Task management is read-only for members. Only project leads can manage tasks.');
        } else {
          setWorkspaceNotice('Task management opened.');
        }
        break;
      case 'task-modify':
        openProjectView(leadProject, 'tasks');
        setShowEditSuggestion(true);
        setWorkspaceNotice('Send edit suggestions for tasks.');
        break;
      case 'file-view-all':
      case 'file-edit':
      case 'file-remove':
        openProjectView(leadProject, 'files');
        setWorkspaceMode(workspaceAction.id);
        setWorkspaceNotice('File management workspace opened.');
        break;
      case 'submit-final':
        openProjectView(leadProject, 'files');
        setWorkspaceMode(workspaceAction.id);
        setWorkspaceNotice('Submission workspace opened.');
        break;
      case 'feedback-view':
      case 'feedback-check':
      case 'feedback-corrections':
        openProjectView(firstProject, 'feedback');
        setWorkspaceMode(workspaceAction.id);
        setWorkspaceNotice('Feedback and evaluation opened.');
        break;
      case 'docs-maintain':
      case 'docs-prepare':
      case 'docs-organize':
        openProjectView(leadProject, 'documentation');
        setWorkspaceMode(workspaceAction.id);
        setWorkspaceNotice('Documentation workspace opened.');
        break;
      default:
        break;
    }
  }, [workspaceAction, projects, studentId, selectedProject]);

  useEffect(() => {
    if (!selectedProject && studentProjects.length > 0) {
      setSelectedProject(studentProjects[0].id);
    }
  }, [selectedProject, studentProjects]);

  return (
    <div className="project-management">
      <section className="page-head page-head-row">
        <div>
          <h1>My Projects</h1>
          <p>View and manage your B.Tech projects</p>
        </div>
        <button type="button" className="primary-dark-btn" onClick={() => setShowCreateForm(true)}>
          + Create New Project
        </button>
      </section>

      <div className="project-grid">
        <section className="project-left-column">
          <section className="project-list">
            <h3>Your Projects</h3>
            {studentProjects.length === 0 ? (
              <p className="no-projects">No projects yet. Create your first one!</p>
            ) : (
              studentProjects.map((project) => (
                <article
                  key={project.id}
                  className={`project-card ${selectedProject === project.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProject(project.id);
                    setActiveTab('overview');
                  }}
                >
                  <div className="project-card-head">
                    <h4>{project.name}</h4>
                    <span className={`status-badge ${project.status}`}>{project.status}</span>
                  </div>
                  <p className="project-description">{project.description}</p>
                  <div className="project-meta">
                    <span>Team: {project.teamMembers.length} members</span>
                    <span>Progress: {project.progressPercent}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${project.progressPercent}%` }} />
                  </div>
                </article>
              ))
            )}
          </section>
        </section>

        {selectedProjectData ? (
          <section className="project-details">
            <div className="project-details-head">
              <div>
                <h3>{selectedProjectData.name}</h3>
                <p className="project-status">{selectedProjectData.status === 'ongoing' ? '🟢 Ongoing' : '🟣 Completed'}</p>
              </div>
              <button
                type="button"
                className="primary-dark-btn"
                onClick={() => {
                  setEditProject(selectedProjectData);
                  setShowEditForm(true);
                }}
              >
                Edit
              </button>
            </div>

            <div className="project-tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                Tasks
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
                onClick={() => setActiveTab('files')}
              >
                Files
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('feedback');
                  setWorkspaceMode('feedback-view');
                }}
              >
                Feedback
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'documentation' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('documentation');
                  setWorkspaceMode('docs-maintain');
                }}
              >
                Documentation
              </button>
            </div>

            {workspaceNotice ? (
              <p className="workspace-notice">{workspaceNotice}</p>
            ) : null}

            <div className="project-details-info">
              {activeTab === 'overview' && (
                <>
                  <div className="info-section">
                    <h4>Description</h4>
                    <p>{selectedProjectData.description}</p>
                  </div>

                  <div className="info-section">
                    <h4>Technologies</h4>
                    <div className="tech-tags">
                      {selectedProjectData.technologies.map((tech) => (
                        <span key={tech} className="tech-tag">{tech}</span>
                      ))}
                    </div>
                  </div>

                  <div className="info-section">
                    <h4>Progress</h4>
                    <div className="progress-bar large">
                      <div className="progress-fill" style={{ width: `${selectedProjectData.progressPercent}%` }} />
                    </div>
                    <p className="progress-text">{selectedProjectData.progressPercent}% Complete</p>
                  </div>

                  <div className="info-section">
                    <h4>Deadline</h4>
                    <p>{selectedProjectData.deadline ? new Date(selectedProjectData.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No deadline set'}</p>
                  </div>

                  <div className="info-section">
                    <h4>Team Members</h4>
                    <div className="team-members">
                      {selectedProjectData.teamMembers.map((member) => (
                        <div key={member.id} className="team-member">
                          <div className="member-avatar">{member.name.substring(0, 1)}</div>
                          <div className="member-info">
                            <strong>{member.name}</strong>
                            <p>
                              {member.role}
                              {member.id ? ` | ${member.id}` : ''}
                              {member.email ? ` | ${member.email}` : ''}
                            </p>
                          </div>
                          {selectedProjectData.ownerId === studentId && (
                            <button
                              type="button"
                              className="remove-member-btn"
                              onClick={() => handleRemoveTeamMember(member.id)}
                              title="Remove from project"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {selectedProjectData.ownerId === studentId && (
                      <button
                        type="button"
                        className="primary-dark-btn"
                        onClick={() => setShowAddTeamMember(true)}
                        style={{ marginTop: '12px' }}
                      >
                        + Add Team Member
                      </button>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'tasks' && (
                <TaskManagement
                  projectId={selectedProjectData.id}
                  projectLeadId={selectedProjectData.projectLeadId}
                  currentUserId={studentId}
                  teamMembers={selectedProjectData.teamMembers}
                  projectTasks={tasks}
                  onTasksUpdate={setTasks}
                  actionMode={workspaceMode}
                  projectName={selectedProjectData.name}
                />
              )}

              {activeTab === 'files' && (
                <FileManagement
                  projectId={selectedProjectData.id}
                  projectLeadId={selectedProjectData.projectLeadId}
                  currentUserId={studentId}
                  teamMembers={selectedProjectData.teamMembers}
                  projectFiles={files}
                  onFilesUpdate={setFiles}
                  actionMode={workspaceMode}
                  projectName={selectedProjectData.name}
                />
              )}

              {activeTab === 'chat' && (
                <div className="project-chat">
                  <h4>Team Chat</h4>
                  <div className="chat-messages">
                    {selectedProjectChatMessages.length === 0 ? (
                      <p className="no-messages">No messages yet. Start the conversation!</p>
                    ) : (
                      selectedProjectChatMessages.map((msg) => (
                        <div key={msg.id} className="chat-message">
                          <strong>{msg.senderName}</strong>
                          <p>{msg.message}</p>
                          <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <form className="chat-input-form" onSubmit={handleSendMessage}>
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="send-btn">Send</button>
                  </form>
                </div>
              )}

              {activeTab === 'feedback' && (
                <div className="project-chat">
                  <h4>Feedback & Evaluation</h4>
                  {workspaceMode === 'feedback-view' && (
                    <p className="workspace-notice">View mentor feedback and guidance for this project.</p>
                  )}
                  {workspaceMode === 'feedback-check' && (
                    <p className="workspace-notice">Check marks and grade progress shared by mentor.</p>
                  )}
                  {workspaceMode === 'feedback-corrections' && (
                    <p className="workspace-notice">Submit correction requests or improvement updates.</p>
                  )}

                  <div className="info-section">
                    <h4>Mentor Feedback</h4>
                    <p>
                      {selectedProjectProposal?.feedbackFromFaculty || selectedProjectGrade?.comments || 'No mentor feedback available yet.'}
                    </p>
                    <p>
                      Last evaluation date: {selectedProjectGrade?.evaluationDate || 'Not evaluated'}
                    </p>
                  </div>

                  <div className="info-section">
                    <h4>Current Evaluation Summary</h4>
                    <p>Project progress: {selectedProjectData.progressPercent}%</p>
                    <p>Status: {selectedProjectData.status}</p>
                  </div>

                  {workspaceMode === 'feedback-check' && (
                    <div className="info-section">
                      <h4>Marks Breakdown</h4>
                      {selectedProjectGrade ? (
                        <div className="contributions-grid">
                          <div className="contribution-card">
                            <div className="contribution-head"><strong>Proposal</strong></div>
                            <div className="contribution-stats"><span>{selectedProjectGrade.proposalMark} / 20</span></div>
                          </div>
                          <div className="contribution-card">
                            <div className="contribution-head"><strong>Progress</strong></div>
                            <div className="contribution-stats"><span>{selectedProjectGrade.progressMark} / 20</span></div>
                          </div>
                          <div className="contribution-card">
                            <div className="contribution-head"><strong>Implementation</strong></div>
                            <div className="contribution-stats"><span>{selectedProjectGrade.implementationMark} / 30</span></div>
                          </div>
                          <div className="contribution-card">
                            <div className="contribution-head"><strong>Final Submission</strong></div>
                            <div className="contribution-stats"><span>{selectedProjectGrade.finalSubmissionMark} / 30</span></div>
                          </div>
                        </div>
                      ) : (
                        <p>Marks are not published yet.</p>
                      )}
                    </div>
                  )}

                  <div className="info-section">
                    <h4>Correction / Improvement Note</h4>
                    <textarea
                      className="form-textarea"
                      rows="4"
                      placeholder="Add corrections or clarification for mentor"
                      value={feedbackCorrections}
                      onChange={(e) => setFeedbackCorrections(e.target.value)}
                    />
                    <div className="button-group" style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          if (!feedbackCorrections.trim()) {
                            alert('Please enter a correction note.');
                            return;
                          }
                          setCorrectionHistory((prev) => [
                            {
                              id: `CORR-${Date.now()}`,
                              note: feedbackCorrections,
                              createdAt: new Date().toLocaleString()
                            },
                            ...prev
                          ]);
                          alert('Correction note submitted to mentor.');
                          setFeedbackCorrections('');
                        }}
                      >
                        Submit Correction
                      </button>
                    </div>
                  </div>

                  <div className="info-section">
                    <h4>Correction History</h4>
                    {correctionHistory.length === 0 ? (
                      <p>No corrections submitted yet.</p>
                    ) : (
                      <div className="suggestions-list">
                        {correctionHistory.map((entry) => (
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

              {activeTab === 'documentation' && (
                <div className="project-chat">
                  <h4>Documentation Workspace</h4>
                  {workspaceMode === 'docs-maintain' && (
                    <p className="workspace-notice">Maintain reports and supporting documents.</p>
                  )}
                  {workspaceMode === 'docs-prepare' && (
                    <p className="workspace-notice">Prepare presentation notes and review points.</p>
                  )}
                  {workspaceMode === 'docs-organize' && (
                    <p className="workspace-notice">Organize project files and final folders.</p>
                  )}

                  <div className="info-section">
                    <h4>Add Documentation Note</h4>
                    <textarea
                      className="form-textarea"
                      rows="3"
                      placeholder="Write documentation update"
                      value={docNote}
                      onChange={(e) => setDocNote(e.target.value)}
                    />
                    <div className="button-group" style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          if (!docNote.trim()) {
                            alert('Please enter documentation notes.');
                            return;
                          }
                          setDocEntries((prev) => [
                            {
                              id: `DOC-${Date.now()}`,
                              text: docNote,
                              mode: workspaceMode,
                              createdAt: new Date().toLocaleString()
                            },
                            ...prev
                          ]);
                          setDocNote('');
                        }}
                      >
                        Save Note
                      </button>
                    </div>
                  </div>

                  {workspaceMode === 'docs-maintain' && (
                    <div className="info-section">
                      <h4>Maintain Reports & Documents</h4>
                      <div className="modal-card" style={{ padding: '12px' }}>
                        <label htmlFor="docTitle">Document Title</label>
                        <input
                          id="docTitle"
                          type="text"
                          value={docRecord.title}
                          onChange={(e) => setDocRecord((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Sprint 3 Report"
                        />
                        <label htmlFor="docCategory">Category</label>
                        <select
                          id="docCategory"
                          value={docRecord.category}
                          onChange={(e) => setDocRecord((prev) => ({ ...prev, category: e.target.value }))}
                        >
                          <option value="report">Report</option>
                          <option value="document">Document</option>
                          <option value="minutes">Meeting Minutes</option>
                        </select>
                        <div className="button-group" style={{ marginTop: '10px' }}>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => {
                              if (!docRecord.title.trim()) {
                                alert('Please enter a document title.');
                                return;
                              }
                              setDocRegistry((prev) => [
                                {
                                  id: `REG-${Date.now()}`,
                                  title: docRecord.title,
                                  category: docRecord.category,
                                  createdAt: new Date().toLocaleString()
                                },
                                ...prev
                              ]);
                              setDocRecord({ title: '', category: 'report' });
                            }}
                          >
                            Add Record
                          </button>
                        </div>
                      </div>

                      {docRegistry.length > 0 ? (
                        <div className="suggestions-list" style={{ marginTop: '12px' }}>
                          {docRegistry.map((entry) => (
                            <div key={entry.id} className="suggestion-item">
                              <p>{entry.title}</p>
                              <p className="suggestion-meta">{entry.category} | {entry.createdAt}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No report/document records added yet.</p>
                      )}
                    </div>
                  )}

                  {workspaceMode === 'docs-prepare' && (
                    <div className="info-section">
                      <h4>Presentation Preparation</h4>
                      <div className="modal-card" style={{ padding: '12px' }}>
                        <label htmlFor="presentationTitle">Presentation Title</label>
                        <input
                          id="presentationTitle"
                          type="text"
                          value={presentationDraft.title}
                          onChange={(e) => setPresentationDraft((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Final Demo"
                        />
                        <label htmlFor="presentationDate">Presentation Date</label>
                        <input
                          id="presentationDate"
                          type="date"
                          value={presentationDraft.date}
                          onChange={(e) => setPresentationDraft((prev) => ({ ...prev, date: e.target.value }))}
                        />
                        <label htmlFor="presentationPoints">Key Points</label>
                        <textarea
                          id="presentationPoints"
                          rows="3"
                          value={presentationDraft.points}
                          onChange={(e) => setPresentationDraft((prev) => ({ ...prev, points: e.target.value }))}
                          placeholder="Mention top points for the presentation"
                        />
                        <div className="button-group" style={{ marginTop: '10px' }}>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => {
                              if (!presentationDraft.title.trim()) {
                                alert('Please enter a presentation title.');
                                return;
                              }
                              setPresentationPlans((prev) => [
                                {
                                  id: `PRESENT-${Date.now()}`,
                                  ...presentationDraft,
                                  createdAt: new Date().toLocaleString()
                                },
                                ...prev
                              ]);
                              setPresentationDraft({ title: '', date: '', points: '' });
                            }}
                          >
                            Save Presentation Plan
                          </button>
                        </div>
                      </div>

                      {presentationPlans.length > 0 ? (
                        <div className="suggestions-list" style={{ marginTop: '12px' }}>
                          {presentationPlans.map((plan) => (
                            <div key={plan.id} className="suggestion-item">
                              <p>{plan.title}</p>
                              <p className="suggestion-meta">Date: {plan.date || 'TBD'} | {plan.createdAt}</p>
                              <p>{plan.points || 'No points added yet.'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No presentation plans yet.</p>
                      )}
                    </div>
                  )}

                  {workspaceMode === 'docs-organize' && (
                    <div className="info-section">
                      <h4>Organize Project Files</h4>
                      <p>Current files linked to this project: {selectedProjectFiles.length}</p>
                      <div className="button-group" style={{ marginBottom: '10px' }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setOrganizeChecklist((prev) => ({ ...prev, reports: !prev.reports }))}
                        >
                          {organizeChecklist.reports ? 'Unmark Reports Organized' : 'Mark Reports Organized'}
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setOrganizeChecklist((prev) => ({ ...prev, presentation: !prev.presentation }))}
                        >
                          {organizeChecklist.presentation ? 'Unmark Presentation Organized' : 'Mark Presentation Organized'}
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setOrganizeChecklist((prev) => ({ ...prev, sourceCode: !prev.sourceCode }))}
                        >
                          {organizeChecklist.sourceCode ? 'Unmark Source Code Organized' : 'Mark Source Code Organized'}
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => setOrganizeChecklist((prev) => ({ ...prev, references: !prev.references }))}
                        >
                          {organizeChecklist.references ? 'Unmark References Organized' : 'Mark References Organized'}
                        </button>
                      </div>
                      <p>
                        Reports: {organizeChecklist.reports ? 'Completed' : 'Pending'} | Presentation: {organizeChecklist.presentation ? 'Completed' : 'Pending'} | Source Code: {organizeChecklist.sourceCode ? 'Completed' : 'Pending'} | References: {organizeChecklist.references ? 'Completed' : 'Pending'}
                      </p>
                    </div>
                  )}

                  <div className="info-section">
                    <h4>Documentation History</h4>
                    {docEntries.length === 0 ? (
                      <p>No documentation notes yet.</p>
                    ) : (
                      <div className="suggestions-list">
                        {docEntries.map((entry) => (
                          <div key={entry.id} className="suggestion-item">
                            <p>{entry.text}</p>
                            <p className="suggestion-meta">{entry.mode} | {entry.createdAt}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="project-details empty">
            <p>Select a project to view details and chat with your team</p>
          </section>
        )}
      </div>

      {showCreateForm ? (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleCreateProject}>
            <div className="modal-head">
              <div>
                <h3>Create New Project</h3>
                <p>Start a new B.Tech project</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowCreateForm(false)}>✕</button>
            </div>

            <label htmlFor="projectName">Project Name *</label>
            <input
              id="projectName"
              type="text"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              required
            />

            <label htmlFor="projectDesc">Description</label>
            <textarea
              id="projectDesc"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              rows="3"
            />

            <label htmlFor="projectTech">Technologies (comma-separated)</label>
            <input
              id="projectTech"
              type="text"
              placeholder="e.g., React, Node.js, MongoDB"
              value={newProject.technologies}
              onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
            />

            <label htmlFor="projectDeadline">Deadline</label>
            <input
              id="projectDeadline"
              type="date"
              value={newProject.deadline}
              onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
            />

            <div className="modal-actions">
              <button type="button" className="outline-btn" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="primary-dark-btn">Create Project</button>
            </div>
          </form>
        </div>
      ) : null}

      {showEditForm && editProject ? (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleEditProject}>
            <div className="modal-head">
              <div>
                <h3>Edit Project</h3>
                <p>Update project details</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => { setShowEditForm(false); setEditProject(null); }}>✕</button>
            </div>

            <label htmlFor="editProjectName">Project Name *</label>
            <input
              id="editProjectName"
              type="text"
              value={editProject.name}
              onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
              required
            />

            <label htmlFor="editProjectDesc">Description</label>
            <textarea
              id="editProjectDesc"
              value={editProject.description}
              onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
              rows="3"
            />

            <label htmlFor="editProjectStatus">Status</label>
            <select
              id="editProjectStatus"
              value={editProject.status}
              onChange={(e) => setEditProject({ ...editProject, status: e.target.value })}
            >
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>

            <label htmlFor="editProjectProgress">Progress (%)</label>
            <input
              id="editProjectProgress"
              type="number"
              min="0"
              max="100"
              value={editProject.progressPercent}
              onChange={(e) => setEditProject({ ...editProject, progressPercent: Number(e.target.value) })}
            />

            <div className="modal-actions">
              <button type="button" className="outline-btn" onClick={() => { setShowEditForm(false); setEditProject(null); }}>Cancel</button>
              <button type="submit" className="primary-dark-btn">Save Changes</button>
            </div>
          </form>
        </div>
      ) : null}

      {showAddTeamMember ? (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleAddTeamMember}>
            <div className="modal-head">
              <div>
                <h3>Add Team Member</h3>
                <p>Add a new member to your project</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowAddTeamMember(false)}>✕</button>
            </div>

            <label htmlFor="memberName">Team Member Name</label>
            <input
              id="memberName"
              type="text"
              placeholder="Enter member name"
              value={newTeamMemberName}
              onChange={(e) => setNewTeamMemberName(e.target.value)}
              required
            />

            <label htmlFor="memberStudentId">Student ID</label>
            <input
              id="memberStudentId"
              type="text"
              placeholder="Enter student ID (e.g., STU005)"
              value={newTeamMemberStudentId}
              onChange={(e) => setNewTeamMemberStudentId(e.target.value)}
              required
            />

            <label htmlFor="memberEmail">Student Email</label>
            <input
              id="memberEmail"
              type="email"
              placeholder="Enter student email"
              value={newTeamMemberEmail}
              onChange={(e) => setNewTeamMemberEmail(e.target.value)}
              required
            />

            <div className="modal-actions">
              <button
                type="button"
                className="outline-btn"
                onClick={() => {
                  setShowAddTeamMember(false);
                  setNewTeamMemberName('');
                  setNewTeamMemberStudentId('');
                  setNewTeamMemberEmail('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="primary-dark-btn">Add Member</button>
            </div>
          </form>
        </div>
      ) : null}

      {showEditSuggestion && selectedProjectData ? (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleSendEditSuggestion}>
            <div className="modal-head">
              <div>
                <h3>Send Edit Suggestion</h3>
                <p>Suggest changes to a task</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => { setShowEditSuggestion(false); setEditSuggestion({ taskId: '', suggestion: '' }); }}>✕</button>
            </div>

            <label htmlFor="suggestionTask">Select Task</label>
            <select
              id="suggestionTask"
              value={editSuggestion.taskId}
              onChange={(e) => setEditSuggestion({ ...editSuggestion, taskId: e.target.value })}
              required
            >
              <option value="">Choose a task...</option>
              {tasks
                .filter((t) => t.projectId === selectedProjectData.id)
                .map((task) => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
            </select>

            <label htmlFor="suggestionText">Your Suggestion</label>
            <textarea
              id="suggestionText"
              placeholder="Describe your suggested edits or improvements..."
              value={editSuggestion.suggestion}
              onChange={(e) => setEditSuggestion({ ...editSuggestion, suggestion: e.target.value })}
              rows="4"
              required
            />

            <div className="modal-actions">
              <button type="button" className="outline-btn" onClick={() => { setShowEditSuggestion(false); setEditSuggestion({ taskId: '', suggestion: '' }); }}>Cancel</button>
              <button type="submit" className="primary-dark-btn">Send Suggestion</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default ProjectManagement;
