const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { chat } = require('../controllers/ai.controller');
const rateLimit = require('express-rate-limit');

// Stricter rate limit for AI endpoint (costly API calls)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, message: 'Too many AI requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/ai/chat
router.post('/chat', authenticateToken, aiLimiter, chat);

module.exports = router;
