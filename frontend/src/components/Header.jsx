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

  const showServiceNowInfo = () => {
    alert(
      `🎫 ServiceNow Service Catalog & ITSM Integration Status\n\n` +
      `• Instance URL: https://ven04528.service-now.com\n` +
      `• Username: AE_Dev_Vaibhav_Tore\n` +
      `• Instance Status: Connected (Online)\n` +
      `• Integration: Service Catalog API & REQ/RITM Workflow\n\n` +
      `--- Active Lifecycle Automation ---\n` +
      `1. Candidate fills details & uploads documents -> ServiceNow creates REQ & RITM for HR verification.\n` +
      `2. HR approves from Portal OR ServiceNow -> Candidate receives verified notification.\n` +
      `3. Sequential Provisioning: 1. ServiceNow Approved -> 2. T4 AD User -> 3. Office 365 -> 4. OrangeHRM (with O365 email).`
    );
  };

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
        {/* Live System Status Badges for all 4 Automated Engines */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Candidate only Autofill */}
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

          {/* 1. ServiceNow Badge */}
          <span
            className="badge badge-verified"
            style={{
              fontSize: '0.73rem',
              padding: '0.35rem 0.65rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            onClick={showServiceNowInfo}
            title="ServiceNow Service Catalog Instance Active (ven04528)"
          >
            <span className="live-pulse-dot"></span> <strong>ServiceNow</strong>
          </span>

          {/* 2. T4 AD Badge */}
          <a
            href="https://t4.automationedge.com/#/login"
            target="_blank"
            rel="noreferrer"
            className="badge"
            style={{
              fontSize: '0.73rem',
              padding: '0.35rem 0.65rem',
              border: '1px solid #fed7aa',
              color: '#c2410c',
              background: '#fff7ed',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="AutomationEdge T4 Active Directory Engine Online"
          >
            <span className="live-pulse-dot"></span> <strong>T4 AD</strong>
          </a>

          {/* 3. Microsoft 365 Badge */}
          <a
            href="https://admin.microsoft.com/#/users"
            target="_blank"
            rel="noreferrer"
            className="badge"
            style={{
              fontSize: '0.73rem',
              padding: '0.35rem 0.65rem',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              background: '#eff6ff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Microsoft Office 365 / Entra ID Cloud Connected"
          >
            <span className="live-pulse-dot"></span> <strong>M365</strong>
          </a>

          {/* 4. OrangeHRM Badge */}
          <a
            href="http://10.41.5.39/orangehrm/web/index.php/auth/login"
            target="_blank"
            rel="noreferrer"
            className="badge"
            style={{
              fontSize: '0.73rem',
              padding: '0.35rem 0.65rem',
              border: '1px solid #fed7aa',
              color: '#ea580c',
              background: '#fff7ed',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="OrangeHRM PIM Enterprise Server Connected"
          >
            <span className="live-pulse-dot"></span> <strong>OrangeHRM</strong>
          </a>
        </div>
      </div>
    </header>
  );
}
