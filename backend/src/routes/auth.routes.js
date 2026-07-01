const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

// Authenticated
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getMe);
router.patch('/change-password', authenticateToken, authController.changePassword);

// Admin only
router.post('/users', authenticateToken, requireAdmin, authController.createUser);
router.get('/users', authenticateToken, requireAdmin, authController.getAllUsers);
router.patch('/users/:id', authenticateToken, requireAdmin, authController.updateUser);
router.patch('/users/:id/reset-password', authenticateToken, requireAdmin, authController.resetUserPassword);

module.exports = router;
