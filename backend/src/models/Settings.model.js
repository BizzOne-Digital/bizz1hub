const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Global currency settings
  usdToCad: {
    type: Number,
    default: 1.38,
    min: 0.1,
  },
  pkrPerUsd: {
    type: Number,
    default: 283,
    min: 1,
  },
  // Derived: 1 CAD = pkrPerUsd / usdToCad PKR
  workingHoursPerMonth: {
    type: Number,
    default: 160,
    min: 80,
    max: 300,
  },
  // Company identity
  companyName: {
    type: String,
    default: 'BizzOne Digital',
    trim: true,
  },
  companyTagline: {
    type: String,
    default: 'Business Hub',
    trim: true,
  },
  // Feature flags
  aiAdvisorEnabled: {
    type: Boolean,
    default: true,
  },
  // Last updated by
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Singleton pattern — only one settings doc per app
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Virtual: CAD to PKR rate
settingsSchema.virtual('cadToPkr').get(function () {
  return parseFloat((this.pkrPerUsd / this.usdToCad).toFixed(2));
});

module.exports = mongoose.model('Settings', settingsSchema);
