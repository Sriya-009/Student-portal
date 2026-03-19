const sections = [
  {
    id: 'my-projects',
    title: 'My Projects',
    items: [
      { label: 'Create a new project', action: 'create-project' },
      { label: 'View assigned projects', action: 'view-assigned' },
      { label: 'View project details (title, description, deadline)', action: 'view-details' },
      { label: 'Ongoing', action: 'filter-ongoing' },
      { label: 'Completed', action: 'filter-completed' }
    ]
  },
  {
    id: 'team-collaboration',
    title: 'Team Collaboration',
    items: [
      { label: 'Add/join team members', action: 'team-add-join' },
      { label: 'Communicate with team members', action: 'team-communicate' },
      { label: 'Coordinate with faculty', action: 'team-coordinate-faculty' }
    ]
  },
  {
    id: 'task-management',
    title: 'Task Management',
    subtitle: 'Only for project lead assigned by faculty',
    items: [
      { label: 'Create tasks within project', action: 'task-create' },
      { label: 'Assign tasks to team members', action: 'task-assign' },
      { label: 'View assigned tasks', action: 'task-view' },
      { label: 'Update task status (Pending / In Progress / Completed)', action: 'task-update' },
      { label: 'Track overall project progress', action: 'task-track' }
    ]
  },
  {
    id: 'file-handling',
    title: 'File Handling',
    items: [
      { label: 'Upload project files (documents, code, PPT)', action: 'file-upload' },
      { label: 'Update/replace files', action: 'file-update' },
      { label: 'View/download files', action: 'file-view' }
    ]
  },
  {
    id: 'submission',
    title: 'Submission',
    items: [
      { label: 'Submit project work', action: 'submit-work' },
      { label: 'Submit final project', action: 'submit-final' },
      { label: 'Ensure submission before deadline', action: 'submit-before-deadline' }
    ]
  },
  {
    id: 'feedback-evaluation',
    title: 'Feedback & Evaluation',
    items: [
      { label: 'View mentor feedback', action: 'feedback-view' },
      { label: 'Check marks/grades', action: 'feedback-check' },
      { label: 'Make corrections if required', action: 'feedback-corrections' }
    ]
  },
  {
    id: 'documentation',
    title: 'Documentation',
    items: [
      { label: 'Maintain reports and documents', action: 'docs-maintain' },
      { label: 'Prepare presentations', action: 'docs-prepare' },
      { label: 'Organize project files', action: 'docs-organize' }
    ]
  }
];

function ProjectWorkspaceSidebar({ onSectionSelect, onActionSelect }) {
  return (
    <section className="workspace-sidebar" aria-label="Project Workspace Navigation">
      <div className="workspace-sidebar-head">
        <h3>Project Workspace</h3>
      </div>

      <div className="workspace-menu">
        {sections.map((section) => {
          return (
            <article key={section.id} className="workspace-menu-section">
              <button
                type="button"
                className="workspace-menu-title"
                onClick={() => {
                  onSectionSelect?.(section.id);
                }}
              >
                <span>{section.title}</span>
              </button>

              {section.subtitle ? (
                <p className="workspace-subtitle">{section.subtitle}</p>
              ) : null}

              <ul className="workspace-submenu">
                {section.items.map((item) => (
                  <li key={item.action}>
                    <button
                      type="button"
                      className="workspace-submenu-action"
                      onClick={() => onActionSelect?.(item.action)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ProjectWorkspaceSidebar;
