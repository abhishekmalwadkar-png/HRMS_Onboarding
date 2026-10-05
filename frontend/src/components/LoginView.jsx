import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginView() {
  const { loginAs } = useAuth();
  const { showToast } = useToast();
  const [selectedRole, setSelectedRole] = useState('hr');

  // HR Form State
  const [hrEmail, setHrEmail] = useState('pooja.deshmukh@mangohrms.com');
  const [hrPassword, setHrPassword] = useState('••••••••');

  // Candidate Form State
  const [candName, setCandName] = useState('Sneha Rao');
  const [candEmail, setCandEmail] = useState('sneha.rao@mangohrms.com');
  const [candPin, setCandPin] = useState('123456');

  const handleHRSubmit = (e) => {
    e.preventDefault();
    loginAs('hr', hrEmail, 'Pooja Deshmukh (HR Operations Director)');
    showToast('👋 Welcome back, Pooja Deshmukh! (HR Administrator)', 'success');
  };

  const handleCandSubmit = (e) => {
    e.preventDefault();
    loginAs('candidate', candEmail, candName);
    showToast(`👋 Welcome back, ${candName}! (Candidate / New Hire)`, 'success');
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-modal-box">
        <div className="login-brand-header">
          <div className="brand" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
            <div className="brand-icon">
              <i className="fa-solid fa-mango"></i>
            </div>
            <span className="brand-title">MangoHRMS Suite</span>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="login-role-tabs">
          <button
            type="button"
            className={`login-role-btn ${selectedRole === 'hr' ? 'active' : ''}`}
            onClick={() => setSelectedRole('hr')}
          >
            <i className="fa-solid fa-user-tie"></i> HR Administrator
          </button>
          <button
            type="button"
            className={`login-role-btn ${selectedRole === 'candidate' ? 'active' : ''}`}
            onClick={() => setSelectedRole('candidate')}
          >
            <i className="fa-solid fa-user"></i> Candidate / New Hire
          </button>
        </div>

        {/* HR Form */}
        {selectedRole === 'hr' && (
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
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', background: 'var(--accent-gradient)', borderColor: 'transparent', fontWeight: 800 }}
              >
                <i className="fa-solid fa-arrow-right-to-bracket"></i> Login as HR Administrator
              </button>
            </form>
          </div>
        )}

        {/* Candidate Form */}
        {selectedRole === 'candidate' && (
          <div>
            <form onSubmit={handleCandSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                  Candidate Full Legal Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                  Personal Email Address
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={candEmail}
                  onChange={(e) => setCandEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
                  Passcode / PIN
                </label>
                <input
                  type="password"
                  className="form-control"
                  value={candPin}
                  onChange={(e) => setCandPin(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', background: 'var(--accent-gradient)', borderColor: 'transparent', fontWeight: 800 }}
              >
                <i className="fa-solid fa-arrow-right-to-bracket"></i> Login as Candidate
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
