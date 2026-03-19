import { useState } from 'react';

const adminSections = [
  {
    id: 'user-management',
    title: 'User Management',
    items: [
      { label: 'Register Users', actionId: 'user-add-register' },
      { label: 'Approvals and Roles', actionId: 'user-manage-roles' },
      { label: 'Update User Details', actionId: 'user-update-details' }
    ]
  },
  {
    id: 'system-management',
    title: 'System Management',
    items: [
      { label: 'System Health', actionId: 'system-maintain' },
      { label: 'Database Operations', actionId: 'system-database' }
    ]
  },
  {
    id: 'monitoring-control',
    title: 'Operational Monitoring',
    items: [
      { label: 'Activity Logs', actionId: 'monitor-track-activities' },
      { label: 'Deadline Tracking', actionId: 'monitor-deadlines' }
    ]
  },
  {
    id: 'data-file-management',
    title: 'Data Governance & Records',
    items: [
      { label: 'Records and Assets', actionId: 'data-manage-files' },
      { label: 'Backup and Recovery', actionId: 'data-backup-restore' }
    ]
  },
  {
    id: 'reports-analytics',
    title: 'Reports & Analytics',
    items: [
      { label: 'Summary Reports', actionId: 'report-generate' },
      { label: 'Performance Metrics', actionId: 'report-performance' }
    ]
  },
  {
    id: 'notifications-communication',
    title: 'Notifications & Communication',
    items: [
      { label: 'Send Announcements', actionId: 'notify-announcements' },
      { label: 'Deadline Alerts', actionId: 'notify-deadlines' }
    ]
  },
  {
    id: 'security-management',
    title: 'Security Management',
    items: [
      { label: 'Authentication', actionId: 'security-auth' },
      { label: 'Permissions', actionId: 'security-permissions' }
    ]
  },
  {
    id: 'maintenance',
    title: 'System Maintenance & Support',
    items: [
      { label: 'Issue Tracking', actionId: 'maintenance-fix-issues' },
      { label: 'Performance Check', actionId: 'maintenance-smooth-performance' }
    ]
  },
  {
    id: 'final-actions',
    title: 'Project Closure & Archives',
    items: [
      { label: 'Archive Completed Projects', actionId: 'final-archive-projects' },
      { label: 'History Records', actionId: 'final-maintain-history' }
    ]
  }
];

function AdminWorkspaceSidebar({ onSectionSelect, onActionSelect }) {
  const [openSections, setOpenSections] = useState(new Set([
    'user-management',
    'system-management',
    'monitoring-control',
    'data-file-management'
  ]));

  const toggleSection = (sectionId) => {
    const next = new Set(openSections);
    if (next.has(sectionId)) {
      next.delete(sectionId);
    } else {
      next.add(sectionId);
    }
    setOpenSections(next);
  };

  return (
    <nav className="workspace-sidebar faculty-sidebar admin-sidebar">
      <h2 className="workspace-title">Admin Workspace</h2>

      {adminSections.map((section) => (
        <div key={section.id} className="workspace-section">
          <button
            className="workspace-menu-title"
            onClick={() => {
              toggleSection(section.id);
              onSectionSelect(section.id);
            }}
            aria-expanded={openSections.has(section.id)}
          >
            {section.title}
            <span className="workspace-chevron">{openSections.has(section.id) ? '▼' : '▶'}</span>
          </button>

          {openSections.has(section.id) && (
            <div className="workspace-submenu">
              {section.items.map((item) => (
                <button
                  key={item.actionId}
                  className="workspace-submenu-action"
                  onClick={() => onActionSelect(item.actionId)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

export default AdminWorkspaceSidebar;
