import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { section: 'OVERVIEW', items: [{ to: '/', label: 'Home', icon: '🏠', end: true }] },
  {
    section: 'FINANCE',
    items: [
      { to: '/unit-economics', label: 'Unit Economics', icon: '📊' },
      { to: '/rate-card', label: 'Rate Card', icon: '💼' },
      { to: '/payroll', label: 'Payroll', icon: '👥' },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { to: '/ai-advisor', label: 'AI Advisor', icon: '🤖' },
      { to: '/pl-model', label: 'P&L Model', icon: '💰' },
    ],
  },
  {
    section: 'SYSTEM',
    items: [{ to: '/settings', label: 'Settings', icon: '⚙️' }],
  },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">B1</div>
          <h1>Bizz1</h1>
          <p>BUSINESS HUB</p>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(section => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">Bizz1 Hub</div>
          <div className="topbar-actions">
            <span className="save-indicator">
              <span className="save-dot" />
              Saved
            </span>
            <span className="text-secondary text-sm" style={{ marginLeft: 8 }}>{user?.name}</span>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;