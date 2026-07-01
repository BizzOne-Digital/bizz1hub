import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['Automation & Sales', 'Client Delivery', 'Development', 'HR', 'QA'];
const DEPT_COLORS = {
  'Automation & Sales': 'sales',
  'Client Delivery': 'delivery',
  'Development': 'development',
  'HR': 'hr',
  'QA': 'qa',
};

const EMPTY_EMP = {
  name: '',
  role: '',
  department: 'Client Delivery',
  baseSalaryPkr: 20000,
  clientsPerPersonPerMonth: 10,
  compensationType: 'fixed',
  commissionPerSitePkr: 0,
};

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/* ── Reusable Modal Shell ───────────────────────────────── */
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  }}>
    <div className="card" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

/* ── Employee Form (shared by Add & Edit) ───────────────── */
const EmpForm = ({ value, onChange, onSubmit, onCancel, submitLabel }) => (
  <form onSubmit={onSubmit}>
    <div className="grid-2" style={{ gap: 10 }}>
      <div className="form-group">
        <label className="form-label">Full Name *</label>
        <input required className="form-input" value={value.name}
          onChange={e => onChange(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Role / Title *</label>
        <input required className="form-input" value={value.role}
          onChange={e => onChange(f => ({ ...f, role: e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Department</label>
        <select className="form-select" value={value.department}
          onChange={e => onChange(f => ({ ...f, department: e.target.value }))}>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Compensation Type</label>
        <select className="form-select" value={value.compensationType}
          onChange={e => onChange(f => ({ ...f, compensationType: e.target.value }))}>
          <option value="fixed">Fixed</option>
          <option value="commission">Commission</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Base Salary (PKR)</label>
        <input type="number" min={0} className="form-input" value={value.baseSalaryPkr}
          onChange={e => onChange(f => ({ ...f, baseSalaryPkr: +e.target.value }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Clients / Person / Mo</label>
        <input type="number" min={0} className="form-input" value={value.clientsPerPersonPerMonth}
          onChange={e => onChange(f => ({ ...f, clientsPerPersonPerMonth: +e.target.value }))} />
      </div>
      {value.compensationType === 'commission' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Commission per Site (PKR)</label>
          <input type="number" min={0} className="form-input" value={value.commissionPerSitePkr}
            onChange={e => onChange(f => ({ ...f, commissionPerSitePkr: +e.target.value }))} />
        </div>
      )}
    </div>
    <div className="flex gap-2" style={{ marginTop: 12 }}>
      <button type="submit" className="btn btn-primary btn-sm">{submitLabel}</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  </form>
);

/* ── Main Page ──────────────────────────────────────────── */
const PayrollPage = () => {
  const { isManager, isAdmin } = useAuth();
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [month, setMonth]           = useState(getCurrentMonth());
  const [activeTab, setActiveTab]   = useState('roster');
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  /* modals */
  const [showAdd, setShowAdd]       = useState(false);
  const [editEmp, setEditEmp]       = useState(null);   // employee object being edited
  const [editForm, setEditForm]     = useState({});
  const [newEmp, setNewEmp]         = useState({ ...EMPTY_EMP });

  /* adjustment modal */
  const [adjEmp, setAdjEmp]         = useState(null);
  const [adjForm, setAdjForm]       = useState({ type: 'bonus', amountPkr: 0, reason: '' });

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/payroll/monthly/${month}`);
      setData(res.data);
    } catch { toast.error('Failed to load payroll'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayroll(); }, [month]);

  /* ── Actions ── */
  const markAllPaid = async () => {
    if (!window.confirm('Mark all employees as paid for this month?')) return;
    try {
      await api.post('/payroll/mark-all-paid', { month });
      toast.success('All marked as paid');
      fetchPayroll();
    } catch { toast.error('Failed'); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/payroll/employees/${id}/status`, { month, status });
      fetchPayroll();
    } catch { toast.error('Failed to update status'); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payroll/employees', newEmp);
      toast.success('Employee added');
      setShowAdd(false);
      setNewEmp({ ...EMPTY_EMP });
      fetchPayroll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add'); }
  };

  const openEdit = (emp) => {
    setEditEmp(emp);
    setEditForm({
      name: emp.name,
      role: emp.role,
      department: emp.department,
      baseSalaryPkr: emp.baseSalaryPkr,
      clientsPerPersonPerMonth: emp.clientsPerPersonPerMonth,
      compensationType: emp.compensationType,
      commissionPerSitePkr: emp.commissionPerSitePkr || 0,
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/payroll/employees/${editEmp._id}`, editForm);
      toast.success('Employee updated');
      setEditEmp(null);
      fetchPayroll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from active roster?`)) return;
    try {
      await api.delete(`/payroll/employees/${id}`);
      toast.success('Employee removed');
      fetchPayroll();
    } catch { toast.error('Failed to remove'); }
  };

  const handleAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/payroll/employees/${adjEmp._id}/adjustments`, adjForm);
      toast.success('Adjustment added');
      setAdjEmp(null);
      setAdjForm({ type: 'bonus', amountPkr: 0, reason: '' });
      fetchPayroll();
    } catch { toast.error('Failed to add adjustment'); }
  };

  const addViolation = async (id, reason) => {
    try {
      await api.post(`/payroll/employees/${id}/violations`, { reason });
      toast.success('Violation logged');
      fetchPayroll();
    } catch { toast.error('Failed to log violation'); }
  };

  const toggleCompliance = async (emp) => {
    try {
      await api.patch(`/payroll/employees/${emp._id}`, { complianceVerified: !emp.complianceVerified });
      fetchPayroll();
    } catch { toast.error('Failed'); }
  };

  /* ── Render ── */
  if (loading) return <div className="loading"><div className="spinner" />Loading payroll...</div>;
  if (!data) return null;

  const { employees = [], summary = {} } = data;
  const filtered = employees.filter(e =>
    (!deptFilter || e.department === deptFilter) &&
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Payroll</h2>
        <div className="flex gap-2 items-center">
          <input type="month" className="form-input"
            style={{ width: 160, padding: '6px 10px' }}
            value={month} onChange={e => setMonth(e.target.value)} />
          {isManager && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={markAllPaid}>✅ Mark All Paid</button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Employee</button>
            </>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip" style={{ marginBottom: 14 }}>
        <div className="kpi-item">
          <div className="kpi-label">Active Employees</div>
          <div className="kpi-value">{summary.activeCount}</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Total Gross / Mo</div>
          <div className="kpi-value text-green">CA${summary.totalGrossCad?.toFixed(0)}</div>
          <div className="kpi-sub">PKR {((summary.totalGrossPkr || 0) / 1000).toFixed(0)}k</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Total Deductions</div>
          <div className="kpi-value text-red">PKR {summary.totalDeductionsPkr || 0}</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Paid Status</div>
          <div className="kpi-value">{summary.paidCount} / {summary.activeCount}</div>
          <div className="kpi-sub text-yellow">{summary.pendingCount} Pending</div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'roster',     label: '👥 Roster' },
          { id: 'capacity',   label: '📊 Capacity' },
          { id: 'compliance', label: '🔒 Compliance' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className="btn btn-ghost btn-sm"
            style={{
              borderRadius: '6px 6px 0 0',
              borderBottom: activeTab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2" style={{ marginBottom: 12 }}>
        <input type="text" placeholder="🔍 Search name or role..." className="form-input"
          style={{ maxWidth: 240 }} value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ maxWidth: 200 }} value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(search || deptFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setDeptFilter(''); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── ROSTER TAB ── */}
      {activeTab === 'roster' && (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th style={{ textAlign: 'right' }}>Salary (PKR)</th>
                <th style={{ textAlign: 'right' }}>Net (CA$)</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Compliance</th>
                {isManager && <th style={{ textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={isManager ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No employees found</td></tr>
              )}
              {filtered.map(emp => (
                <tr key={emp._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{emp.name}</div>
                    <div className="text-xs text-muted">{emp.role}</div>
                    {(emp.adjustments || []).length > 0 && (
                      <div className="text-xs" style={{ color: 'var(--accent-orange)', marginTop: 2 }}>
                        {emp.adjustments.length} adjustment{emp.adjustments.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`dept-badge ${DEPT_COLORS[emp.department] || 'delivery'}`}>
                      {emp.department}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 500 }}>{emp.baseSalaryPkr?.toLocaleString()}</div>
                    <div className="text-xs text-muted">≈ CA${emp.baseSalaryCad?.toFixed(0)}</div>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    CA${emp.netCad?.toFixed(0)}
                  </td>
                  <td>
                    {isManager ? (
                      <select
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: 12, width: 105 }}
                        value={emp.paymentStatus}
                        onChange={e => updateStatus(emp._id, e.target.value)}
                      >
                        <option value="pending">⏳ Pending</option>
                        <option value="paid">✅ Paid</option>
                        <option value="overdue">🔴 Overdue</option>
                      </select>
                    ) : (
                      <span className={`status-badge ${emp.paymentStatus}`}>{emp.paymentStatus}</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isManager ? (
                      <button
                        className="btn btn-ghost btn-xs"
                        title="Toggle compliance"
                        onClick={() => toggleCompliance(emp)}
                        style={{ fontSize: 16 }}
                      >
                        {emp.complianceVerified ? '✅' : '❌'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 16 }}>{emp.complianceVerified ? '✅' : '❌'}</span>
                    )}
                  </td>
                  {isManager && (
                    <td>
                      <div className="flex gap-1" style={{ justifyContent: 'center' }}>
                        {/* Edit */}
                        <button
                          className="btn btn-ghost btn-xs"
                          title="Edit employee"
                          onClick={() => openEdit(emp)}
                          style={{ color: 'var(--accent-blue)' }}
                        >
                          ✏️
                        </button>
                        {/* Adjustment */}
                        <button
                          className="btn btn-ghost btn-xs"
                          title="Add adjustment (bonus/deduction)"
                          onClick={() => setAdjEmp(emp)}
                          style={{ color: 'var(--accent-orange)' }}
                        >
                          ±
                        </button>
                        {/* Delete (admin only) */}
                        {isAdmin && (
                          <button
                            className="btn btn-ghost btn-xs"
                            title="Remove employee"
                            onClick={() => handleDelete(emp._id, emp.name)}
                            style={{ color: 'var(--accent-red)' }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CAPACITY TAB ── */}
      {activeTab === 'capacity' && (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th style={{ textAlign: 'center' }}>Clients / Person</th>
                <th style={{ textAlign: 'right' }}>Cost / Client (CA$)</th>
                <th style={{ textAlign: 'right' }}>Salary (PKR)</th>
                {isManager && <th style={{ textAlign: 'center' }}>Edit</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{emp.name}</div>
                    <div className="text-xs text-muted">{emp.role}</div>
                  </td>
                  <td>
                    <span className={`dept-badge ${DEPT_COLORS[emp.department] || 'delivery'}`}>
                      {emp.department}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{emp.clientsPerPersonPerMonth}</td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>
                    CA${emp.clientsPerPersonPerMonth > 0
                      ? (emp.baseSalaryCad / emp.clientsPerPersonPerMonth).toFixed(2)
                      : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>{emp.baseSalaryPkr?.toLocaleString()}</td>
                  {isManager && (
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent-blue)' }}
                        onClick={() => openEdit(emp)}>✏️ Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── COMPLIANCE TAB ── */}
      {activeTab === 'compliance' && (
        <div>
          <div className="kpi-strip" style={{ marginBottom: 14 }}>
            <div className="kpi-item">
              <div className="kpi-label">🟢 Clean</div>
              <div className="kpi-value text-green">{employees.filter(e => !e.violations?.length).length}</div>
            </div>
            <div className="kpi-item">
              <div className="kpi-label">🟡 1st Warning</div>
              <div className="kpi-value text-yellow">{employees.filter(e => e.violations?.length === 1).length}</div>
            </div>
            <div className="kpi-item">
              <div className="kpi-label">🟠 2nd Warning</div>
              <div className="kpi-value" style={{ color: 'var(--accent-orange)' }}>
                {employees.filter(e => e.violations?.length === 2).length}
              </div>
            </div>
            <div className="kpi-item">
              <div className="kpi-label">🔴 At-Risk</div>
              <div className="kpi-value text-red">{employees.filter(e => e.violations?.length >= 3).length}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role & Dept</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Violations</th>
                  <th>Last Violation</th>
                  {isManager && <th style={{ textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => {
                  const vCount = emp.violations?.length || 0;
                  const statusLabel = vCount === 0 ? 'Clean' : vCount === 1 ? '1st Warning'
                    : vCount === 2 ? '2nd Warning' : vCount === 3 ? 'At-Risk' : 'Replacement';
                  const statusColor = vCount === 0 ? 'var(--accent-green)'
                    : vCount === 1 ? 'var(--accent-yellow)'
                    : vCount === 2 ? 'var(--accent-orange)' : 'var(--accent-red)';
                  return (
                    <tr key={emp._id}>
                      <td style={{ fontWeight: 600 }}>{emp.name}</td>
                      <td>
                        <div className="text-xs text-muted" style={{ marginBottom: 3 }}>{emp.role}</div>
                        <span className={`dept-badge ${DEPT_COLORS[emp.department] || 'delivery'}`}>{emp.department}</span>
                      </td>
                      <td>
                        <span style={{ color: statusColor, fontWeight: 600, fontSize: 12 }}>● {statusLabel}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{vCount}</td>
                      <td className="text-xs text-muted">
                        {vCount === 0 ? '—' : emp.violations?.slice(-1)[0]?.reason || 'Recorded'}
                      </td>
                      {isManager && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ color: 'var(--accent-orange)' }}
                            onClick={() => {
                              const r = prompt(`Log violation reason for ${emp.name}:`);
                              if (r?.trim()) addViolation(emp._id, r.trim());
                            }}
                          >
                            + Log Violation
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Add Employee */}
      {showAdd && (
        <Modal title="+ Add Employee" onClose={() => { setShowAdd(false); setNewEmp({ ...EMPTY_EMP }); }}>
          <EmpForm
            value={newEmp}
            onChange={setNewEmp}
            onSubmit={handleAdd}
            onCancel={() => { setShowAdd(false); setNewEmp({ ...EMPTY_EMP }); }}
            submitLabel="Add Employee"
          />
        </Modal>
      )}

      {/* Edit Employee */}
      {editEmp && (
        <Modal title={`✏️ Edit — ${editEmp.name}`} onClose={() => setEditEmp(null)}>
          <EmpForm
            value={editForm}
            onChange={setEditForm}
            onSubmit={handleEdit}
            onCancel={() => setEditEmp(null)}
            submitLabel="Save Changes"
          />
        </Modal>
      )}

      {/* Adjustment Modal */}
      {adjEmp && (
        <Modal title={`± Adjustment — ${adjEmp.name}`} onClose={() => setAdjEmp(null)}>
          <form onSubmit={handleAdjustment}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={adjForm.type}
                onChange={e => setAdjForm(f => ({ ...f, type: e.target.value }))}>
                <option value="bonus">Bonus</option>
                <option value="deduction">Deduction</option>
                <option value="advance">Advance</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (PKR)</label>
              <input type="number" min={0} required className="form-input"
                value={adjForm.amountPkr}
                onChange={e => setAdjForm(f => ({ ...f, amountPkr: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <input required className="form-input" value={adjForm.reason}
                placeholder="e.g. Performance bonus Q2"
                onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="flex gap-2" style={{ marginTop: 12 }}>
              <button type="submit" className="btn btn-primary btn-sm">Add Adjustment</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdjEmp(null)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PayrollPage;