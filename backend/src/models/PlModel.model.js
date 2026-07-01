const mongoose = require('mongoose');

const retainerClientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  currency: { type: String, enum: ['CAD', 'USD', 'PKR'], default: 'CAD' },
  monthlyFeeCad: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  startDate: { type: Date, default: Date.now },
});

const extraIncomeSchema = new mongoose.Schema({
  description: { type: String, trim: true },
  amountCad: { type: Number, default: 0, min: 0 },
});

const marketingSpendSchema = new mongoose.Schema({
  channel: { type: String, trim: true }, // "Meta Ads", "Google Ads"
  amountCad: { type: Number, default: 0, min: 0 },
  newClientsGenerated: { type: Number, default: 0 },
});

const plModelSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    unique: true, // "2026-06"
  },
  // Website sales
  standardWebsiteClosesCount: { type: Number, default: 0 },
  upsellClosesCount: { type: Number, default: 0 },
  newRetainerClientsCount: { type: Number, default: 0 }, // for CAC calculation

  // Retainer clients
  retainerClients: [retainerClientSchema],

  // Extra income
  extraIncome: [extraIncomeSchema],

  // Expenses
  subscriptionsAndToolsCad: { type: Number, default: 5500 },
  videographerCad: { type: Number, default: 500 },
  otherExpensesCad: { type: Number, default: 0 },

  // Marketing
  marketingSpend: [marketingSpendSchema],

  // Note: payroll is pulled dynamically from Employee records
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isLocked: { type: Boolean, default: false }, // Locked after month closes
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Virtual: total retainer revenue
plModelSchema.virtual('totalRetainerRevenueCad').get(function () {
  return this.retainerClients
    .filter(c => c.isActive)
    .reduce((sum, c) => sum + c.monthlyFeeCad, 0);
});

// Virtual: total marketing spend
plModelSchema.virtual('totalMarketingSpendCad').get(function () {
  return this.marketingSpend.reduce((sum, m) => sum + m.amountCad, 0);
});

// Virtual: total extra income
plModelSchema.virtual('totalExtraIncomeCad').get(function () {
  return this.extraIncome.reduce((sum, e) => sum + e.amountCad, 0);
});

module.exports = mongoose.model('PlModel', plModelSchema);