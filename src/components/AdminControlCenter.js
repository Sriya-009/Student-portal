import { useMemo, useState } from 'react';

function AdminControlCenter({ students, mentors, projects, projectProposals, files, submissionEvents, activeSection, activeAction }) {
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

  const [proposalsState, setProposalsState] = useState(projectProposals);
  const [projectsState, setProjectsState] = useState(projects);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');

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

  const handleAddUser = () => {
    if (!newUser.id.trim() || !newUser.name.trim() || !newUser.email.trim()) {
      alert('Please fill ID, name, and email to register a user.');
      return;
    }

    const exists = users.some((user) => user.id.toLowerCase() === newUser.id.trim().toLowerCase());
    if (exists) {
      alert('User ID already exists. Use a unique ID.');
      return;
    }

    const createdUser = {
      id: newUser.id.trim().toUpperCase(),
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      department: newUser.department.trim() || 'Not Assigned',
      role: newUser.role,
      approved: false
    };

    setUsers((prev) => [createdUser, ...prev]);
    setDbRecordCount((prev) => prev + 1);
    addLog(`Registered user ${createdUser.id} (${createdUser.role})`);
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
    alert('Database update operation completed.');
  };

  const handleDeleteData = () => {
    setDbRecordCount((prev) => Math.max(0, prev - 1));
    addLog('Deleted one record from database');
  };

  const pendingProposals = useMemo(
    () => proposalsState.filter((proposal) => proposal.status === 'pending'),
    [proposalsState]
  );

  const filteredUsers = useMemo(() => {
    const query = studentIdSearch.trim().toLowerCase();
    if (!query) {
      return users.slice(0, 6);
    }

    return users
      .filter((user) => user.role === 'student' && user.id.toLowerCase().includes(query))
      .slice(0, 6);
  }, [users, studentIdSearch]);

  const approveProposal = (proposalId) => {
    setProposalsState((prev) => prev.map((proposal) => (
      proposal.id === proposalId
        ? { ...proposal, status: 'approved', approvedDate: new Date().toISOString().split('T')[0] }
        : proposal
    )));
    addLog(`Approved project proposal ${proposalId}`);
  };

  const rejectProposal = (proposalId) => {
    setProposalsState((prev) => prev.map((proposal) => (
      proposal.id === proposalId
        ? { ...proposal, status: 'rejected' }
        : proposal
    )));
    addLog(`Rejected project proposal ${proposalId}`);
  };

  const assignMentor = () => {
    if (!selectedProjectId || !selectedMentorId) {
      alert('Select both project and mentor before assigning.');
      return;
    }

    setProjectsState((prev) => prev.map((project) => (
      project.id === selectedProjectId
        ? { ...project, mentorId: selectedMentorId }
        : project
    )));

    addLog(`Assigned mentor ${selectedMentorId} to project ${selectedProjectId}`);
  };

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
    alert(`Backup restored: ${backupHistory[0].createdAt}`);
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
    alert(`${completedIds.length} completed projects archived.`);
  };

  const section = activeSection || 'user-management';
  const showUser = section === 'user-management';
  const showSystem = section === 'system-management';
  const showProject = section === 'project-management';
  const showMonitoring = section === 'monitoring-control';
  const showData = section === 'data-file-management';
  const showReports = section === 'reports-analytics';
  const showNotify = section === 'notifications-communication';
  const showSecurity = section === 'security-management';
  const showMaintenance = section === 'maintenance';
  const showFinal = section === 'final-actions';

  const userAction = activeAction && activeAction.startsWith('user-') ? activeAction : 'user-add-register';
  const systemAction = activeAction && activeAction.startsWith('system-') ? activeAction : 'system-maintain';
  const projectAction = activeAction && activeAction.startsWith('project-') ? activeAction : 'project-view-all';
  const monitorAction = activeAction && activeAction.startsWith('monitor-') ? activeAction : 'monitor-track-activities';
  const dataAction = activeAction && activeAction.startsWith('data-') ? activeAction : 'data-manage-files';
  const reportAction = activeAction && activeAction.startsWith('report-') ? activeAction : 'report-generate';
  const notifyAction = activeAction && activeAction.startsWith('notify-') ? activeAction : 'notify-announcements';
  const securityAction = activeAction && activeAction.startsWith('security-') ? activeAction : 'security-auth';
  const maintenanceAction = activeAction && activeAction.startsWith('maintenance-') ? activeAction : 'maintenance-fix-issues';
  const finalAction = activeAction && activeAction.startsWith('final-') ? activeAction : 'final-archive-projects';

  return (
    <section className="faculty-panel admin-control-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{users.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Projects</h3>
          <p className="stat-value">{projectsState.length}</p>
        </div>
        <div className="stat-card">
          <h3>Database Records</h3>
          <p className="stat-value">{dbRecordCount}</p>
        </div>
        <div className="stat-card">
          <h3>Completion Rate</h3>
          <p className="stat-value">{completionRate}%</p>
        </div>
      </div>

      <div className="panel-content">
        <div className="admin-operations-grid">
          {showUser && (<article className="admin-operation-card">
            <h3>User Management</h3>
            <p className="muted-line">Mode: {userAction.replace('user-', '').replace('-', ' ')}</p>
            {(userAction === 'user-add-register' || userAction === 'user-management-overview') && <div className="admin-form-grid">
              <input className="form-input" placeholder="ID" value={newUser.id} onChange={(e) => setNewUser({ ...newUser, id: e.target.value })} />
              <input className="form-input" placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              <input className="form-input" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              <input className="form-input" placeholder="Department" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
              <select className="form-select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
              <button className="btn-primary" onClick={handleAddUser}>Add/Register</button>
            </div>}

            {(userAction === 'user-approve-remove' || userAction === 'user-manage-roles' || userAction === 'user-management-overview') && <div className="admin-list">
              <div className="admin-form-grid" style={{ marginBottom: '4px' }}>
                <input
                  className="form-input"
                  placeholder="Search student by ID (e.g., STU001)"
                  value={studentIdSearch}
                  onChange={(e) => setStudentIdSearch(e.target.value)}
                />
                <button className="btn-secondary" onClick={() => setStudentIdSearch('')}>Clear Search</button>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="muted-line">No student found for ID: {studentIdSearch}</p>
              ) : null}

              {filteredUsers.map((user) => (
                <div key={user.id} className="admin-list-item">
                  <div>
                    <strong>{user.id} - {user.name}</strong>
                    <p>{user.role} | {user.department}</p>
                  </div>
                  <div className="button-group">
                    <button className="btn-secondary" onClick={() => toggleUserApproval(user.id)}>{user.approved ? 'Approved' : 'Approve'}</button>
                    <select className="form-select compact" value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                    </select>
                    <button className="btn-secondary" onClick={() => startEditUser(user)}>Edit</button>
                    <button className="btn-danger" onClick={() => removeUser(user.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>}

            {(userAction === 'user-update-details' || editUserId) ? (
              <div className="admin-form-grid">
                <input className="form-input" placeholder="Name" value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
                <input className="form-input" placeholder="Email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
                <input className="form-input" placeholder="Department" value={editUser.department} onChange={(e) => setEditUser({ ...editUser, department: e.target.value })} />
                <button className="btn-success" onClick={saveEditUser}>Update User Details</button>
              </div>
            ) : null}
          </article>)}

          {showSystem && (<article className="admin-operation-card">
            <h3>System Management</h3>
            <p className="muted-line">Mode: {systemAction.replace('system-', '').replace('-', ' ')}</p>
            <p>System Status: <strong>{systemHealthy ? 'Healthy' : 'Attention Required'}</strong></p>
            <p>Access Control: <strong>{accessControlEnabled ? 'Enabled' : 'Disabled'}</strong></p>
            {(systemAction === 'system-maintain' || systemAction === 'system-management-overview') && <div className="button-group">
              <button className="btn-secondary" onClick={() => setSystemHealthy((prev) => !prev)}>Maintain Functionality</button>
              <button className="btn-secondary" onClick={() => setAccessControlEnabled((prev) => !prev)}>Access Control</button>
            </div>}
            {(systemAction === 'system-database' || systemAction === 'system-management-overview') && <div className="button-group">
              <button className="btn-primary" onClick={handleStoreData}>Store Data</button>
              <button className="btn-info" onClick={handleUpdateData}>Update Data</button>
              <button className="btn-danger" onClick={handleDeleteData}>Delete Data</button>
            </div>}
          </article>)}

          {showProject && (<article className="admin-operation-card">
            <h3>Project Management</h3>
            <p className="muted-line">Mode: {projectAction.replace('project-', '').replace('-', ' ')}</p>
            <p>Pending Proposals: <strong>{pendingProposals.length}</strong></p>
            {(projectAction === 'project-approve-reject' || projectAction === 'project-management-overview') && <div className="admin-list">
              {pendingProposals.slice(0, 4).map((proposal) => (
                <div key={proposal.id} className="admin-list-item">
                  <div>
                    <strong>{proposal.title}</strong>
                    <p>Student: {proposal.studentId}</p>
                  </div>
                  <div className="button-group">
                    <button className="btn-success" onClick={() => approveProposal(proposal.id)}>Approve</button>
                    <button className="btn-danger" onClick={() => rejectProposal(proposal.id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>}
            {(projectAction === 'project-assign-mentor' || projectAction === 'project-management-overview') && <div className="admin-form-grid">
              <select className="form-select" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                <option value="">Select Project</option>
                {projectsState.map((project) => <option key={project.id} value={project.id}>{project.id}</option>)}
              </select>
              <select className="form-select" value={selectedMentorId} onChange={(e) => setSelectedMentorId(e.target.value)}>
                <option value="">Select Mentor</option>
                {mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.name}</option>)}
              </select>
              <button className="btn-primary" onClick={assignMentor}>Assign Mentor</button>
            </div>}
            {(projectAction === 'project-view-all' || projectAction === 'project-monitor-status' || projectAction === 'project-management-overview') && <p>Ongoing: <strong>{projectsState.filter((project) => project.status === 'ongoing').length}</strong> | Completed: <strong>{projectsState.filter((project) => project.status === 'completed').length}</strong></p>}
          </article>)}

          {showMonitoring && (<article className="admin-operation-card">
            <h3>Monitoring & Control</h3>
            <p className="muted-line">Mode: {monitorAction.replace('monitor-', '').replace('-', ' ')}</p>
            <p>User Activity Logs: <strong>{activityLogs.length}</strong></p>
            <p>Deadlines due in 24h: <strong>{dueSoonCount}</strong></p>
            <div className="admin-log-list">
              {activityLogs.slice(0, 6).map((log) => (
                <p key={log.id}><strong>{log.time}</strong> - {log.message}</p>
              ))}
            </div>
          </article>)}

          {showData && (<article className="admin-operation-card">
            <h3>Data & File Management</h3>
            <p className="muted-line">Mode: {dataAction.replace('data-', '').replace('-', ' ')}</p>
            <p>Uploaded Files: <strong>{files.length}</strong></p>
            <p>Project Records: <strong>{projectsState.length}</strong></p>
            {(dataAction === 'data-backup-restore' || dataAction === 'data-file-management-overview') && <div className="button-group">
              <button className="btn-primary" onClick={handleCreateBackup}>Backup Data</button>
              <button className="btn-secondary" onClick={handleRestoreBackup}>Restore Data</button>
            </div>}
            <div className="admin-log-list">
              {backupHistory.slice(0, 4).map((backup) => (
                <p key={backup.id}><strong>{backup.createdAt}</strong> - {backup.records} records</p>
              ))}
            </div>
          </article>)}

          {showReports && (<article className="admin-operation-card">
            <h3>Reports & Analytics</h3>
            <p className="muted-line">Mode: {reportAction.replace('report-', '').replace('-', ' ')}</p>
            <p>System-wide report includes users, projects, and deadlines.</p>
            <p>Completion Rate: <strong>{completionRate}%</strong></p>
            <p>Pending Work: <strong>{projectsState.filter((project) => project.status !== 'completed').length}</strong> projects</p>
            <button className="btn-success" onClick={() => {
              addLog('Generated system-wide report');
              alert('System report generated successfully.');
            }}>
              Generate Report
            </button>
          </article>)}

          {showNotify && (<article className="admin-operation-card">
            <h3>Notifications & Communication</h3>
            <p className="muted-line">Mode: {notifyAction.replace('notify-', '').replace('-', ' ')}</p>
            <textarea
              className="form-textarea"
              rows="3"
              placeholder="Send announcement or deadline update"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
            />
            <button className="btn-primary" onClick={sendAnnouncement}>Send Announcement</button>
            {notifyAction === 'notify-deadlines' && (
              <p className="muted-line">{dueSoonCount} deadlines are due in the next 24 hours. Send an update to all users.</p>
            )}
            <div className="admin-log-list">
              {announcements.slice(0, 4).map((announcement) => (
                <p key={announcement.id}><strong>{announcement.sentAt}</strong> - {announcement.message}</p>
              ))}
            </div>
          </article>)}

          {showSecurity && (<article className="admin-operation-card">
            <h3>Security Management</h3>
            <p className="muted-line">Mode: {securityAction.replace('security-', '').replace('-', ' ')}</p>
            <p>Authentication: <strong>{securityState.authEnabled ? 'Enabled' : 'Disabled'}</strong></p>
            <p>Permission Policy: <strong>{securityState.strictPermissions ? 'Strict' : 'Standard'}</strong></p>
            <div className="button-group">
              <button className="btn-secondary" onClick={() => setSecurityState((prev) => ({ ...prev, authEnabled: !prev.authEnabled }))}>Toggle Authentication</button>
              <button className="btn-secondary" onClick={() => setSecurityState((prev) => ({ ...prev, strictPermissions: !prev.strictPermissions }))}>Manage Permissions</button>
            </div>
            <button className="btn-info" onClick={runSecurityAudit}>Run Privacy Audit</button>
            {securityState.lastAudit ? <p>Last Audit: <strong>{securityState.lastAudit}</strong></p> : null}
          </article>)}

          {showMaintenance && (<article className="admin-operation-card">
            <h3>Maintenance</h3>
            <p className="muted-line">Mode: {maintenanceAction.replace('maintenance-', '').replace('-', ' ')}</p>
            <input className="form-input" placeholder="Log system issue" value={issueText} onChange={(e) => setIssueText(e.target.value)} />
            <button className="btn-danger" onClick={logMaintenanceIssue}>Fix System Issue</button>
            <input className="form-input" placeholder="Feature update notes" value={featureText} onChange={(e) => setFeatureText(e.target.value)} />
            <button className="btn-primary" onClick={logFeatureUpdate}>Update Feature</button>
            {maintenanceAction === 'maintenance-smooth-performance' && (
              <button className="btn-secondary" onClick={() => addLog('Performance check completed: system running smoothly')}>Run Performance Check</button>
            )}
            <div className="admin-log-list">
              {maintenanceHistory.slice(0, 4).map((entry) => (
                <p key={entry.id}><strong>{entry.type}</strong> - {entry.text}</p>
              ))}
            </div>
          </article>)}

          {showFinal && (<article className="admin-operation-card">
            <h3>Final Actions</h3>
            <p className="muted-line">Mode: {finalAction.replace('final-', '').replace('-', ' ')}</p>
            <p>Archived Projects: <strong>{archivedProjectIds.size}</strong></p>
            <p>Operation Logs: <strong>{activityLogs.length}</strong></p>
            {(finalAction === 'final-archive-projects' || finalAction === 'final-actions-overview') && <button className="btn-secondary" onClick={archiveCompletedProjects}>Archive Completed Projects</button>}
            {(finalAction === 'final-maintain-history' || finalAction === 'final-actions-overview') && <button className="btn-info" onClick={() => alert('History maintained and system operations reviewed.')}>Maintain History</button>}
            {(finalAction === 'final-oversee-operations' || finalAction === 'final-actions-overview') && <button className="btn-primary" onClick={() => addLog('Completed overall system operations review')}>Oversee Operations</button>}
          </article>)}
        </div>
      </div>
    </section>
  );
}

export default AdminControlCenter;
