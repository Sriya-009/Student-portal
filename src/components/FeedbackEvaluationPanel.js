import { useState } from 'react';

function FeedbackEvaluationPanel({ grades, facultyId }) {
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [feedback, setFeedback] = useState('');

  const handleAddFeedback = () => {
    if (feedback.trim() && selectedGrade) {
      alert('✓ Feedback added successfully!');
      setFeedback('');
      setSelectedGrade(null);
    }
  };

  const inProgressGrades = grades.filter((g) => g.status === 'in-progress');
  const averageMark = Math.round(grades.reduce((sum, g) => sum + g.totalMark, 0) / grades.length);

  return (
    <section className="faculty-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Students Evaluated</h3>
          <p className="stat-value">{grades.length}</p>
        </div>
        <div className="stat-card">
          <h3>In Progress</h3>
          <p className="stat-value">{inProgressGrades.length}</p>
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
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="form-select"
          >
            <option value="">Select Student Project</option>
            {inProgressGrades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.projectId} - Score: {grade.totalMark}/{grade.maxMark}
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
            <button className="btn-primary" onClick={handleAddFeedback}>
              💭 Add Feedback
            </button>
            <button className="btn-secondary" onClick={() => setFeedback('')}>
              Clear
            </button>
          </div>
        </div>

        <h3>Recent Evaluations</h3>
        <div className="feedback-list">
          {grades.map((grade) => (
            <div key={grade.id} className="feedback-card">
              <div className="feedback-header">
                <h4>#Project: {grade.projectId}</h4>
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
                  <span>Total:</span>
                  <strong>{grade.totalMark}/{grade.maxMark}</strong>
                </div>
              </div>

              <p className="feedback-comment">{grade.comments}</p>
              <p className="feedback-meta">Evaluated: {grade.evaluationDate}</p>

              <button className="btn-secondary">✎ Edit Feedback</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeedbackEvaluationPanel;
