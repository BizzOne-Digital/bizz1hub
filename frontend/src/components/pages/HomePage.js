import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const fmt = (n) => {
  if (n === Infinity || n === -Infinity) return '∞';
  if (Math.abs(n) >= 1000) return `CA$${(n / 1000).toFixed(1)}k`;
  return `CA$${n?.toFixed ? n.toFixed(0) : n}`;
};

const HomePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ue, payroll, rc, pl] = await Promise.all([
          api.get('/unit-economics'),
          api.get('/payroll/monthly'),
          api.get('/rate-card'),
          api.get('/pl-model'),
        ]);
        setData({
          ue: ue.data.data,
          payroll: payroll.data.data,
          rc: rc.data.data,
          pl: pl.data.data,
        });
      } catch (e) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="loading"><div className="spinner" />Loading dashboard...</div>;
  if (!data) return null;

  const { ue, payroll, rc, pl } = data;
  const netProfit = ue?.metrics?.netProfitCad || 0;
  const totalPayroll = payroll?.summary?.totalNetCad || 0;
  const activeEmployees = payroll?.summary?.activeCount || 0;
  const markup = rc?.rateCard?.defaultMarkupPercent || 0;
  const retainerRevenue = pl?.metrics?.mrrCad || 0;
  const breakEven = ue?.metrics?.breakEvenSites;
  const closes = ue?.config?.websitesClosedThisMonth || 0;

  const plItems = [
    { label: 'Revenue', value: ue?.metrics?.totalRevenueCad || 0, type: 'neutral' },
    { label: 'Variable costs', value: -(ue?.metrics?.totalVariableCad || 0), type: 'negative' },
    { label: 'Fixed costs', value: -(ue?.metrics?.totalFixedCad - totalPayroll || 0), type: 'negative' },
    { label: 'Net profit', value: netProfit, type: netProfit >= 0 ? 'positive' : 'negative' },
  ];

  const deptMap = {};
  (payroll?.employees || []).forEach(emp => {
    if (!deptMap[emp.department]) deptMap[emp.department] = { count: 0, totalCad: 0 };
    deptMap[emp.department].count++;
    deptMap[emp.department].totalCad += emp.baseSalaryCad || 0;
  });

  const deptColors = {
    'Automation & Sales': 'sales',
    'Client Delivery': 'delivery',
    'Development': 'development',
    'HR': 'hr',
    'QA': 'qa',
  };

  const maxAbsValue = Math.max(...plItems.map(i => Math.abs(i.value)), 1);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Overview</h2>

      {/* Module Cards */}
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <div className="metric-card" onClick={() => navigate('/unit-economics')}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #3b7ff5, #2563eb)', borderRadius: '14px 14px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <div className="metric-icon">📊</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Unit Economics</div>
          <div className="text-xs text-muted" style={{ marginBottom: 10 }}>Website pricing · P&L · Break-even</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div><div className={`metric-value ${netProfit < 0 ? 'negative' : 'positive'}`} style={{ fontSize: 16 }}>{netProfit < 0 ? '-' : ''}{fmt(Math.abs(netProfit))}</div><div className="text-xs text-muted">Net/mo</div></div>
            <div><div className="metric-value" style={{ fontSize: 16 }}>CA$0.00</div><div className="text-xs text-muted">Avg price</div></div>
            <div><div className="metric-value" style={{ fontSize: 16 }}>{breakEven === Infinity ? '∞' : breakEven}</div><div className="text-xs text-muted">Break-even</div></div>
          </div>
          <div className="metric-link">Open →</div>
        </div>

        <div className="metric-card" onClick={() => navigate('/rate-card')}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '14px 14px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <div className="metric-icon">💼</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Agency Rate Card</div>
          <div className="text-xs text-muted" style={{ marginBottom: 10 }}>Service pricing · Markup · Packages</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div><div className="metric-value" style={{ fontSize: 16 }}>{fmt(totalPayroll)}</div><div className="text-xs text-muted">Payroll</div></div>
            <div><div className="metric-value" style={{ fontSize: 16 }}>{rc?.rateCard?.activeProjectsPerMonth || 0}</div><div className="text-xs text-muted">Clients</div></div>
            <div><div className="metric-value" style={{ fontSize: 16 }}>{markup}%</div><div className="text-xs text-muted">Markup</div></div>
          </div>
          <div className="metric-link">Open →</div>
        </div>

        <div className="metric-card" onClick={() => navigate('/payroll')}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #a78bfa, #7c3aed)', borderRadius: '14px 14px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <div className="metric-icon">👥</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Payroll</div>
          <div className="text-xs text-muted" style={{ marginBottom: 10 }}>Team roster · Salaries · Departments</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div><div className="metric-value" style={{ fontSize: 16 }}>{activeEmployees}</div><div className="text-xs text-muted">Active</div></div>
            <div><div className="metric-value" style={{ fontSize: 16 }}>{fmt(totalPayroll)}</div><div className="text-xs text-muted">Total/mo</div></div>
          </div>
          <div className="metric-link">Open →</div>
        </div>

        <div className="metric-card" onClick={() => navigate('/ai-advisor')}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, #ec4899, #db2777)', borderRadius: '14px 14px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
          <div className="metric-icon">🤖</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>AI Advisor</div>
          <div className="text-xs text-muted" style={{ marginBottom: 10 }}>Ask questions about your business data</div>
          <div style={{ color: '#ec4899', fontSize: 13, fontWeight: 600 }}>Live</div>
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>Claude-powered</div>
          <div className="metric-link">Open →</div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip" style={{ marginBottom: 14 }}>
        <div className="kpi-item">
          <div className="kpi-label">Website net/mo</div>
          <div className={`kpi-value ${netProfit < 0 ? 'text-red' : 'text-green'}`}>{netProfit < 0 ? '-' : ''}{fmt(Math.abs(netProfit))}</div>
          <div className="kpi-sub">0.0% margin</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Agency payroll</div>
          <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>{fmt(totalPayroll)}</div>
          <div className="kpi-sub">{rc?.employees?.length || 0} services</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">HR payroll/mo</div>
          <div className="kpi-value text-purple">{fmt(totalPayroll)}</div>
          <div className="kpi-sub">{activeEmployees} employees</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Break-even</div>
          <div className="kpi-value" style={{ color: 'var(--accent-yellow)' }}>{breakEven === Infinity ? '∞' : breakEven}</div>
          <div className="kpi-sub">Closing {closes}/mo</div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid-2" style={{ gap: 14 }}>
        {/* Website P&L */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Website P&L</div>
          </div>
          {plItems.map((item, i) => (
            <div key={i} className="pl-bar-row">
              <div className="pl-bar-label">{item.label}</div>
              <div className="pl-bar-track">
                <div
                  className={`pl-bar-fill ${item.value >= 0 ? 'positive' : 'negative'}`}
                  style={{ width: `${Math.min((Math.abs(item.value) / maxAbsValue) * 100, 100)}%` }}
                />
              </div>
              <div className={`pl-bar-value ${item.value < 0 ? 'negative' : item.value > 0 ? 'positive' : ''}`}>
                {item.value < 0 ? '-' : ''}{fmt(Math.abs(item.value))}
              </div>
            </div>
          ))}
        </div>

        {/* Payroll by Department */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">👥 Payroll by Department</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>DEPT</th>
                <th style={{ textAlign: 'center' }}>PEOPLE</th>
                <th style={{ textAlign: 'right' }}>TOTAL / MO</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(deptMap).map(([dept, info]) => (
                <tr key={dept}>
                  <td><span className={`dept-badge ${deptColors[dept] || 'delivery'}`}>{dept}</span></td>
                  <td style={{ textAlign: 'center' }}>{info.count}</td>
                  <td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>CA${info.totalCad.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="alert danger" style={{ marginTop: 14 }}>
        <div className="alert-dot" />
        <div>
          <strong>Website business needs more volume</strong><br />
          <span style={{ fontSize: 12, opacity: 0.85 }}>
            Need {breakEven === Infinity ? '∞' : breakEven} sites/mo to break even (closing {closes}). Agency payroll {fmt(totalPayroll)}/mo. HR payroll {fmt(totalPayroll)}/mo.
          </span>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
