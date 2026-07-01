const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee.model');
const Settings = require('../models/Settings.model');
const UnitEconomics = require('../models/UnitEconomics.model');
const { requireManagerOrAbove } = require('../middleware/auth');

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

router.get('/:month?', async (req, res, next) => {
  try {
    const month = req.params.month || getCurrentMonth();
    const settings = await Settings.getSettings();
    const cadToPkr = settings.pkrPerUsd / settings.usdToCad;
    const ue = await UnitEconomics.findOne({ month }).lean();
    const closes = ue?.websitesClosedThisMonth || 0;

    const employees = await Employee.find({ isActive: true }).lean();

    const commissionEmployees = employees.map(emp => {
      const monthAdj = emp.adjustments?.filter(a => a.month === month && a.type === 'commission') || [];
      const commissionUnits = monthAdj.length > 0 ? monthAdj[0].amountPkr : 0;

      return {
        _id: emp._id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        compensationType: emp.compensationType,
        commissionPerSitePkr: emp.commissionPerSitePkr || 0,
        sitesDelivered: commissionUnits > 0 ? Math.round(commissionUnits / (emp.commissionPerSitePkr || 1)) : 0,
        totalCommissionPkr: emp.commissionPerSitePkr * (commissionUnits > 0 ? Math.round(commissionUnits / (emp.commissionPerSitePkr || 1)) : 0),
        totalCommissionCad: parseFloat(((emp.commissionPerSitePkr * (commissionUnits > 0 ? Math.round(commissionUnits / (emp.commissionPerSitePkr || 1)) : 0)) / cadToPkr).toFixed(2)),
      };
    });

    const totalCommissionPkr = commissionEmployees.reduce((s, e) => s + e.totalCommissionPkr, 0);
    const totalCommissionCad = parseFloat((totalCommissionPkr / cadToPkr).toFixed(2));

    const salesPayout = commissionEmployees.filter(e => e.department === 'Automation & Sales').reduce((s, e) => s + e.totalCommissionPkr, 0);
    const pmPayout = commissionEmployees.filter(e => e.role?.toLowerCase().includes('manager') || e.role?.toLowerCase().includes('pm')).reduce((s, e) => s + e.totalCommissionPkr, 0);
    const devPayout = commissionEmployees.filter(e => e.department === 'Development').reduce((s, e) => s + e.totalCommissionPkr, 0);

    res.json({
      success: true,
      data: {
        month,
        employees: commissionEmployees,
        summary: {
          totalCommissionPkr,
          totalCommissionCad,
          salesPayoutPkr: salesPayout,
          pmPayoutPkr: pmPayout,
          devPayoutPkr: devPayout,
          websitesClosed: closes,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update commission for an employee for a given month
router.patch('/employees/:id', requireManagerOrAbove, async (req, res, next) => {
  try {
    const { month, sitesDelivered, commissionPerSitePkr } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    if (commissionPerSitePkr !== undefined) employee.commissionPerSitePkr = commissionPerSitePkr;

    const totalPkr = (commissionPerSitePkr ?? employee.commissionPerSitePkr) * sitesDelivered;
    const existing = employee.adjustments.find(a => a.month === month && a.type === 'commission');
    if (existing) {
      existing.amountPkr = totalPkr;
    } else {
      employee.adjustments.push({ month, type: 'commission', amountPkr: totalPkr, note: `${sitesDelivered} sites @ PKR ${commissionPerSitePkr}` });
    }
    await employee.save();
    res.json({ success: true, message: 'Commission updated' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
