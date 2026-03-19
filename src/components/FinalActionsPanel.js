import { useState, useMemo } from 'react';

function FinalActionsPanel({ projects, grades }) {
  const [projectsState, setProjectsState] = useState(projects);
  const [completedProjects, setCompletedProjects] = useState(new Set());
  const [archivedProjects, setArchivedProjects] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const completedCount = useMemo(
    () => completedProjects.size,
    [completedProjects]
  );

  const archivedCount = useMemo(
    () => archivedProjects.size,
    [archivedProjects]
  );

  const handleMarkComplete = (projectId) => {
    setConfirmAction({ type: 'complete', projectId });
  };

  const confirmMarkComplete = () => {
    if (!confirmAction || !confirmAction.projectId) return;

    const updatedProjects = projectsState.map((p) =>
      p.id === confirmAction.projectId
        ? { ...p, status: 'completed', completionDate: new Date().toISOString().split('T')[0] }
        : p
    );

    setProjectsState(updatedProjects);
    setCompletedProjects(new Set(completedProjects).add(confirmAction.projectId));
    alert(`✓ Project marked as completed!`);
    setConfirmAction(null);
  };

  const handleArchive = (projectId) => {
    setConfirmAction({ type: 'archive', projectId });
  };

  const confirmArchive = () => {
    if (!confirmAction || !confirmAction.projectId) return;

    const updatedProjects = projectsState.map((p) =>
      p.id === confirmAction.projectId ? { ...p, isArchived: true } : p
    );

    setProjectsState(updatedProjects);
    setArchivedProjects(new Set(archivedProjects).add(confirmAction.projectId));
    alert(`✓ Project archived successfully!`);
    setConfirmAction(null);
  };

  const handlePublishResults = () => {
    const completedProj = projectsState.filter((p) => p.status === 'completed').length;
    if (completedProj === 0) {
      alert('No completed projects to publish');
      return;
    }

    alert(`✓ Results published to ${completedProj} students!`);
  };

  const handleCleanup = () => {
    const totalProjects = projectsState.length;
    const cleanedProjects = projectsState.filter((p) => p.isArchived).length;

    alert(`Database Cleanup Report:\n- Total Projects: ${totalProjects}\n- Cleaned (Archived): ${cleanedProjects}`);
  };

  const handleFinalReview = () => {
    const total = projectsState.length;
    const completed = completedCount;
    const archived = archivedCount;
    const pending = total - completed;

    alert(
      `Final Review Summary:\n` +
      `─────────────────────\n` +
      `Total Projects: ${total}\n` +
      `Completed: ${completed}\n` +
      `Archived: ${archived}\n` +
      `Pending: ${pending}`
    );
  };

  const cancelConfirmation = () => {
    setConfirmAction(null);
    setSelectedProject(null);
  };

  const incompleteProjects = projectsState.filter((p) => p.status !== 'completed' && !archivedProjects.has(p.id));

  return (
    <section className="faculty-panel final-actions-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Projects</h3>
          <p className="stat-value">{projectsState.length}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p className="stat-value">{completedCount}</p>
        </div>
        <div className="stat-card">
          <h3>Archived</h3>
          <p className="stat-value">{archivedCount}</p>
        </div>
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-value">{projectsState.length - completedCount - archivedCount}</p>
        </div>
      </div>

      <div className="panel-content">
        <div className="action-grid">
          <div className="action-section">
            <h3>Complete Projects</h3>
            <div className="project-list">
              {incompleteProjects.length === 0 ? (
                <p className="empty-state">All projects completed or archived</p>
              ) : (
                incompleteProjects.map((proj) => (
                  <div key={proj.id} className="project-item">
                    <div className="project-info">
                      <strong>{proj.id}</strong>
                      <p>{proj.title}</p>
                      <p className="project-status">{proj.status}</p>
                    </div>
                    <button
                      className="btn-success"
                      onClick={() => {
                        setSelectedProject(proj.id);
                        handleMarkComplete(proj.id);
                      }}
                    >
                      Mark Complete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="action-section">
            <h3>Archive & Cleanup</h3>
            <ul className="checklist">
              <li>
                <strong>Archive completed projects</strong>
                <p>Move finalized projects to archive</p>
              </li>
              <li>
                <strong>Cleanup old data</strong>
                <p>Remove temporary records and cleanup</p>
              </li>
              <li>
                <strong>Final review</strong>
                <p>Review summary before publish</p>
              </li>
            </ul>

            <div className="button-group">
              <button className="btn-primary" onClick={() => handleArchive(selectedProject || projectsState[0]?.id)}>
                Archive Projects
              </button>
              <button className="btn-secondary" onClick={handleCleanup}>
                Cleanup
              </button>
              <button className="btn-info" onClick={handleFinalReview}>
                Final Review
              </button>
            </div>
          </div>

          <div className="action-section">
            <h3>Publish Results</h3>
            <div className="publish-section">
              <h4>Publish to Students</h4>
              <p>Notify all students of their final grades and feedback</p>
              <button className="btn-success" onClick={handlePublishResults}>
                Publish Results
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmAction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Action</h3>
            <p>
              {confirmAction.type === 'complete'
                ? 'Mark this project as completed? This action will update the project status.'
                : 'Archive this project? Archived projects will be removed from active view.'}
            </p>
            <div className="button-group">
              <button
                className="btn-success"
                onClick={confirmAction.type === 'complete' ? confirmMarkComplete : confirmArchive}
              >
                Confirm
              </button>
              <button className="btn-secondary" onClick={cancelConfirmation}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default FinalActionsPanel;
