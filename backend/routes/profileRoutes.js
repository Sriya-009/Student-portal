const express = require('express');
const { createProfileControllers } = require('../controllers/profileController');

function createProfileRouter(dependencies) {
  const router = express.Router();
  const controller = createProfileControllers(dependencies);
  router.get('/:identifier', controller.getProfile);
  router.patch('/:identifier', controller.patchProfile);
  return router;
}

module.exports = { createProfileRouter };
