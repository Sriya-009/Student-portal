import { useState } from 'react';

const adminSections = [
  {
    id: 'user-management',
    title: 'User Management',
    items: [
      { label: 'Add/Register Students & Faculty', actionId: 'user-add-register' },
      { label: 'Approve or Remove Users', actionId: 'user-approve-remove' },
      { label: 'Manage User Roles', actionId: 'user-manage-roles' },
      { label: 'Update User Details', actionId: 'user-update-details' }
    ]
  },
  {
    id: 'system-management',
    title: 'System Management',
    items: [
      { label: 'Maintain System Functionality', actionId: 'system-maintain' },
      { label: 'Manage Database', actionId: 'system-database' },
      { label: 'Security & Access Control', actionId: 'system-access-control' }
    ]
  },
  {
    id: 'monitoring-control',
    title: 'Operational Monitoring',
    items: [
      { label: 'Audit User Activity', actionId: 'monitor-track-activities' },
      { label: 'Track Project Execution', actionId: 'monitor-project-progress' },
      { label: 'Manage Deadline Compliance', actionId: 'monitor-deadlines' }
    ]
  },
  {
    id: 'data-file-management',
    title: 'Data Governance & Records',
    items: [
      { label: 'Manage Documents & Assets', actionId: 'data-manage-files' },
      { label: 'Maintain Project Records', actionId: 'data-project-records' },
      { label: 'Backup and Recovery', actionId: 'data-backup-restore' }
    ]
  },
  {
    id: 'reports-analytics',
    title: 'Reports & Analytics',
    items: [
      { label: 'Generate Reports', actionId: 'report-generate' },
      { label: 'Analyze Performance', actionId: 'report-performance' },
      { label: 'View Completion/Pending Stats', actionId: 'report-statistics' }
    ]
  },
  {
    id: 'notifications-communication',
    title: 'Notifications & Communication',
    items: [
      { label: 'Send Announcements', actionId: 'notify-announcements' },
      { label: 'Notify Deadlines/Updates', actionId: 'notify-deadlines' }
    ]
  },
  {
    id: 'security-management',
    title: 'Security Management',
    items: [
      { label: 'Authentication & Authorization', actionId: 'security-auth' },
      { label: 'Protect Data Privacy', actionId: 'security-privacy' },
      { label: 'Manage Permissions', actionId: 'security-permissions' }
    ]
  },
  {
    id: 'maintenance',
    title: 'System Maintenance & Support',
    items: [
      { label: 'Fix System Issues', actionId: 'maintenance-fix-issues' },
      { label: 'Update Features', actionId: 'maintenance-update-features' },
      { label: 'Ensure Smooth Performance', actionId: 'maintenance-smooth-performance' }
    ]
  },
  {
    id: 'final-actions',
    title: 'Project Closure & Archives',
    items: [
      { label: 'Archive Completed Projects', actionId: 'final-archive-projects' },
      { label: 'Maintain History Records', actionId: 'final-maintain-history' },
      { label: 'Oversee Operations', actionId: 'final-oversee-operations' }
    ]
  }
];

function AdminWorkspaceSidebar({ onSectionSelect, onActionSelect }) {
  const [openSections, setOpenSections] = useState(new Set(['user-management', 'system-management']));

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
