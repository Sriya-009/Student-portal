import { useState } from 'react';

const sections = [
  {
    id: 'my-projects',
    title: 'My Projects',
    items: [
      { label: 'Create a new project', action: 'create-project' },
      { label: 'Delete project', action: 'delete-project' },
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
    items: [
      { label: 'Create tasks within project', action: 'task-create' },
      { label: 'Update task status (Pending / In Progress / Completed)', action: 'task-update' },
      { label: 'Track overall project progress', action: 'task-track' }
    ]
  },
  {
    id: 'file-handling',
    title: 'File Handling',
    items: [
      { label: 'View all the files uploaded', action: 'file-view-all' },
      { label: 'Edit file', action: 'file-edit' },
      { label: 'Remove file', action: 'file-remove' }
    ]
  },
  {
    id: 'submission',
    title: 'Submission',
    items: [
      { label: 'Submit final project', action: 'submit-final' }
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
  const [openSections, setOpenSections] = useState({
    'my-projects': true,
    'task-management': true
  });

  const toggleSection = (id) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <section className="workspace-sidebar" aria-label="Project Workspace Navigation">
      <div className="workspace-sidebar-head">
        <h3>Project Workspace</h3>
      </div>

      <div className="workspace-menu">
        {sections.map((section) => {
          const isOpen = Boolean(openSections[section.id]);
          return (
            <article key={section.id} className="workspace-menu-section">
              <button
                type="button"
                className="workspace-menu-title"
                onClick={() => {
                  toggleSection(section.id);
                  onSectionSelect?.(section.id);
                }}
              >
                <span>{section.title}</span>
                <span className="workspace-chevron">{isOpen ? '▾' : '▸'}</span>
              </button>

              {section.subtitle ? (
                <p className="workspace-subtitle">{section.subtitle}</p>
              ) : null}

              {isOpen ? (
                <ul className="workspace-submenu">
                  {section.items.map((item) => (
                    <li key={item.action}>
                      <button
                        type="button"
                        className="workspace-submenu-action"
                        onClick={() => onActionSelect?.(item.action)}
                      >
                        » {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ProjectWorkspaceSidebar;
