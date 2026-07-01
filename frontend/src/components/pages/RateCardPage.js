import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RateCardPage = () => {
  const { isManager } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rateCard, setRateCard] = useState(null);

  useEffect(() => {
    api.get('/rate-card')
      .then(({ data: res }) => { setData(res.data); setRateCard(res.data.rateCard); })
      .catch(() => toast.error('Failed to load rate card'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/rate-card', rateCard);
      toast.success('Rate card saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const togglePackage = (idx) => {
    const updated = [...rateCard.services];
    updated[idx] = { ...updated[idx], selectedInPackage: !updated[idx].selectedInPackage };
    setRateCard(rc => ({ ...rc, services: updated }));
  };

  const addService = () => {
    setRateCard(rc => ({ ...rc, services: [...(rc.services || []), { name: 'New Service', assignedRole: '', customMarkupPercent: null, isActive: true, selectedInPackage: false }] }));
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading rate card...</div>;
  if (!data || !rateCard) return null;

  const { employees, settings } = data;
  const markup = rateCard.defaultMarkupPercent / 100;
  const effectiveMargin = parseFloat(((markup / (1 + markup)) * 100).toFixed(1));

  // Package builder
  const selectedServices = (rateCard.services || []).filter(s => s.selectedInPackage && s.isActive);
  const packageCost = selectedServices.reduce((sum, s) => {
    if (s.hourlyRateCad && s.hoursPerClient) return sum + s.hourlyRateCad * s.hoursPerClient;
    const emp = employees.find(e => e.role === s.assignedRole);
    return sum + (emp ? emp.costPerClientCad || 0 : 0);
  }, 0);
  const packagePrice = parseFloat((packageCost * (1 + markup)).toFixed(2));
  const packageProfit = parseFloat((packagePrice - packageCost).toFixed(2));

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Agency Rate Card</h2>
        {isManager && <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? '💾 Saving...' : '💾 Save'}</button>}
      </div>

      {/* Config Cards */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Default Markup %</div>
          <input type="range" className="form-slider" min={0} max={500} value={rateCard.defaultMarkupPercent}
            onChange={e => setRateCard(rc => ({ ...rc, defaultMarkupPercent: +e.target.value }))} />
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-blue)' }}>{rateCard.defaultMarkupPercent}%</div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Effective Margin</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)' }}>{effectiveMargin}%</div>
          <div className="text-xs text-muted">Profit ÷ Revenue</div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Active Projects / Mo</div>
          <input type="number" className="form-input" value={rateCard.activeProjectsPerMonth}
            onChange={e => setRateCard(rc => ({ ...rc, activeProjectsPerMonth: +e.target.value }))} />
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Working Hrs/Person/Mo</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{settings?.workingHoursPerMonth || 160}</div>
          <div className="text-xs text-muted">8h × 5d × 4wk</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 14 }}>
        {/* Services */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 Services & Markup</div>
            {isManager && <button className="btn btn-secondary btn-xs" onClick={addService}>+ Add Service</button>}
          </div>
          <table className="data-table">
            <thead><tr><th>Service</th><th>Assigned Role</th><th style={{ textAlign: 'right' }}>Markup %</th><th>Package</th></tr></thead>
            <tbody>
              {(rateCard.services || []).filter(s => s.isActive).map((s, i) => (
                <tr key={i}>
                  <td>
                    <input className="form-input" style={{ padding: '3px 6px', fontSize: 12 }} value={s.name}
                      onChange={e => { const svcs = [...rateCard.services]; svcs[i] = { ...svcs[i], name: e.target.value }; setRateCard(rc => ({ ...rc, services: svcs })); }} />
                  </td>
                  <td className="text-xs text-muted">{s.assignedRole || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input type="number" className="form-input" style={{ width: 70, padding: '3px 6px', fontSize: 12, textAlign: 'right' }}
                      placeholder={`${rateCard.defaultMarkupPercent}`} value={s.customMarkupPercent ?? ''}
                      onChange={e => { const svcs = [...rateCard.services]; svcs[i] = { ...svcs[i], customMarkupPercent: e.target.value ? +e.target.value : null }; setRateCard(rc => ({ ...rc, services: svcs })); }} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={s.selectedInPackage || false} onChange={() => togglePackage(i)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Team Capacity */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>👥 Team Cost Per Client</div>
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Dept</th><th style={{ textAlign: 'center' }}>Capacity</th><th style={{ textAlign: 'right' }}>CA$/Client</th></tr></thead>
              <tbody>
                {employees.slice(0, 12).map(emp => (
                  <tr key={emp._id}>
                    <td style={{ fontWeight: 500, fontSize: 12 }}>{emp.name}</td>
                    <td className="text-xs text-muted" style={{ fontSize: 11 }}>{emp.department?.split(' & ')[0]}</td>
                    <td style={{ textAlign: 'center', fontSize: 12 }}>{emp.clientsPerPersonPerMonth}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-cyan)', fontSize: 12 }}>CA${emp.costPerClientCad?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Package Builder */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 10 }}>📦 Package Builder</div>
            {selectedServices.length === 0
              ? <p className="text-xs text-muted">Check services above to build a package</p>
              : (
                <>
                  <div className="text-sm" style={{ marginBottom: 8 }}>Selected: {selectedServices.map(s => s.name).join(', ')}</div>
                  <div className="divider" />
                  <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                    <span className="text-secondary text-sm">Cost to Deliver</span>
                    <span className="font-semibold text-red">CA${packageCost.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                    <span className="text-secondary text-sm">Your Retail Price</span>
                    <span className="font-bold text-blue" style={{ fontSize: 16 }}>CA${packagePrice.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                    <span className="text-secondary text-sm">Profit/Client/Mo</span>
                    <span className="font-bold text-green" style={{ fontSize: 16 }}>CA${packageProfit.toFixed(0)}</span>
                  </div>
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateCardPage;
