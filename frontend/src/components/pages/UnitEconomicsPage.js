import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const UnitEconomicsPage = () => {
  const { isManager } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [month] = useState(getCurrentMonth());
  const [config, setConfig] = useState({});
  const [activeTab, setActiveTab] = useState('economics');

  useEffect(() => {
    api.get(`/unit-economics/${month}`)
      .then(({ data: res }) => {
        setData(res.data);
        setConfig(res.data.config);
      })
      .catch(() => toast.error('Failed to load unit economics'))
      .finally(() => setLoading(false));
  }, [month]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/unit-economics/${month}`, config);
      const { data: res } = await api.get(`/unit-economics/${month}`);
      setData(res.data);
      setConfig(res.data.config);
      toast.success('Saved');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading unit economics...</div>;
  const m = data?.metrics || {};
  const isLoss = m.netProfitCad < 0;

  const Input = ({ label, field, type = 'number', step, min = 0, max, suffix }) => (
    <div className="form-group">
      <label className="form-label">{label}{suffix && <span className="text-muted"> ({suffix})</span>}</label>
      <input type={type} step={step || 1} min={min} max={max} className="form-input"
        value={config[field] || 0}
        onChange={e => setConfig(c => ({ ...c, [field]: parseFloat(e.target.value) || 0 }))} />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Unit Economics</h2>
        {isManager && <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? '💾 Saving...' : '💾 Save'}</button>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {[{ id: 'economics', label: '📊 Economics' }, { id: 'commissions', label: '💰 Commission Tracker' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className="btn btn-ghost btn-sm"
            style={{ borderRadius: '6px 6px 0 0', borderBottom: activeTab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === t.id ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'economics' && (
        <div>
          {/* KPI Strip */}
          <div className="kpi-strip" style={{ marginBottom: 16 }}>
            <div className="kpi-item"><div className="kpi-label">Monthly Net</div><div className={`kpi-value ${isLoss ? 'text-red' : 'text-green'}`}>{isLoss ? '-' : ''}CA${Math.abs(m.netProfitCad || 0).toFixed(0)}</div></div>
            <div className="kpi-item"><div className="kpi-label">Contribution Margin</div><div className={`kpi-value ${(m.contributionMarginPercent || 0) < 0 ? 'text-red' : 'text-green'}`}>{m.contributionMarginPercent?.toFixed(1)}%</div></div>
            <div className="kpi-item"><div className="kpi-label">Ad CAC</div><div className="kpi-value">CA${m.adCacCad?.toFixed(2)}</div></div>
            <div className="kpi-item"><div className="kpi-label">Break-even</div><div className="kpi-value text-yellow">{m.breakEvenSites === Infinity ? '∞' : m.breakEvenSites} sites</div></div>
          </div>

          <div className="grid-2" style={{ gap: 14 }}>
            {/* Left: Config */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>💰 Core Pricing & Targets</div>
                <div className="grid-2" style={{ gap: 10 }}>
                  <Input label="Standard Price" field="standardPriceCad" suffix="CA$" step="0.01" />
                  <Input label="Upsell Price" field="upsellPriceCad" suffix="CA$" step="0.01" />
                </div>
                <label className="form-label">Upsell Rate: {config.upsellRatePercent || 35}%</label>
                <input type="range" className="form-slider" min={0} max={100} value={config.upsellRatePercent || 35}
                  onChange={e => setConfig(c => ({ ...c, upsellRatePercent: +e.target.value }))} />
                <Input label="Monthly Profit Target" field="monthlyProfitTargetCad" suffix="CA$" />
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>📢 Meta Ads Lead Funnel</div>
                <div className="grid-2" style={{ gap: 10 }}>
                  <Input label="Daily Ad Spend" field="dailyAdSpendCad" suffix="CA$/day" step="0.01" />
                  <Input label="Cost Per Lead" field="costPerLeadCad" suffix="CA$" step="0.01" min={0.01} />
                </div>
                <label className="form-label">Lead Close Rate: {config.leadCloseRatePercent || 10}%</label>
                <input type="range" className="form-slider" min={0} max={100} value={config.leadCloseRatePercent || 10}
                  onChange={e => setConfig(c => ({ ...c, leadCloseRatePercent: +e.target.value }))} />
                <label className="form-label" style={{ marginTop: 10 }}>Websites Closed This Month: {config.websitesClosedThisMonth || 0}</label>
                <input type="range" className="form-slider" min={0} max={500} value={config.websitesClosedThisMonth || 0}
                  onChange={e => setConfig(c => ({ ...c, websitesClosedThisMonth: +e.target.value }))} />
                <div className="text-xs text-muted">≈ {((config.websitesClosedThisMonth || 0) / 30).toFixed(1)} closes/day</div>
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>⚙️ Monthly Overhead & Fixed Costs</div>
                <div className="grid-2" style={{ gap: 10 }}>
                  <Input label="Other Ads / Mo" field="otherAdsCad" suffix="CA$" />
                  <Input label="AI Tools / Mo" field="aiToolsCad" suffix="CA$" />
                  <Input label="Software / Overhead" field="softwareOverheadCad" suffix="CA$" />
                  <Input label="Other Fixed Costs" field="otherFixedCostsCad" suffix="CA$" />
                </div>
              </div>
            </div>

            {/* Right: Outputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 12 }}>📉 Real-Time Performance</div>
                {[
                  { label: 'Blended rev/site', value: `CA$${m.blendedRevPerSite?.toFixed(2)}` },
                  { label: 'Contribution margin', value: `${m.contributionMarginPercent?.toFixed(1)}%`, color: (m.contributionMarginPercent || 0) < 0 ? 'var(--accent-red)' : 'var(--accent-green)' },
                  { label: 'Ad CAC', value: `CA$${m.adCacCad?.toFixed(2)}` },
                  { label: 'Monthly ad spend', value: `CA$${(data?.config?.dailyAdSpendCad * 30)?.toFixed(0)}` },
                  { label: 'Total fixed costs', value: `CA$${m.totalFixedCad?.toFixed(0)}`, color: 'var(--accent-red)' },
                  { label: 'Total variable costs', value: `CA$${m.totalVariableCad?.toFixed(0)}`, color: 'var(--accent-red)' },
                  { label: 'Break-even', value: m.breakEvenSites === Infinity ? '∞ sites' : `${m.breakEvenSites} sites`, color: 'var(--accent-yellow)' },
                  { label: 'Monthly net', value: `${isLoss ? '-' : ''}CA$${Math.abs(m.netProfitCad || 0).toFixed(0)}`, color: isLoss ? 'var(--accent-red)' : 'var(--accent-green)' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="text-secondary text-sm">{item.label}</span>
                    <span style={{ fontWeight: 600, color: item.color || 'var(--text-primary)' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Volume Sensitivity Table */}
              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>📈 Volume Sensitivity</div>
                <table className="data-table">
                  <thead><tr><th>Sites/mo</th><th style={{ textAlign: 'right' }}>Net (CA$)</th><th style={{ textAlign: 'right' }}>Margin</th></tr></thead>
                  <tbody>
                    {[0, 25, 50, 100, 150, 163, 200, 250, 300].map(sites => {
                      const rev = (m.blendedRevPerSite || 0) * sites;
                      const variable = (m.totalVariableCad || 0) / Math.max(config.websitesClosedThisMonth || 1, 1) * sites;
                      const net = rev - (m.totalFixedCad || 0) - variable;
                      const margin = rev > 0 ? ((net / rev) * 100).toFixed(1) : '—';
                      const isCurrent = sites === (config.websitesClosedThisMonth || 0);
                      return (
                        <tr key={sites} style={isCurrent ? { background: 'rgba(59,127,245,0.08)' } : {}}>
                          <td>{sites}{isCurrent ? ' ← current' : ''}</td>
                          <td style={{ textAlign: 'right', color: net < 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: isCurrent ? 700 : 400 }}>
                            {net < 0 ? '-' : ''}CA${Math.abs(net).toFixed(0)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{typeof margin === 'string' ? margin : `${margin}%`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {isLoss && (
            <div className="alert danger" style={{ marginTop: 14 }}>
              <div className="alert-dot" />
              <div>
                <strong>Loss-making at {config.websitesClosedThisMonth || 0} sites/mo.</strong> Need {m.breakEvenSites === Infinity ? '∞' : m.breakEvenSites} sites/mo to break even. Set a Standard Price above CA$0 to fix the pricing bottleneck.
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'commissions' && <CommissionTracker month={month} isManager={isManager} />}
    </div>
  );
};

const CommissionTracker = ({ month, isManager }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/commissions/${month}`)
      .then(({ data: res }) => setData(res.data))
      .catch(() => toast.error('Failed to load commissions'))
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return null;

  const { summary, employees } = data;
  return (
    <div>
      <div className="kpi-strip" style={{ marginBottom: 14 }}>
        <div className="kpi-item"><div className="kpi-label">Total Commissions</div><div className="kpi-value text-green">CA${summary.totalCommissionCad?.toFixed(0)}</div><div className="kpi-sub">PKR {(summary.totalCommissionPkr / 1000).toFixed(0)}k</div></div>
        <div className="kpi-item"><div className="kpi-label">Sales Payout</div><div className="kpi-value">PKR {(summary.salesPayoutPkr / 1000).toFixed(0)}k</div></div>
        <div className="kpi-item"><div className="kpi-label">PM Payout</div><div className="kpi-value">PKR {(summary.pmPayoutPkr / 1000).toFixed(0)}k</div></div>
        <div className="kpi-item"><div className="kpi-label">Dev Payout</div><div className="kpi-value">PKR {(summary.devPayoutPkr / 1000).toFixed(0)}k</div></div>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Department</th><th style={{ textAlign: 'center' }}>PKR/Site</th><th style={{ textAlign: 'center' }}>Sites</th><th style={{ textAlign: 'right' }}>Total (PKR)</th><th style={{ textAlign: 'right' }}>Total (CA$)</th></tr></thead>
          <tbody>
            {employees.filter(e => e.compensationType === 'commission' || e.commissionPerSitePkr > 0).map(emp => (
              <tr key={emp._id}>
                <td style={{ fontWeight: 500 }}>{emp.name}</td>
                <td className="text-secondary text-xs">{emp.department}</td>
                <td style={{ textAlign: 'center' }}>{emp.commissionPerSitePkr?.toLocaleString()}</td>
                <td style={{ textAlign: 'center' }}>{emp.sitesDelivered}</td>
                <td style={{ textAlign: 'right', color: 'var(--accent-green)' }}>PKR {emp.totalCommissionPkr?.toLocaleString()}</td>
                <td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>CA${emp.totalCommissionCad?.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UnitEconomicsPage;
