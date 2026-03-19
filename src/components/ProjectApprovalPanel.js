import { useState } from 'react';

function ProjectApprovalPanel({ proposals, mentors, projects = [], students = [], activeAction }) {
  const [proposalsState, setProposalsState] = useState(proposals);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');
  const [studentAssignment, setStudentAssignment] = useState({ studentId: '', projectId: '' });
  const [assignmentHistory, setAssignmentHistory] = useState([]);

  const handleApprove = (proposalId) => {
    const updated = proposalsState.map((proposal) => {
      if (proposal.id !== proposalId) return proposal;
      return {
        ...proposal,
        status: 'approved',
        assignedMentor: selectedMentor || proposal.assignedMentor,
        feedbackFromFaculty: feedback || 'Approved by faculty',
        approvedDate: new Date().toISOString().split('T')[0]
      };
    });
    setProposalsState(updated);
    alert(`Project proposal ${proposalId} approved.`);
  };

  const handleReject = (proposalId) => {
    const updated = proposalsState.filter((proposal) => proposal.id !== proposalId);
    setProposalsState(updated);
    alert(`Project proposal ${proposalId} rejected.`);
  };

  const pendingProposals = proposalsState.filter((p) => p.status === 'pending');
  const approvedProposals = proposalsState.filter((p) => p.status === 'approved');
  const rejectedOrApprovedHistory = proposalsState.filter((p) => p.status !== 'pending');
  const availableStudents = students.filter((student) => student.rollNumber);

  const handleAssignStudent = () => {
    if (!studentAssignment.studentId || !studentAssignment.projectId) {
      alert('Please choose both student and project.');
      return;
    }

    const student = availableStudents.find((item) => item.rollNumber === studentAssignment.studentId);
    const project = projects.find((item) => item.id === studentAssignment.projectId);

    if (!student || !project) {
      alert('Selected student or project was not found.');
      return;
    }

    const duplicate = assignmentHistory.some(
      (entry) => entry.studentId === student.rollNumber && entry.projectId === project.id
    );
    if (duplicate) {
      alert('This student is already assigned to the selected project.');
      return;
    }

    const assignment = {
      id: `ASN-${Date.now()}`,
      studentId: student.rollNumber,
      studentName: student.name,
      projectId: project.id,
      projectName: project.name,
      assignedOn: new Date().toISOString().split('T')[0]
    };

    setAssignmentHistory((prev) => [assignment, ...prev]);
    setStudentAssignment({ studentId: '', projectId: '' });
    alert('Student assigned successfully.');
  };

  const showPendingOnly = activeAction === 'approval-pending';
  const showAssignStudents = activeAction === 'approval-assign-students';
  const showHistoryOnly = activeAction === 'approval-history';

  return (
    <section className="faculty-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Pending Approvals</h3>
          <p className="stat-value">{pendingProposals.length}</p>
        </div>
        <div className="stat-card">
          <h3>Approved Projects</h3>
          <p className="stat-value">{approvedProposals.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Proposals</h3>
          <p className="stat-value">{proposals.length}</p>
        </div>
      </div>

      <div className="panel-content">
        {showAssignStudents ? (
          <>
            <h3>Assign Students</h3>
            <div className="approval-form">
              <div className="info-section" style={{ gridColumn: '1 / -1' }}>
                <h4>Assign Student to Project</h4>
                <p>Choose student first, then choose the project where you want to add the student.</p>
              </div>
              <select
                className="form-select"
                value={studentAssignment.studentId}
                onChange={(e) => setStudentAssignment({ ...studentAssignment, studentId: e.target.value })}
              >
                <option value="">Choose Student</option>
                {availableStudents.map((student) => (
                  <option key={student.rollNumber} value={student.rollNumber}>
                    {student.rollNumber} - {student.name}
                  </option>
                ))}
              </select>
              <select
                className="form-select"
                value={studentAssignment.projectId}
                onChange={(e) => setStudentAssignment({ ...studentAssignment, projectId: e.target.value })}
              >
                <option value="">Choose Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.id} - {project.name}</option>
                ))}
              </select>
              <button className="btn-primary" onClick={handleAssignStudent}>Assign Student</button>
            </div>

            <h3 style={{ marginTop: '24px' }}>Assignment History</h3>
            <div className="proposals-list">
              {assignmentHistory.length === 0 ? (
                <p className="empty-state">No student assignments yet.</p>
              ) : (
                assignmentHistory.map((entry) => (
                  <div key={entry.id} className="proposal-card approved">
                    <p className="proposal-meta">Student: <strong>{entry.studentId} - {entry.studentName}</strong></p>
                    <p className="proposal-meta">Project: <strong>{entry.projectId} - {entry.projectName}</strong></p>
                    <p className="proposal-meta">Assigned On: {entry.assignedOn}</p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : showHistoryOnly ? (
          <>
            <h3>Approval History</h3>
            <div className="proposals-list">
              {rejectedOrApprovedHistory.length === 0 ? (
                <p className="empty-state">No approval history available.</p>
              ) : (
                rejectedOrApprovedHistory.map((proposal) => (
                  <div key={proposal.id} className={`proposal-card ${proposal.status === 'approved' ? 'approved' : ''}`}>
                    <div className="proposal-header">
                      <h4>{proposal.title}</h4>
                      <span className={`badge ${proposal.status === 'approved' ? 'approved' : 'pending'}`}>
                        {proposal.status}
                      </span>
                    </div>
                    <p className="proposal-meta">Student: <strong>{proposal.studentId}</strong></p>
                    <p className="proposal-meta">Mentor: <strong>{mentors.find((m) => m.id === proposal.assignedMentor)?.name || 'Unassigned'}</strong></p>
                    <p className="proposal-meta">Approved Date: {proposal.approvedDate || 'N/A'}</p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <h3>{showPendingOnly ? 'Pending Approvals' : 'Pending Project Proposals'}</h3>
            {pendingProposals.length === 0 ? (
              <p className="empty-state">No pending proposals at this time.</p>
            ) : (
              <div className="proposals-list">
                {pendingProposals.map((proposal) => (
                  <div key={proposal.id} className="proposal-card">
                    <div className="proposal-header">
                      <h4>{proposal.title}</h4>
                      <span className="badge pending">Pending</span>
                    </div>
                    <p className="proposal-desc">{proposal.description}</p>
                    <p className="proposal-meta">
                      Submitted by: <strong>{proposal.suggestedBy}</strong> on {proposal.submittedDate}
                    </p>

                    {selectedProposal === proposal.id && (
                      <div className="approval-form">
                        <select
                          value={selectedMentor}
                          onChange={(e) => setSelectedMentor(e.target.value)}
                          className="form-select"
                        >
                          <option value="">Select Mentor</option>
                          {mentors.map((m) => (
                            <option key={m.id} value={m.id}>{m.name} - {m.specialization}</option>
                          ))}
                        </select>

                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Feedback for student (optional)"
                          className="form-textarea"
                          rows="3"
                        />

                        <div className="button-group">
                          <button
                            className="btn-success"
                            onClick={() => {
                              if (!selectedMentor) {
                                alert('Please select a mentor before approval.');
                                return;
                              }
                              handleApprove(proposal.id);
                              setSelectedProposal(null);
                              setFeedback('');
                              setSelectedMentor('');
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => {
                              handleReject(proposal.id);
                              setSelectedProposal(null);
                              setFeedback('');
                              setSelectedMentor('');
                            }}
                          >
                            Reject
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => setSelectedProposal(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedProposal !== proposal.id && (
                      <button
                        className="btn-primary"
                        onClick={() => setSelectedProposal(proposal.id)}
                      >
                        Review & Approve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!showPendingOnly && (
              <>
                <h3 style={{ marginTop: '32px' }}>Recently Approved Projects</h3>
                <div className="proposals-list">
                  {approvedProposals.slice(0, 3).map((proposal) => (
                    <div key={proposal.id} className="proposal-card approved">
                      <div className="proposal-header">
                        <h4>{proposal.title}</h4>
                        <span className="badge approved">Approved</span>
                      </div>
                      <p className="proposal-desc">{proposal.description}</p>
                      <p className="proposal-meta">
                        Mentor: <strong>{mentors.find((m) => m.id === proposal.assignedMentor)?.name || 'Unassigned'}</strong>
                      </p>
                      <p className="proposal-feedback">{proposal.feedbackFromFaculty}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default ProjectApprovalPanel;
