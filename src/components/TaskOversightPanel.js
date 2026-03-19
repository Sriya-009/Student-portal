import { useState } from 'react';

function TaskOversightPanel({ tasks, studentsMap, activeAction }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestionForm, setShowSuggestionForm] = useState(null);
  const [suggestionText, setSuggestionText] = useState('');

  const handleSuggestEdit = (taskId, taskTitle) => {
    setShowSuggestionForm({ taskId, taskTitle });
  };

  const handleSubmitSuggestion = () => {
    if (!suggestionText.trim() || !showSuggestionForm) {
      alert('Please enter a suggestion');
      return;
    }

    const newSuggestion = {
      id: `SUG-${Date.now()}`,
      taskId: showSuggestionForm.taskId,
      taskTitle: showSuggestionForm.taskTitle,
      suggestion: suggestionText,
      addedDate: new Date().toISOString().split('T')[0],
      status: 'pending'
    };

    setSuggestions([...suggestions, newSuggestion]);
    alert(`Suggestion added for "${showSuggestionForm.taskTitle}"`);
    setSuggestionText('');
    setShowSuggestionForm(null);
  };

  const tasksByStatus = {
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
    pending: tasks.filter((t) => t.status === 'pending')
  };

  const taskDistribution = Object.values(
    tasks.reduce((acc, task) => {
      if (!acc[task.assignedToId]) {
        acc[task.assignedToId] = {
          studentId: task.assignedToId,
          studentName: studentsMap?.[task.assignedToId] || task.assignedToName,
          count: 0
        };
      }
      acc[task.assignedToId].count += 1;
      return acc;
    }, {})
  );

  const overdueTasks = tasks.filter((task) => {
    return task.status !== 'completed' && new Date(task.deadline) < new Date();
  });

  const avgContribution = tasks.length > 0
    ? Math.round(tasks.reduce((sum, task) => sum + task.contributionPercent, 0) / tasks.length)
    : 0;

  const showReview = activeAction === 'task-review' || activeAction === 'tasks-overview' || !activeAction;
  const showDistribution = activeAction === 'task-distribution';
  const showModify = activeAction === 'task-modify';
  const showOversee = activeAction === 'task-oversee' || activeAction === 'task-overdue';
  const showAnalytics = activeAction === 'task-analytics';

  return (
    <section className="faculty-panel task-oversight-panel">
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
        <div className="stat-card">
          <h3>Suggestions</h3>
          <p className="stat-value">{suggestions.length}</p>
        </div>
      </div>

      <div className="panel-content">
        {showReview && (
          <>
            <h3>Review Tasks</h3>
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.assignedToName}</td>
                    <td>{task.status}</td>
                    <td>{task.deadline}</td>
                    <td>{task.contributionPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {showDistribution && (
          <>
            <h3>Task Distribution</h3>
            <div className="tasks-list">
              {taskDistribution.map((entry) => (
                <div key={entry.studentId} className="task-item">
                  <div className="task-main">
                    <h5>{entry.studentName}</h5>
                    <p className="task-desc">Student ID: {entry.studentId}</p>
                  </div>
                  <div className="task-details">
                    <p>Assigned Tasks: <strong>{entry.count}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {showModify && (
          <>
            <h3>Suggest Modifications</h3>
            <div className="tasks-list">
              {tasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-main">
                    <h5>{task.title}</h5>
                    <p className="task-desc">{task.description}</p>
                  </div>
                  <div className="task-details">
                    <p>Assigned: <strong>{task.assignedToName}</strong></p>
                    <p>Due: <strong>{task.deadline}</strong></p>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => handleSuggestEdit(task.id, task.title)}
                  >
                    Suggest Edit
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {showOversee && (
          <>
            <h3>Oversee Tasks</h3>
            {overdueTasks.length === 0 ? (
              <p className="empty-state">No overdue tasks currently.</p>
            ) : (
              <div className="tasks-list">
                {overdueTasks.map((task) => (
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
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {showAnalytics && (
          <>
            <h3>Task Analytics</h3>
            <div className="panel-grid">
              <div className="stat-card">
                <h3>Pending</h3>
                <p className="stat-value">{tasksByStatus.pending.length}</p>
              </div>
              <div className="stat-card">
                <h3>In Progress</h3>
                <p className="stat-value">{tasksByStatus.in_progress.length}</p>
              </div>
              <div className="stat-card">
                <h3>Completed</h3>
                <p className="stat-value">{tasksByStatus.completed.length}</p>
              </div>
              <div className="stat-card">
                <h3>Average Completion</h3>
                <p className="stat-value">{avgContribution}%</p>
              </div>
            </div>
          </>
        )}

        {showSuggestionForm && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-head">
                <div>
                  <h3>Suggest Task Modification</h3>
                  <p>Task: {showSuggestionForm.taskTitle}</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    setShowSuggestionForm(null);
                    setSuggestionText('');
                  }}
                >
                  ✕
                </button>
              </div>

              <textarea
                placeholder="Enter your suggestion for modifying this task..."
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                rows="4"
                className="form-textarea"
              />

              <div className="button-group" style={{ marginTop: '16px' }}>
                <button className="btn-success" onClick={handleSubmitSuggestion}>
                  Submit Suggestion
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowSuggestionForm(null);
                    setSuggestionText('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <>
            <h3 style={{ marginTop: '32px' }}>Suggestions History</h3>
            <div className="suggestions-list">
              {suggestions.map((sug) => (
                <div key={sug.id} className="suggestion-item">
                  <div className="suggestion-header">
                    <strong>{sug.taskTitle}</strong>
                    <span className={`badge ${sug.status}`}>{sug.status}</span>
                  </div>
                  <p>{sug.suggestion}</p>
                  <p className="suggestion-meta">Added: {sug.addedDate}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default TaskOversightPanel;
