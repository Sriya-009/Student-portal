function ProjectMonitoringPanel({ projects, tasks = [], activeAction }) {
  const handleViewDetails = (project) => {
    alert(`Project: ${project.name}\nLead: ${project.teamMembers[0]?.name || 'N/A'}\nProgress: ${project.progressPercent}%\nDeadline: ${project.deadline}`);
  };

  const averageProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.progressPercent, 0) / projects.length)
    : 0;
  const ongoingProjects = projects.filter((p) => p.status === 'ongoing');
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const avgTaskCompletion = tasks.length > 0
    ? Math.round(tasks.reduce((sum, task) => sum + task.contributionPercent, 0) / tasks.length)
    : 0;
  const sortedByDeadline = [...projects].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const showAllProjects = activeAction === 'monitor-all-projects';
  const showTaskCompletion = activeAction === 'monitor-tasks';
  const showDeadlines = activeAction === 'monitor-deadlines';
  const showStatus = activeAction === 'monitor-status';

  return (
    <section className="faculty-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Projects</h3>
          <p className="stat-value">{projects.length}</p>
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
                {projects.map((project) => (
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
            <div className="projects-monitoring-list">
              {sortedByDeadline.map((project) => (
                <div key={project.id} className="monitoring-card">
                  <h4>{project.name}</h4>
                  <p className="project-lead">Deadline: <strong>{project.deadline}</strong></p>
                  <p className="project-status">Status: {project.status}</p>
                  <button className="btn-primary" onClick={() => handleViewDetails(project)}>Track Project</button>
                </div>
              ))}
            </div>
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
                        style={{ width: `${project.progressPercent}%` }}
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
    </section>
  );
}

export default ProjectMonitoringPanel;
