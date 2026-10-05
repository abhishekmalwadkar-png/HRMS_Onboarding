import React from 'react';
import { useAuth } from '../context/AuthContext';

const VIEW_TITLES = {
  approvals: 'HR Approvals & IT Hardware Provisioning',
  recruitment: 'Candidate Recruitment Pipeline',
  dashboard: 'Employee Directory & Master Records',
  wizard: 'Digital Onboarding & Offer Letter Acceptance',
  services: 'Employee Self-Service & Leave Management',
  exit: 'Employee Offboarding & Exit Management',
  analytics: 'Executive HR Analytics & Compliance',
};

export default function Header({ currentView, toggleSidebar, onAutoFill }) {
  const { currentUser } = useAuth();
  const isHR = currentUser?.role === 'hr';

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          id="sidebarToggle"
          title="Toggle Sidebar"
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="breadcrumb-container" id="currentViewBreadcrumb">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Enterprise Portal</span>
          <span style={{ color: 'var(--border-orange-strong)', margin: '0 5px' }}>/</span>
          <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
            {VIEW_TITLES[currentView] || 'Overview'}
          </strong>
        </div>
      </div>

      <div className="top-header-right">
        {!isHR && currentView === 'wizard' && (
          <button
            className="btn btn-secondary"
            onClick={onAutoFill}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              borderColor: 'var(--border-orange)',
              background: 'var(--bg-accent-soft)',
              fontWeight: 700,
              color: 'var(--brand-orange)',
            }}
            title="Pre-fill candidate profile data into Onboarding Wizard"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-accent"></i> Auto-Fill
          </button>
        )}
      </div>
    </header>
  );
}
