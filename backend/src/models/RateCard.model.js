const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  assignedRole: { type: String, trim: true }, // role from employees
  customMarkupPercent: { type: Number, default: null }, // null = use default
  hourlyRateCad: { type: Number, default: null }, // for hourly services
  hoursPerClient: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
  selectedInPackage: { type: Boolean, default: false },
});

const rateCardSchema = new mongoose.Schema({
  defaultMarkupPercent: {
    type: Number,
    default: 160,
    min: 0,
    max: 1000,
  },
  activeProjectsPerMonth: {
    type: Number,
    default: 0,
    min: 0,
  },
  services: [serviceSchema],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Virtual: effective margin
rateCardSchema.virtual('effectiveMarginPercent').get(function () {
  const markup = this.defaultMarkupPercent / 100;
  const margin = markup / (1 + markup);
  return parseFloat((margin * 100).toFixed(1));
});

module.exports = mongoose.model('RateCard', rateCardSchema);
