import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// hrOnly items are hidden for non-HR roles (App.jsx also refuses to render those views)
const NAV_ITEMS = [
  { view: 'home', icon: 'fa-gauge-high', label: 'Dashboard', hrOnly: true },
  { view: 'wizard', icon: 'fa-wand-magic-sparkles', label: 'Onboarding' },
  { view: 'approvals', icon: 'fa-clipboard-check', label: 'Approvals', hrOnly: true },
  { view: 'recruitment', icon: 'fa-user-plus', label: 'Recruitment', hrOnly: true },
  { view: 'dashboard', icon: 'fa-users-gear', label: 'Directory', hrOnly: true },
  { view: 'services', icon: 'fa-headset', label: 'Services & AI', hrOnly: true },
  { view: 'exit', icon: 'fa-person-walking-arrow-right', label: 'Offboarding' },
  { view: 'analytics', icon: 'fa-chart-pie', label: 'HR Analytics', hrOnly: true },
  { view: 'whatsapp', icon: 'fa-comments', label: 'WhatsApp Discovery' },
];

export default function Sidebar({ currentView, setCurrentView, isCollapsed, isMobileOpen, toggleCollapse }) {
  const { currentUser, logout } = useAuth();
  const { showToast } = useToast();

  const isHR = currentUser?.role === 'hr';
  const displayName = currentUser?.name?.split(' (')[0] || 'User';
  const roleLabel = currentUser?.badge || (isHR ? 'HR Administrator' : 'Employee');
  const avatar = currentUser?.avatar || displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
  };

  return (
    <aside
      className={`sidebar navbar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
      id="appSidebar"
      aria-label="Main navigation"
    >
      <div className="sidebar-top">
        <div className="brand">
          <div className="brand-icon">
            <i className="fa-solid fa-cube"></i>
          </div>
          <div className="brand-text">
            <span className="brand-title">AutomationEdge</span>
            <span className="brand-subtitle">HR Suite</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>

        <div className="sidebar-section-title">Main navigation</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.filter((item) => isHR || !item.hrOnly).map((item) => (
            <button
              key={item.view}
              className={`nav-tab-btn ${currentView === item.view ? 'active' : ''}`}
              onClick={() => setCurrentView(item.view)}
              aria-current={currentView === item.view ? 'page' : undefined}
            >
              {currentView === item.view && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="nav-active-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}
              <i className={`fa-solid ${item.icon}`}></i>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="user-avatar" aria-hidden="true">{avatar}</div>
          <div className="user-meta">
            <div className="user-name" title={displayName}>{displayName}</div>
            <span className="badge badge-verified user-role">{roleLabel}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout" aria-label="Log out">
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </aside>
  );
}
