import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
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

export default function App() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const isHR = currentUser?.role === 'hr';
  const [currentView, setCurrentView] = useState(() => (isHR ? 'approvals' : 'wizard'));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('mangohrms_sidebar_collapsed') === 'true';
  });

  const [employees, setEmployees] = useState([]);

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
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchEmployees();
      setCurrentView(currentUser.role === 'hr' ? 'approvals' : 'wizard');
    }
  }, [currentUser, fetchEmployees]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('mangohrms_sidebar_collapsed', next ? 'true' : 'false');
      return next;
    });
  };

  const handleCandidateAutofill = () => {
    if (currentView === 'exit') {
      window.dispatchEvent(new CustomEvent('mangohrms-trigger-exit-autofill'));
    } else {
      if (currentView !== 'wizard') {
        setCurrentView('wizard');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mangohrms-trigger-autofill'));
      }, 50);
    }
  };

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className="main-layout">
        <Header
          currentView={currentView}
          toggleSidebar={toggleSidebar}
          onAutoFill={handleCandidateAutofill}
        />

        <div className="app-container">
          {currentView === 'approvals' && isHR && (
            <ApprovalsView
              employees={employees}
              onRefreshEmployees={fetchEmployees}
            />
          )}

          {currentView === 'wizard' && (
            <OnboardingWizard
              onRefreshEmployees={fetchEmployees}
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

          {currentView === 'services' && isHR && (
            <ServicesView />
          )}

          {currentView === 'analytics' && isHR && (
            <AnalyticsView
              employees={employees}
            />
          )}
        </div>
      </div>
    </div>
  );
}
