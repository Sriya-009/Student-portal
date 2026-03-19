import { useState } from 'react';

function ProjectApprovalPanel({ proposals, mentors, activeAction }) {
  const [proposalsState, setProposalsState] = useState(proposals);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');
  const [studentAssignment, setStudentAssignment] = useState({ studentId: '', mentorId: '' });
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

  const handleAssignStudent = () => {
    if (!studentAssignment.studentId.trim() || !studentAssignment.mentorId) {
      alert('Enter student ID and select mentor.');
      return;
    }

    const mentor = mentors.find((m) => m.id === studentAssignment.mentorId);
    const assignment = {
      id: `ASN-${Date.now()}`,
      studentId: studentAssignment.studentId.trim().toUpperCase(),
      mentorId: studentAssignment.mentorId,
      mentorName: mentor?.name || 'Unknown Mentor',
      assignedOn: new Date().toISOString().split('T')[0]
    };

    setAssignmentHistory((prev) => [assignment, ...prev]);
    setStudentAssignment({ studentId: '', mentorId: '' });
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
              <input
                className="form-input"
                placeholder="Student ID (e.g., STU001)"
                value={studentAssignment.studentId}
                onChange={(e) => setStudentAssignment({ ...studentAssignment, studentId: e.target.value })}
              />
              <select
                className="form-select"
                value={studentAssignment.mentorId}
                onChange={(e) => setStudentAssignment({ ...studentAssignment, mentorId: e.target.value })}
              >
                <option value="">Select Mentor</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>{mentor.name}</option>
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
                    <p className="proposal-meta">Student: <strong>{entry.studentId}</strong></p>
                    <p className="proposal-meta">Mentor: <strong>{entry.mentorName}</strong></p>
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
