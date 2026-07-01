import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './components/pages/LoginPage';
import HomePage from './components/pages/HomePage';
import UnitEconomicsPage from './components/pages/UnitEconomicsPage';
import RateCardPage from './components/pages/RateCardPage';
import PayrollPage from './components/pages/PayrollPage';
import PlModelPage from './components/pages/PlModelPage';
import SettingsPage from './components/pages/SettingsPage';
import AiAdvisorPage from './components/pages/AiAdvisorPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" />Loading...</div>;
  return user ? <Navigate to="/" replace /> : children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
      <Route index element={<HomePage />} />
      <Route path="unit-economics" element={<UnitEconomicsPage />} />
      <Route path="rate-card" element={<RateCardPage />} />
      <Route path="payroll" element={<PayrollPage />} />
      <Route path="pl-model" element={<PlModelPage />} />
      <Route path="ai-advisor" element={<AiAdvisorPage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1e2a', color: '#e8ecf4', border: '1px solid #2a2f3d', fontSize: '13px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#1a1e2a' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#1a1e2a' } },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
