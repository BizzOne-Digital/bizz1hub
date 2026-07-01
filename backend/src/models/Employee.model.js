const mongoose = require('mongoose');

const adjustmentSchema = new mongoose.Schema({
  month: { type: String, required: true }, // "2026-06"
  type: { type: String, enum: ['bonus', 'deduction', 'commission'], default: 'bonus' },
  amountPkr: { type: Number, default: 0 },
  note: { type: String, trim: true },
});

const paymentHistorySchema = new mongoose.Schema({
  month: { type: String, required: true }, // "2026-06"
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  paidAt: { type: Date, default: null },
  grossPkr: { type: Number, default: 0 },
  adjustmentPkr: { type: Number, default: 0 },
  netPkr: { type: Number, default: 0 },
});

const violationSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  reason: { type: String, trim: true },
  level: { type: Number, min: 1, max: 4, default: 1 },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true,
    maxlength: 100,
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    trim: true,
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['Automation & Sales', 'Client Delivery', 'Development', 'HR', 'QA'],
  },
  compensationType: {
    type: String,
    enum: ['fixed', 'commission'],
    default: 'fixed',
  },
  baseSalaryPkr: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Client capacity for Rate Card
  clientsPerPersonPerMonth: {
    type: Number,
    default: 10,
    min: 1,
  },
  // Commission fields
  commissionPerSitePkr: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  complianceVerified: {
    type: Boolean,
    default: true,
  },
  adjustments: [adjustmentSchema],
  paymentHistory: [paymentHistorySchema],
  violations: [violationSchema],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
employeeSchema.index({ department: 1, isActive: 1 });
employeeSchema.index({ name: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);
