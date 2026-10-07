import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PAGE_HEADER_SLOT_ID } from './ui';

export default function Header({ toggleSidebar }) {
  const { currentUser, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();
  const displayName = currentUser?.name?.split(' (')[0] || 'User';

  const aeConfig = {
    url: 'https://t4.automationedge.com/#/requests/list',
    orgCode: 'MSP_EVENT',
    username: 'Msp',
    password: 'Msp@12345',
  };

  const handleAeServerClick = (e) => {
    e.preventDefault();
    // Copy password to clipboard for quick paste
    navigator.clipboard.writeText(aeConfig.password).catch(() => {});
    showToast('🔑 AE Server credentials ready! (Org: MSP_EVENT | User: Msp) — Opening portal...', 'success');
    // Open direct URL in new tab
    window.open(aeConfig.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="top-header">
      <button
        className="sidebar-toggle-btn"
        onClick={toggleSidebar}
        id="sidebarToggle"
        title="Toggle sidebar"
        aria-label="Toggle navigation menu"
      >
        <i className="fa-solid fa-bars" aria-hidden="true"></i>
      </button>

      {/* Filled by the active page's <PageHeader> */}
      <div id={PAGE_HEADER_SLOT_ID} className="top-header-slot"></div>

      <div className="top-header-tools">
        {/* Direct AE Server Button */}
        <button
          onClick={handleAeServerClick}
          className="t4-server-btn"
          title="Open AutomationEdge Server"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '12.5px',
            fontWeight: '600',
            letterSpacing: '0.2px',
            boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(234, 88, 12, 0.25)';
          }}
        >
          <i className="fa-solid fa-server" style={{ fontSize: '12px' }}></i>
          <span>AE server</span>
          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '10px', opacity: 0.85 }}></i>
        </button>

        <button
          className="header-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true"></i>
        </button>
        <span className="header-user" title={displayName}>
          <span className="header-user-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
          <span className="header-user-name">{displayName}</span>
        </span>
      </div>
    </header>
  );
}
