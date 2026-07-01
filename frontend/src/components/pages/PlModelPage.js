import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmt = (n) => {
  if (!n && n !== 0) return 'CA$0';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n < 0 ? '-' : ''}CA$${(abs / 1000).toFixed(1)}k`;
  return `${n < 0 ? '-' : ''}CA$${abs.toFixed(0)}`;
};

/* ── Smart number input: clears 0 on focus, never shows NaN ── */
const NumInput = ({ value, onChange, style, placeholder, min = 0 }) => {
  const [display, setDisplay] = useState(String(value ?? 0));

  useEffect(() => {
    setDisplay(String(value ?? 0));
  }, [value]);

  return (
    <input
      type="number"
      min={min}
      className="form-input"
      style={style}
      placeholder={placeholder}
      value={display}
      onFocus={e => { if (display === '0') { setDisplay(''); } e.target.select(); }}
      onBlur={() => {
        const v = parseFloat(display);
        const safe = isNaN(v) ? 0 : v;
        setDisplay(String(safe));
        onChange(safe);
      }}
      onChange={e => {
        setDisplay(e.target.value);
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
    />
  );
};

const PlModelPage = () => {
  const { isManager } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]  = useState(false);
  const [month, setMonth]    = useState(getCurrentMonth());
  const [pl, setPl]          = useState(null);

  const fetchPl = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/pl-model/${month}`);
      setData(res.data);
      setPl(res.data.pl);
    } catch { toast.error('Failed to load P&L'); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { fetchPl(); }, [fetchPl]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/pl-model/${month}`, pl);
      toast.success('Saved');
      fetchPl();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const resetAll = () => {
    if (!window.confirm('Reset all data for this month?')) return;
    setPl(p => ({
      ...p,
      retainerClients: [],
      extraIncome: [],
      marketingSpend: [],
      standardWebsiteClosesCount: 0,
      upsellClosesCount: 0,
      subscriptionsAndToolsCad: 0,
      videographerCad: 0,
      otherExpensesCad: 0,
    }));
  };

  /* ── Retainer helpers ── */
  const addRetainer = () => setPl(p => ({
    ...p,
    retainerClients: [...(p.retainerClients || []),
      { name: '', currency: 'CAD', monthlyFeeCad: 990, isActive: true }]
  }));
  const removeRetainer = (i) => setPl(p => ({
    ...p, retainerClients: p.retainerClients.filter((_, idx) => idx !== i)
  }));
  const updateRetainer = (i, field, val) => setPl(p => ({
    ...p, retainerClients: p.retainerClients.map((c, idx) => idx === i ? { ...c, [field]: val } : c)
  }));

  /* ── Extra income helpers ── */
  const addExtra = () => setPl(p => ({
    ...p, extraIncome: [...(p.extraIncome || []), { description: 'Job name', amountCad: 0 }]
  }));
  const removeExtra = (i) => setPl(p => ({
    ...p, extraIncome: p.extraIncome.filter((_, idx) => idx !== i)
  }));
  const updateExtra = (i, field, val) => setPl(p => ({
    ...p, extraIncome: p.extraIncome.map((e, idx) => idx === i ? { ...e, [field]: val } : e)
  }));

  /* ── Marketing helpers ── */
  const addMarketing = () => setPl(p => ({
    ...p, marketingSpend: [...(p.marketingSpend || []), { channel: '', amountCad: 0, newClientsGenerated: 0 }]
  }));
  const removeMarketing = (i) => setPl(p => ({
    ...p, marketingSpend: p.marketingSpend.filter((_, idx) => idx !== i)
  }));
  const updateMarketing = (i, field, val) => setPl(p => ({
    ...p, marketingSpend: p.marketingSpend.map((m, idx) => idx === i ? { ...m, [field]: val } : m)
  }));

  if (loading) return <div className="loading"><div className="spinner" />Loading P&L...</div>;
  if (!data || !pl) return null;

  const m   = data.metrics || {};
  const ue  = data.ue || {};
  const isLoss = m.netProfitCad < 0;

  /* live extra total */
  const extraTotal = (pl.extraIncome || []).reduce((s, e) => s + (e.amountCad || 0), 0);
  const retainerCount = (pl.retainerClients || []).filter(c => c.isActive).length;
  const retainerMrr   = (pl.retainerClients || []).filter(c => c.isActive).reduce((s, c) => s + (c.monthlyFeeCad || 0), 0);

  const sectionStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 22px',
    marginBottom: 14,
  };

  const sectionHead = (dot, title, badge, right) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</span>
        {badge && <span style={{ background: 'rgba(59,127,245,0.15)', color: 'var(--accent-blue)', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{badge}</span>}
      </div>
      {right && <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent-cyan)' }}>{right}</span>}
    </div>
  );

  return (
    <div>
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>MONTH</span>
          <input type="month" className="form-input"
            style={{ padding: '6px 10px', fontSize: 14, fontWeight: 600 }}
            value={month} onChange={e => setMonth(e.target.value)} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Each month saves separately · retainer roster &amp; costs are global
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isManager && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }} onClick={resetAll}>
              Reset all
            </button>
          )}
          {isManager && (
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? '💾 Saving...' : '↓ Save'}
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 18 }}>
        {[
          { label: 'TOTAL REVENUE',  val: fmt(m.totalRevenueCad),  sub: 'This month',           color: 'var(--text-primary)', large: true },
          { label: 'MRR',            val: fmt(m.mrrCad),           sub: `${m.activeRetainers || 0} retainer clients`, color: 'var(--accent-cyan)' },
          { label: 'NET PROFIT',     val: (isLoss ? '-' : '') + `CA$${Math.abs(m.netProfitCad || 0).toFixed(0)}`, sub: `${m.netMarginPercent?.toFixed(1)}% margin`, color: isLoss ? 'var(--accent-red)' : 'var(--accent-green)' },
          { label: 'CAC',            val: `CA$${m.cacCad?.toFixed(0) || 0}`, sub: 'per new client',    color: 'var(--accent-orange)' },
          { label: 'BLENDED LTV',    val: `CA$${m.blendedLtvCad?.toFixed(0) || 0}`, sub: 'per acquired client', color: 'var(--accent-cyan)' },
          { label: 'LTV:CAC',        val: `${m.ltvCacRatio || 0}:1`, sub: m.ltvCacRatio >= 3 ? '🟢 Excellent' : m.ltvCacRatio >= 2 ? '🟡 Good' : '🔴 Low', color: m.ltvCacRatio >= 3 ? 'var(--accent-green)' : m.ltvCacRatio >= 2 ? 'var(--accent-yellow)' : 'var(--accent-red)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: k.large ? 22 : 18, fontWeight: 700, color: k.color, lineHeight: 1.1 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>
        Revenue Streams
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* ══ LEFT: Websites & Retainers ══ */}
        <div style={sectionStyle}>
          {sectionHead('var(--accent-blue)', 'Websites & Retainers', null, fmt(retainerMrr + (pl.standardWebsiteClosesCount || 0) * (ue.standardPriceCad || 0)))}

          {/* Website Sales */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
            Website Sales
          </div>

          {/* Standard row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 130, flexShrink: 0 }}>Standard (CA$</span>
            <NumInput
              value={ue.standardPriceCad || 109}
              onChange={() => {}} /* read-only from unit economics */
              style={{ width: 80, padding: '5px 8px', fontSize: 13, color: 'var(--accent-cyan)' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginRight: 4 }}>)</span>
            <NumInput
              value={pl.standardWebsiteClosesCount || 0}
              onChange={v => setPl(p => ({ ...p, standardWebsiteClosesCount: v }))}
              style={{ width: 70, padding: '5px 8px', textAlign: 'center' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 40 }}>closes</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
              CA${((pl.standardWebsiteClosesCount || 0) * (ue.standardPriceCad || 0)).toFixed(0)}
            </span>
          </div>

          {/* Upsell row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 130, flexShrink: 0 }}>Upsell (CA$</span>
            <NumInput
              value={ue.upsellPriceCad || 207}
              onChange={() => {}}
              style={{ width: 80, padding: '5px 8px', fontSize: 13, color: 'var(--accent-cyan)' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginRight: 4 }}>)</span>
            <NumInput
              value={pl.upsellClosesCount || 0}
              onChange={v => setPl(p => ({ ...p, upsellClosesCount: v }))}
              style={{ width: 70, padding: '5px 8px', textAlign: 'center' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 40 }}>closes</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
              CA${((pl.upsellClosesCount || 0) * (ue.upsellPriceCad || 0)).toFixed(0)}
            </span>
          </div>

          {/* Retainer Clients */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Retainer Clients</span>
              <span style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                {retainerCount} CLIENTS · {fmt(retainerMrr)} MRR
              </span>
            </div>
            {isManager && (
              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent-blue)' }} onClick={addRetainer}>
                + Add client
              </button>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Each client has their own monthly price. These carry over every month.
          </div>

          {/* Retainer table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 20px', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CLIENT</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CURR</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MONTHLY</span>
            <span />
          </div>

          {(pl.retainerClients || []).map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 20px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ padding: '5px 8px', fontSize: 13 }}
                placeholder="Client name"
                value={c.name}
                onChange={e => updateRetainer(i, 'name', e.target.value)}
              />
              <select
                className="form-select"
                style={{ padding: '5px 8px', fontSize: 12 }}
                value={c.currency}
                onChange={e => updateRetainer(i, 'currency', e.target.value)}
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
                <option value="PKR">PKR</option>
              </select>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <NumInput
                  value={c.monthlyFeeCad}
                  onChange={v => updateRetainer(i, 'monthlyFeeCad', v)}
                  style={{ padding: '5px 8px', fontSize: 13, paddingRight: 28, width: '100%' }}
                />
                <span style={{ position: 'absolute', right: 8, fontSize: 11, color: 'var(--text-muted)', pointerEvents: 'none' }}>/mo</span>
              </div>
              <button onClick={() => removeRetainer(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
            </div>
          ))}

          {(pl.retainerClients || []).length === 0 && (
            <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: 12 }}>
              No retainer clients yet
            </div>
          )}

          {isManager && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 8, border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}
              onClick={addRetainer}
            >
              + Add retainer client
            </button>
          )}

          {/* New retainer clients count for CAC */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>New retainer clients added this month</span>
            <NumInput
              value={pl.newRetainerClientsCount || 0}
              onChange={v => setPl(p => ({ ...p, newRetainerClientsCount: v }))}
              style={{ width: 60, padding: '4px 8px', textAlign: 'center', fontSize: 12 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>for CAC</span>
          </div>
        </div>

        {/* ══ RIGHT: Extra Income ══ */}
        <div style={sectionStyle}>
          {sectionHead('var(--accent-purple)', 'Extra / One-Time Income', null, `CA$${extraTotal.toFixed(0)}`)}

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            One-time jobs this month — custom builds, brand kits, rush design, one-off campaigns. Resets each month.
          </div>

          {/* Extra income rows */}
          {(pl.extraIncome || []).map((e, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 20px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ padding: '5px 8px', fontSize: 13 }}
                placeholder="Description"
                value={e.description}
                onChange={ev => updateExtra(i, 'description', ev.target.value)}
              />
              <select className="form-select" style={{ padding: '5px 8px', fontSize: 12 }}>
                <option>CAD</option>
              </select>
              <NumInput
                value={e.amountCad}
                onChange={v => updateExtra(i, 'amountCad', v)}
                style={{ padding: '5px 8px', fontSize: 13, width: '100%' }}
              />
              <button onClick={() => removeExtra(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
            </div>
          ))}

          {isManager && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 4, border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}
              onClick={addExtra}
            >
              + Add extra income
            </button>
          )}
        </div>
      </div>

      {/* ── Expenses + Marketing ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Expenses */}
        <div style={sectionStyle}>
          {sectionHead('var(--accent-red)', 'Monthly Expenses', null, `CA$${(m.totalCostsCad || 0).toFixed(0)}`)}

          {[
            { label: 'Team Payroll', value: `CA$${m.totalPayrollCad?.toFixed(0) || 0}`, readOnly: true },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 13 }}>{item.value} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(auto)</span></span>
            </div>
          ))}

          {[
            { label: 'Subscriptions & Tools', field: 'subscriptionsAndToolsCad' },
            { label: 'Videographer', field: 'videographerCad' },
            { label: 'Other Expenses', field: 'otherExpensesCad' },
          ].map(item => (
            <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
              <NumInput
                value={pl[item.field] || 0}
                onChange={v => setPl(p => ({ ...p, [item.field]: v }))}
                style={{ width: 110, padding: '4px 8px', textAlign: 'right', fontSize: 13 }}
              />
            </div>
          ))}
        </div>

        {/* Marketing Spend */}
        <div style={sectionStyle}>
          {sectionHead('var(--accent-orange)', 'Marketing Spend', null,
            `CA$${(pl.marketingSpend || []).reduce((s, x) => s + (x.amountCad || 0), 0).toFixed(0)}`)}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 20px', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CHANNEL</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AMOUNT</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>NEW CLIENTS</span>
            <span />
          </div>

          {(pl.marketingSpend || []).map((ms, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 20px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input className="form-input" style={{ padding: '5px 8px', fontSize: 13 }}
                placeholder="e.g. Meta Ads" value={ms.channel}
                onChange={e => updateMarketing(i, 'channel', e.target.value)} />
              <NumInput value={ms.amountCad} onChange={v => updateMarketing(i, 'amountCad', v)}
                style={{ padding: '5px 8px', fontSize: 13, width: '100%' }} />
              <NumInput value={ms.newClientsGenerated} onChange={v => updateMarketing(i, 'newClientsGenerated', v)}
                style={{ padding: '5px 8px', fontSize: 13, width: '100%' }} />
              <button onClick={() => removeMarketing(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
            </div>
          ))}

          {isManager && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 4, border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}
              onClick={addMarketing}
            >
              + Add channel
            </button>
          )}

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total marketing</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                CA${(pl.marketingSpend || []).reduce((s, x) => s + (x.amountCad || 0), 0).toFixed(0)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>CAC</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-blue)', fontSize: 13 }}>
                CA${m.cacCad?.toFixed(0) || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert ── */}
      {isLoss && (
        <div className="alert danger" style={{ marginTop: 14 }}>
          <div className="alert-dot" />
          <div>
            <strong>Running at a loss:</strong> Costs (CA${m.totalCostsCad?.toFixed(0)}) exceed revenue (CA${m.totalRevenueCad?.toFixed(0)}) by CA${Math.abs(m.netProfitCad || 0).toFixed(0)}.
            {m.neededToBreakEven > 0 && ` Need ${m.neededToBreakEven} more retainer${m.neededToBreakEven > 1 ? 's' : ''} at current avg to break even.`}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlModelPage;