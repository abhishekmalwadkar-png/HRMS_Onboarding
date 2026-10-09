import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PAGE_HEADER_SLOT_ID } from './ui';

export default function Header({ toggleSidebar }) {
  const { currentUser, logout, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayName = currentUser?.name?.split(' (')[0] || 'User';
  const roleLabel = currentUser?.badge || (currentUser?.role === 'hr' ? 'HR Administrator' : 'Employee');
  const email = currentUser?.email || 'pooja.deshmukh@automationedge.ai';
  const avatar = currentUser?.avatar || displayName.charAt(0).toUpperCase();

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const aeConfig = {
    url: 'https://t4.automationedge.com/#/requests/list',
    orgCode: 'MSP_EVENT',
    username: 'Msp',
    password: 'Msp@12345',
  };

  const handleAeServerClick = (e) => {
    e.preventDefault();
    // Copy password to clipboard for quick paste
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(aeConfig.password).catch(() => {});
    }
    showToast('🔑 AE Server credentials ready! (User: Msp) — Opening portal...', 'success');
    // Open direct URL in new tab
    window.open(aeConfig.url, '_blank', 'noopener,noreferrer');
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    showToast('Logged out successfully', 'info');
  };

  return (
    <header className="top-header">
      {/* Filled by the active page's <PageHeader> */}
      <div id={PAGE_HEADER_SLOT_ID} className="top-header-slot"></div>

      <div className="top-header-tools">
        {/* Direct AE Server Button */}
        <a
          href={aeConfig.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAeServerClick}
          className="t4-server-btn"
          title="Open AutomationEdge Server"
          style={{
            textDecoration: 'none',
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
            cursor: 'pointer',
          }}
        >
          <i className="fa-solid fa-server" style={{ fontSize: '12px' }}></i>
          <span>AE server</span>
          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '10px', opacity: 0.85 }}></i>
        </a>

        {/* Download Android APK Button */}
        <a
          href="/HRMS_Onboarding.apk"
          download="HRMS_Onboarding.apk"
          onClick={() => {
            showToast('⬇️ Downloading HRMS Android App (.apk)...', 'success');
          }}
          className="apk-download-btn"
          title="Download HRMS Android APK App"
          aria-label="Download HRMS Android APK App"
        >
          <i className="fa-brands fa-android apk-icon" aria-hidden="true"></i>
          <span className="apk-label">Get Android APK</span>
        </a>

        <button
          className="header-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true"></i>
        </button>

        {/* User Profile Dropdown Menu */}
        <div className="header-user-menu-wrapper" ref={dropdownRef}>
          <button
            className={`header-user-btn ${isDropdownOpen ? 'active' : ''}`}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            title={`Account: ${displayName}`}
          >
            <span className="header-user-avatar" aria-hidden="true">{avatar}</span>
            <span className="header-user-name">{displayName}</span>
            <i className={`fa-solid fa-chevron-down header-user-chevron ${isDropdownOpen ? 'rotate' : ''}`} aria-hidden="true"></i>
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                className="header-user-dropdown"
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                <div className="dropdown-user-header">
                  <div className="dropdown-user-avatar">{avatar}</div>
                  <div className="dropdown-user-info">
                    <div className="dropdown-user-name">{displayName}</div>
                    <div className="dropdown-user-email">{email}</div>
                    <span className="dropdown-user-badge">{roleLabel}</span>
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                <div className="dropdown-menu-list">
                  <a
                    href="/HRMS_Onboarding.apk"
                    download="HRMS_Onboarding.apk"
                    className="dropdown-menu-item"
                    style={{ textDecoration: 'none' }}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      showToast('⬇️ Downloading HRMS Android App (.apk)...', 'success');
                    }}
                  >
                    <i className="fa-brands fa-android" style={{ color: '#22c55e' }}></i>
                    <span>Download Android APK</span>
                  </a>

                  <button
                    className="dropdown-menu-item logout-item"
                    onClick={handleLogout}
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    <span>Log out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
