function ProjectMonitoringPanel({ projects }) {
  const ongoingProjects = projects.filter((p) => p.status === 'ongoing');

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
          <p className="stat-value">{Math.round(projects.reduce((sum, p) => sum + p.progressPercent, 0) / projects.length)}%</p>
        </div>
      </div>

      <div className="panel-content">
        <h3>Project Progress Tracking</h3>
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
                <p>📅 Deadline: <strong>{project.deadline}</strong></p>
                <p>👥 Team Size: <strong>{project.teamMemberIds.length}</strong></p>
              </div>

              <button className="btn-primary">View Details</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProjectMonitoringPanel;
