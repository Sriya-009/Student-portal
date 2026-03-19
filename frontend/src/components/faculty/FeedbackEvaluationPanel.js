import { useState } from 'react';

function FeedbackEvaluationPanel({ grades, facultyId, activeAction }) {
  const [gradesState, setGradesState] = useState(
    grades.map((g) => ({
      ...g,
      feedbackList: g.feedbackList || []
    }))
  );
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [performanceSearch, setPerformanceSearch] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState('all');

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
  const filteredInProgressGrades = inProgressGrades.filter((grade) => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      grade.projectId.toLowerCase().includes(query)
      || grade.studentId.toLowerCase().includes(query)
      || String(grade.totalMark).includes(query)
    );
  });
  const averageMark = gradesState.length > 0 
    ? Math.round(gradesState.reduce((sum, g) => sum + g.totalMark, 0) / gradesState.length)
    : 0;
  const feedbackGivenCount = gradesState.filter((g) => g.feedbackList && g.feedbackList.length > 0).length;

  const showProvideFeedback = !activeAction || activeAction === 'feedback-overview' || activeAction === 'feedback-add';
  const showReviewComments = activeAction === 'feedback-review';
  const showSuggestImprovements = activeAction === 'feedback-suggest';
  const showEvaluationStatus = activeAction === 'feedback-status';
  const showPerformanceNotes = activeAction === 'feedback-notes';

  const getPerformancePriority = (grade) => {
    const percent = grade.maxMark > 0 ? (grade.totalMark / grade.maxMark) * 100 : 0;
    if (percent < 40 || grade.progressMark < 10) return 'needs-attention';
    if (percent < 70) return 'watch';
    return 'on-track';
  };

  const getNextAction = (grade) => {
    const priority = getPerformancePriority(grade);
    if (priority === 'needs-attention') {
      return 'Schedule mentor check-in and assign a focused improvement task this week.';
    }
    if (priority === 'watch') {
      return 'Request incremental update and verify implementation milestones.';
    }
    return 'Continue current pace and prepare final submission checkpoints.';
  };

  const performanceGrades = gradesState.filter((grade) => {
    const query = performanceSearch.trim().toLowerCase();
    const priority = getPerformancePriority(grade);
    const matchesQuery = !query
      || grade.projectId.toLowerCase().includes(query)
      || grade.studentId.toLowerCase().includes(query)
      || (grade.comments || '').toLowerCase().includes(query);
    const matchesFilter = performanceFilter === 'all' || performanceFilter === priority;
    return matchesQuery && matchesFilter;
  });

  const needsAttentionCount = gradesState.filter((grade) => getPerformancePriority(grade) === 'needs-attention').length;

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
        {(showProvideFeedback || showSuggestImprovements) && (
          <>
            <h3>{showSuggestImprovements ? 'Suggest Improvements' : 'Provide Feedback'}</h3>

            <div className="feedback-form" style={{ marginBottom: '24px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search project by project ID or student ID"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
              />

              <select
                value={selectedGrade || ''}
                onChange={(e) => setSelectedGrade(e.target.value || null)}
                className="form-select"
              >
                <option value="">Select Student Project</option>
                {filteredInProgressGrades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.projectId} - {grade.studentId} - Score: {grade.totalMark}/{grade.maxMark}
                  </option>
                ))}
              </select>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={showSuggestImprovements ? 'Suggest improvements for this project...' : 'Provide constructive feedback here...'}
                rows="4"
                className="form-textarea"
              />

              <div className="button-group">
                <button className="btn-success" onClick={handleAddFeedback}>
                  {showSuggestImprovements ? 'Submit Improvement Suggestion' : 'Add Feedback'}
                </button>
                <button className="btn-secondary" onClick={handleClearFeedback}>
                  Clear
                </button>
              </div>
            </div>
          </>
        )}

        {(showProvideFeedback || showReviewComments || showPerformanceNotes) && (
          <>
            <h3>{showReviewComments ? 'Review Comments' : showPerformanceNotes ? 'Performance Notes' : 'Recent Evaluations & Feedback'}</h3>

            {showPerformanceNotes ? (
              <div className="feedback-form" style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by project ID, student ID, or note"
                  value={performanceSearch}
                  onChange={(e) => setPerformanceSearch(e.target.value)}
                />
                <select
                  className="form-select"
                  value={performanceFilter}
                  onChange={(e) => setPerformanceFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="needs-attention">Needs Attention</option>
                  <option value="watch">Watch</option>
                  <option value="on-track">On Track</option>
                </select>
                <p className="muted-line">Needs Attention: <strong>{needsAttentionCount}</strong></p>
              </div>
            ) : null}

            <div className="feedback-list">
              {(showPerformanceNotes ? performanceGrades : gradesState).length === 0 ? (
                <p className="empty-state">No evaluations available.</p>
              ) : (
                (showPerformanceNotes ? performanceGrades : gradesState).map((grade) => (
                  <div key={grade.id} className={`feedback-card ${grade.status}`}>
                    <div className="feedback-header">
                      <div>
                        <h4>Project: {grade.projectId}</h4>
                        <p>Student ID: {grade.studentId}</p>
                      </div>
                      <span className={`status-badge ${grade.status}`}>{grade.status}</span>
                    </div>

                    {showPerformanceNotes ? (
                      <p className="muted-line" style={{ margin: '6px 0 10px' }}>
                        Priority: <strong>{getPerformancePriority(grade).replace('-', ' ')}</strong>
                      </p>
                    ) : null}

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

                    {grade.comments && <p className="feedback-comment"><strong>{showPerformanceNotes ? 'Performance Note:' : 'Feedback:'}</strong> {grade.comments}</p>}

                    {showPerformanceNotes ? (
                      <p className="feedback-comment"><strong>Next Action:</strong> {getNextAction(grade)}</p>
                    ) : null}

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

                    {showProvideFeedback && (
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
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {showEvaluationStatus && (
          <>
            <h3>Evaluation Status</h3>
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Student</th>
                  <th>Current Status</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {gradesState.map((grade) => (
                  <tr key={grade.id}>
                    <td>{grade.projectId}</td>
                    <td>{grade.studentId}</td>
                    <td>{grade.status}</td>
                    <td>
                      <select
                        value={grade.status}
                        onChange={(e) => handleUpdateEvaluationStatus(grade.id, e.target.value)}
                        className="form-select"
                      >
                        <option value="in-progress">In Progress</option>
                        <option value="graded">Graded</option>
                        <option value="approved">Approved</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}

export default FeedbackEvaluationPanel;
