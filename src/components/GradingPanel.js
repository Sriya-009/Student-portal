import { useState } from 'react';

function GradingPanel({ grades, projects }) {
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [marks, setMarks] = useState({
    proposalMark: 0,
    progressMark: 0,
    implementationMark: 0,
    finalSubmissionMark: 0
  });

  const handleUpdateMarks = () => {
    if (selectedGrade) {
      const total = marks.proposalMark + marks.progressMark + marks.implementationMark + marks.finalSubmissionMark;
      alert(`✓ Grades updated! Total: ${total}/100`);
      setSelectedGrade(null);
      setMarks({ proposalMark: 0, progressMark: 0, implementationMark: 0, finalSubmissionMark: 0 });
    }
  };

  const handleApproveSubmission = (gradeId) => {
    alert('✓ Final submission approved!');
  };

  const totalMarks = Object.values(marks).reduce((sum, mark) => sum + mark, 0);

  return (
    <section className="faculty-panel grading-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p className="stat-value">{grades.length}</p>
        </div>
        <div className="stat-card">
          <h3>Graded</h3>
          <p className="stat-value">{grades.filter((g) => g.totalMark > 0).length}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Grades</h3>
          <p className="stat-value">{grades.filter((g) => g.totalMark === 0).length}</p>
        </div>
      </div>

      <div className="panel-content">
        <div className="grading-layout">
          <div className="grading-form">
            <h3>Assign Marks</h3>

            <select
              value={selectedGrade || ''}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                const grade = grades.find((g) => g.id === e.target.value);
                if (grade) {
                  setMarks({
                    proposalMark: grade.proposalMark,
                    progressMark: grade.progressMark,
                    implementationMark: grade.implementationMark,
                    finalSubmissionMark: grade.finalSubmissionMark
                  });
                }
              }}
              className="form-select"
            >
              <option value="">Select Student Project</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.projectId} (Total: {grade.totalMark}/100)
                </option>
              ))}
            </select>

            {selectedGrade && (
              <>
                <div className="mark-input-group">
                  <label>Proposal Mark (out of 20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={marks.proposalMark}
                    onChange={(e) => setMarks({ ...marks, proposalMark: parseInt(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>

                <div className="mark-input-group">
                  <label>Progress Mark (out of 20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={marks.progressMark}
                    onChange={(e) => setMarks({ ...marks, progressMark: parseInt(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>

                <div className="mark-input-group">
                  <label>Implementation Mark (out of 30)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={marks.implementationMark}
                    onChange={(e) => setMarks({ ...marks, implementationMark: parseInt(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>

                <div className="mark-input-group">
                  <label>Final Submission Mark (out of 30)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={marks.finalSubmissionMark}
                    onChange={(e) => setMarks({ ...marks, finalSubmissionMark: parseInt(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>

                <div className="mark-total">
                  <strong>Total: {totalMarks}/100</strong>
                </div>

                <div className="button-group">
                  <button className="btn-success" onClick={handleUpdateMarks}>
                    ✓ Save Marks
                  </button>
                  <button className="btn-secondary" onClick={() => setSelectedGrade(null)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="grading-list">
            <h3>Grade Distribution</h3>
            <div className="grades-table">
              {grades.map((grade) => (
                <div key={grade.id} className="grade-row">
                  <div className="grade-info">
                    <strong>{grade.projectId}</strong>
                    <p>Student ID: {grade.studentId}</p>
                  </div>
                  <div className="grade-score">
                    <strong>{grade.totalMark}/{grade.maxMark}</strong>
                    <p>{((grade.totalMark / grade.maxMark) * 100).toFixed(1)}%</p>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => handleApproveSubmission(grade.id)}
                  >
                    Approve ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GradingPanel;
