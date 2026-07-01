// unitEconomics.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/unitEconomics.controller');
const { requireManagerOrAbove } = require('../middleware/auth');

router.get('/:month?', ctrl.getUnitEconomics);
router.put('/:month?', requireManagerOrAbove, ctrl.saveUnitEconomics);

module.exports = router;
