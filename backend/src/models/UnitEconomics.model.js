const mongoose = require('mongoose');

const unitEconomicsSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    unique: true, // e.g. "2026-06"
  },
  // Pricing
  standardPriceCad: { type: Number, default: 0, min: 0 },
  upsellPriceCad: { type: Number, default: 0, min: 0 },
  upsellRatePercent: { type: Number, default: 35, min: 0, max: 100 },
  monthlyProfitTargetCad: { type: Number, default: 0 },

  // Meta Ads Funnel
  dailyAdSpendCad: { type: Number, default: 10, min: 0 },
  costPerLeadCad: { type: Number, default: 10, min: 0.01 },
  leadCloseRatePercent: { type: Number, default: 10, min: 0, max: 100 },
  websitesClosedThisMonth: { type: Number, default: 163, min: 0 },

  // Fixed Overhead
  otherAdsCad: { type: Number, default: 40, min: 0 },
  aiToolsCad: { type: Number, default: 10, min: 0 },
  softwareOverheadCad: { type: Number, default: 30, min: 0 },
  otherFixedCostsCad: { type: Number, default: 50, min: 0 },

  // Saved by
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Virtual: total monthly ad spend
unitEconomicsSchema.virtual('monthlyAdSpendCad').get(function () {
  return parseFloat((this.dailyAdSpendCad * 30).toFixed(2));
});

// Virtual: total fixed costs
unitEconomicsSchema.virtual('totalFixedCostsCad').get(function () {
  return parseFloat((
    this.otherAdsCad +
    this.aiToolsCad +
    this.softwareOverheadCad +
    this.otherFixedCostsCad
  ).toFixed(2));
});

module.exports = mongoose.model('UnitEconomics', unitEconomicsSchema);
