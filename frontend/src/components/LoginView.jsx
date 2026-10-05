import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginView() {
  const { loginAs } = useAuth();
  const { showToast } = useToast();

  const [hrEmail, setHrEmail] = useState('pooja.deshmukh@automationedge.ai');
  const [hrPassword, setHrPassword] = useState('••••••••');

  const handleHRSubmit = (e) => {
    e.preventDefault();
    loginAs('hr', hrEmail, 'Pooja Deshmukh (HR Operations Director)');
    showToast('👋 Welcome back, Pooja Deshmukh! (HR Administrator)', 'success');
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-modal-box">
        <div className="login-brand-header">
          <div className="brand" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
            <div className="brand-icon">
              <i className="fa-solid fa-cube"></i>
            </div>
            <span className="brand-title">AutomationEdge HR</span>
          </div>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span className="badge badge-verified" style={{ fontSize: '0.78rem', padding: '3px 10px' }}>
              <i className="fa-solid fa-shield-halved"></i> HR Administrator Portal
            </span>
          </div>
        </div>

        <div>
          <form onSubmit={handleHRSubmit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                HR Work Email
              </label>
              <input
                type="email"
                className="form-control"
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                Password
              </label>
              <input
                type="password"
                className="form-control"
                value={hrPassword}
                onChange={(e) => setHrPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', background: 'var(--button-gradient)', borderColor: 'transparent', fontWeight: 800 }}
            >
              <i className="fa-solid fa-arrow-right-to-bracket"></i> Login to HR Dashboard
            </button>
            <p style={{ textAlign: 'center', marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-circle-info"></i> Demo environment: credentials are pre-filled.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
