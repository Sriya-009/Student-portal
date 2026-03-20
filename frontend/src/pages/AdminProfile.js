import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/shared/ThemeToggle';
import { admins } from '../data/portalData';
import { getUserProfile, updateUserProfile } from '../services/authService';
import '../styles/profile.css';

function AdminProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [backendProfile, setBackendProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

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

  const currentAdmin = useMemo(() => {
    const identifier = user?.identifier || user?.id;
    const matchedAdmin = admins.find(
      (admin) => admin.identifier === identifier || admin.id === identifier
    );

    return {
      ...(matchedAdmin || admins[0]),
      ...(backendProfile || {}),
      id: user?.id || matchedAdmin?.id || admins[0].id,
      identifier: user?.identifier || matchedAdmin?.identifier || admins[0].identifier,
      name: (backendProfile && backendProfile.name) || user?.name || matchedAdmin?.name || admins[0].name,
      email: (backendProfile && backendProfile.email) || user?.email || matchedAdmin?.email || admins[0].email,
      role: (backendProfile && backendProfile.role) || user?.role || matchedAdmin?.role || 'admin',
      department: (backendProfile && backendProfile.department) || user?.department || matchedAdmin?.department || 'Administration',
      createdAt: (backendProfile && backendProfile.createdAt) || user?.createdAt || matchedAdmin?.createdAt || null
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

    try {
      const updated = await updateUserProfile(currentAdmin.identifier, {
        name: formData.name,
        email: formData.email,
        department: formData.department,
        phoneNumber: formData.phoneNumber,
        employeeId: formData.employeeId,
        accessLevel: formData.accessLevel,
        emergencyContact: formData.emergencyContact,
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
              <div className="profile-avatar-large">{currentAdmin.initials}</div>
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
