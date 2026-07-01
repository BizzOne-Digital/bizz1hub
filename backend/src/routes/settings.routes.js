const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { requireAdmin } = require('../middleware/auth');

router.get('/', settingsController.getSettings);
router.patch('/', requireAdmin, settingsController.updateSettings);

module.exports = router;
