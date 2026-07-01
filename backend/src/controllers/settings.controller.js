const Settings = require('../models/Settings.model');
const { AppError } = require('../middleware/errorHandler');

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    const cadToPkr = parseFloat((settings.pkrPerUsd / settings.usdToCad).toFixed(2));
    res.json({ success: true, data: { settings: { ...settings.toObject(), cadToPkr } } });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const allowed = ['usdToCad', 'pkrPerUsd', 'workingHoursPerMonth', 'companyName', 'companyTagline', 'aiAdvisorEnabled'];
    const updates = {};
    allowed.forEach(key => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
    updates.updatedBy = req.user._id;

    const settings = await Settings.findOneAndUpdate({}, updates, { new: true, upsert: true, runValidators: true });
    const cadToPkr = parseFloat((settings.pkrPerUsd / settings.usdToCad).toFixed(2));
    res.json({ success: true, message: 'Settings saved', data: { settings: { ...settings.toObject(), cadToPkr } } });
  } catch (error) {
    next(error);
  }
};
