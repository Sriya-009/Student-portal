const express = require('express');
const { createProfilePhotoControllers } = require('../controllers/profilePhotoController');

function createProfilePhotoRouters({ uploadMiddleware, ...dependencies }) {
  const controller = createProfilePhotoControllers(dependencies);
  const uploadRouter = express.Router();
  uploadRouter.post('/:identifier', uploadMiddleware.single('profilePhoto'), controller.uploadProfilePhoto);
  const photoRouter = express.Router();
  photoRouter.get('/:identifier', controller.getProfilePhoto);
  photoRouter.delete('/:identifier', controller.deleteProfilePhoto);
  return { uploadRouter, photoRouter };
}

module.exports = { createProfilePhotoRouters };
