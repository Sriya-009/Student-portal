import { useState } from 'react';
import { createStudentProject } from '../../services/authService';

function ProjectCreateModal({ isOpen, ownerIdentifier, onClose, onProjectCreated, department }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline: '',
    technologies: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Project title is required');
      return;
    }

    setIsLoading(true);
    try {
      const newProject = await createStudentProject({
        name: formData.name.trim(),
        description: formData.description.trim(),
        deadline: formData.deadline ? formData.deadline.trim() : '',
        ownerIdentifier,
        department: department || ''
      });

      onProjectCreated(newProject);
      setFormData({
        name: '',
        description: '',
        deadline: '',
        technologies: ''
      });
      onClose();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-head">
          <div>
            <h3>Create New Project</h3>
            <p>Add a new project to your workspace</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        <label htmlFor="projectName">Project Title *</label>
        <input
          id="projectName"
          type="text"
          name="name"
          placeholder="e.g., E-Commerce Platform, AI Chatbot"
          value={formData.name}
          onChange={handleChange}
          disabled={isLoading}
          required
        />

        <label htmlFor="projectDescription">Description</label>
        <textarea
          id="projectDescription"
          name="description"
          placeholder="Briefly describe your project, objectives, and scope..."
          value={formData.description}
          onChange={handleChange}
          disabled={isLoading}
          rows={4}
        />

        <label htmlFor="projectDeadline">Deadline (YYYY-MM-DD)</label>
        <input
          id="projectDeadline"
          type="date"
          name="deadline"
          value={formData.deadline}
          onChange={handleChange}
          disabled={isLoading}
        />

        <label htmlFor="projectTechnologies">Technologies / Stack (optional)</label>
        <input
          id="projectTechnologies"
          type="text"
          name="technologies"
          placeholder="e.g., React, Node.js, MongoDB"
          value={formData.technologies}
          onChange={handleChange}
          disabled={isLoading}
        />

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-dark-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectCreateModal;
