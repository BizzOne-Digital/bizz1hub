const Employee = require('../models/Employee.model');
const Settings = require('../models/Settings.model');
const { AppError } = require('../middleware/errorHandler');

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// ─── Get All Employees ─────────────────────────────────────────────────────────
exports.getEmployees = async (req, res, next) => {
  try {
    const { department, search, activeOnly } = req.query;
    const filter = {};
    if (activeOnly !== 'false') filter.isActive = true;
    if (department) filter.department = department;
    if (search) filter.$text = { $search: search };

    const employees = await Employee.find(filter).sort({ department: 1, name: 1 }).lean();
    const settings = await Settings.getSettings();
    const cadToPkr = settings.pkrPerUsd / settings.usdToCad;

    const enriched = employees.map(emp => ({
      ...emp,
      baseSalaryCad: parseFloat((emp.baseSalaryPkr / cadToPkr).toFixed(2)),
    }));

    res.json({ success: true, data: { employees: enriched } });
  } catch (error) {
    next(error);
  }
};

// ─── Add Employee ──────────────────────────────────────────────────────────────
exports.addEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json({ success: true, message: 'Employee added', data: { employee } });
  } catch (error) {
    next(error);
  }
};

// ─── Update Employee ───────────────────────────────────────────────────────────
exports.updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!employee) return next(new AppError('Employee not found', 404));
    res.json({ success: true, data: { employee } });
  } catch (error) {
    next(error);
  }
};

// ─── Delete Employee ───────────────────────────────────────────────────────────
exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!employee) return next(new AppError('Employee not found', 404));
    res.json({ success: true, message: 'Employee removed from active roster' });
  } catch (error) {
    next(error);
  }
};

// ─── Get Monthly Payroll Summary ───────────────────────────────────────────────
exports.getMonthlyPayroll = async (req, res, next) => {
  try {
    const month = req.params.month || getCurrentMonth();
    const settings = await Settings.getSettings();
    const cadToPkr = settings.pkrPerUsd / settings.usdToCad;

    const employees = await Employee.find({ isActive: true }).lean();

    const roster = employees.map(emp => {
      const monthHistory = emp.paymentHistory?.find(h => h.month === month) || {};
      const monthAdjustments = emp.adjustments?.filter(a => a.month === month) || [];
      const totalAdjPkr = monthAdjustments.reduce((sum, a) => {
        return a.type === 'deduction' ? sum - a.amountPkr : sum + a.amountPkr;
      }, 0);
      const netPkr = emp.baseSalaryPkr + totalAdjPkr;

      return {
        ...emp,
        baseSalaryCad: parseFloat((emp.baseSalaryPkr / cadToPkr).toFixed(2)),
        adjustmentsPkr: totalAdjPkr,
        netPkr,
        netCad: parseFloat((netPkr / cadToPkr).toFixed(2)),
        paymentStatus: monthHistory.status || 'pending',
        adjustments: monthAdjustments,
      };
    });

    const totalGrossPkr = roster.reduce((s, e) => s + e.baseSalaryPkr, 0);
    const totalNetPkr = roster.reduce((s, e) => s + e.netPkr, 0);
    const totalDeductionsPkr = roster.reduce((s, e) => s + (e.adjustmentsPkr < 0 ? Math.abs(e.adjustmentsPkr) : 0), 0);
    const paidCount = roster.filter(e => e.paymentStatus === 'paid').length;

    res.json({
      success: true,
      data: {
        month,
        employees: roster,
        summary: {
          activeCount: roster.length,
          totalGrossPkr,
          totalGrossCad: parseFloat((totalGrossPkr / cadToPkr).toFixed(2)),
          totalDeductionsPkr,
          totalNetPkr,
          totalNetCad: parseFloat((totalNetPkr / cadToPkr).toFixed(2)),
          paidCount,
          pendingCount: roster.length - paidCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update Payment Status ─────────────────────────────────────────────────────
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { month, status } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return next(new AppError('Employee not found', 404));

    const existing = employee.paymentHistory.find(h => h.month === month);
    if (existing) {
      existing.status = status;
      if (status === 'paid') existing.paidAt = new Date();
    } else {
      employee.paymentHistory.push({ month, status, paidAt: status === 'paid' ? new Date() : null });
    }
    await employee.save();
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    next(error);
  }
};

// ─── Mark All Paid ─────────────────────────────────────────────────────────────
exports.markAllPaid = async (req, res, next) => {
  try {
    const { month } = req.body;
    const employees = await Employee.find({ isActive: true });

    for (const emp of employees) {
      const existing = emp.paymentHistory.find(h => h.month === month);
      if (existing) {
        existing.status = 'paid';
        existing.paidAt = new Date();
      } else {
        emp.paymentHistory.push({ month, status: 'paid', paidAt: new Date() });
      }
      await emp.save();
    }
    res.json({ success: true, message: `All ${employees.length} employees marked as paid` });
  } catch (error) {
    next(error);
  }
};

// ─── Add Adjustment ────────────────────────────────────────────────────────────
exports.addAdjustment = async (req, res, next) => {
  try {
    const { month, type, amountPkr, note } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return next(new AppError('Employee not found', 404));

    employee.adjustments.push({ month, type, amountPkr, note });
    await employee.save();
    res.json({ success: true, message: 'Adjustment added', data: { employee } });
  } catch (error) {
    next(error);
  }
};

// ─── Add Violation ─────────────────────────────────────────────────────────────
exports.addViolation = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return next(new AppError('Employee not found', 404));

    const level = Math.min(employee.violations.length + 1, 4);
    employee.violations.push({ reason, level, addedBy: req.user._id });
    await employee.save();
    res.json({ success: true, message: 'Violation logged', data: { employee } });
  } catch (error) {
    next(error);
  }
};

// ─── Department Summary ────────────────────────────────────────────────────────
exports.getDepartmentSummary = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    const cadToPkr = settings.pkrPerUsd / settings.usdToCad;

    const result = await Employee.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          totalBasePkr: { $sum: '$baseSalaryPkr' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const departments = result.map(d => ({
      department: d._id,
      count: d.count,
      totalBasePkr: d.totalBasePkr,
      totalBaseCad: parseFloat((d.totalBasePkr / cadToPkr).toFixed(2)),
    }));

    res.json({ success: true, data: { departments } });
  } catch (error) {
    next(error);
  }
};
