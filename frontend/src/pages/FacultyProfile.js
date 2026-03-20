import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { mentors, profileUpdateRequests } from '../data/portalData';
import { getUserProfile } from '../services/authService';
import ThemeToggle from '../components/shared/ThemeToggle';
import '../styles/profile.css';

function FacultyProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [updateReason, setUpdateReason] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [backendProfile, setBackendProfile] = useState(null);

  const currentFaculty = useMemo(() => {
    const profileIdentifier = user?.identifier || user?.facultyId;
    if (profileIdentifier) {
      const mentor = mentors.find(
        (m) => m.id === profileIdentifier || m.identifier === profileIdentifier
      );
      if (mentor) {
        setFormData(mentor);
        return mentor;
      }
    }
    return mentors[0];
  }, [user]);

  const facultyProfile = {
    ...currentFaculty,
    ...(backendProfile || {}),
    id: user?.identifier || currentFaculty.identifier || currentFaculty.id,
    email: (backendProfile && backendProfile.email) || user?.email || currentFaculty.email,
    name: (backendProfile && backendProfile.name) || user?.name || currentFaculty.name,
    department: (backendProfile && backendProfile.department) || user?.department || currentFaculty.department,
    role: (backendProfile && backendProfile.role) || user?.role || 'faculty',
    createdAt: (backendProfile && backendProfile.createdAt) || user?.createdAt || currentFaculty.createdAt || null
  };

  useEffect(() => {
    let isMounted = true;
    const profileIdentifier = user?.identifier;

    if (!profileIdentifier) {
      return () => {
        isMounted = false;
      };
    }

    getUserProfile(profileIdentifier)
      .then((profile) => {
        if (isMounted) {
          setBackendProfile(profile);
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendProfile(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const pendingRequest = profileUpdateRequests.find(
    (req) => req.userId === facultyProfile.id && req.status === 'pending'
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
        formData[key] !== facultyProfile[key]
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
    setFormData(facultyProfile);
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
          <span className="topbar-avatar">{facultyProfile.initials}</span>
          <div>
            <p className="topbar-name">{facultyProfile.name}</p>
            <p className="topbar-meta">{facultyProfile.department} • {facultyProfile.specialization || 'Faculty'}</p>
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
              <div className="profile-avatar-large">{facultyProfile.initials}</div>
              <div>
                <h2>{facultyProfile.name}</h2>
                <p>{facultyProfile.id}</p>
              </div>
            </div>

            <div className="profile-content">
              {!isEditing ? (
                <div className="profile-view-mode">
                  <div className="info-grid">
                    <div className="info-item">
                      <label>ID</label>
                      <p>{facultyProfile.id}</p>
                    </div>
                    <div className="info-item">
                      <label>Employee ID</label>
                      <p>{facultyProfile.employeeId || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Name</label>
                      <p>{facultyProfile.name}</p>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <p>{facultyProfile.email}</p>
                    </div>
                    <div className="info-item">
                      <label>Role</label>
                      <p>{facultyProfile.role}</p>
                    </div>
                    <div className="info-item">
                      <label>Department</label>
                      <p>{facultyProfile.department || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Specialization</label>
                      <p>{facultyProfile.specialization || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Designation</label>
                      <p>{facultyProfile.designation || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Qualification</label>
                      <p>{facultyProfile.qualification || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Phone Number</label>
                      <p>{facultyProfile.phoneNumber || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Assigned Students</label>
                      <p>{facultyProfile.assignedStudents?.length || 0} students</p>
                    </div>
                    <div className="info-item">
                      <label>Assigned Projects</label>
                      <p>{facultyProfile.assignedProjects?.length || 0} projects</p>
                    </div>
                    <div className="info-item">
                      <label>Office Location</label>
                      <p>{facultyProfile.officeLocation || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Office Hours</label>
                      <p>{facultyProfile.officeHours || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Joining Date</label>
                      <p>{facultyProfile.joiningDate || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Status</label>
                      <p>{facultyProfile.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="info-item">
                      <label>Created At</label>
                      <p>{facultyProfile.createdAt || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Updated At</label>
                      <p>{facultyProfile.updatedAt || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Bio</label>
                      <p>{facultyProfile.bio || 'NA'}</p>
                    </div>
                  </div>

                  {!pendingRequest && (
                    <button
                      type="button"
                      className="primary-dark-btn"
                      onClick={() => {
                        setIsEditing(true);
                        setFormData(facultyProfile);
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
