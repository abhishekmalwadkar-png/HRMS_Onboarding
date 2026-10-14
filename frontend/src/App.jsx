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

const VALID_VIEWS = [
  'home',
  'wizard',
  'approvals',
  'recruitment',
  'dashboard',
  'credentials',
  'services',
  'exit',
  'analytics',
  'whatsapp'
];

function parseRouteFromHash() {
  if (typeof window === 'undefined') return { view: null, subtab: null };
  const raw = (window.location.hash || '').replace(/^#\/?/, '').trim();
  if (!raw) return { view: null, subtab: null };
  const parts = raw.split('/');
  let view = (parts[0] || '').toLowerCase();
  const subtab = (parts[1] || '').toLowerCase();
  if (view === 'offboarding') view = 'exit';
  if (view === 'directory') view = 'dashboard';
  return { view, subtab };
}

export default function App() {
  const { currentUser } = useAuth();

  const isHR = currentUser?.role === 'hr';
  const [currentView, setCurrentView] = useState(() => {
    const route = parseRouteFromHash();
    if (route.view && VALID_VIEWS.includes(route.view)) {
      return route.view;
    }
    return isHR ? 'home' : 'wizard';
  });
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

  const navigateTo = useCallback((view, subtab = null, replace = false) => {
    let resolvedView = view;
    if (resolvedView === 'offboarding') resolvedView = 'exit';
    if (resolvedView === 'directory') resolvedView = 'dashboard';

    if (!VALID_VIEWS.includes(resolvedView)) return;

    setCurrentView(resolvedView);
    setIsMobileNavOpen(false);

    const newHash = subtab ? `#/${resolvedView}/${subtab}` : `#/${resolvedView}`;
    if (window.location.hash !== newHash) {
      if (replace) {
        window.history.replaceState({ view: resolvedView, subtab }, '', newHash);
      } else {
        window.history.pushState({ view: resolvedView, subtab }, '', newHash);
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchEmployees();
      const route = parseRouteFromHash();
      const defaultView = currentUser.role === 'hr' ? 'home' : 'wizard';
      const initialView = route.view && VALID_VIEWS.includes(route.view) ? route.view : defaultView;
      setCurrentView(initialView);

      // Initialize browser history entry so clicking back doesn't immediately exit the app
      const initialHash = route.subtab ? `#/${initialView}/${route.subtab}` : `#/${initialView}`;
      if (window.location.hash !== initialHash) {
        window.history.replaceState({ view: initialView, subtab: route.subtab }, '', initialHash);
      }
    }
  }, [currentUser, fetchEmployees]);

  // Listen for Chrome Back / Forward navigation (popstate & hashchange)
  useEffect(() => {
    const handlePopState = (event) => {
      const route = parseRouteFromHash();
      const stateView = event.state?.view;
      const targetView = stateView || route.view || (isHR ? 'home' : 'wizard');

      if (VALID_VIEWS.includes(targetView)) {
        setCurrentView(targetView);
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [isHR]);

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
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: {
              type: 'spring',
              stiffness: 320,
              damping: 28,
              mass: 0.8,
              opacity: { duration: 0.22, ease: 'easeOut' },
            },
          }}
          exit={{
            opacity: 0,
            y: -10,
            transition: {
              duration: 0.16,
              ease: [0.4, 0, 1, 1],
            },
          }}
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
