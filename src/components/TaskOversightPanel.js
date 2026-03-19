import { useState } from 'react';

function TaskOversightPanel({ tasks, studentsMap }) {
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
    alert(`✓ Suggestion added for "${showSuggestionForm.taskTitle}"`);
    setSuggestionText('');
    setShowSuggestionForm(null);
  };

  const tasksByStatus = {
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
    pending: tasks.filter((t) => t.status === 'pending')
  };

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
        <h3>Task Distribution & Status</h3>

        {['pending', 'in_progress', 'completed'].map((status) => (
          <div key={status} className="task-section" style={{ marginBottom: '32px' }}>
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
                    <button
                      className="btn-secondary"
                      onClick={() => handleSuggestEdit(task.id, task.title)}
                    >
                      ✎ Suggest Edit
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

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
                  ✓ Submit Suggestion
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
