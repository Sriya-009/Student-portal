const STORAGE_KEY = 'project_portal_store_v1';

const roleAliases = {
  faculty: 'mentor',
  mentor: 'mentor',
  admin: 'admin',
  student: 'student'
};

function normalizeRole(role) {
  return roleAliases[(role || '').toLowerCase()] || null;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function simpleHashPassword(password) {
  return btoa(unescape(encodeURIComponent(password)));
}

function verifyPassword(rawPassword, passwordHash) {
  return simpleHashPassword(rawPassword) === passwordHash;
}

function sanitizeText(text) {
  return String(text || '').replace(/[<>]/g, '').trim();
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultStore();
    }
    return JSON.parse(raw);
  } catch (error) {
    return getDefaultStore();
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getDefaultStore() {
  const adminId = 'U-ADMIN-001';
  const mentorId = 'U-MENTOR-001';
  const studentId = 'U-STUDENT-001';
  const projectId = 'PRJ-001';
  const taskId = 'TSK-001';
  const fileId = 'FIL-001';

  return {
    users: [
      {
        id: adminId,
        name: 'Portal Admin',
        email: 'admin@portal.com',
        phone: '+91 9876512345',
        role: 'admin',
        passwordHash: simpleHashPassword('admin123'),
        createdAt: nowIso(),
        active: true
      },
      {
        id: mentorId,
        name: 'Mentor One',
        email: 'mentor@portal.com',
        phone: '+91 9123456789',
        role: 'mentor',
        passwordHash: simpleHashPassword('mentor123'),
        createdAt: nowIso(),
        active: true
      },
      {
        id: studentId,
        name: 'Student One',
        email: 'student@portal.com',
        phone: '+91 9988776655',
        role: 'student',
        passwordHash: simpleHashPassword('student123'),
        createdAt: nowIso(),
        active: true
      }
    ],
    projects: [
      {
        id: projectId,
        name: 'AI Attendance System',
        description: 'Face recognition attendance tool for campus labs.',
        ownerId: studentId,
        mentorId,
        teamMemberIds: [studentId],
        status: 'ongoing',
        approvalStatus: 'approved',
        deadline: null,
        milestones: [],
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
    ],
    tasks: [
      {
        id: taskId,
        projectId,
        title: 'Build project proposal',
        description: 'Submit objective, scope, and architecture draft.',
        assignedToUserId: studentId,
        createdByUserId: mentorId,
        deadline: null,
        progressStatus: 'in_progress',
        contributionPercent: 30,
        updatedAt: nowIso()
      }
    ],
    files: [
      {
        id: fileId,
        projectId,
        fileName: 'proposal-v1.pdf',
        mimeType: 'application/pdf',
        uploadedByUserId: studentId,
        uploadedAt: nowIso(),
        versions: [
          {
            version: 1,
            fileName: 'proposal-v1.pdf',
            uploadedByUserId: studentId,
            uploadedAt: nowIso()
          }
        ],
        finalSubmission: false
      }
    ],
    messages: [],
    evaluations: [],
    notifications: [],
    projectHistory: []
  };
}

let store = loadStore();

function persist() {
  saveStore(store);
}

function addHistory(projectId, action, actorUserId, metadata = {}) {
  store.projectHistory.push({
    id: makeId('HIS'),
    projectId,
    action,
    actorUserId,
    metadata,
    createdAt: nowIso()
  });
}

function requireActor(actor) {
  if (!actor || !actor.id) {
    throw new Error('Authentication required');
  }
  return actor;
}

function requireRole(actor, allowedRoles) {
  const normalizedRole = normalizeRole(actor.role);
  if (!allowedRoles.includes(normalizedRole)) {
    throw new Error('Not authorized for this action');
  }
}

function findUserByEmail(email) {
  return store.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
}

function findProject(projectId) {
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error('Project not found');
  }
  return project;
}

function canManageProject(actor, project) {
  const role = normalizeRole(actor.role);
  if (role === 'admin') return true;
  if (role === 'mentor' && project.mentorId === actor.id) return true;
  if (role === 'student' && project.ownerId === actor.id) return true;
  return false;
}

function notifyUsers(userIds, title, body, type = 'info') {
  userIds.forEach((userId) => {
    store.notifications.push({
      id: makeId('NOTIF'),
      userId,
      title,
      body,
      type,
      read: false,
      createdAt: nowIso()
    });
  });
}

export function registerUser({ name, email, phone, password, role }) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    throw new Error('Role must be student, mentor, or admin');
  }

  if (findUserByEmail(email)) {
    throw new Error('User already exists');
  }

  const user = {
    id: makeId('USR'),
    name: sanitizeText(name),
    email: sanitizeText(email).toLowerCase(),
    phone: sanitizeText(phone),
    role: normalizedRole,
    passwordHash: simpleHashPassword(password),
    createdAt: nowIso(),
    active: true
  };

  store.users.push(user);
  persist();

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function loginWithCredentials({ identifier, password }) {
  const normalizedIdentifier = sanitizeText(identifier).toLowerCase();
  const user = store.users.find(
    (item) => (item.email.toLowerCase() === normalizedIdentifier || item.id.toLowerCase() === normalizedIdentifier)
      && verifyPassword(password, item.passwordHash)
      && item.active
  );

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function updateProfile(actor, profilePatch) {
  const currentUser = requireActor(actor);
  const user = store.users.find((item) => item.id === currentUser.id);
  if (!user) {
    throw new Error('User not found');
  }

  user.name = sanitizeText(profilePatch.name ?? user.name);
  user.phone = sanitizeText(profilePatch.phone ?? user.phone);
  user.updatedAt = nowIso();

  persist();

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function createProject(actor, payload) {
  const currentUser = requireActor(actor);
  const role = normalizeRole(currentUser.role);
  if (!['student', 'mentor', 'admin'].includes(role)) {
    throw new Error('Not authorized to create projects');
  }

  const project = {
    id: makeId('PRJ'),
    name: sanitizeText(payload.name),
    description: sanitizeText(payload.description),
    ownerId: payload.ownerId || currentUser.id,
    mentorId: payload.mentorId || null,
    teamMemberIds: Array.isArray(payload.teamMemberIds) ? payload.teamMemberIds : [currentUser.id],
    status: 'ongoing',
    approvalStatus: role === 'admin' ? 'approved' : 'pending',
    deadline: payload.deadline || null,
    milestones: Array.isArray(payload.milestones) ? payload.milestones : [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  store.projects.push(project);
  addHistory(project.id, 'PROJECT_CREATED', currentUser.id, { name: project.name });

  if (project.mentorId) {
    notifyUsers([project.mentorId], 'Mentor Assigned', `You are assigned to ${project.name}.`);
  }

  persist();
  return deepClone(project);
}

export function updateProject(actor, projectId, patch) {
  const currentUser = requireActor(actor);
  const project = findProject(projectId);

  if (!canManageProject(currentUser, project)) {
    throw new Error('Not authorized to update this project');
  }

  project.name = sanitizeText(patch.name ?? project.name);
  project.description = sanitizeText(patch.description ?? project.description);
  project.status = patch.status || project.status;
  project.updatedAt = nowIso();

  addHistory(project.id, 'PROJECT_UPDATED', currentUser.id, { patch });
  persist();
  return deepClone(project);
}

export function assignTeamMembers(actor, projectId, memberIds) {
  const currentUser = requireActor(actor);
  const project = findProject(projectId);

  if (!canManageProject(currentUser, project)) {
    throw new Error('Not authorized to assign team members');
  }

  project.teamMemberIds = Array.from(new Set(memberIds));
  project.updatedAt = nowIso();

  addHistory(project.id, 'TEAM_ASSIGNED', currentUser.id, { memberIds: project.teamMemberIds });
  notifyUsers(project.teamMemberIds, 'Task Assignment Update', `You were assigned to project ${project.name}.`);
  persist();

  return deepClone(project);
}

export function assignMentor(actor, projectId, mentorUserId) {
  const currentUser = requireActor(actor);
  requireRole(currentUser, ['admin']);

  const mentor = store.users.find((item) => item.id === mentorUserId && normalizeRole(item.role) === 'mentor');
  if (!mentor) {
    throw new Error('Mentor user not found');
  }

  const project = findProject(projectId);
  project.mentorId = mentorUserId;
  project.updatedAt = nowIso();

  addHistory(project.id, 'MENTOR_ASSIGNED', currentUser.id, { mentorUserId });
  notifyUsers([mentorUserId], 'Mentor Assigned', `You were assigned as mentor for ${project.name}.`);
  persist();

  return deepClone(project);
}

export function setProjectSchedule(actor, projectId, { deadline, milestones = [] }) {
  const currentUser = requireActor(actor);
  const project = findProject(projectId);

  if (!canManageProject(currentUser, project)) {
    throw new Error('Not authorized to update deadlines and milestones');
  }

  project.deadline = deadline || project.deadline;
  project.milestones = milestones;
  project.updatedAt = nowIso();

  addHistory(project.id, 'SCHEDULE_UPDATED', currentUser.id, { deadline, milestones });
  notifyUsers(project.teamMemberIds, 'Project Deadline Updated', `${project.name} schedule was updated.`);
  persist();

  return deepClone(project);
}

export function setProjectStatus(actor, projectId, status) {
  const currentUser = requireActor(actor);
  const project = findProject(projectId);

  if (!canManageProject(currentUser, project)) {
    throw new Error('Not authorized to update project status');
  }

  project.status = status;
  project.updatedAt = nowIso();

  addHistory(project.id, 'STATUS_UPDATED', currentUser.id, { status });
  persist();
  return deepClone(project);
}

export function createTask(actor, payload) {
  const currentUser = requireActor(actor);
  const project = findProject(payload.projectId);

  if (!canManageProject(currentUser, project)) {
    throw new Error('Not authorized to create tasks for this project');
  }

  const task = {
    id: makeId('TSK'),
    projectId: payload.projectId,
    title: sanitizeText(payload.title),
    description: sanitizeText(payload.description),
    assignedToUserId: payload.assignedToUserId,
    createdByUserId: currentUser.id,
    deadline: payload.deadline || null,
    progressStatus: 'pending',
    contributionPercent: 0,
    updatedAt: nowIso()
  };

  store.tasks.push(task);
  addHistory(task.projectId, 'TASK_CREATED', currentUser.id, { taskId: task.id });
  notifyUsers([task.assignedToUserId], 'New Task Assigned', `Task: ${task.title}`);
  persist();

  return deepClone(task);
}

export function assignTask(actor, taskId, assignedToUserId) {
  const currentUser = requireActor(actor);
  const task = store.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const project = findProject(task.projectId);
  if (!canManageProject(currentUser, project)) {
    throw new Error('Not authorized to reassign task');
  }

  task.assignedToUserId = assignedToUserId;
  task.updatedAt = nowIso();

  addHistory(project.id, 'TASK_ASSIGNED', currentUser.id, { taskId, assignedToUserId });
  notifyUsers([assignedToUserId], 'Task Reassigned', `You are now assigned task ${task.title}.`);
  persist();

  return deepClone(task);
}

export function updateTaskProgress(actor, taskId, progressStatus, contributionPercent = null) {
  const currentUser = requireActor(actor);
  const task = store.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const project = findProject(task.projectId);
  const role = normalizeRole(currentUser.role);
  const canUpdate = role === 'admin'
    || (role === 'mentor' && project.mentorId === currentUser.id)
    || (role === 'student' && task.assignedToUserId === currentUser.id);

  if (!canUpdate) {
    throw new Error('Not authorized to update this task');
  }

  task.progressStatus = progressStatus;
  if (typeof contributionPercent === 'number') {
    task.contributionPercent = Math.max(0, Math.min(100, contributionPercent));
  }
  task.updatedAt = nowIso();

  addHistory(project.id, 'TASK_PROGRESS_UPDATED', currentUser.id, { taskId, progressStatus });
  notifyUsers(project.mentorId ? [project.mentorId] : [], 'Task Progress Updated', `${task.title} is now ${progressStatus}.`);
  persist();

  return deepClone(task);
}

export function trackIndividualContributions(projectId) {
  const projectTasks = store.tasks.filter((task) => task.projectId === projectId);
  const contributions = {};

  projectTasks.forEach((task) => {
    const key = task.assignedToUserId;
    contributions[key] = (contributions[key] || 0) + (task.contributionPercent || 0);
  });

  return contributions;
}

export function calculateProjectProgress(projectId) {
  const projectTasks = store.tasks.filter((task) => task.projectId === projectId);
  if (projectTasks.length === 0) {
    return 0;
  }

  const completed = projectTasks.filter((task) => task.progressStatus === 'completed').length;
  return Math.round((completed / projectTasks.length) * 100);
}

export function getDashboardSummary() {
  const totalProjects = store.projects.length;
  const completedTasks = store.tasks.filter((task) => task.progressStatus === 'completed').length;
  const pendingTasks = store.tasks.filter((task) => task.progressStatus !== 'completed').length;

  const progressPercentages = store.projects.map((project) => calculateProjectProgress(project.id));
  const progressAverage = progressPercentages.length
    ? Math.round(progressPercentages.reduce((a, b) => a + b, 0) / progressPercentages.length)
    : 0;

  return {
    totalProjects,
    completedTasks,
    pendingTasks,
    progressAverage
  };
}

export function uploadProjectFile(actor, { projectId, fileName, mimeType }) {
  const currentUser = requireActor(actor);
  const project = findProject(projectId);

  if (!canManageProject(currentUser, project) && !project.teamMemberIds.includes(currentUser.id)) {
    throw new Error('Not authorized to upload files for this project');
  }

  const existingFile = store.files.find((file) => file.projectId === projectId && file.fileName === fileName);
  if (existingFile) {
    const nextVersion = existingFile.versions.length + 1;
    existingFile.versions.push({
      version: nextVersion,
      fileName,
      uploadedByUserId: currentUser.id,
      uploadedAt: nowIso()
    });
    existingFile.uploadedByUserId = currentUser.id;
    existingFile.uploadedAt = nowIso();
    persist();
    return deepClone(existingFile);
  }

  const newFile = {
    id: makeId('FIL'),
    projectId,
    fileName: sanitizeText(fileName),
    mimeType,
    uploadedByUserId: currentUser.id,
    uploadedAt: nowIso(),
    versions: [
      {
        version: 1,
        fileName,
        uploadedByUserId: currentUser.id,
        uploadedAt: nowIso()
      }
    ],
    finalSubmission: false
  };

  store.files.push(newFile);
  persist();
  return deepClone(newFile);
}

export function submitFinalProject(actor, projectId) {
  const currentUser = requireActor(actor);
  const project = findProject(projectId);

  if (project.ownerId !== currentUser.id && !project.teamMemberIds.includes(currentUser.id)) {
    throw new Error('Only project team can make final submission');
  }

  const projectFiles = store.files.filter((file) => file.projectId === projectId);
  projectFiles.forEach((file) => {
    file.finalSubmission = true;
  });

  addHistory(projectId, 'FINAL_SUBMISSION', currentUser.id, { fileCount: projectFiles.length });
  notifyUsers(project.mentorId ? [project.mentorId] : [], 'Final Submission Received', `${project.name} has been submitted.`);
  persist();

  return {
    projectId,
    submittedFiles: projectFiles.length,
    submittedAt: nowIso()
  };
}

export function getSubmittedFiles(projectId) {
  return store.files.filter((file) => file.projectId === projectId).map((file) => deepClone(file));
}

export function sendMessage(actor, { toUserId, projectId, content }) {
  const currentUser = requireActor(actor);
  const message = {
    id: makeId('MSG'),
    fromUserId: currentUser.id,
    toUserId,
    projectId: projectId || null,
    content: sanitizeText(content),
    sentAt: nowIso(),
    read: false
  };

  store.messages.push(message);
  notifyUsers([toUserId], 'New Message', 'You have a new portal message.');
  persist();

  return deepClone(message);
}

export function getMessagesForUser(userId) {
  return store.messages
    .filter((item) => item.fromUserId === userId || item.toUserId === userId)
    .map((item) => deepClone(item));
}

export function getNotifications(userId) {
  return store.notifications
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((item) => deepClone(item));
}

export function markNotificationRead(actor, notificationId) {
  const currentUser = requireActor(actor);
  const notification = store.notifications.find((item) => item.id === notificationId && item.userId === currentUser.id);
  if (!notification) {
    throw new Error('Notification not found');
  }

  notification.read = true;
  persist();
  return deepClone(notification);
}

export function reviewProject(actor, { projectId, comments, marks, grade }) {
  const currentUser = requireActor(actor);
  requireRole(currentUser, ['mentor', 'admin']);

  const project = findProject(projectId);
  if (normalizeRole(currentUser.role) === 'mentor' && project.mentorId !== currentUser.id) {
    throw new Error('Only assigned mentor can review this project');
  }

  const evaluation = {
    id: makeId('EVAL'),
    projectId,
    reviewerUserId: currentUser.id,
    comments: sanitizeText(comments),
    marks: Number(marks),
    grade: sanitizeText(grade),
    status: 'reviewed',
    reviewedAt: nowIso()
  };

  store.evaluations.push(evaluation);
  addHistory(projectId, 'PROJECT_REVIEWED', currentUser.id, { marks: evaluation.marks, grade: evaluation.grade });
  notifyUsers(project.teamMemberIds, 'Project Reviewed', `${project.name} has new feedback.`);
  persist();

  return deepClone(evaluation);
}

export function getEvaluationStatus(projectId) {
  const evaluations = store.evaluations.filter((item) => item.projectId === projectId);
  return {
    status: evaluations.length ? 'reviewed' : 'pending',
    evaluations: deepClone(evaluations)
  };
}

export function getProjectHistory(projectId) {
  return store.projectHistory
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((item) => deepClone(item));
}

export function searchProjects(query) {
  const needle = sanitizeText(query).toLowerCase();
  return store.projects.filter((project) => {
    const haystack = `${project.name} ${project.description}`.toLowerCase();
    return haystack.includes(needle);
  }).map((project) => deepClone(project));
}

export function filterProjects({ status, mentorId, deadlineBefore } = {}) {
  return store.projects.filter((project) => {
    if (status && project.status !== status) return false;
    if (mentorId && project.mentorId !== mentorId) return false;
    if (deadlineBefore && project.deadline && new Date(project.deadline) > new Date(deadlineBefore)) return false;
    return true;
  }).map((project) => deepClone(project));
}

export function approveOrRejectProject(actor, projectId, approvalStatus) {
  const currentUser = requireActor(actor);
  requireRole(currentUser, ['admin']);

  const project = findProject(projectId);
  project.approvalStatus = approvalStatus;
  project.updatedAt = nowIso();

  addHistory(project.id, 'PROJECT_APPROVAL_UPDATED', currentUser.id, { approvalStatus });
  notifyUsers([project.ownerId], 'Project Approval Updated', `${project.name} is now ${approvalStatus}.`);
  persist();

  return deepClone(project);
}

export function manageUsers(actor, action, userPayload) {
  const currentUser = requireActor(actor);
  requireRole(currentUser, ['admin']);

  if (action === 'add') {
    return registerUser(userPayload);
  }

  if (action === 'remove') {
    const index = store.users.findIndex((item) => item.id === userPayload.userId);
    if (index === -1) {
      throw new Error('User not found');
    }
    const [removed] = store.users.splice(index, 1);
    persist();

    const { passwordHash, ...safeRemoved } = removed;
    return safeRemoved;
  }

  throw new Error('Unsupported user management action');
}

export function monitorProjects(actor) {
  const currentUser = requireActor(actor);
  requireRole(currentUser, ['admin']);

  return store.projects.map((project) => ({
    ...deepClone(project),
    progressPercent: calculateProjectProgress(project.id),
    taskCount: store.tasks.filter((task) => task.projectId === project.id).length
  }));
}

export function generateReports(actor) {
  const currentUser = requireActor(actor);
  requireRole(currentUser, ['admin', 'mentor']);

  const projectPerformance = store.projects.map((project) => ({
    projectId: project.id,
    projectName: project.name,
    status: project.status,
    progressPercent: calculateProjectProgress(project.id)
  }));

  const studentParticipation = store.users
    .filter((user) => normalizeRole(user.role) === 'student')
    .map((user) => {
      const taskCount = store.tasks.filter((task) => task.assignedToUserId === user.id).length;
      const completed = store.tasks.filter(
        (task) => task.assignedToUserId === user.id && task.progressStatus === 'completed'
      ).length;
      return {
        userId: user.id,
        studentName: user.name,
        assignedTasks: taskCount,
        completedTasks: completed
      };
    });

  const completionStats = {
    totalProjects: store.projects.length,
    completedProjects: store.projects.filter((project) => project.status === 'completed').length,
    ongoingProjects: store.projects.filter((project) => project.status === 'ongoing').length
  };

  return {
    generatedAt: nowIso(),
    projectPerformance,
    studentParticipation,
    completionStats
  };
}

export function listProjects() {
  return deepClone(store.projects);
}

export function listTasks(projectId = null) {
  return deepClone(projectId ? store.tasks.filter((task) => task.projectId === projectId) : store.tasks);
}

export function listUsers() {
  return store.users.map(({ passwordHash, ...safeUser }) => deepClone(safeUser));
}

export function resetProjectPortalStore() {
  store = getDefaultStore();
  persist();
  return true;
}
