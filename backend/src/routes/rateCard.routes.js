const express = require('express');
const router = express.Router();
const RateCard = require('../models/RateCard.model');
const Employee = require('../models/Employee.model');
const Settings = require('../models/Settings.model');
const { requireManagerOrAbove } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    let rateCard = await RateCard.findOne();
    if (!rateCard) rateCard = await RateCard.create({});

    const settings = await Settings.getSettings();
    const cadToPkr = settings.pkrPerUsd / settings.usdToCad;
    const employees = await Employee.find({ isActive: true }).lean();

    const enrichedEmployees = employees.map(emp => ({
      ...emp,
      baseSalaryCad: parseFloat((emp.baseSalaryPkr / cadToPkr).toFixed(2)),
      costPerClientCad: emp.clientsPerPersonPerMonth > 0
        ? parseFloat((emp.baseSalaryPkr / cadToPkr / emp.clientsPerPersonPerMonth).toFixed(2))
        : 0,
    }));

    res.json({
      success: true,
      data: {
        rateCard: { ...rateCard.toJSON(), effectiveMarginPercent: rateCard.effectiveMarginPercent },
        employees: enrichedEmployees,
        settings: { cadToPkr, workingHoursPerMonth: settings.workingHoursPerMonth },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/', requireManagerOrAbove, async (req, res, next) => {
  try {
    const updates = { ...req.body, updatedBy: req.user._id };
    const rateCard = await RateCard.findOneAndUpdate({}, updates, { new: true, upsert: true, runValidators: true });
    res.json({ success: true, message: 'Rate card saved', data: { rateCard } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
