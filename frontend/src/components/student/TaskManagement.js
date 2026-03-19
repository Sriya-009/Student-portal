import { useState, useMemo, useEffect } from 'react';

function TaskManagement({ projectId, projectLeadId, currentUserId, teamMembers, projectTasks, onTasksUpdate, projectName, actionMode }) {
  const [tasks, setTasks] = useState(projectTasks || []);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedToId: '',
    deadline: ''
  });

  const isProjectLead = projectLeadId === currentUserId;
  const projectTasksFiltered = tasks.filter((t) => t.projectId === projectId);

  useEffect(() => {
    if (!actionMode) return;
    if ((actionMode === 'task-create' || actionMode === 'task-assign') && isProjectLead) {
      setShowCreateForm(true);
    }
  }, [actionMode, isProjectLead]);

  const taskStats = useMemo(() => {
    const pending = projectTasksFiltered.filter((t) => t.status === 'pending').length;
    const inProgress = projectTasksFiltered.filter((t) => t.status === 'in_progress').length;
    const completed = projectTasksFiltered.filter((t) => t.status === 'completed').length;
    return { pending, inProgress, completed, total: projectTasksFiltered.length };
  }, [projectTasksFiltered]);

  const contributions = useMemo(() => {
    const contribMap = {};
    projectTasksFiltered.forEach((task) => {
      const key = task.assignedToId;
      if (!contribMap[key]) {
        contribMap[key] = {
          name: task.assignedToName,
          totalContribution: 0,
          taskCount: 0
        };
      }
      contribMap[key].totalContribution += task.contributionPercent;
      contribMap[key].taskCount += 1;
    });
    return contribMap;
  }, [projectTasksFiltered]);

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      alert('Task title is required');
      return;
    }

    const task = {
      id: `TSK-${Date.now()}`,
      projectId,
      title: newTask.title,
      description: newTask.description,
      assignedToId: newTask.assignedToId,
      assignedToName: teamMembers.find((m) => m.id === newTask.assignedToId)?.name || 'Unassigned',
      createdByLeadId: currentUserId,
      deadline: newTask.deadline,
      status: 'pending',
      contributionPercent: 0,
      createdDate: new Date().toISOString().split('T')[0]
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    onTasksUpdate?.(updatedTasks);
    setNewTask({ title: '', description: '', assignedToId: '', deadline: '' });
    setShowCreateForm(false);
  };

  const handleUpdateTaskStatus = (taskId, newStatus) => {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    setTasks(updatedTasks);
    onTasksUpdate?.(updatedTasks);
  };

  const handleUpdateContribution = (taskId, percent) => {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, contributionPercent: Math.min(100, Math.max(0, percent)) } : t
    );
    setTasks(updatedTasks);
    onTasksUpdate?.(updatedTasks);
  };

  const handleReassignTask = (taskId, newAssigneeId) => {
    const newAssignee = teamMembers.find((m) => m.id === newAssigneeId);
    const updatedTasks = tasks.map((t) =>
      t.id === taskId
        ? { ...t, assignedToId: newAssigneeId, assignedToName: newAssignee?.name || 'Unassigned' }
        : t
    );
    setTasks(updatedTasks);
    onTasksUpdate?.(updatedTasks);
  };

  if (!isProjectLead) {
    return (
      <div className="task-management-restricted">
        <p>✓ Task management is available only to the project lead.</p>
      </div>
    );
  }

  return (
    <div className="task-management">
      <div className="task-header">
        <h3>Task Management</h3>
        <button type="button" className="primary-dark-btn" onClick={() => setShowCreateForm(true)}>
          + Create New Task
        </button>
      </div>

      {actionMode ? (
        <p className="workspace-notice">
          {actionMode === 'task-create' && 'Create a new task for this project.'}
          {actionMode === 'task-assign' && 'Assign tasks to team members from the task list.'}
          {actionMode === 'task-view' && 'Viewing current assigned project tasks.'}
          {actionMode === 'task-update' && 'Update task status for ongoing work.'}
          {actionMode === 'task-track' && 'Track task-level progress and contribution.'}
        </p>
      ) : null}

      <section className="task-stats">
        <article className="task-stat-card">
          <h5>Total Tasks</h5>
          <strong>{taskStats.total}</strong>
        </article>
        <article className="task-stat-card">
          <h5>Pending</h5>
          <strong className="pending">{taskStats.pending}</strong>
        </article>
        <article className="task-stat-card">
          <h5>In Progress</h5>
          <strong className="progress">{taskStats.inProgress}</strong>
        </article>
        <article className="task-stat-card">
          <h5>Completed</h5>
          <strong className="completed">{taskStats.completed}</strong>
        </article>
      </section>

      <section className="task-list">
        <h4>Project Tasks</h4>
        {projectTasksFiltered.length === 0 ? (
          <p className="no-tasks">No tasks created yet. Create your first task to get started.</p>
        ) : (
          <div className="tasks-container">
            {projectTasksFiltered.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-item-head">
                  <div>
                    <h5>{task.title}</h5>
                    <p className="task-description">{task.description}</p>
                  </div>
                  <span className={`task-status ${task.status}`}>{task.status.replace('_', ' ')}</span>
                </div>

                <div className="task-item-meta">
                  <div className="meta-row">
                    <label>Assigned to:</label>
                    {isProjectLead ? (
                      <select
                        value={task.assignedToId}
                        onChange={(e) => handleReassignTask(task.id, e.target.value)}
                        className="task-reassign-select"
                      >
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span>{task.assignedToName}</span>
                    )}
                  </div>

                  {task.deadline && (
                    <div className="meta-row">
                      <label>Deadline:</label>
                      <span>{new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}

                  <div className="meta-row">
                    <label>Contribution:</label>
                    <div className="contribution-control">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={task.contributionPercent}
                        onChange={(e) => handleUpdateContribution(task.id, Number(e.target.value))}
                        className="contribution-input"
                        disabled={!isProjectLead}
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>

                <div className="task-actions">
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                    className="task-status-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="team-contributions">
        <h4>Team Member Contributions</h4>
        <div className="contributions-grid">
          {Object.entries(contributions).length === 0 ? (
            <p className="no-contributions">No tasks assigned yet.</p>
          ) : (
            Object.entries(contributions).map(([memberId, data]) => (
              <div key={memberId} className="contribution-card">
                <div className="contribution-head">
                  <strong>{data.name}</strong>
                </div>
                <div className="contribution-stats">
                  <span>Tasks Assigned: {data.taskCount}</span>
                  <span>Contribution: {data.totalContribution}%</span>
                </div>
                <div className="contribution-bar">
                  <div className="contribution-fill" style={{ width: `${data.totalContribution}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showCreateForm ? (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleCreateTask}>
            <div className="modal-head">
              <div>
                <h3>Create New Task</h3>
                <p>Add a task to your project</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowCreateForm(false)}>✕</button>
            </div>

            <label htmlFor="taskTitle">Task Title *</label>
            <input
              id="taskTitle"
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g., Database Schema Design"
              required
            />

            <label htmlFor="taskDesc">Description</label>
            <textarea
              id="taskDesc"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Task details and requirements"
              rows="3"
            />

            <label htmlFor="taskAssign">Assign To *</label>
            <select
              id="taskAssign"
              value={newTask.assignedToId}
              onChange={(e) => setNewTask({ ...newTask, assignedToId: e.target.value })}
              required
            >
              <option value="">Select team member</option>
              {teamMembers.filter((m) => m.id !== currentUserId || teamMembers.length === 1).map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>

            <label htmlFor="taskDeadline">Deadline</label>
            <input
              id="taskDeadline"
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
            />

            <div className="modal-actions">
              <button type="button" className="outline-btn" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="primary-dark-btn">Create Task</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default TaskManagement;
