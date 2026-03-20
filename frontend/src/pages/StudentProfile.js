import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { deleteProfilePhoto, getProfilePhotoUrl, getUserProfile, uploadProfilePhoto } from '../services/authService';
import ThemeToggle from '../components/shared/ThemeToggle';
import '../styles/profile.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

function toAbsolutePhotoUrl(photoUrl) {
  if (!photoUrl) {
    return '';
  }
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  return `${API_BASE_URL}${photoUrl}`;
}

function StudentProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [updateReason, setUpdateReason] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [backendProfile, setBackendProfile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);

  const currentStudent = useMemo(() => {
    const name = backendProfile?.name || user?.name || 'Student';
    const identifier = backendProfile?.identifier || user?.identifier || user?.rollNumber || 'NA';
    return {
      id: backendProfile?.id || user?.id || identifier,
      rollNumber: identifier,
      name,
      email: backendProfile?.email || user?.email || '',
      department: backendProfile?.department || user?.department || '',
      role: backendProfile?.role || user?.role || 'student',
      createdAt: backendProfile?.createdAt || user?.createdAt || null,
      registrationNo: backendProfile?.registrationNo || '',
      semester: backendProfile?.semester || '',
      section: backendProfile?.section || '',
      batchYear: backendProfile?.batchYear || '',
      dateOfBirth: backendProfile?.dateOfBirth || '',
      guardianName: backendProfile?.guardianName || '',
      guardianPhone: backendProfile?.guardianPhone || '',
      address: backendProfile?.address || '',
      phoneNumber: backendProfile?.phoneNumber || '',
      grade: backendProfile?.grade || '',
      initials: (String(name).trim().charAt(0) || 'S').toUpperCase(),
      isActive: backendProfile?.isActive ?? true,
      updatedAt: backendProfile?.updatedAt || null
    };
  }, [backendProfile, user]);

  const studentProfile = {
    ...currentStudent,
    ...(backendProfile || {}),
    id: user?.id || currentStudent.id,
    rollNumber: user?.identifier || currentStudent.rollNumber,
    email: (backendProfile && backendProfile.email) || user?.email || currentStudent.email,
    name: (backendProfile && backendProfile.name) || user?.name || currentStudent.name,
    department: (backendProfile && backendProfile.department) || user?.department || currentStudent.department,
    role: (backendProfile && backendProfile.role) || user?.role || 'student',
    createdAt: (backendProfile && backendProfile.createdAt) || user?.createdAt || currentStudent.createdAt || null
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

  useEffect(() => {
    let isMounted = true;
    const profileIdentifier = user?.identifier || user?.rollNumber;

    if (!profileIdentifier) {
      return () => {
        isMounted = false;
      };
    }

    getProfilePhotoUrl(profileIdentifier)
      .then((nextPhotoUrl) => {
        if (isMounted) {
          setPhotoUrl(nextPhotoUrl || '');
        }
      })
      .catch(() => {
        if (isMounted) {
          setPhotoUrl('');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    const profileIdentifier = user?.identifier || studentProfile.rollNumber;

    if (!file || !profileIdentifier) {
      return;
    }

    try {
      setPhotoLoading(true);
      const nextPhotoUrl = await uploadProfilePhoto(profileIdentifier, file);
      setPhotoUrl(nextPhotoUrl || '');
    } catch (error) {
      alert(error.message || 'Failed to upload profile photo.');
    } finally {
      setPhotoLoading(false);
      event.target.value = '';
    }
  };

  const handlePhotoDelete = async () => {
    const profileIdentifier = user?.identifier || studentProfile.rollNumber;
    if (!profileIdentifier) {
      return;
    }

    try {
      setPhotoLoading(true);
      await deleteProfilePhoto(profileIdentifier);
      setPhotoUrl('');
    } catch (error) {
      alert(error.message || 'Failed to remove profile photo.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const pendingRequest = null;

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
      return key !== 'id' && key !== 'rollNumber' && key !== 'grade' && key !== 'initials' && formData[key] !== studentProfile[key];
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
    setFormData(studentProfile);
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-shell student-shell">
      <header className="portal-topbar">
        <div className="topbar-user">
          <span className="topbar-avatar">{studentProfile.initials}</span>
          <div>
            <p className="topbar-name">{studentProfile.name}</p>
            <p className="topbar-meta">Student • {studentProfile.rollNumber}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <button type="button" className="outline-btn" onClick={() => navigate('/student')}>
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
              <div className="profile-avatar-wrap">
                {photoUrl ? (
                  <img className="profile-avatar-image" src={toAbsolutePhotoUrl(photoUrl)} alt={`${studentProfile.name} profile`} />
                ) : (
                  <div className="profile-avatar-large">{studentProfile.initials}</div>
                )}
                <div className="profile-photo-actions">
                  <label className="outline-btn upload-photo-btn" htmlFor="student-photo-upload">
                    {photoLoading ? 'Uploading...' : 'Upload Photo'}
                  </label>
                  <input
                    id="student-photo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handlePhotoUpload}
                    hidden
                    disabled={photoLoading}
                  />
                  {photoUrl ? (
                    <button type="button" className="outline-btn" onClick={handlePhotoDelete} disabled={photoLoading}>
                      Remove Photo
                    </button>
                  ) : null}
                </div>
              </div>
              <div>
                <h2>{studentProfile.name}</h2>
                <p>{studentProfile.rollNumber}</p>
              </div>
            </div>

            <div className="profile-content">
              {!isEditing ? (
                <div className="profile-view-mode">
                  <div className="info-grid">
                    <div className="info-item">
                      <label>ID</label>
                      <p>{studentProfile.id}</p>
                    </div>
                    <div className="info-item">
                      <label>Identifier</label>
                      <p>{studentProfile.rollNumber}</p>
                    </div>
                    <div className="info-item">
                      <label>Name</label>
                      <p>{studentProfile.name}</p>
                    </div>
                    <div className="info-item">
                      <label>Registration Number</label>
                      <p>{studentProfile.registrationNo || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <p>{studentProfile.email}</p>
                    </div>
                    <div className="info-item">
                      <label>Role</label>
                      <p>{studentProfile.role}</p>
                    </div>
                    <div className="info-item">
                      <label>Department</label>
                      <p>{studentProfile.department || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Phone Number</label>
                      <p>{studentProfile.phoneNumber || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Grade</label>
                      <p>{studentProfile.grade || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Semester</label>
                      <p>{studentProfile.semester || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Section</label>
                      <p>{studentProfile.section || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Batch Year</label>
                      <p>{studentProfile.batchYear || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Date of Birth</label>
                      <p>{studentProfile.dateOfBirth || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Guardian Name</label>
                      <p>{studentProfile.guardianName || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Guardian Phone</label>
                      <p>{studentProfile.guardianPhone || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Address</label>
                      <p>{studentProfile.address || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Status</label>
                      <p>{studentProfile.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="info-item">
                      <label>Created At</label>
                      <p>{studentProfile.createdAt || 'NA'}</p>
                    </div>
                    <div className="info-item">
                      <label>Updated At</label>
                      <p>{studentProfile.updatedAt || 'NA'}</p>
                    </div>
                  </div>

                  {!pendingRequest && (
                    <button
                      type="button"
                      className="primary-dark-btn"
                      onClick={() => {
                        setIsEditing(true);
                        setFormData(studentProfile);
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
                    <label htmlFor="registrationNo">Registration Number</label>
                    <input
                      id="registrationNo"
                      type="text"
                      name="registrationNo"
                      value={formData.registrationNo || ''}
                      onChange={handleInputChange}
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
                    <label htmlFor="department">Department</label>
                    <input
                      id="department"
                      type="text"
                      name="department"
                      value={formData.department || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="semester">Semester</label>
                    <input
                      id="semester"
                      type="text"
                      name="semester"
                      value={formData.semester || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="section">Section</label>
                    <input
                      id="section"
                      type="text"
                      name="section"
                      value={formData.section || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="batchYear">Batch Year</label>
                    <input
                      id="batchYear"
                      type="text"
                      name="batchYear"
                      value={formData.batchYear || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="dateOfBirth">Date of Birth</label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth || ''}
                      onChange={handleInputChange}
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
                    <label htmlFor="guardianName">Guardian Name</label>
                    <input
                      id="guardianName"
                      type="text"
                      name="guardianName"
                      value={formData.guardianName || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="guardianPhone">Guardian Phone</label>
                    <input
                      id="guardianPhone"
                      type="tel"
                      name="guardianPhone"
                      value={formData.guardianPhone || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="grade">Grade</label>
                    <input
                      id="grade"
                      type="text"
                      name="grade"
                      value={formData.grade || ''}
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

export default StudentProfile;
