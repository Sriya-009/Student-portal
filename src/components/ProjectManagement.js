import { useState, useMemo } from 'react';
import { bTechProjects, projectChats, projectTasks } from '../data/portalData';
import TaskManagement from './TaskManagement';

function ProjectManagement({ studentId }) {
  const [projects, setProjects] = useState(bTechProjects);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState(projectTasks);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    technologies: '',
    deadline: ''
  });
  const [editProject, setEditProject] = useState(null);
  const [projectMessages, setProjectMessages] = useState(projectChats);
  const [newMessage, setNewMessage] = useState('');

  const studentProjects = useMemo(
    () => projects.filter((p) => p.teamMemberIds.includes(studentId)),
    [projects, studentId]
  );

  const selectedProjectData = selectedProject ? projects.find((p) => p.id === selectedProject) : null;
  const selectedProjectChatMessages = selectedProject
    ? projectMessages.filter((msg) => msg.projectId === selectedProject).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
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

  return (
    <div className="project-management">
      <section className="page-head page-head-row">
        <div>
          <h1>Project Management</h1>
          <p>Manage your B.Tech projects, collaborate with team members, and track progress</p>
        </div>
        <button type="button" className="primary-dark-btn" onClick={() => setShowCreateForm(true)}>
          + Create New Project
        </button>
      </section>

      <section className="stats-grid three-cols">
        <article className="stat-card">
          <h4>Total Projects</h4>
          <strong className="value-primary">{studentProjects.length}</strong>
        </article>
        <article className="stat-card">
          <h4>Ongoing</h4>
          <strong className="value-success">{studentProjects.filter((p) => p.status === 'ongoing').length}</strong>
        </article>
        <article className="stat-card">
          <h4>Completed</h4>
          <strong className="value-primary">{studentProjects.filter((p) => p.status === 'completed').length}</strong>
        </article>
      </section>

      <div className="project-grid">
        <section className="project-list">
          <h3>Your Projects</h3>
          {studentProjects.length === 0 ? (
            <p className="no-projects">No projects yet. Create your first one!</p>
          ) : (
            studentProjects.map((project) => (
              <article
                key={project.id}
                className={`project-card ${selectedProject === project.id ? 'active' : ''}`}
                onClick={() => setSelectedProject(project.id)}
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

            {selectedProjectData.projectLeadId === studentId && (
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
                  className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chat')}
                >
                  Chat
                </button>
              </div>
            )}

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
                            <p>{member.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'tasks' && selectedProjectData.projectLeadId === studentId && (
                <TaskManagement
                  projectId={selectedProjectData.id}
                  projectLeadId={selectedProjectData.projectLeadId}
                  currentUserId={studentId}
                  teamMembers={selectedProjectData.teamMembers}
                  projectTasks={tasks}
                  onTasksUpdate={setTasks}
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

              {!(selectedProjectData.projectLeadId === studentId) && (
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
                            <p>{member.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

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
                </>
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
    </div>
  );
}

export default ProjectManagement;
