import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PAGE_HEADER_SLOT_ID } from './ui';

// Sticky app bar: menu button, the current page's title/description/actions (portalled in by
// <PageHeader>), then theme toggle and the signed-in user.
export default function Header({ toggleSidebar }) {
  const { currentUser, theme, toggleTheme } = useAuth();
  const displayName = currentUser?.name?.split(' (')[0] || 'User';

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
