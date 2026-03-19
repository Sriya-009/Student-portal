import { useState } from 'react';

const sections = [
  {
    id: 'my-projects',
    title: 'My Projects',
    items: [
      'Create a new project',
      'View assigned projects',
      'View project details (title, description, deadline)',
      'Ongoing',
      'Completed'
    ]
  },
  {
    id: 'team-collaboration',
    title: 'Team Collaboration',
    items: [
      'Add/join team members',
      'Communicate with team members',
      'Coordinate with faculty'
    ]
  },
  {
    id: 'task-management',
    title: 'Task Management',
    subtitle: 'Only for project lead assigned by faculty',
    items: [
      'Create tasks within project',
      'Assign tasks to team members',
      'View assigned tasks',
      'Update task status (Pending / In Progress / Completed)',
      'Track overall project progress'
    ]
  },
  {
    id: 'file-handling',
    title: 'File Handling',
    items: [
      'Upload project files (documents, code, PPT)',
      'Update/replace files',
      'View/download files'
    ]
  },
  {
    id: 'submission',
    title: 'Submission',
    items: [
      'Submit project work',
      'Submit final project',
      'Ensure submission before deadline'
    ]
  },
  {
    id: 'feedback-evaluation',
    title: 'Feedback & Evaluation',
    items: [
      'View mentor feedback',
      'Check marks/grades',
      'Make corrections if required'
    ]
  },
  {
    id: 'documentation',
    title: 'Documentation',
    items: [
      'Maintain reports and documents',
      'Prepare presentations',
      'Organize project files'
    ]
  }
];

function ProjectWorkspaceSidebar({ onSectionSelect }) {
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
                    <li key={item}>» {item}</li>
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
