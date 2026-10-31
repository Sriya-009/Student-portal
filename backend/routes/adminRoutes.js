const express = require('express');
const { createAdminControllers } = require('../controllers/adminController');

function createAdminRouter({ requireRoles, ...dependencies }) {
  const router = express.Router();
  const controller = createAdminControllers(dependencies);

  router.get('/users', requireRoles('admin'), controller.listUsers);
  router.post('/users', requireRoles('admin'), controller.createUser);
  router.post('/admin/assign-student-faculty', requireRoles('admin'), controller.assignStudentFaculty);
  router.get('/admin/student-faculty-assignments', requireRoles('admin'), controller.listStudentFacultyAssignments);
  router.get('/stats/dashboard', requireRoles('admin'), controller.dashboardStats);

  return router;
}

module.exports = { createAdminRouter };
