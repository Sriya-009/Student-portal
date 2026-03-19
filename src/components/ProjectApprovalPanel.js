import { useState } from 'react';

function ProjectApprovalPanel({ proposals, mentors }) {
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');

  const handleApprove = (proposalId) => {
    alert(`✓ Project proposal ${proposalId} approved! Mentor assignment pending.`);
  };

  const handleReject = (proposalId) => {
    alert(`✗ Project proposal ${proposalId} rejected. Feedback sent to student.`);
  };

  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const approvedProposals = proposals.filter((p) => p.status === 'approved');

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
        <h3>Pending Project Proposals</h3>
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
                          handleApprove(proposal.id);
                          setSelectedProposal(null);
                          setFeedback('');
                          setSelectedMentor('');
                        }}
                      >
                        ✓ Approve
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
                        ✗ Reject
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

        <h3 style={{ marginTop: '32px' }}>Recently Approved Projects</h3>
        <div className="proposals-list">
          {approvedProposals.slice(0, 3).map((proposal) => (
            <div key={proposal.id} className="proposal-card approved">
              <div className="proposal-header">
                <h4>{proposal.title}</h4>
                <span className="badge approved">✓ Approved</span>
              </div>
              <p className="proposal-desc">{proposal.description}</p>
              <p className="proposal-meta">
                Mentor: <strong>{mentors.find((m) => m.id === proposal.assignedMentor)?.name || 'Unassigned'}</strong>
              </p>
              <p className="proposal-feedback">{proposal.feedbackFromFaculty}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProjectApprovalPanel;
