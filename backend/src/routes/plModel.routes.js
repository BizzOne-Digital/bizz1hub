const express = require('express');
const router = express.Router();
const PlModel = require('../models/PlModel.model');
const Employee = require('../models/Employee.model');
const UnitEconomics = require('../models/UnitEconomics.model');
const Settings = require('../models/Settings.model');
const { requireManagerOrAbove } = require('../middleware/auth');

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

router.get('/:month?', async (req, res, next) => {
  try {
    const month = req.params.month || getCurrentMonth();
    let pl = await PlModel.findOne({ month });
    if (!pl) pl = await PlModel.create({ month, updatedBy: req.user._id });

    const settings = await Settings.getSettings();
    const cadToPkr = settings.pkrPerUsd / settings.usdToCad;

    // Pull payroll
    const employees = await Employee.find({ isActive: true }).lean();
    const totalPayrollPkr = employees.reduce((s, e) => s + e.baseSalaryPkr, 0);
    const totalPayrollCad = parseFloat((totalPayrollPkr / cadToPkr).toFixed(2));

    // Pull unit economics for website revenue
    const ue = await UnitEconomics.findOne({ month }).lean();
    const standardPrice = ue?.standardPriceCad || 0;
    const upsellPrice = ue?.upsellPriceCad || 0;
    const upsellRate = ue?.upsellRatePercent || 35;

    const websiteRevenue = parseFloat((standardPrice * (pl.standardWebsiteClosesCount || 0)).toFixed(2));
    const upsellRevenue = parseFloat((upsellPrice * (pl.upsellClosesCount || 0) * (upsellRate / 100)).toFixed(2));
    const retainerRevenue = pl.totalRetainerRevenueCad || 0;
    const extraRevenue = pl.totalExtraIncomeCad || 0;
    const totalRevenue = parseFloat((websiteRevenue + upsellRevenue + retainerRevenue + extraRevenue).toFixed(2));

    const totalMarketing = pl.totalMarketingSpendCad || 0;
    const totalCosts = parseFloat((totalPayrollCad + pl.subscriptionsAndToolsCad + pl.videographerCad + pl.otherExpensesCad + totalMarketing).toFixed(2));
    const netProfit = parseFloat((totalRevenue - totalCosts).toFixed(2));
    const netMarginPercent = totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    const totalNewClients = (pl.newRetainerClientsCount || 0) +
      pl.marketingSpend.reduce((s, m) => s + m.newClientsGenerated, 0);
    const cac = totalNewClients > 0 ? parseFloat((totalMarketing / totalNewClients).toFixed(2)) : 0;
    const activeRetainers = pl.retainerClients.filter(c => c.isActive).length;
    const avgRetainerValue = activeRetainers > 0 ? parseFloat((retainerRevenue / activeRetainers).toFixed(2)) : 0;
    const blendedLtv = parseFloat((avgRetainerValue * 12 * 0.85).toFixed(2)); // 12mo avg retention
    const ltvCacRatio = cac > 0 ? parseFloat((blendedLtv / cac).toFixed(1)) : 0;

    const mrr = retainerRevenue;
    const neededToBreakEven = netProfit < 0 && avgRetainerValue > 0
      ? Math.ceil(Math.abs(netProfit) / avgRetainerValue) : 0;

    res.json({
      success: true,
      data: {
        pl,
        metrics: {
          totalRevenueCad: totalRevenue,
          mrrCad: mrr,
          netProfitCad: netProfit,
          netMarginPercent,
          cacCad: cac,
          blendedLtvCad: blendedLtv,
          ltvCacRatio,
          activeRetainers,
          totalPayrollCad,
          totalCostsCad: totalCosts,
          newClientsFromAds: totalNewClients,
          neededToBreakEven,
        },
        ue: {
          standardPriceCad: standardPrice,
          upsellPriceCad: upsellPrice,
          upsellRatePercent: upsellRate,
        },
        settings: { cadToPkr },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:month?', requireManagerOrAbove, async (req, res, next) => {
  try {
    const month = req.params.month || getCurrentMonth();
    const existing = await PlModel.findOne({ month });
    if (existing?.isLocked) return res.status(403).json({ success: false, message: 'This month is locked' });

    const pl = await PlModel.findOneAndUpdate(
      { month },
      { ...req.body, updatedBy: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, message: 'P&L saved', data: { pl } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;