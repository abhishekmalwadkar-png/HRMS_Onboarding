import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Curated nav menu: Only HR AI Assistant and WhatsApp Discovery
const NAV_ITEMS = [
  { view: 'ai-assistant', icon: 'fa-solid fa-robot', label: 'HR AI Assistant', color: '#0284c7' },
  { view: 'whatsapp', icon: 'fa-solid fa-comments', label: 'WhatsApp Discovery', color: '#22c55e' },
];

export default function Sidebar({ currentView, setCurrentView, isCollapsed, isMobileOpen, toggleCollapse }) {
  const { currentUser, logout } = useAuth();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);

  const isHR = currentUser?.role === 'hr';
  const displayName = currentUser?.name?.split(' (')[0] || 'User';
  const roleLabel = currentUser?.badge || (isHR ? 'HR Administrator' : 'Employee');
  const avatar = currentUser?.avatar || displayName.charAt(0).toUpperCase();

  // Listen for Ctrl+K or Cmd+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCollapsed) {
          toggleCollapse();
        }
        setTimeout(() => searchInputRef.current?.focus(), 120);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, toggleCollapse]);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
  };

  const filteredNavItems = NAV_ITEMS
    .filter((item) => isHR || !item.hrOnly)
    .filter((item) => item.label.toLowerCase().includes(searchTerm.toLowerCase().trim()));

  return (
    <aside
      className={`sidebar navbar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobileOpen ? 'mobile-open' : ''}`}
      id="appSidebar"
      aria-label="Main navigation"
    >
      {/* Right-edge curved notch toggle button */}
      <button
        className="sidebar-notch-toggle"
        onClick={toggleCollapse}
        title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
        aria-label={isCollapsed ? 'Expand menu' : 'Collapse menu'}
      >
        <i className={`fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
      </button>

      <div className="sidebar-top">
        {/* Brand Logo & Title */}
        <div
          className="brand"
          onClick={() => {
            if (!isCollapsed) {
              setCurrentView('ai-assistant');
            }
          }}
          title="AutomationEdge HR Suite"
          style={{ cursor: isCollapsed ? 'default' : 'pointer' }}
        >
          <div className="brand-icon">
            <i className="fa-solid fa-cube"></i>
          </div>
          {!isCollapsed && (
            <div className="brand-text">
              <span className="brand-title">AutomationEdge</span>
              <span className="brand-subtitle">HR Suite</span>
            </div>
          )}
        </div>

        {/* Sidebar Search Bar */}
        {!isCollapsed ? (
          <div className="sidebar-search-box">
            <i className="fa-solid fa-magnifying-glass sidebar-search-icon" aria-hidden="true"></i>
            <input
              ref={searchInputRef}
              type="text"
              className="sidebar-search-input"
              placeholder="Search menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search navigation menu"
            />
            {searchTerm ? (
              <button
                className="sidebar-search-clear"
                onClick={() => setSearchTerm('')}
                title="Clear search"
                aria-label="Clear search text"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            ) : (
              <span className="sidebar-search-kbd">Ctrl K</span>
            )}
          </div>
        ) : (
          <div className="sidebar-search-compact" data-tooltip="Search menu (Ctrl + K)">
            <button
              className="sidebar-search-compact-btn"
              onClick={() => {
                toggleCollapse();
                setTimeout(() => searchInputRef.current?.focus(), 150);
              }}
              title="Search menu (Ctrl + K)"
              aria-label="Search menu"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {filteredNavItems.length > 0 ? (
            filteredNavItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <div key={item.view} className="nav-item-wrapper" data-tooltip={isCollapsed ? item.label : undefined}>
                  <button
                    className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentView(item.view);
                      setSearchTerm('');
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <>
                        <motion.div
                          layoutId="nav-active-indicator"
                          className="nav-left-bar-indicator"
                          transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                        />
                        <motion.div
                          layoutId="nav-active-pill"
                          className="nav-active-pill"
                          transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                        />
                      </>
                    )}
                    <div className="nav-icon-box" style={{ '--icon-color': item.color }}>
                      <i className={item.icon} style={{ color: item.color }}></i>
                    </div>
                    {!isCollapsed && <span className="nav-label">{item.label}</span>}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="sidebar-search-empty">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>No match found</span>
            </div>
          )}
        </nav>
      </div>

      {/* Sidebar Footer */}
      {!isCollapsed && (
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
      )}
    </aside>
  );
}
