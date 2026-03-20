import { useMemo, useState } from 'react';
import { registerAdminCreatedUser } from '../../services/authService';

function AdminControlCenter({ students, mentors, projects, files, submissionEvents, activeSection, activeAction }) {
  const [users, setUsers] = useState(() => [
    ...students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      department: student.department || 'Not Assigned',
      role: 'student',
      approved: true
    })),
    ...mentors.map((mentor) => ({
      id: mentor.id,
      name: mentor.name,
      email: mentor.email,
      department: mentor.department || 'Not Assigned',
      role: 'faculty',
      approved: true
    }))
  ]);
  const [newUser, setNewUser] = useState({ id: '', name: '', email: '', department: '', role: 'student' });
  const [editUserId, setEditUserId] = useState(null);
  const [editUser, setEditUser] = useState({ name: '', email: '', department: '' });
  const [studentIdSearch, setStudentIdSearch] = useState('');

  const [projectsState] = useState(projects);

  const [dbRecordCount, setDbRecordCount] = useState(() => students.length + mentors.length + projects.length + files.length);
  const [systemHealthy, setSystemHealthy] = useState(true);
  const [accessControlEnabled, setAccessControlEnabled] = useState(true);

  const [activityLogs, setActivityLogs] = useState([
    { id: 1, message: 'Admin control center initialized', time: new Date().toLocaleString() }
  ]);

  const [backupHistory, setBackupHistory] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcements, setAnnouncements] = useState([]);

  const [securityState, setSecurityState] = useState({
    authEnabled: true,
    strictPermissions: true,
    lastAudit: null
  });

  const [issueText, setIssueText] = useState('');
  const [featureText, setFeatureText] = useState('');
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [archivedProjectIds, setArchivedProjectIds] = useState(new Set());

  const addLog = (message) => {
    setActivityLogs((prev) => [
      { id: Date.now(), message, time: new Date().toLocaleString() },
      ...prev
    ]);
  };

  const handleAddUser = async () => {
    if (!newUser.id.trim() || !newUser.name.trim() || !newUser.email.trim()) {
      alert('Please fill ID, name, and email to register a user.');
      return;
    }

    // Check for duplicate user ID
    const idExists = users.some((user) => user.id.toLowerCase() === newUser.id.trim().toLowerCase());
    if (idExists) {
      alert('User ID already exists. Use a unique ID.');
      return;
    }

    // Check for duplicate email
    const emailExists = users.some((user) => user.email.toLowerCase() === newUser.email.trim().toLowerCase());
    if (emailExists) {
      alert('Email already exists. Use a unique email address.');
      return;
    }

    // For students, validate 10-digit ID not starting with 0.
    if (newUser.role === 'student') {
      if (!newUser.id.match(/^[1-9]\d{9}$/)) {
        alert('Student ID must be exactly 10 digits and cannot start with 0.');
        return;
      }
      
      // Check for duplicate student ID in students list
      const studentExists = users.filter(u => u.role === 'student').some(
        (user) => user.id.toLowerCase() === newUser.id.trim().toLowerCase()
      );
      if (studentExists) {
        alert('Student roll number already exists in the system.');
        return;
      }
    }

    // For faculty, validate 4-digit numeric ID.
    if (newUser.role === 'faculty') {
      if (!newUser.id.match(/^\d{4}$/)) {
        alert('Faculty ID must be exactly 4 digits.');
        return;
      }

      // Check for duplicate faculty ID
      const facultyExists = users.filter(u => u.role === 'faculty').some(
        (user) => user.id.toLowerCase() === newUser.id.trim().toLowerCase()
      );
      if (facultyExists) {
        alert('Faculty ID already exists in the system.');
        return;
      }
    }

    // For admin, validate a basic admin ID format.
    if (newUser.role === 'admin') {
      if (!newUser.id.match(/^ADM[0-9]{3,}$/i)) {
        alert('Admin ID must start with ADM followed by at least 3 digits (example: ADM001).');
        return;
      }
    }

    const createdUser = {
      id: newUser.id.trim().toUpperCase(),
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      department: newUser.department.trim() || 'Not Assigned',
      role: newUser.role,
      approved: false
    };

    let managedCredentials;
    try {
      managedCredentials = await registerAdminCreatedUser({
        identifier: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        department: createdUser.department,
        role: createdUser.role,
        phone: '+91 90000 00000'
      });
    } catch (registrationError) {
      alert(registrationError.message || 'Failed to generate user credentials.');
      return;
    }

    setUsers((prev) => [createdUser, ...prev]);
    setDbRecordCount((prev) => prev + 1);
    addLog(`Registered user ${createdUser.id} (${createdUser.role})`);

    alert(
      `User created successfully.\n\nIdentifier: ${managedCredentials.identifier}\nRole: ${managedCredentials.role}\nDefault Password: ${managedCredentials.password}\n\nJWT will be generated automatically after successful login.`
    );
    setNewUser({ id: '', name: '', email: '', department: '', role: 'student' });
  };

  const toggleUserApproval = (userId) => {
    setUsers((prev) => prev.map((user) => {
      if (user.id !== userId) return user;
      return { ...user, approved: !user.approved };
    }));
    addLog(`Updated approval status for ${userId}`);
  };

  const removeUser = (userId) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
    setDbRecordCount((prev) => Math.max(0, prev - 1));
    addLog(`Removed user ${userId}`);
  };

  const handleRoleChange = (userId, role) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
    addLog(`Changed role for ${userId} to ${role}`);
  };

  const startEditUser = (user) => {
    setEditUserId(user.id);
    setEditUser({ name: user.name, email: user.email, department: user.department });
  };

  const saveEditUser = () => {
    if (!editUserId) return;
    setUsers((prev) => prev.map((user) => (
      user.id === editUserId
        ? {
            ...user,
            name: editUser.name.trim() || user.name,
            email: editUser.email.trim() || user.email,
            department: editUser.department.trim() || user.department
          }
        : user
    )));
    addLog(`Updated details for ${editUserId}`);
    setEditUserId(null);
    setEditUser({ name: '', email: '', department: '' });
  };

  const handleStoreData = () => {
    setDbRecordCount((prev) => prev + 1);
    addLog('Stored one record in database');
  };

  const handleUpdateData = () => {
    addLog('Performed database update operation');
  };

  const handleDeleteData = () => {
    setDbRecordCount((prev) => Math.max(0, prev - 1));
    addLog('Deleted one record from database');
  };

  const filteredUsers = useMemo(() => {
    const query = studentIdSearch.trim().toLowerCase();
    if (!query) {
      return users.slice(0, 8);
    }

    return users
      .filter((user) => (
        user.id.toLowerCase().includes(query)
        || user.name.toLowerCase().includes(query)
        || user.email.toLowerCase().includes(query)
      ))
      .slice(0, 8);
  }, [users, studentIdSearch]);

  const dueSoonCount = useMemo(() => {
    const now = Date.now();
    const dayAhead = now + 24 * 60 * 60 * 1000;
    return submissionEvents.filter((event) => {
      const due = new Date(event.dueDate).getTime();
      return due >= now && due <= dayAhead;
    }).length;
  }, [submissionEvents]);

  const handleCreateBackup = () => {
    const backupEntry = {
      id: Date.now(),
      createdAt: new Date().toLocaleString(),
      records: dbRecordCount
    };
    setBackupHistory((prev) => [backupEntry, ...prev]);
    addLog('Created system backup');
  };

  const handleRestoreBackup = () => {
    if (backupHistory.length === 0) {
      alert('No backup available to restore.');
      return;
    }
    addLog(`Restored backup from ${backupHistory[0].createdAt}`);
  };

  const completionRate = useMemo(() => {
    if (projectsState.length === 0) return 0;
    const completed = projectsState.filter((project) => project.status === 'completed').length;
    return Math.round((completed / projectsState.length) * 100);
  }, [projectsState]);

  const sendAnnouncement = () => {
    if (!announcementText.trim()) {
      alert('Enter announcement message first.');
      return;
    }

    const entry = {
      id: Date.now(),
      message: announcementText.trim(),
      sentAt: new Date().toLocaleString()
    };

    setAnnouncements((prev) => [entry, ...prev]);
    addLog('Announcement sent to users');
    setAnnouncementText('');
  };

  const runSecurityAudit = () => {
    setSecurityState((prev) => ({ ...prev, lastAudit: new Date().toLocaleString() }));
    addLog('Security and privacy audit completed');
  };

  const logMaintenanceIssue = () => {
    if (!issueText.trim()) return;
    const entry = {
      id: Date.now(),
      type: 'issue',
      text: issueText.trim(),
      time: new Date().toLocaleString()
    };
    setMaintenanceHistory((prev) => [entry, ...prev]);
    addLog('System issue logged and assigned');
    setIssueText('');
  };

  const logFeatureUpdate = () => {
    if (!featureText.trim()) return;
    const entry = {
      id: Date.now(),
      type: 'feature',
      text: featureText.trim(),
      time: new Date().toLocaleString()
    };
    setMaintenanceHistory((prev) => [entry, ...prev]);
    addLog('Feature update scheduled');
    setFeatureText('');
  };

  const archiveCompletedProjects = () => {
    const completedIds = projectsState
      .filter((project) => project.status === 'completed')
      .map((project) => project.id);

    setArchivedProjectIds(new Set([...archivedProjectIds, ...completedIds]));
    addLog(`Archived ${completedIds.length} completed projects`);
  };

  const section = activeSection || 'user-management';
  const showUser = section === 'user-management';
  const showSystem = section === 'system-management';
  const showMonitoring = section === 'monitoring-control';
  const showData = section === 'data-file-management';
  const showReports = section === 'reports-analytics';
  const showNotify = section === 'notifications-communication';
  const showSecurity = section === 'security-management';
  const showMaintenance = section === 'maintenance';
  const showFinal = section === 'final-actions';

  const userAction = activeAction && activeAction.startsWith('user-') ? activeAction : 'user-add-register';
  const systemAction = activeAction && activeAction.startsWith('system-') ? activeAction : 'system-maintain';
  const dataAction = activeAction && activeAction.startsWith('data-') ? activeAction : 'data-manage-files';
  const maintenanceAction = activeAction && activeAction.startsWith('maintenance-') ? activeAction : 'maintenance-fix-issues';
  const finalAction = activeAction && activeAction.startsWith('final-') ? activeAction : 'final-archive-projects';

  return (
    <section className="faculty-panel admin-control-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Registered Users</h3>
          <p className="stat-value">{users.length}</p>
          <p className="muted-line">Students and faculty accounts</p>
        </div>
        <div className="stat-card">
          <h3>Active Projects</h3>
          <p className="stat-value">{projectsState.length}</p>
          <p className="muted-line">Current B.Tech project portfolio</p>
        </div>
        <div className="stat-card">
          <h3>System Records</h3>
          <p className="stat-value">{dbRecordCount}</p>
          <p className="muted-line">Tracked records in storage</p>
        </div>
        <div className="stat-card">
          <h3>Overall Progress</h3>
          <p className="stat-value">{completionRate}%</p>
          <p className="muted-line">Completed projects ratio</p>
        </div>
      </div>

      <div className="panel-content">
        <div className="admin-operations-grid">
          {showUser && (<article className="admin-operation-card">
            <h3>User Management</h3>
            <p className="muted-line">{userAction === 'user-add-register' ? 'Register New Users' : userAction === 'user-management-overview' ? 'Overview & Management' : userAction === 'user-approve-remove' ? 'Approve & Remove Access' : 'Manage User Roles & Details'}</p>
            {(userAction === 'user-add-register' || userAction === 'user-management-overview') && <div className="admin-form-grid">
              <input className="form-input" placeholder="User ID (e.g., STU001, FAC123)" value={newUser.id} onChange={(e) => setNewUser({ ...newUser, id: e.target.value })} />
              <input className="form-input" placeholder="Full Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              <input className="form-input" placeholder="Email Address" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              <input className="form-input" placeholder="Department (Optional)" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
              <select className="form-select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn-primary" onClick={handleAddUser}>Register User</button>
            </div>}

            {(userAction === 'user-approve-remove' || userAction === 'user-manage-roles' || userAction === 'user-management-overview') && <div className="admin-list">
              <div className="admin-form-grid">
                <input
                  className="form-input"
                  placeholder="Search users by ID, name, or email"
                  value={studentIdSearch}
                  onChange={(e) => setStudentIdSearch(e.target.value)}
                />
                <button className="btn-secondary" onClick={() => setStudentIdSearch('')}>Clear</button>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="muted-line">No users found for: {studentIdSearch}</p>
              ) : null}

              {filteredUsers.map((user) => (
                <div key={user.id} className="admin-list-item">
                  <div>
                    <strong>{user.id} - {user.name}</strong>
                    <p>{user.role} - {user.department}</p>
                  </div>
                  <div className="button-group">
                    <button className="btn-secondary" onClick={() => toggleUserApproval(user.id)}>{user.approved ? 'Approved' : 'Approve'}</button>
                    <select className="form-select compact" value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button className="btn-secondary" onClick={() => startEditUser(user)}>Edit</button>
                    <button className="btn-danger" onClick={() => removeUser(user.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>}

            {(userAction === 'user-update-details' || editUserId) ? (
              <div className="admin-form-grid">
                <input className="form-input" placeholder="Full Name" value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
                <input className="form-input" placeholder="Email Address" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
                <input className="form-input" placeholder="Department" value={editUser.department} onChange={(e) => setEditUser({ ...editUser, department: e.target.value })} />
                <button className="btn-success" onClick={saveEditUser}>Save Changes</button>
              </div>
            ) : null}
          </article>)}

          {showSystem && (<article className="admin-operation-card">
            <h3>System Management</h3>
            <p className="muted-line">{systemAction === 'system-maintain' ? 'System Health & Maintenance' : systemAction === 'system-database' ? 'Database Operations' : 'System Status Dashboard'}</p>
            <div>
              <p>System Status: <strong>{systemHealthy ? 'Healthy' : 'Requires Attention'}</strong></p>
              <p>Access Control: <strong>{accessControlEnabled ? 'Enabled' : 'Disabled'}</strong></p>
            </div>
            {(systemAction === 'system-maintain' || systemAction === 'system-management-overview') && <div className="button-group">
              <button className="btn-secondary" onClick={() => setSystemHealthy((prev) => !prev)}>{systemHealthy ? 'Mark Maintenance' : 'Resume Operations'}</button>
              <button className="btn-secondary" onClick={() => setAccessControlEnabled((prev) => !prev)}>Toggle Access Control</button>
            </div>}
            {(systemAction === 'system-database' || systemAction === 'system-management-overview') && <div className="button-group">
              <button className="btn-primary" onClick={handleStoreData}>Add Record</button>
              <button className="btn-info" onClick={handleUpdateData}>Update Records</button>
              <button className="btn-danger" onClick={handleDeleteData}>Remove Record</button>
            </div>}
          </article>)}

          {showMonitoring && (<article className="admin-operation-card">
            <h3>Operational Monitoring</h3>
            <p className="muted-line">Track system activity and project timelines</p>
            <div>
              <p>Activity Logs: <strong>{activityLogs.length}</strong> events recorded</p>
              <p>Urgent Deadlines: <strong>{dueSoonCount}</strong> due within 24 hours</p>
            </div>
            <div className="admin-log-list">
              <p className="muted-line">Recent Activity</p>
              {activityLogs.slice(0, 6).map((log) => (
                <p key={log.id}><strong>{log.time}</strong> - {log.message}</p>
              ))}
            </div>
          </article>)}

          {showData && (<article className="admin-operation-card">
            <h3>Data Governance and Records</h3>
            <p className="muted-line">Manage institutional data, files, and backups</p>
            <div>
              <p>Project Files: <strong>{files.length}</strong> documents in system</p>
              <p>Active Records: <strong>{projectsState.length}</strong> project entries</p>
            </div>
            {(dataAction === 'data-backup-restore' || dataAction === 'data-file-management-overview') && <div className="button-group">
              <button className="btn-primary" onClick={handleCreateBackup}>Create Backup</button>
              <button className="btn-secondary" onClick={handleRestoreBackup}>Restore from Backup</button>
            </div>}
            <div className="admin-log-list">
              {backupHistory.length > 0 ? (
                <>
                  <p className="muted-line">Backup History</p>
                  {backupHistory.slice(0, 4).map((backup) => (
                    <p key={backup.id}><strong>{backup.createdAt}</strong> - {backup.records} records</p>
                  ))}
                </>
              ) : (
                <p className="muted-line">No backups yet. Create one to secure your data.</p>
              )}
            </div>
          </article>)}

          {showReports && (<article className="admin-operation-card">
            <h3>Reports and Analytics</h3>
            <p className="muted-line">View project completion rates and system statistics</p>
            <div>
              <p>Completion Rate: <strong>{completionRate}%</strong></p>
              <p>Pending Projects: <strong>{projectsState.filter((project) => project.status !== 'completed').length}</strong> in progress</p>
              <p>Total Users: <strong>{users.length}</strong> registered</p>
            </div>
            <button className="btn-success" onClick={() => {
              addLog('Generated system-wide report');
            }}>
              Generate System Report
            </button>
          </article>)}

          {showNotify && (<article className="admin-operation-card">
            <h3>Notifications and Communication</h3>
            <p className="muted-line">Send announcements and deadline reminders to users</p>
            {dueSoonCount > 0 && <p className="muted-line">{dueSoonCount} deadlines are due in the next 24 hours.</p>}
            <textarea
              className="form-textarea"
              rows="3"
              placeholder="Type your announcement or deadline update message here..."
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
            />
            <button className="btn-primary" onClick={sendAnnouncement}>Send to All Users</button>
            <div className="admin-log-list">
              {announcements.length > 0 ? (
                <>
                  <p className="muted-line">Sent Announcements</p>
                  {announcements.slice(0, 4).map((announcement) => (
                    <p key={announcement.id}><strong>{announcement.sentAt}</strong> - {announcement.message}</p>
                  ))}
                </>
              ) : (
                <p className="muted-line">No announcements sent yet.</p>
              )}
            </div>
          </article>)}

          {showSecurity && (<article className="admin-operation-card">
            <h3>Security Management</h3>
            <p className="muted-line">Configure authentication, permissions, and security settings</p>
            <div>
              <p>Authentication: <strong>{securityState.authEnabled ? 'Enabled' : 'Disabled'}</strong></p>
              <p>Permission Level: <strong>{securityState.strictPermissions ? 'Strict' : 'Standard'}</strong></p>
            </div>
            <div className="button-group">
              <button className="btn-secondary" onClick={() => setSecurityState((prev) => ({ ...prev, authEnabled: !prev.authEnabled }))}>Toggle Auth</button>
              <button className="btn-secondary" onClick={() => setSecurityState((prev) => ({ ...prev, strictPermissions: !prev.strictPermissions }))}>Change Permissions</button>
            </div>
            <button className="btn-info" onClick={runSecurityAudit}>Run Security Audit</button>
            {securityState.lastAudit && <p>Last Audit: <strong>{securityState.lastAudit}</strong></p>}
          </article>)}

          {showMaintenance && (<article className="admin-operation-card">
            <h3>System Maintenance and Support</h3>
            <p className="muted-line">Log issues, schedule updates, and monitor performance</p>
            <input className="form-input" placeholder="Describe system issue or problem" value={issueText} onChange={(e) => setIssueText(e.target.value)} />
            <button className="btn-danger" onClick={logMaintenanceIssue}>Report Issue</button>
            <input className="form-input" placeholder="Describe feature update or improvement" value={featureText} onChange={(e) => setFeatureText(e.target.value)} />
            <button className="btn-primary" onClick={logFeatureUpdate}>Schedule Update</button>
            {maintenanceAction === 'maintenance-smooth-performance' && (
              <button className="btn-secondary" onClick={() => addLog('Performance check completed: system running smoothly')}>Check Performance</button>
            )}
            <div className="admin-log-list">
              {maintenanceHistory.length > 0 ? (
                <>
                  <p className="muted-line">Maintenance History</p>
                  {maintenanceHistory.slice(0, 4).map((entry) => (
                    <p key={entry.id}><strong>{entry.type}</strong> - {entry.text}</p>
                  ))}
                </>
              ) : (
                <p className="muted-line">No maintenance history yet.</p>
              )}
            </div>
          </article>)}

          {showFinal && (<article className="admin-operation-card">
            <h3>Project Closure and Archives</h3>
            <p className="muted-line">Archive completed projects and maintain operational history</p>
            <div>
              <p>Archived Projects: <strong>{archivedProjectIds.size}</strong></p>
              <p>Operation Records: <strong>{activityLogs.length}</strong> logged</p>
            </div>
            {(finalAction === 'final-archive-projects' || finalAction === 'final-actions-overview') && <button className="btn-secondary" onClick={archiveCompletedProjects}>Archive Completed Projects</button>}
            {(finalAction === 'final-maintain-history' || finalAction === 'final-actions-overview') && <button className="btn-info" onClick={() => addLog('System history reviewed and maintained')}>Review History</button>}
            {(finalAction === 'final-oversee-operations' || finalAction === 'final-actions-overview') && <button className="btn-primary" onClick={() => addLog('Completed overall system operations review')}>Complete Operations Review</button>}
          </article>)}
        </div>
      </div>
    </section>
  );
}

export default AdminControlCenter;
