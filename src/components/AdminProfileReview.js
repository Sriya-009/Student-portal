import { useState, useMemo } from 'react';
import { profileUpdateRequests, students, mentors } from '../data/portalData';
import '../styles/admin-profile-review.css';

function AdminProfileReview() {
  const [requests, setRequests] = useState(profileUpdateRequests);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredRequests = useMemo(() => {
    if (filterStatus === 'all') return requests;
    return requests.filter((req) => req.status === filterStatus);
  }, [requests, filterStatus]);

  const selectedRequestData = selectedRequest ? requests.find((req) => req.id === selectedRequest) : null;

  const getUserName = (userId, userType) => {
    if (userType === 'student') {
      const student = students.find((s) => s.id === userId);
      return student?.name || userId;
    } else {
      const mentor = mentors.find((m) => m.id === userId);
      return mentor?.name || userId;
    }
  };

  const handleApprove = () => {
    if (!selectedRequestData) return;

    const updatedRequests = requests.map((req) => {
      if (req.id === selectedRequest) {
        return {
          ...req,
          status: 'approved',
          reviewedDate: new Date().toISOString().split('T')[0],
          reviewedBy: 'admin',
          adminComment
        };
      }
      return req;
    });

    setRequests(updatedRequests);
    alert('✓ Profile update approved!');

    // Update the actual student or mentor data (in a real app, this would be a backend call)
    if (selectedRequestData.userType === 'student') {
      const student = students.find((s) => s.id === selectedRequestData.userId);
      if (student) {
        Object.assign(student, selectedRequestData.proposedData);
      }
    } else {
      const mentor = mentors.find((m) => m.id === selectedRequestData.userId);
      if (mentor) {
        Object.assign(mentor, selectedRequestData.proposedData);
      }
    }

    setSelectedRequest(null);
    setAdminComment('');
  };

  const handleReject = () => {
    if (!selectedRequestData) return;

    if (!adminComment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    const updatedRequests = requests.map((req) => {
      if (req.id === selectedRequest) {
        return {
          ...req,
          status: 'rejected',
          reviewedDate: new Date().toISOString().split('T')[0],
          reviewedBy: 'admin',
          adminComment
        };
      }
      return req;
    });

    setRequests(updatedRequests);
    alert('✓ Profile update rejected!');
    setSelectedRequest(null);
    setAdminComment('');
  };

  return (
    <section className="admin-profile-review">
      <div className="review-head">
        <h3>Profile Update Requests</h3>
        <div className="review-filters">
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({requests.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending ({requests.filter((r) => r.status === 'pending').length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'approved' ? 'active' : ''}`}
            onClick={() => setFilterStatus('approved')}
          >
            Approved ({requests.filter((r) => r.status === 'approved').length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filterStatus === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilterStatus('rejected')}
          >
            Rejected ({requests.filter((r) => r.status === 'rejected').length})
          </button>
        </div>
      </div>

      <div className="review-grid">
        <section className="requests-list">
          <h4>Update Requests</h4>
          {filteredRequests.length === 0 ? (
            <p className="no-requests">No requests to display.</p>
          ) : (
            <div className="requests-container">
              {filteredRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  className={`request-card ${selectedRequest === request.id ? 'active' : ''} ${request.status}`}
                  onClick={() => {
                    setSelectedRequest(request.id);
                    setAdminComment('');
                  }}
                >
                  <div className="request-header">
                    <strong>{getUserName(request.userId, request.userType)}</strong>
                    <span className={`status-badge ${request.status}`}>{request.status}</span>
                  </div>
                  <p className="request-type">{request.userType === 'student' ? 'Student' : 'Faculty'}</p>
                  <p className="request-date">Requested: {request.requestedDate}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedRequestData ? (
          <section className="request-details">
            <div className="details-head">
              <h4>Request Details</h4>
              <p>{selectedRequestData.userType === 'student' ? 'Student Profile Update' : 'Faculty Profile Update'}</p>
            </div>

            <div className="user-info">
              <p>
                <strong>User:</strong> {getUserName(selectedRequestData.userId, selectedRequestData.userType)}
              </p>
              <p>
                <strong>Requested Date:</strong> {selectedRequestData.requestedDate}
              </p>
              <p>
                <strong>Status:</strong> <span className={`status-badge ${selectedRequestData.status}`}>{selectedRequestData.status}</span>
              </p>
            </div>

            <div className="changes-section">
              <h5>Proposed Changes:</h5>
              <div className="changes-comparison">
                {Object.keys(selectedRequestData.proposedData).map((key) => {
                  if (selectedRequestData.currentData[key] !== selectedRequestData.proposedData[key]) {
                    return (
                      <div key={key} className="change-item">
                        <p>
                          <strong>{key}:</strong>
                        </p>
                        <div className="change-values">
                          <div className="current">
                            <p>Current: <span>{selectedRequestData.currentData[key]}</span></p>
                          </div>
                          <div className="proposed">
                            <p>Proposed: <span>{selectedRequestData.proposedData[key]}</span></p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            <div className="reason-section">
              <p>
                <strong>User Reason:</strong>
              </p>
              <p className="reason-text">{selectedRequestData.reason}</p>
            </div>

            {selectedRequestData.status === 'pending' ? (
              <div className="action-section">
                <h5>Review & Decision:</h5>
                <div className="comment-area">
                  <label htmlFor="adminComment">Admin Comment/Reason *</label>
                  <textarea
                    id="adminComment"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Add your admin comment, notes, or reason for decision..."
                    rows="4"
                  />
                </div>

                <div className="action-buttons">
                  <button type="button" className="btn-danger" onClick={handleReject}>
                    ✗ Reject
                  </button>
                  <button type="button" className="btn-success" onClick={handleApprove}>
                    ✓ Approve
                  </button>
                </div>
              </div>
            ) : (
              <div className="reviewed-section">
                <p>
                  <strong>Reviewed By:</strong> {selectedRequestData.reviewedBy}
                </p>
                <p>
                  <strong>Reviewed Date:</strong> {selectedRequestData.reviewedDate}
                </p>
                <p>
                  <strong>Admin Comment:</strong>
                </p>
                <p className="admin-comment">{selectedRequestData.adminComment}</p>
              </div>
            )}
          </section>
        ) : (
          <section className="request-details empty">
            <p>Select a request to view details and make a decision.</p>
          </section>
        )}
      </div>
    </section>
  );
}

export default AdminProfileReview;
