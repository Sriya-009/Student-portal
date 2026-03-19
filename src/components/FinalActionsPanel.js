import { useState } from 'react';

function FinalActionsPanel({ projects }) {
  const [selectedProject, setSelectedProject] = useState(null);

  const handleMarkComplete = (projectId) => {
    alert(`✓ Project ${projectId} marked as completed!`);
  };

  const handleArchive = (projectId) => {
    alert(`📦 Project ${projectId} archived successfully!`);
  };

  const handlePublishResults = () => {
    alert('✓ Results published to students!');
  };

  const ongoingProjects = projects.filter((p) => p.status === 'ongoing');

  return (
    <section className="faculty-panel final-actions-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Projects</h3>
          <p className="stat-value">{projects.length}</p>
        </div>
        <div className="stat-card">
          <h3>Active Projects</h3>
          <p className="stat-value">{ongoingProjects.length}</p>
        </div>
        <div className="stat-card">
          <h3>Ready for Archive</h3>
          <p className="stat-value">{projects.filter((p) => p.progressPercent >= 100).length}</p>
        </div>
      </div>

      <div className="panel-content">
        <h3>Project Completion & Archival</h3>

        <div className="final-actions-list">
          {ongoingProjects.map((project) => (
            <div key={project.id} className="final-action-card">
              <div className="project-info">
                <h4>{project.name}</h4>
                <p>{project.description}</p>
                <div className="project-meta">
                  <span>Progress: <strong>{project.progressPercent}%</strong></span>
                  <span>Team: <strong>{project.teamMemberIds.length}</strong></span>
                  <span>Deadline: <strong>{project.deadline}</strong></span>
                </div>
              </div>

              <div className="action-buttons">
                {project.progressPercent >= 100 ? (
                  <>
                    <button
                      className="btn-success"
                      onClick={() => handleMarkComplete(project.id)}
                    >
                      ✓ Mark Complete
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => handleArchive(project.id)}
                    >
                      📦 Archive
                    </button>
                  </>
                ) : (
                  <p className="status-badge in-progress">In Progress - {project.progressPercent}%</p>
                )}
              </div>

              {selectedProject === project.id && (
                <div className="confirmation-box">
                  <p>⚠️ Mark this project as completed?</p>
                  <div className="confirm-buttons">
                    <button className="btn-danger" onClick={() => {
                      handleMarkComplete(project.id);
                      setSelectedProject(null);
                    }}>
                      Yes, Complete
                    </button>
                    <button className="btn-secondary" onClick={() => setSelectedProject(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: '32px' }}>Results & Publishing</h3>
        <div className="publishing-panel">
          <div className="publish-card">
            <h4>📊 Publish Grades & Results</h4>
            <p>Make student grades and feedback visible to students</p>
            <button className="btn-primary" onClick={handlePublishResults}>
              🔓 Publish Results to Students
            </button>
          </div>

          <div className="publish-card">
            <h4>📦 Archive Completed Projects</h4>
            <p>Archive all completed projects to maintain records</p>
            <button className="btn-primary">
              📦 Archive All Completed
            </button>
          </div>

          <div className="publish-card">
            <h4>🧹 Cleanup & Maintenance</h4>
            <p>Remove temporary data and optimize storage</p>
            <button className="btn-secondary">
              🧹 Run Cleanup
            </button>
          </div>
        </div>

        <h3 style={{ marginTop: '32px' }}>Final Review Checklist</h3>
        <div className="checklist">
          <div className="checklist-item">
            <input type="checkbox" id="c1" />
            <label htmlFor="c1">✓ All grades assigned and reviewed</label>
          </div>
          <div className="checklist-item">
            <input type="checkbox" id="c2" />
            <label htmlFor="c2">✓ Feedback provided to all students</label>
          </div>
          <div className="checklist-item">
            <input type="checkbox" id="c3" />
            <label htmlFor="c3">✓ Final submissions verified</label>
          </div>
          <div className="checklist-item">
            <input type="checkbox" id="c4" />
            <label htmlFor="c4">✓ Reports generated and documented</label>
          </div>
          <div className="checklist-item">
            <input type="checkbox" id="c5" />
            <label htmlFor="c5">✓ Student notifications sent</label>
          </div>
          <div className="checklist-item">
            <input type="checkbox" id="c6" />
            <label htmlFor="c6">✓ Projects archived</label>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FinalActionsPanel;
