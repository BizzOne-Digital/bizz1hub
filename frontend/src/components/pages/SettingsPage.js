import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { user, isAdmin, changePassword } = useAuth();
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('global');

  // Password form
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  // New user form
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/settings');
        setSettings(data.data.settings);
        if (isAdmin) {
          const usersRes = await api.get('/auth/users');
          setUsers(usersRes.data.data.users);
        }
      } catch { toast.error('Failed to load settings'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [isAdmin]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/settings', {
        usdToCad: parseFloat(settings.usdToCad),
        pkrPerUsd: parseFloat(settings.pkrPerUsd),
        workingHoursPerMonth: parseInt(settings.workingHoursPerMonth),
        companyName: settings.companyName,
        companyTagline: settings.companyTagline,
      });
      setSettings(data.data.settings);
      toast.success('Settings saved');
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPassLoading(true);
    try {
      await changePassword(passForm.currentPassword, passForm.newPassword);
      toast.success('Password changed. Please log in again.');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to change password'); }
    finally { setPassLoading(false); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserLoading(true);
    try {
      await api.post('/auth/users', newUser);
      toast.success(`User ${newUser.name} created`);
      const { data } = await api.get('/auth/users');
      setUsers(data.data.users);
      setNewUser({ name: '', email: '', password: '', role: 'viewer' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to create user'); }
    finally { setUserLoading(false); }
  };

  const handleToggleUser = async (userId, isActive) => {
    try {
      await api.patch(`/auth/users/${userId}`, { isActive: !isActive });
      setUsers(u => u.map(x => x._id === userId ? { ...x, isActive: !isActive } : x));
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update user'); }
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading settings...</div>;

  const cadToPkr = settings ? parseFloat((settings.pkrPerUsd / settings.usdToCad).toFixed(2)) : 205;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Settings</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { id: 'global', label: '⚙️ Global Config' },
          { id: 'security', label: '🔒 Security' },
          ...(isAdmin ? [{ id: 'users', label: '👤 Users' }] : []),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-ghost btn-sm"
            style={{
              borderRadius: '6px 6px 0 0',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'global' && settings && (
        <div style={{ maxWidth: 560 }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header"><div className="card-title">💱 Exchange Rates</div></div>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">USD → CAD Rate</label>
                <input type="number" step="0.01" className="form-input" value={settings.usdToCad}
                  onChange={e => setSettings(s => ({ ...s, usdToCad: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">PKR per 1 USD</label>
                <input type="number" className="form-input" value={settings.pkrPerUsd}
                  onChange={e => setSettings(s => ({ ...s, pkrPerUsd: e.target.value }))} />
              </div>
            </div>
            <div className="alert info" style={{ marginTop: 0, padding: '8px 12px' }}>
              <span style={{ fontSize: 12 }}>Calculated: <strong>1 CAD ≈ {cadToPkr} PKR</strong></span>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header"><div className="card-title">⏰ Work Schedule</div></div>
            <div className="form-group">
              <label className="form-label">Working Hours / Person / Month</label>
              <input type="number" className="form-input" value={settings.workingHoursPerMonth}
                onChange={e => setSettings(s => ({ ...s, workingHoursPerMonth: e.target.value }))} />
            </div>
            <p className="text-xs text-muted">Standard: 8h × 5d × 4wk = 160h</p>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header"><div className="card-title">🏢 Company Identity</div></div>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input type="text" className="form-input" value={settings.companyName || ''}
                onChange={e => setSettings(s => ({ ...s, companyName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tagline</label>
              <input type="text" className="form-input" value={settings.companyTagline || ''}
                onChange={e => setSettings(s => ({ ...s, companyTagline: e.target.value }))} />
            </div>
          </div>

          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? '💾 Saving...' : '💾 Save Settings'}
          </button>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>📌 About This Hub</div>
            <p className="text-sm text-secondary" style={{ lineHeight: 1.7 }}>
              All financial calculations across Unit Economics, Rate Card, Payroll, and P&L Model pull from these global settings. Changing exchange rates here updates every module instantly.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{ maxWidth: 400 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">🔑 Change Your Password</div></div>
            <p className="text-xs text-muted" style={{ marginBottom: 14 }}>Logged in as: <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong></p>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" value={passForm.currentPassword}
                  onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password <span className="text-muted">(min 8 characters)</span></label>
                <input type="password" className="form-input" value={passForm.newPassword}
                  onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" value={passForm.confirmPassword}
                  onChange={e => setPassForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={passLoading}>
                {passLoading ? 'Updating...' : '🔒 Update Password'}
              </button>
            </form>
          </div>

          <div className="alert info" style={{ marginTop: 14 }}>
            <div className="alert-dot" />
            <div className="text-sm">Changing your password will log you out of all other devices for security.</div>
          </div>
        </div>
      )}

      {activeTab === 'users' && isAdmin && (
        <div>
          <div className="card" style={{ marginBottom: 14, maxWidth: 480 }}>
            <div className="card-header"><div className="card-title">➕ Create New User</div></div>
            <form onSubmit={handleCreateUser}>
              <div className="grid-2" style={{ gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input type="text" className="form-input" value={newUser.name}
                    onChange={e => setNewUser(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={newUser.email}
                    onChange={e => setNewUser(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" value={newUser.password}
                    onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))} required minLength={8} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={newUser.role}
                    onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))}>
                    <option value="viewer">Viewer (read-only)</option>
                    <option value="manager">Manager (read + edit)</option>
                    <option value="admin">Admin (full access)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={userLoading}>
                {userLoading ? 'Creating...' : '➕ Create User'}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">👤 All Users ({users.length})</div></div>
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th></th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td className="text-secondary">{u.email}</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: u.role === 'admin' ? 'rgba(239,68,68,0.15)' : u.role === 'manager' ? 'rgba(59,127,245,0.15)' : 'rgba(100,100,100,0.15)', color: u.role === 'admin' ? 'var(--accent-red)' : u.role === 'manager' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.isActive ? 'paid' : 'overdue'}`}>
                        {u.isActive ? '✓ Active' : '✗ Inactive'}
                      </span>
                    </td>
                    <td className="text-muted text-xs">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                    <td>
                      {u._id !== user?._id && (
                        <button className="btn btn-ghost btn-xs" onClick={() => handleToggleUser(u._id, u.isActive)}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
