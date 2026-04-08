import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/shared/ThemeToggle';
import {
  deleteProfilePhoto,
  getProfilePhotoUrl,
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto
} from '../services/authService';
import { BASE_URL as API_BASE_URL } from '../config/api';
import '../styles/profile.css';

function toAbsolutePhotoUrl(photoUrl) {
  if (!photoUrl) {
    return '';
  }
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  return `${API_BASE_URL}${photoUrl}`;
}

function AdminProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [backendProfile, setBackendProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);

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
          setFormData(profile);
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
    const profileIdentifier = user?.identifier;

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

  const currentAdmin = useMemo(() => {
    const name = backendProfile?.name || user?.name || 'Admin';
    const identifier = backendProfile?.identifier || user?.identifier || user?.id || 'NA';

    return {
      ...(backendProfile || {}),
      id: backendProfile?.id || user?.id || identifier,
      identifier,
      name,
      email: backendProfile?.email || user?.email || '',
      role: backendProfile?.role || user?.role || 'admin',
      department: backendProfile?.department || user?.department || 'Administration',
      createdAt: backendProfile?.createdAt || user?.createdAt || null,
      initials: (String(name).trim().charAt(0) || 'A').toUpperCase()
    };
  }, [user, backendProfile]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleTwoFactor = () => {
    setFormData((prev) => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
  };

  const handleToggleStatus = () => {
    setFormData((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setSaveMessage('');

    if (!currentAdmin.identifier) {
      setError('Unable to update profile without identifier.');
      return;
    }

    const normalizedPermissions = Array.isArray(formData.permissions)
      ? formData.permissions
      : String(formData.permissions || '')
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);

    try {
      const updated = await updateUserProfile(currentAdmin.identifier, {
        name: formData.name,
        email: formData.email,
        department: formData.department,
        phoneNumber: formData.phoneNumber,
        employeeId: formData.employeeId,
        accessLevel: formData.accessLevel,
        emergencyContact: formData.emergencyContact,
        permissions: normalizedPermissions,
        twoFactorEnabled: Boolean(formData.twoFactorEnabled),
        isActive: Boolean(formData.isActive)
      });

      setBackendProfile(updated);
      setFormData(updated);
      setSaveMessage('Profile saved to backend successfully.');
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError.message || 'Failed to save profile');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentAdmin.identifier) {
      return;
    }

    try {
      setPhotoLoading(true);
      const nextPhotoUrl = await uploadProfilePhoto(currentAdmin.identifier, file);
      setPhotoUrl(nextPhotoUrl || '');
    } catch (uploadError) {
      setError(uploadError.message || 'Failed to upload profile photo.');
    } finally {
      setPhotoLoading(false);
      event.target.value = '';
    }
  };

  const handlePhotoDelete = async () => {
    if (!currentAdmin.identifier) {
      return;
    }

    try {
      setPhotoLoading(true);
      await deleteProfilePhoto(currentAdmin.identifier);
      setPhotoUrl('');
      setSaveMessage('Profile photo removed successfully.');
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to remove profile photo.');
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="portal-shell">
      <header className="portal-topbar admin-topbar">
        <div className="topbar-user">
          <span className="topbar-avatar">{currentAdmin.initials}</span>
          <div>
            <p className="topbar-name">{currentAdmin.name}</p>
            <p className="topbar-meta">Admin • {currentAdmin.identifier}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <button type="button" className="outline-btn" onClick={() => navigate('/admin')}>
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
            <h1>Admin Profile</h1>
            <p>View complete administrative account details</p>
          </section>

          {saveMessage ? <p className="success-message">{saveMessage}</p> : null}
          {error ? <p className="error">{error}</p> : null}

          <section className="profile-section">
            <div className="profile-head">
              <div className="profile-avatar-wrap">
                {photoUrl ? (
                  <img className="profile-avatar-image" src={toAbsolutePhotoUrl(photoUrl)} alt={`${currentAdmin.name} profile`} />
                ) : (
                  <div className="profile-avatar-large">{currentAdmin.initials}</div>
                )}
                <div className="profile-photo-actions">
                  <label className="outline-btn upload-photo-btn" htmlFor="admin-photo-upload">
                    {photoLoading ? 'Uploading...' : 'Upload Photo'}
                  </label>
                  <input
                    id="admin-photo-upload"
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
                <h2>{currentAdmin.name}</h2>
                <p>{currentAdmin.identifier}</p>
              </div>
            </div>

            <div className="profile-content">
              {!isEditing ? (
                <div className="profile-view-mode">
                <div className="info-grid">
                  <div className="info-item">
                    <label>ID</label>
                    <p>{currentAdmin.id}</p>
                  </div>
                  <div className="info-item">
                    <label>Identifier</label>
                    <p>{currentAdmin.identifier}</p>
                  </div>
                  <div className="info-item">
                    <label>Employee ID</label>
                    <p>{currentAdmin.employeeId || 'NA'}</p>
                  </div>
                  <div className="info-item">
                    <label>Name</label>
                    <p>{currentAdmin.name}</p>
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    <p>{currentAdmin.email}</p>
                  </div>
                  <div className="info-item">
                    <label>Role</label>
                    <p>{currentAdmin.role}</p>
                  </div>
                  <div className="info-item">
                    <label>Department</label>
                    <p>{currentAdmin.department || 'NA'}</p>
                  </div>
                  <div className="info-item">
                    <label>Phone Number</label>
                    <p>{currentAdmin.phoneNumber || 'NA'}</p>
                  </div>
                  <div className="info-item">
                    <label>Access Level</label>
                    <p>{currentAdmin.accessLevel || 'NA'}</p>
                  </div>
                  <div className="info-item">
                    <label>2FA Enabled</label>
                    <p>{currentAdmin.twoFactorEnabled ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="info-item">
                    <label>Emergency Contact</label>
                    <p>{currentAdmin.emergencyContact || 'NA'}</p>
                  </div>
                  <div className="info-item">
                    <label>Permissions</label>
                    <p>{currentAdmin.permissions?.length ? currentAdmin.permissions.join(', ') : 'NA'}</p>
                  </div>
                  <div className="info-item">
                    <label>Status</label>
                    <p>{currentAdmin.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div className="info-item">
                    <label>Created At</label>
                    <p>{currentAdmin.createdAt || 'NA'}</p>
                  </div>
                  <div className="info-item">
                    <label>Updated At</label>
                    <p>{currentAdmin.updatedAt || 'NA'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-dark-btn"
                  onClick={() => {
                    setIsEditing(true);
                    setFormData(currentAdmin);
                    setError('');
                    setSaveMessage('');
                  }}
                >
                  Edit Profile
                </button>
              </div>
              ) : (
                <form className="profile-edit-form" onSubmit={handleSaveProfile}>
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input id="name" name="name" value={formData.name || ''} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <input id="department" name="department" value={formData.department || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phoneNumber">Phone Number</label>
                    <input id="phoneNumber" name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="employeeId">Employee ID</label>
                    <input id="employeeId" name="employeeId" value={formData.employeeId || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="accessLevel">Access Level</label>
                    <input id="accessLevel" name="accessLevel" value={formData.accessLevel || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="emergencyContact">Emergency Contact</label>
                    <input id="emergencyContact" name="emergencyContact" value={formData.emergencyContact || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="permissions">Permissions (comma separated)</label>
                    <input
                      id="permissions"
                      name="permissions"
                      value={Array.isArray(formData.permissions) ? formData.permissions.join(', ') : (formData.permissions || '')}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="outline-btn" onClick={handleToggleTwoFactor}>
                      2FA: {formData.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button type="button" className="outline-btn" onClick={handleToggleStatus}>
                      Status: {formData.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="outline-btn" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="primary-dark-btn">
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default AdminProfile;
