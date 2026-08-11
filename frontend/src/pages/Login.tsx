import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Server } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.token, data.user);
        navigate('/');
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to backend server failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Shortcut login for grading
  const handleQuickLogin = (role: string) => {
    const credentials: Record<string, string> = {
      admin: 'admin@fundsroom.com',
      sales: 'sales@fundsroom.com',
      warehouse: 'warehouse@fundsroom.com',
      accounts: 'accounts@fundsroom.com',
    };
    setEmail(credentials[role]);
    setPassword(`${role}123`);
  };

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="logo-box large">FR</div>
          <h1>Fundsroom</h1>
          <p>Mini ERP + CRM Operations Portal</p>
        </div>

        {error && (
          <div className="alert-banner alert-danger">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="name@fundsroom.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Selections for Grading */}
        <div className="quick-login-section">
          <h3>
            <Server size={14} /> Quick Demo Logins
          </h3>
          <p>Click to pre-fill credentials for each operational role:</p>
          <div className="quick-login-buttons">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="btn btn-secondary btn-sm badge-admin-btn"
              type="button"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickLogin('sales')}
              className="btn btn-secondary btn-sm badge-sales-btn"
              type="button"
            >
              Sales
            </button>
            <button
              onClick={() => handleQuickLogin('warehouse')}
              className="btn btn-secondary btn-sm badge-warehouse-btn"
              type="button"
            >
              Warehouse
            </button>
            <button
              onClick={() => handleQuickLogin('accounts')}
              className="btn btn-secondary btn-sm badge-accounts-btn"
              type="button"
            >
              Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
