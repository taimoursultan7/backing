// ============================================================
// Login Page Component
// Supports Admin, Employee, Customer roles
// ============================================================

import React, { useState } from 'react';
import { User, ThemeMode } from '../types';
import { authenticateUser } from '../utils/helpers';

interface LoginPageProps {
  onLogin: (user: User) => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
}

type LoginRole = 'admin' | 'employee' | 'customer';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, theme, onThemeToggle }) => {
  const [activeRole, setActiveRole] = useState<LoginRole>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role: LoginRole) => {
    setActiveRole(role);
    if (role === 'admin') { setUsername('admin'); setPassword('admin123'); }
    else if (role === 'employee') { setUsername('employee'); setPassword('emp123'); }
    else { setUsername('customer'); setPassword('cust123'); }
    setError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      try {
        const user = authenticateUser(username.trim(), password.trim());
        onLogin(user);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Login failed.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="login-page">
      <div className="login-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Theme toggle */}
      <button
        onClick={onThemeToggle}
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '10px', width: '40px', height: '40px', color: 'white',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', backdropFilter: 'blur(10px)' }}
      >
        <i className={`bi ${theme === 'light' ? 'bi-moon-stars-fill' : 'bi-sun-fill'}`}></i>
      </button>

      <div className="login-container">
        {/* Left Brand Side */}
        <div className="login-brand">
          <div className="login-brand-logo">
            <i className="bi bi-bank2"></i>
          </div>
          <h1>NexaBank</h1>
          <p>Pakistan's Premium Digital Banking Platform</p>
          <div className="login-features">
            {[
              { icon: 'bi-shield-lock-fill', text: 'Bank-Grade Security & Encryption' },
              { icon: 'bi-lightning-charge-fill', text: 'Real-Time Transactions & Alerts' },
              { icon: 'bi-graph-up-arrow', text: 'Advanced Analytics Dashboard' },
              { icon: 'bi-people-fill', text: 'Complete Customer Management' },
              { icon: 'bi-file-earmark-pdf-fill', text: 'PDF Statements & CSV Reports' },
            ].map((f, i) => (
              <div className="login-feature" key={i}>
                <i className={`bi ${f.icon}`}></i>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Login Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h2>Welcome Back</h2>
            <p>Sign in to access your banking dashboard</p>
          </div>

          {/* Role Tabs */}
          <div className="login-tabs">
            {(['admin', 'employee', 'customer'] as LoginRole[]).map(role => (
              <button
                key={role}
                className={`login-tab ${activeRole === role ? 'active' : ''}`}
                onClick={() => handleRoleSelect(role)}
              >
                <i className={`bi ${role === 'admin' ? 'bi-person-badge' : role === 'employee' ? 'bi-person-workspace' : 'bi-person-circle'}`}></i>
                {' '}{role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="form-input-wrap">
                <i className="bi bi-person-fill form-input-icon"></i>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-input-wrap">
                <i className="bi bi-lock-fill form-input-icon"></i>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="form-input-action" onClick={() => setShowPass(p => !p)}>
                  <i className={`bi ${showPass ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
                color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="bi bi-exclamation-triangle-fill"></i>
                {error}
              </div>
            )}

            <div className="form-options">
              <label className="remember-label">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                Remember me
              </label>
              <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); setError('Please contact your administrator.'); }}>
                Forgot password?
              </a>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? (
                <><i className="bi bi-arrow-clockwise" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}></i> Signing in...</>
              ) : (
                <><i className="bi bi-box-arrow-in-right"></i> Sign In to NexaBank</>
              )}
            </button>
          </form>

          {/* Quick login cards */}
          <div className="login-credentials">
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem', textAlign: 'center' }}>
              Click Any Role to Quick Login:
            </p>
            <div className="credentials-grid">
              {[
                { role: 'admin' as LoginRole, label: 'ADMIN', user: 'admin / admin123', pass: 'admin123' },
                { role: 'employee' as LoginRole, label: 'EMPLOYEE', user: 'employee / emp123', pass: 'emp123' },
                { role: 'customer' as LoginRole, label: 'CUSTOMER', user: 'customer / cust123', pass: 'cust123' },
              ].map(c => (
                <div key={c.role} className="cred-card"
                  title={`Quick Sign-in as ${c.label}`}
                  onClick={() => {
                    handleRoleSelect(c.role);
                    setError('');
                    setLoading(true);
                    setTimeout(() => {
                      try {
                        const user = authenticateUser(c.role, c.pass);
                        onLogin(user);
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : 'Login failed.');
                        setLoading(false);
                      }
                    }, 400);
                  }}
                >
                  <div className="cred-role">{c.label}</div>
                  <div className="cred-user">{c.user}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LoginPage;
