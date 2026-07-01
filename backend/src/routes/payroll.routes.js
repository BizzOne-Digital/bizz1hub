const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const { requireManagerOrAbove, requireAdmin } = require('../middleware/auth');

// Employees
router.get('/employees', payrollController.getEmployees);
router.post('/employees', requireManagerOrAbove, payrollController.addEmployee);
router.patch('/employees/:id', requireManagerOrAbove, payrollController.updateEmployee);
router.delete('/employees/:id', requireAdmin, payrollController.deleteEmployee);

// Monthly payroll
router.get('/monthly/:month?', payrollController.getMonthlyPayroll);
router.patch('/employees/:id/status', requireManagerOrAbove, payrollController.updatePaymentStatus);
router.post('/mark-all-paid', requireManagerOrAbove, payrollController.markAllPaid);
router.post('/employees/:id/adjustments', requireManagerOrAbove, payrollController.addAdjustment);
router.post('/employees/:id/violations', requireManagerOrAbove, payrollController.addViolation);

// Summaries
router.get('/departments', payrollController.getDepartmentSummary);

module.exports = router;
