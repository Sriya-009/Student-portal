import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { mentors, profileUpdateRequests } from '../data/portalData';
import ThemeToggle from '../components/shared/ThemeToggle';
import '../styles/profile.css';

function FacultyProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [updateReason, setUpdateReason] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');

  const currentFaculty = useMemo(() => {
    if (user?.facultyId) {
      const mentor = mentors.find((m) => m.id === user.facultyId);
      if (mentor) {
        setFormData(mentor);
        return mentor;
      }
    }
    return mentors[0];
  }, [user]);

  const pendingRequest = profileUpdateRequests.find(
    (req) => req.userId === currentFaculty.id && req.status === 'pending'
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!updateReason.trim()) {
      alert('Please provide a reason for the update');
      return;
    }

    const hasChanges = Object.keys(formData).some((key) => {
      return (
        key !== 'id' &&
        key !== 'assignedProjects' &&
        key !== 'assignedStudents' &&
        key !== 'initials' &&
        formData[key] !== currentFaculty[key]
      );
    });

    if (!hasChanges) {
      alert('No changes detected. Please modify at least one field.');
      return;
    }

    alert('✓ Profile update request submitted! Awaiting admin approval.');
    setSubmitMessage('✓ Your profile update request has been submitted successfully. You will be notified once the admin reviews it.');
    setUpdateReason('');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(currentFaculty);
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-shell faculty-shell">
      <header className="portal-topbar">
        <div className="topbar-user">
          <span className="topbar-avatar">{currentFaculty.initials}</span>
          <div>
            <p className="topbar-name">{currentFaculty.name}</p>
            <p className="topbar-meta">{currentFaculty.department} • {currentFaculty.specialization}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <button type="button" className="outline-btn" onClick={() => navigate('/faculty')}>
            Back to Dashboard
          </button>
          <button type="button" className="outline-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="portal-layout">
        <main className="portal-main">
          <section className="page-head">
            <h1>My Profile</h1>
            <p>View and manage your profile information</p>
          </section>

          {submitMessage && (
            <div className="success-banner">
              <p>{submitMessage}</p>
              <button
                type="button"
                className="close-banner-btn"
                onClick={() => setSubmitMessage('')}
              >
                ✕
              </button>
            </div>
          )}

          {pendingRequest && (
            <div className="pending-request-banner">
              <h4>⏳ Pending Profile Update Request</h4>
              <p>Your profile update request is awaiting admin review.</p>
              <p className="small-text">Submitted on: {pendingRequest.requestedDate}</p>
            </div>
          )}

          <section className="profile-section">
            <div className="profile-head">
              <div className="profile-avatar-large">{currentFaculty.initials}</div>
              <div>
                <h2>{currentFaculty.name}</h2>
                <p>{currentFaculty.id}</p>
              </div>
            </div>

            <div className="profile-content">
              {!isEditing ? (
                <div className="profile-view-mode">
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Name</label>
                      <p>{currentFaculty.name}</p>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <p>{currentFaculty.email}</p>
                    </div>
                    <div className="info-item">
                      <label>Department</label>
                      <p>{currentFaculty.department}</p>
                    </div>
                    <div className="info-item">
                      <label>Specialization</label>
                      <p>{currentFaculty.specialization}</p>
                    </div>
                    <div className="info-item">
                      <label>Phone Number</label>
                      <p>{currentFaculty.phoneNumber}</p>
                    </div>
                    <div className="info-item">
                      <label>Assigned Students</label>
                      <p>{currentFaculty.assignedStudents.length} students</p>
                    </div>
                  </div>

                  {!pendingRequest && (
                    <button
                      type="button"
                      className="primary-dark-btn"
                      onClick={() => {
                        setIsEditing(true);
                        setFormData(currentFaculty);
                      }}
                    >
                      ✎ Edit Profile
                    </button>
                  )}
                </div>
              ) : (
                <form className="profile-edit-form" onSubmit={handleSubmitRequest}>
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phoneNumber">Phone Number *</label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="specialization">Specialization</label>
                    <input
                      id="specialization"
                      type="text"
                      name="specialization"
                      value={formData.specialization || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reason">Reason for Update *</label>
                    <textarea
                      id="reason"
                      value={updateReason}
                      onChange={(e) => setUpdateReason(e.target.value)}
                      placeholder="Explain why you are requesting these changes..."
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="button" className="outline-btn" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button type="submit" className="primary-dark-btn">
                      Submit Update Request
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          <section className="profile-section">
            <h3>Update Request Status</h3>
            {pendingRequest ? (
              <div className="request-details">
                <p>
                  <strong>Status:</strong> <span className="status-badge pending">Pending</span>
                </p>
                <p>
                  <strong>Submitted:</strong> {pendingRequest.requestedDate}
                </p>
                <p>
                  <strong>Changes Requested:</strong>
                </p>
                <ul className="changes-list">
                  {Object.keys(pendingRequest.proposedData).map((key) => {
                    if (pendingRequest.currentData[key] !== pendingRequest.proposedData[key]) {
                      return (
                        <li key={key}>
                          <strong>{key}:</strong> {pendingRequest.currentData[key]} → {pendingRequest.proposedData[key]}
                        </li>
                      );
                    }
                    return null;
                  })}
                </ul>
              </div>
            ) : (
              <p className="no-requests">No pending profile update requests.</p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default FacultyProfile;
