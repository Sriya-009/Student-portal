import { useState } from 'react';

const facultySections = [
  {
    id: 'approval',
    title: 'Project Approval',
    items: [
      { label: 'Review Proposals', actionId: 'approval-review' },
      { label: 'Pending Approvals', actionId: 'approval-pending' },
      { label: 'Assign Mentors', actionId: 'approval-assign-mentor' },
      { label: 'Assign Students', actionId: 'approval-assign-students' },
      { label: 'Approval History', actionId: 'approval-history' }
    ]
  },
  {
    id: 'monitoring',
    title: 'Project Monitoring',
    items: [
      { label: 'View All Projects', actionId: 'monitor-all-projects' },
      { label: 'Track Progress', actionId: 'monitor-progress' },
      { label: 'Task Completion', actionId: 'monitor-tasks' },
      { label: 'Deadlines & Milestones', actionId: 'monitor-deadlines' },
      { label: 'Project Status', actionId: 'monitor-status' }
    ]
  },
  {
    id: 'tasks',
    title: 'Task Oversight',
    items: [
      { label: 'Review Tasks', actionId: 'task-review' },
      { label: 'Task Distribution', actionId: 'task-distribution' },
      { label: 'Suggest Modifications', actionId: 'task-modify' },
      { label: 'Overdue Tasks', actionId: 'task-overdue' },
      { label: 'Task Analytics', actionId: 'task-analytics' }
    ]
  },
  {
    id: 'files',
    title: 'File & Submission Review',
    items: [
      { label: 'View Submissions', actionId: 'file-view' },
      { label: 'Verify Uploads', actionId: 'file-verify' },
      { label: 'Check Versions', actionId: 'file-versions' },
      { label: 'Submission Status', actionId: 'submission-status' },
      { label: 'Pending Submissions', actionId: 'submission-pending' }
    ]
  },
  {
    id: 'communication',
    title: 'Communication',
    items: [
      { label: 'Message Students', actionId: 'communicate-message' },
      { label: 'Send Notifications', actionId: 'communicate-notify' },
      { label: 'Guidance Notes', actionId: 'communicate-guidance' },
      { label: 'Discussion Board', actionId: 'communicate-forum' },
      { label: 'Chat History', actionId: 'communicate-history' }
    ]
  },
  {
    id: 'feedback',
    title: 'Feedback & Evaluation',
    items: [
      { label: 'Provide Feedback', actionId: 'feedback-add' },
      { label: 'Review Comments', actionId: 'feedback-review' },
      { label: 'Suggest Improvements', actionId: 'feedback-suggest' },
      { label: 'Evaluation Status', actionId: 'feedback-status' },
      { label: 'Performance Notes', actionId: 'feedback-notes' }
    ]
  },
  {
    id: 'grading',
    title: 'Grading & Marks',
    items: [
      { label: 'Assign Marks', actionId: 'grade-assign' },
      { label: 'Update Grades', actionId: 'grade-update' },
      { label: 'Approve Submission', actionId: 'grade-approve' },
      { label: 'Evaluation Summary', actionId: 'grade-summary' },
      { label: 'Grade Distribution', actionId: 'grade-distribution' }
    ]
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    items: [
      { label: 'Generate Reports', actionId: 'report-generate' },
      { label: 'Performance Analysis', actionId: 'report-performance' },
      { label: 'Completion Rates', actionId: 'report-completion' },
      { label: 'Problem Areas', actionId: 'report-problems' },
      { label: 'Export Data', actionId: 'report-export' }
    ]
  },
  {
    id: 'final-actions',
    title: 'Final Actions',
    items: [
      { label: 'Mark Complete', actionId: 'final-mark-complete' },
      { label: 'Publish Results', actionId: 'final-publish' },
      { label: 'Archive Projects', actionId: 'final-archive' },
      { label: 'Cleanup Tasks', actionId: 'final-cleanup' },
      { label: 'Final Review', actionId: 'final-review' }
    ]
  }
];

function FacultyWorkspaceSidebar({ onSectionSelect, onActionSelect }) {
  const [openSections, setOpenSections] = useState(new Set(['approval', 'monitoring']));

  const toggleSection = (sectionId) => {
    const newOpen = new Set(openSections);
    if (newOpen.has(sectionId)) {
      newOpen.delete(sectionId);
    } else {
      newOpen.add(sectionId);
    }
    setOpenSections(newOpen);
  };

  const handleSectionClick = (sectionId) => {
    toggleSection(sectionId);
    onSectionSelect(sectionId);
  };

  const handleActionClick = (actionId) => {
    onActionSelect(actionId);
  };

  return (
    <nav className="workspace-sidebar faculty-sidebar">
      <h2 className="workspace-title">Faculty Workspace</h2>

      {facultySections.map((section) => (
        <div key={section.id} className="workspace-section">
          <button
            className="workspace-menu-title"
            onClick={() => handleSectionClick(section.id)}
            aria-expanded={openSections.has(section.id)}
          >
            {section.title}
            <span className="expand-icon">{openSections.has(section.id) ? '▼' : '▶'}</span>
          </button>

          {openSections.has(section.id) && (
            <div className="workspace-submenu">
              {section.items.map((item) => (
                <button
                  key={item.actionId}
                  className="workspace-submenu-action"
                  onClick={() => handleActionClick(item.actionId)}
                  title={item.label}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="workspace-footer">
        <p className="workspace-info">Faculty Portal v1.0</p>
      </div>
    </nav>
  );
}

export default FacultyWorkspaceSidebar;
