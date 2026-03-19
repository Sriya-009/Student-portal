import { useState } from 'react';

function ProjectFilter({ projects, onFilterChange, activeFilter }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const stats = {
    all: projects.length,
    ongoing: projects.filter((p) => p.status === 'ongoing').length,
    completed: projects.filter((p) => p.status === 'completed').length
  };

  const filters = [
    { id: 'all', label: 'All Projects', count: stats.all },
    { id: 'ongoing', label: 'Ongoing', count: stats.ongoing },
    { id: 'completed', label: 'Completed', count: stats.completed }
  ];

  return (
    <section className="project-filter-section">
      <button
        type="button"
        className="filter-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="filter-toggle">{isExpanded ? '✕' : '»'}</span>
        <span className="filter-title">Projects</span>
      </button>

      {isExpanded && (
        <div className="filter-menu">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`filter-item ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => onFilterChange(filter.id)}
            >
              <span className="filter-label">» {filter.label}</span>
              <span className="filter-count">{filter.count}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProjectFilter;
