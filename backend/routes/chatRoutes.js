const express = require('express');
const { createChatController } = require('../controllers/chatController');

function createChatRouter({ requireRoles, chatRateLimiter, requestChatCompletion }) {
  const router = express.Router();
  router.post(
    '/',
    requireRoles('student', 'faculty', 'admin'),
    chatRateLimiter,
    createChatController({ requestChatCompletion })
  );
  return router;
}

module.exports = { createChatRouter };
