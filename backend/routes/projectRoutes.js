const express = require('express');
const { createProjectControllers } = require('../controllers/projectController');

function createProjectRouter({ requireRoles, ...dependencies }) {
  const router = express.Router();
  const controller = createProjectControllers(dependencies);

  router.get('/', controller.listProjects);
  router.post('/', requireRoles('student'), controller.createProject);
  router.delete('/:projectId', requireRoles('student', 'admin'), controller.deleteProject);
  router.get('/:projectId/tasks', controller.listProjectTasks);
  router.put('/:projectId/tasks', requireRoles('faculty', 'admin'), controller.replaceProjectTasks);
  router.get('/:projectId/feedback-corrections', controller.listFeedbackCorrections);
  router.post(
    '/:projectId/feedback-corrections',
    requireRoles('faculty', 'admin'),
    controller.createFeedbackCorrection
  );

  return router;
}

module.exports = { createProjectRouter };
