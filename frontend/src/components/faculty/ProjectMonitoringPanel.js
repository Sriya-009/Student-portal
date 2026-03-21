import { useEffect, useState } from 'react';

function ProjectMonitoringPanel({ projects, tasks = [], activeAction }) {
  const [projectsState, setProjectsState] = useState(projects);
  const [searchTerm, setSearchTerm] = useState('');
  const [popupProject, setPopupProject] = useState(null);

  useEffect(() => {
    setProjectsState(projects);
  }, [projects]);

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleViewDetails = (project) => {
    setPopupProject(project);
  };

  const handleExtendDeadline = (days) => {
    if (!popupProject?.deadline) {
      return;
    }

    const currentDeadline = new Date(popupProject.deadline);
    currentDeadline.setDate(currentDeadline.getDate() + days);
    const nextDeadline = formatDateKey(currentDeadline);

    setProjectsState((prev) => prev.map((project) => (
      project.id === popupProject.id
        ? { ...project, deadline: nextDeadline }
        : project
    )));
    setPopupProject((prev) => (prev ? { ...prev, deadline: nextDeadline } : prev));
  };

  const closePopup = () => {
    setPopupProject(null);
  };

  const averageProgress = projectsState.length > 0
    ? Math.round(projectsState.reduce((sum, p) => sum + p.progressPercent, 0) / projectsState.length)
    : 0;
  const ongoingProjects = projectsState.filter((p) => p.status === 'ongoing');
  const completedProjects = projectsState.filter((p) => p.status === 'completed');
  const avgTaskCompletion = tasks.length > 0
    ? Math.round(tasks.reduce((sum, task) => sum + task.contributionPercent, 0) / tasks.length)
    : 0;
  const sortedByDeadline = [...projectsState].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const filteredBySearch = sortedByDeadline.filter((project) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      project.name.toLowerCase().includes(query)
      || project.id.toLowerCase().includes(query)
      || project.status.toLowerCase().includes(query)
    );
  });

  const showAllProjects = activeAction === 'monitor-all-projects';
  const showTaskCompletion = activeAction === 'monitor-tasks';
  const showDeadlines = activeAction === 'monitor-deadlines';
  const showStatus = activeAction === 'monitor-status';

  return (
    <section className="faculty-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Projects</h3>
          <p className="stat-value">{projectsState.length}</p>
        </div>
        <div className="stat-card">
          <h3>Ongoing Projects</h3>
          <p className="stat-value">{ongoingProjects.length}</p>
        </div>
        <div className="stat-card">
          <h3>Average Progress</h3>
          <p className="stat-value">{averageProgress}%</p>
        </div>
      </div>

      <div className="panel-content">
        {showAllProjects ? (
          <>
            <h3>View All Projects</h3>
            <table>
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {projectsState.map((project) => (
                  <tr key={project.id}>
                    <td>{project.id}</td>
                    <td>{project.name}</td>
                    <td>{project.status}</td>
                    <td>{project.progressPercent}%</td>
                    <td>{project.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : showTaskCompletion ? (
          <>
            <h3>Task Completion Tracking</h3>
            <p className="muted-line">Average completion across tasks: {avgTaskCompletion}%</p>
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Completion</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.assignedToName}</td>
                    <td>{task.status}</td>
                    <td>{task.contributionPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : showDeadlines ? (
          <>
            <h3>Deadlines & Milestones</h3>
            <div className="monitor-search-row">
              <input
                type="text"
                className="form-input monitor-search-input"
                placeholder="Search projects by name, ID, or status"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="projects-monitoring-list">
              {filteredBySearch.map((project) => (
                <div
                  key={project.id}
                  className="monitoring-card monitoring-card-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleViewDetails(project)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleViewDetails(project);
                    }
                  }}
                >
                  <h4>{project.name}</h4>
                  <p className="project-lead">Deadline: <strong>{project.deadline}</strong></p>
                  <p className="project-status">Status: {project.status}</p>
                  <p className="project-track-hint">Click project card to track and extend deadline</p>
                </div>
              ))}
            </div>
            {filteredBySearch.length === 0 ? (
              <p className="empty-state">No projects found for your search.</p>
            ) : null}
          </>
        ) : showStatus ? (
          <>
            <h3>Project Status</h3>
            <div className="panel-grid">
              <div className="stat-card">
                <h3>Ongoing</h3>
                <p className="stat-value">{ongoingProjects.length}</p>
              </div>
              <div className="stat-card">
                <h3>Completed</h3>
                <p className="stat-value">{completedProjects.length}</p>
              </div>
              <div className="stat-card">
                <h3>Average Progress</h3>
                <p className="stat-value">{averageProgress}%</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3>Track Progress</h3>
            <div className="projects-monitoring-list">
              {ongoingProjects.map((project) => (
                <div key={project.id} className="monitoring-card">
                  <div className="project-info">
                    <h4>{project.name}</h4>
                    <p className="project-lead">Lead: <strong>{project.teamMembers[0]?.name || 'N/A'}</strong></p>
                    <p className="project-tech">{project.technologies.join(', ')}</p>
                  </div>

                  <div className="progress-section">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ inlineSize: `${project.progressPercent}%` }}
                      />
                    </div>
                    <p className="progress-text">{project.progressPercent}% Complete</p>
                  </div>

                  <div className="deadline-info">
                    <p>Deadline: <strong>{project.deadline}</strong></p>
                    <p>Team Size: <strong>{project.teamMemberIds.length}</strong></p>
                  </div>

                  <button className="btn-primary" onClick={() => handleViewDetails(project)}>Track Project</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {popupProject ? (
        <div className="monitor-popup-overlay" onClick={closePopup}>
          <section
            className="monitor-popup-card"
            role="dialog"
            aria-modal="true"
            aria-label="Project details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="monitor-popup-head">
              <h3>{popupProject.name}</h3>
              <button type="button" className="monitor-popup-close" onClick={closePopup}>✕</button>
            </div>

            <div className="monitor-popup-body">
              <article className="monitor-popup-stat">
                <span>Project ID</span>
                <strong>{popupProject.id}</strong>
              </article>
              <article className="monitor-popup-stat">
                <span>Project Lead</span>
                <strong>{popupProject.teamMembers[0]?.name || 'N/A'}</strong>
              </article>
              <article className="monitor-popup-stat">
                <span>Progress</span>
                <strong>{popupProject.progressPercent}%</strong>
              </article>
              <article className="monitor-popup-stat">
                <span>Deadline</span>
                <strong>{popupProject.deadline || 'Not set'}</strong>
              </article>
              <article className="monitor-popup-stat">
                <span>Status</span>
                <strong>{popupProject.status}</strong>
              </article>
              <article className="monitor-popup-stat">
                <span>Team Size</span>
                <strong>{popupProject.teamMemberIds?.length || 0}</strong>
              </article>
            </div>

            <div className="monitor-popup-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ inlineSize: `${popupProject.progressPercent}%` }} />
              </div>
              <p>{popupProject.progressPercent}% completed</p>
            </div>

            <div className="monitor-popup-actions">
              <button type="button" className="btn-secondary" onClick={() => handleExtendDeadline(7)}>Extend +7 days</button>
              <button type="button" className="btn-secondary" onClick={() => handleExtendDeadline(14)}>Extend +14 days</button>
              <button type="button" className="btn-primary" onClick={closePopup}>Close</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default ProjectMonitoringPanel;
