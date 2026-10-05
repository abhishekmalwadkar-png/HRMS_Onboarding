import React from 'react';

// Short breadcrumb names; each page renders its own full title via <PageHeader>
const VIEW_TITLES = {
  approvals: 'Approvals',
  recruitment: 'Recruitment',
  dashboard: 'Directory',
  wizard: 'Onboarding',
  services: 'Services & AI',
  exit: 'Offboarding',
  analytics: 'HR Analytics',
};

export default function Header({ currentView, toggleSidebar }) {
  return (
    <header className="top-header">
      <div className="top-header-left">
        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          id="sidebarToggle"
          title="Toggle Sidebar"
          aria-label="Toggle navigation menu"
        >
          <i className="fa-solid fa-bars" aria-hidden="true"></i>
        </button>
        <nav className="breadcrumb-container" id="currentViewBreadcrumb" aria-label="Breadcrumb">
          <span className="breadcrumb-root">Enterprise Portal</span>
          <i className="fa-solid fa-chevron-right breadcrumb-sep" aria-hidden="true"></i>
          <strong className="breadcrumb-current" aria-current="page">{VIEW_TITLES[currentView] || 'Overview'}</strong>
        </nav>
      </div>
    </header>
  );
}
