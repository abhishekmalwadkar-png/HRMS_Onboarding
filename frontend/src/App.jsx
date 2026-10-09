import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginView from './components/LoginView';
import ApprovalsView from './components/ApprovalsView';
import OnboardingWizard from './components/OnboardingWizard';
import DirectoryView from './components/DirectoryView';
import OffboardingView from './components/OffboardingView';
import RecruitmentView from './components/RecruitmentView';
import ServicesView from './components/ServicesView';
import AnalyticsView from './components/AnalyticsView';
import DashboardView from './components/DashboardView';
import WhatsAppView from './components/WhatsAppView';
import CredentialsView from './components/CredentialsView';

export default function App() {
  const { currentUser } = useAuth();

  const isHR = currentUser?.role === 'hr';
  const [currentView, setCurrentView] = useState(() => (isHR ? 'home' : 'wizard'));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('mangohrms_sidebar_collapsed') !== 'false';
  });

  // Below this width the sidebar is an overlay opened from the header menu button (matches index.css)
  const MOBILE_BREAKPOINT = 992;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  // Fetch employee records from Python backend
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.warn('Failed to load employee records:', err);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchEmployees();
      setCurrentView(currentUser.role === 'hr' ? 'home' : 'wizard');
    }
  }, [currentUser, fetchEmployees]);

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsMobileNavOpen(false);
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      setIsMobileNavOpen((prev) => !prev);
      return;
    }
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('mangohrms_sidebar_collapsed', next ? 'true' : 'false');
      return next;
    });
  };

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={navigateTo}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileNavOpen}
        toggleCollapse={toggleSidebar}
      />
      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.button
            className="sidebar-backdrop"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="main-layout">
        <Header
          currentView={currentView}
          toggleSidebar={toggleSidebar}
        />

        {/* The content area is the scroll container, so full-height pages (WhatsApp) can fit exactly */}
        <main className="app-scroll" id="main-content" tabIndex={-1}>
        <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          className="app-container"
          initial={{ opacity: 0, y: 10, scale: 0.995, filter: 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, y: -6, scale: 0.995, filter: 'blur(1px)', transition: { duration: 0.16, ease: 'easeIn' } }}
        >
          {currentView === 'home' && isHR && (
            <DashboardView employees={employees} isLoading={isLoadingEmployees} onNavigate={navigateTo} />
          )}

          {currentView === 'whatsapp' && <WhatsAppView />}

          {currentView === 'approvals' && isHR && (
            <ApprovalsView
              employees={employees}
              onRefreshEmployees={fetchEmployees}
            />
          )}

          {currentView === 'wizard' && (
            <OnboardingWizard
              onRefreshEmployees={fetchEmployees}
              onNavigate={isHR ? navigateTo : undefined}
            />
          )}

          {currentView === 'dashboard' && isHR && (
            <DirectoryView
              employees={employees}
            />
          )}

          {currentView === 'exit' && (
            <OffboardingView />
          )}

          {currentView === 'recruitment' && isHR && (
            <RecruitmentView />
          )}

          {currentView === 'credentials' && isHR && (
            <CredentialsView />
          )}

          {currentView === 'services' && isHR && (
            <ServicesView />
          )}

          {currentView === 'analytics' && isHR && (
            <AnalyticsView
              employees={employees}
              isLoading={isLoadingEmployees}
            />
          )}
        </motion.div>
        </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
