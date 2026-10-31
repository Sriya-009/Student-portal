const express = require('express');
const { createProjectFileControllers } = require('../controllers/projectFileController');

function createProjectFileRouter(dependencies) {
  const router = express.Router({ mergeParams: true });
  const {
    requireRoles,
    validateProjectUploadIdentifiers,
    authorizeProjectUpload,
    projectFileUpload,
    ...controllerDependencies
  } = dependencies;
  const controller = createProjectFileControllers(controllerDependencies);

  router.get('/', controller.listProjectFiles);
  router.post(
    '/:fileId/content',
    requireRoles('student', 'faculty', 'admin'),
    validateProjectUploadIdentifiers,
    authorizeProjectUpload,
    projectFileUpload.single('file'),
    controller.uploadProjectFileContent
  );
  router.get('/:fileId/content', controller.downloadProjectFileContent);
  router.put('/', requireRoles('student', 'faculty', 'admin'), controller.replaceProjectFiles);

  return router;
}

module.exports = { createProjectFileRouter };
