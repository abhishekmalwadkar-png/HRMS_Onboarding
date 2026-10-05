import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Sidebar({ currentView, setCurrentView, isCollapsed, toggleCollapse }) {
  const { currentUser, logout, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();

  const isHR = currentUser?.role === 'hr';

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
  };

  return (
    <aside className={`sidebar navbar ${isCollapsed ? 'collapsed' : ''}`} id="appSidebar">
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-icon">
            <i className="fa-solid fa-mango"></i>
          </div>
          <div className="brand-text">
            <span className="brand-title">MangoHRMS</span>
            <span className="brand-subtitle">Enterprise Suite</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <i className={`fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>

        <div className="sidebar-section-title">Main Navigation</div>

        <nav className="sidebar-nav">
          <button
            className={`nav-tab-btn ${currentView === 'wizard' ? 'active' : ''}`}
            onClick={() => setCurrentView('wizard')}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span className="nav-label">Onboarding</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === 'approvals' ? 'active' : ''}`}
            onClick={() => setCurrentView('approvals')}
          >
            <i className="fa-solid fa-clipboard-check"></i>
            <span className="nav-label">Approvals</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === 'recruitment' ? 'active' : ''}`}
            onClick={() => setCurrentView('recruitment')}
          >
            <i className="fa-solid fa-user-plus"></i>
            <span className="nav-label">Recruitment</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <i className="fa-solid fa-users-gear"></i>
            <span className="nav-label">Directory</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === 'services' ? 'active' : ''}`}
            onClick={() => setCurrentView('services')}
          >
            <i className="fa-solid fa-headset"></i>
            <span className="nav-label">Services & AI</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === 'exit' ? 'active' : ''}`}
            onClick={() => setCurrentView('exit')}
          >
            <i className="fa-solid fa-person-walking-arrow-right"></i>
            <span className="nav-label">Offboarding</span>
          </button>

          <button
            className={`nav-tab-btn ${currentView === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentView('analytics')}
          >
            <i className="fa-solid fa-chart-pie"></i>
            <span className="nav-label">HR Analytics</span>
          </button>
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-controls">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title="Toggle Dark/Light Mode"
          >
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Theme Mode</span>
        </div>

        <div className="sidebar-user-card">
          <div
            className="avatar"
            style={{
              width: '36px',
              height: '36px',
              fontSize: '0.95rem',
              fontWeight: 700,
              background: 'var(--accent-gradient)',
              color: '#fff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)',
            }}
          >
            {currentUser?.avatar || 'P'}
          </div>
          <div className="user-meta" style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.82rem',
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentUser?.name?.split(' (')[0] || 'Pooja Deshmukh'}
            </div>
            <span
              className="badge badge-verified"
              style={{ fontSize: '0.62rem', padding: '1px 6px', marginTop: '2px' }}
            >
              HR Administrator
            </span>
          </div>
          <button
            className="icon-btn"
            onClick={handleLogout}
            style={{
              padding: '0.45rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              color: 'var(--accent-rose)',
              background: 'rgba(225, 29, 72, 0.08)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Logout"
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </aside>
  );
}
