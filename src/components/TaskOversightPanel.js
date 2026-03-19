function TaskOversightPanel({ tasks, studentsMap }) {
  const tasksByStatus = {
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
    pending: tasks.filter((t) => t.status === 'pending')
  };

  return (
    <section className="faculty-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Tasks</h3>
          <p className="stat-value">{tasks.length}</p>
        </div>
        <div className="stat-card">
          <h3>In Progress</h3>
          <p className="stat-value">{tasksByStatus.in_progress.length}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p className="stat-value">{tasksByStatus.completed.length}</p>
        </div>
      </div>

      <div className="panel-content">
        <h3>Task Distribution & Status</h3>

        {['in_progress', 'pending', 'completed'].map((status) => (
          <div key={status} className="task-section">
            <h4 className={`task-status-header ${status}`}>
              {status === 'in_progress' ? '⏳ In Progress' : status === 'pending' ? '📋 Pending' : '✓ Completed'}
              <span className="count">({tasksByStatus[status].length})</span>
            </h4>

            <div className="tasks-list">
              {tasksByStatus[status].length === 0 ? (
                <p className="empty-state">No tasks in this status.</p>
              ) : (
                tasksByStatus[status].map((task) => (
                  <div key={task.id} className="task-item">
                    <div className="task-main">
                      <h5>{task.title}</h5>
                      <p className="task-desc">{task.description}</p>
                    </div>
                    <div className="task-details">
                      <p>Assigned: <strong>{task.assignedToName}</strong></p>
                      <p>Due: <strong>{task.deadline}</strong></p>
                      <p>Progress: <strong>{task.contributionPercent}%</strong></p>
                    </div>
                    <button className="btn-secondary">✎ Suggest Edit</button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TaskOversightPanel;
