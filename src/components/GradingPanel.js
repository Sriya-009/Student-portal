import { useState, useMemo } from 'react';

function GradingPanel({ grades, projects }) {
  const [gradesState, setGradesState] = useState(grades);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [marks, setMarks] = useState({
    proposalMark: 0,
    progressMark: 0,
    implementationMark: 0,
    finalSubmissionMark: 0
  });
  const [approvedSubmissions, setApprovedSubmissions] = useState(new Set());

  const currentGrade = useMemo(() => {
    return selectedGrade ? gradesState.find((g) => g.id === selectedGrade) : null;
  }, [selectedGrade, gradesState]);

  const handleSelectGrade = (gradeId) => {
    setSelectedGrade(gradeId);
    const grade = gradesState.find((g) => g.id === gradeId);
    if (grade) {
      setMarks({
        proposalMark: grade.proposalMark,
        progressMark: grade.progressMark,
        implementationMark: grade.implementationMark,
        finalSubmissionMark: grade.finalSubmissionMark
      });
    }
  };

  const handleUpdateMarks = () => {
    if (!selectedGrade) {
      alert('Please select a student project');
      return;
    }

    const totalMark = marks.proposalMark + marks.progressMark + marks.implementationMark + marks.finalSubmissionMark;
    
    if (totalMark > 100) {
      alert('Total marks cannot exceed 100');
      return;
    }

    const updatedGrades = gradesState.map((g) =>
      g.id === selectedGrade
        ? {
            ...g,
            proposalMark: marks.proposalMark,
            progressMark: marks.progressMark,
            implementationMark: marks.implementationMark,
            finalSubmissionMark: marks.finalSubmissionMark,
            totalMark: totalMark,
            status: 'graded',
            evaluationDate: new Date().toISOString().split('T')[0]
          }
        : g
    );

    setGradesState(updatedGrades);
    alert(`Grades updated successfully. Total: ${totalMark}/100`);
    setSelectedGrade(null);
    setMarks({ proposalMark: 0, progressMark: 0, implementationMark: 0, finalSubmissionMark: 0 });
  };

  const handleApproveSubmission = (gradeId) => {
    const newApproved = new Set(approvedSubmissions);
    if (newApproved.has(gradeId)) {
      newApproved.delete(gradeId);
    } else {
      newApproved.add(gradeId);
    }
    setApprovedSubmissions(newApproved);
    
    const grade = gradesState.find((g) => g.id === gradeId);
    alert(approvedSubmissions.has(gradeId) 
      ? `Approval removed for ${grade.projectId}` 
      : `Final submission approved for ${grade.projectId}.`);
  };

  const handleResetMarks = () => {
    setSelectedGrade(null);
    setMarks({ proposalMark: 0, progressMark: 0, implementationMark: 0, finalSubmissionMark: 0 });
  };

  const totalMarks = Object.values(marks).reduce((sum, mark) => sum + mark, 0);
  const gradedCount = gradesState.filter((g) => g.status === 'graded').length;
  const pendingCount = gradesState.filter((g) => g.status !== 'graded').length;

  return (
    <section className="faculty-panel grading-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p className="stat-value">{gradesState.length}</p>
        </div>
        <div className="stat-card">
          <h3>Graded</h3>
          <p className="stat-value">{gradedCount}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Grades</h3>
          <p className="stat-value">{pendingCount}</p>
        </div>
      </div>

      <div className="panel-content">
        <div className="grading-layout">
          <div className="grading-form">
            <h3>Assign & Update Marks</h3>

            <select
              value={selectedGrade || ''}
              onChange={(e) => handleSelectGrade(e.target.value || null)}
              className="form-select"
            >
              <option value="">Select Student Project</option>
              {gradesState.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.projectId} - {grade.studentId} (Current: {grade.totalMark}/100)
                </option>
              ))}
            </select>

            {selectedGrade && currentGrade && (
              <>
                <div className="form-section">
                  <h4>Project: {currentGrade.projectId}</h4>
                  <p>Student ID: {currentGrade.studentId}</p>
                </div>

                <div className="mark-input-group">
                  <label>Proposal Mark (out of 20)</label>
                  <div className="mark-input-row">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={marks.proposalMark}
                      onChange={(e) => setMarks({ ...marks, proposalMark: parseInt(e.target.value) || 0 })}
                      className="form-input"
                    />
                    <span className="mark-max">/20</span>
                  </div>
                </div>

                <div className="mark-input-group">
                  <label>Progress Mark (out of 20)</label>
                  <div className="mark-input-row">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={marks.progressMark}
                      onChange={(e) => setMarks({ ...marks, progressMark: parseInt(e.target.value) || 0 })}
                      className="form-input"
                    />
                    <span className="mark-max">/20</span>
                  </div>
                </div>

                <div className="mark-input-group">
                  <label>Implementation Mark (out of 30)</label>
                  <div className="mark-input-row">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={marks.implementationMark}
                      onChange={(e) => setMarks({ ...marks, implementationMark: parseInt(e.target.value) || 0 })}
                      className="form-input"
                    />
                    <span className="mark-max">/30</span>
                  </div>
                </div>

                <div className="mark-input-group">
                  <label>Final Submission Mark (out of 30)</label>
                  <div className="mark-input-row">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={marks.finalSubmissionMark}
                      onChange={(e) => setMarks({ ...marks, finalSubmissionMark: parseInt(e.target.value) || 0 })}
                      className="form-input"
                    />
                    <span className="mark-max">/30</span>
                  </div>
                </div>

                <div className="mark-total">
                  <strong>Total: {totalMarks}/100</strong>
                  {totalMarks > 100 && <span className="warning">Exceeds maximum</span>}
                </div>

                <div className="button-group">
                  <button className="btn-success" onClick={handleUpdateMarks}>
                    Save Marks
                  </button>
                  <button className="btn-secondary" onClick={handleResetMarks}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="grading-list">
            <h3>Grade Distribution & Management</h3>
            <div className="grades-table">
              {gradesState.length === 0 ? (
                <p className="empty-state">No grades available.</p>
              ) : (
                gradesState.map((grade) => (
                  <div key={grade.id} className={`grade-row ${grade.status === 'graded' ? 'graded' : 'pending'}`}>
                    <div className="grade-info">
                      <strong>{grade.projectId}</strong>
                      <p>Student: {grade.studentId}</p>
                      <p className="grade-status">{grade.status === 'graded' ? 'Graded' : 'Pending'}</p>
                    </div>
                    <div className="grade-score">
                      <strong>{grade.totalMark}/{grade.maxMark}</strong>
                      <p>{((grade.totalMark / grade.maxMark) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="grade-details">
                      <span>P: {grade.proposalMark}</span>
                      <span>Pr: {grade.progressMark}</span>
                      <span>I: {grade.implementationMark}</span>
                      <span>F: {grade.finalSubmissionMark}</span>
                    </div>
                    <button
                      className={`btn-secondary ${approvedSubmissions.has(grade.id) ? 'approved' : ''}`}
                      onClick={() => handleApproveSubmission(grade.id)}
                    >
                      {approvedSubmissions.has(grade.id) ? 'Approved' : 'Approve'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GradingPanel;
