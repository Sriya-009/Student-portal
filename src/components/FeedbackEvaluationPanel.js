import { useState } from 'react';

function FeedbackEvaluationPanel({ grades, facultyId }) {
  const [gradesState, setGradesState] = useState(
    grades.map((g) => ({
      ...g,
      feedbackList: g.feedbackList || []
    }))
  );
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [feedback, setFeedback] = useState('');

  const handleAddFeedback = () => {
    if (!feedback.trim() || !selectedGrade) {
      alert('Please select a project and enter feedback');
      return;
    }

    const updatedGrades = gradesState.map((g) => {
      if (g.id === selectedGrade) {
        const newFeedbackList = g.feedbackList || [];
        return {
          ...g,
          feedbackList: [
            ...newFeedbackList,
            {
              id: `FB-${Date.now()}`,
              text: feedback,
              addedDate: new Date().toISOString().split('T')[0],
              addedBy: 'You (Faculty)',
              status: 'active'
            }
          ],
          comments: feedback
        };
      }
      return g;
    });

    setGradesState(updatedGrades);
    alert('Feedback added successfully.');
    setFeedback('');
    setSelectedGrade(null);
  };

  const handleUpdateEvaluationStatus = (gradeId, newStatus) => {
    const updatedGrades = gradesState.map((g) =>
      g.id === gradeId ? { ...g, status: newStatus } : g
    );
    setGradesState(updatedGrades);
    alert(`Evaluation status updated to "${newStatus}"`);
  };

  const handleClearFeedback = () => {
    setFeedback('');
  };

  const inProgressGrades = gradesState.filter((g) => g.status === 'in-progress' || g.status === 'graded');
  const averageMark = gradesState.length > 0 
    ? Math.round(gradesState.reduce((sum, g) => sum + g.totalMark, 0) / gradesState.length)
    : 0;
  const feedbackGivenCount = gradesState.filter((g) => g.feedbackList && g.feedbackList.length > 0).length;

  return (
    <section className="faculty-panel feedback-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Students Evaluated</h3>
          <p className="stat-value">{gradesState.length}</p>
        </div>
        <div className="stat-card">
          <h3>Feedback Given</h3>
          <p className="stat-value">{feedbackGivenCount}</p>
        </div>
        <div className="stat-card">
          <h3>Average Score</h3>
          <p className="stat-value">{averageMark}%</p>
        </div>
      </div>

      <div className="panel-content">
        <h3>Provide Feedback & Evaluation</h3>

        <div className="feedback-form" style={{ marginBottom: '32px' }}>
          <select
            value={selectedGrade || ''}
            onChange={(e) => setSelectedGrade(e.target.value || null)}
            className="form-select"
          >
            <option value="">Select Student Project</option>
            {inProgressGrades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.projectId} - {grade.studentId} - Score: {grade.totalMark}/{grade.maxMark}
              </option>
            ))}
          </select>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Provide constructive feedback here..."
            rows="4"
            className="form-textarea"
          />

          <div className="button-group">
            <button className="btn-success" onClick={handleAddFeedback}>
              Add Feedback
            </button>
            <button className="btn-secondary" onClick={handleClearFeedback}>
              Clear
            </button>
          </div>
        </div>

        <h3>Recent Evaluations & Feedback</h3>
        <div className="feedback-list">
          {gradesState.length === 0 ? (
            <p className="empty-state">No evaluations available.</p>
          ) : (
            gradesState.map((grade) => (
              <div key={grade.id} className={`feedback-card ${grade.status}`}>
                <div className="feedback-header">
                  <div>
                    <h4>Project: {grade.projectId}</h4>
                    <p>Student ID: {grade.studentId}</p>
                  </div>
                  <span className={`status-badge ${grade.status}`}>{grade.status}</span>
                </div>

                <div className="feedback-scores">
                  <div className="score-item">
                    <span>Proposal:</span>
                    <strong>{grade.proposalMark}</strong>
                  </div>
                  <div className="score-item">
                    <span>Progress:</span>
                    <strong>{grade.progressMark}</strong>
                  </div>
                  <div className="score-item">
                    <span>Implementation:</span>
                    <strong>{grade.implementationMark}</strong>
                  </div>
                  <div className="score-item">
                    <span>Final Submission:</span>
                    <strong>{grade.finalSubmissionMark}</strong>
                  </div>
                  <div className="score-item total">
                    <span>Total:</span>
                    <strong>{grade.totalMark}/{grade.maxMark}</strong>
                  </div>
                </div>

                {grade.comments && <p className="feedback-comment"><strong>Feedback:</strong> {grade.comments}</p>}
                
                {grade.feedbackList && grade.feedbackList.length > 0 && (
                  <div className="feedback-history">
                    <h5>Feedback History:</h5>
                    {grade.feedbackList.map((fb) => (
                      <div key={fb.id} className="feedback-item">
                        <p>{fb.text}</p>
                        <p className="feedback-meta">Added on {fb.addedDate} by {fb.addedBy}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="evaluation-actions">
                  <select
                    value={grade.status}
                    onChange={(e) => handleUpdateEvaluationStatus(grade.id, e.target.value)}
                    className="form-select"
                    style={{ maxWidth: '200px' }}
                  >
                    <option value="in-progress">In Progress</option>
                    <option value="graded">Graded</option>
                    <option value="approved">Approved</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default FeedbackEvaluationPanel;
