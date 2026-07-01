const UnitEconomics = require('../models/UnitEconomics.model');
const Employee = require('../models/Employee.model');
const Settings = require('../models/Settings.model');
const { AppError } = require('../middleware/errorHandler');

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

exports.getUnitEconomics = async (req, res, next) => {
  try {
    const month = req.params.month || getCurrentMonth();
    let data = await UnitEconomics.findOne({ month });

    if (!data) {
      // Auto-create with defaults
      data = await UnitEconomics.create({ month, updatedBy: req.user._id });
    }

    const settings = await Settings.getSettings();
    const cadToPkr = settings.pkrPerUsd / settings.usdToCad;

    // Pull payroll from employees
    const employees = await Employee.find({ isActive: true }).lean();
    const totalPayrollPkr = employees.reduce((s, e) => s + e.baseSalaryPkr, 0);
    const totalPayrollCad = parseFloat((totalPayrollPkr / cadToPkr).toFixed(2));

    // Commission variable costs
    const commissionEmployees = employees.filter(e => e.compensationType === 'commission');
    const variableCostCad = commissionEmployees.reduce((s, e) => {
      return s + (e.commissionPerSitePkr * data.websitesClosedThisMonth) / cadToPkr;
    }, 0);

    // Calculations
    const closes = data.websitesClosedThisMonth;
    const blendedRevPerSite = parseFloat(
      (data.standardPriceCad + data.upsellPriceCad * (data.upsellRatePercent / 100)).toFixed(2)
    );
    const totalRevenue = parseFloat((blendedRevPerSite * closes).toFixed(2));
    const monthlyAdSpend = parseFloat((data.dailyAdSpendCad * 30).toFixed(2));
    const totalFixed = parseFloat((data.otherAdsCad + data.aiToolsCad + data.softwareOverheadCad + data.otherFixedCostsCad + totalPayrollCad).toFixed(2));
    const totalVariable = parseFloat((variableCostCad + monthlyAdSpend).toFixed(2));
    const netProfit = parseFloat((totalRevenue - totalFixed - totalVariable).toFixed(2));
    const contributionMargin = blendedRevPerSite > 0
      ? parseFloat((((blendedRevPerSite - (totalVariable / closes || 0)) / blendedRevPerSite) * 100).toFixed(1))
      : -9999;
    const adCac = closes > 0 ? parseFloat((monthlyAdSpend / closes).toFixed(2)) : 0;
    const breakEven = (blendedRevPerSite - (variableCostCad / (closes || 1))) > 0
      ? Math.ceil(totalFixed / (blendedRevPerSite - (variableCostCad / (closes || 1))))
      : Infinity;

    res.json({
      success: true,
      data: {
        config: data,
        metrics: {
          blendedRevPerSite,
          totalRevenueCad: totalRevenue,
          totalFixedCad: totalFixed,
          totalVariableCad: totalVariable,
          netProfitCad: netProfit,
          contributionMarginPercent: contributionMargin,
          adCacCad: adCac,
          breakEvenSites: breakEven,
          totalPayrollCad,
        },
        settings: { cadToPkr },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.saveUnitEconomics = async (req, res, next) => {
  try {
    const month = req.params.month || getCurrentMonth();
    const updates = { ...req.body, updatedBy: req.user._id };

    const data = await UnitEconomics.findOneAndUpdate(
      { month },
      updates,
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, message: 'Saved', data: { config: data } });
  } catch (error) {
    next(error);
  }
};
