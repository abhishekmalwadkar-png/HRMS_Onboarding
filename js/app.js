/* App Core Controller - Navigation, Theme & Notifications across all 5 HRMS Modules */

document.addEventListener('DOMContentLoaded', () => {
  renderCandidatesTable();
});

// Breadcrumb titles mapping
const VIEW_TITLES = {
  approvals: 'HR Approvals & IT Hardware Provisioning',
  recruitment: 'Candidate Recruitment Pipeline',
  dashboard: 'Employee Directory & Master Records',
  wizard: 'Digital Onboarding & Offer Letter Acceptance',
  services: 'Employee Self-Service & Leave Management',
  exit: 'Employee Exit Management & Offboarding',
  analytics: 'Executive HR Analytics & Compliance'
};

// Switch view across all HRMS modules
function switchView(viewName) {
  const views = ['recruitment', 'approvals', 'wizard', 'dashboard', 'services', 'exit', 'analytics'];
  
  views.forEach(v => {
    const section = document.getElementById(v + 'View');
    const tabBtn = document.getElementById('tab' + v.charAt(0).toUpperCase() + v.slice(1));

    if (section) {
      if (v === viewName) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    }

    if (tabBtn) {
      if (v === viewName) {
        tabBtn.classList.add('active');
      } else {
        tabBtn.classList.remove('active');
      }
    }
  });

  // Update Breadcrumb in Top Header
  const breadcrumbEl = document.getElementById('currentViewBreadcrumb');
  if (breadcrumbEl && VIEW_TITLES[viewName]) {
    breadcrumbEl.innerHTML = `
      <span style="color: var(--text-muted); font-size: 0.82rem;">Overview</span>
      <span style="color: var(--border-orange); margin: 0 4px;">/</span>
      <strong style="color: var(--text-main); font-size: 0.95rem;">${VIEW_TITLES[viewName]}</strong>
    `;
  }

  // Auto-close mobile sidebar if open
  const sidebar = document.getElementById('appSidebar');
  if (sidebar && window.innerWidth <= 992) {
    sidebar.classList.remove('mobile-open');
  }

  // Ensure header and sidebar autofill buttons are strictly hidden when in HR role
  const isHR = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'hr';
  const sidebarAutofillBox = document.getElementById('sidebarAutofillBox');
  const headerAutofillBtn = document.getElementById('headerAutofillBtn');
  if (isHR) {
    if (sidebarAutofillBox) sidebarAutofillBox.style.display = 'none';
    if (headerAutofillBtn) headerAutofillBtn.style.display = 'none';
  }

  // Re-trigger module specific data loads
  if (viewName === 'approvals') loadApprovals();
  if (viewName === 'dashboard') renderCandidatesTable();
  if (viewName === 'recruitment') loadRecruitmentData();
  if (viewName === 'services') loadLeaveRequests();
  if (viewName === 'exit') loadExitData();
  if (viewName === 'analytics') renderAnalyticsDashboard();
}

// Toggle Sidebar Collapse (Open / Close Side Menu)
function toggleSidebarCollapse() {
  const sidebar = document.getElementById('appSidebar');
  const appLayout = document.querySelector('.app-layout');
  
  if (!sidebar) return;

  // If on mobile (<= 992px), toggle mobile-open class
  if (window.innerWidth <= 992) {
    sidebar.classList.toggle('mobile-open');
    return;
  }

  // Desktop/Laptop toggle collapse
  const isCollapsed = sidebar.classList.toggle('collapsed');
  if (appLayout) {
    appLayout.classList.toggle('sidebar-collapsed', isCollapsed);
  }
  
  localStorage.setItem('mangohrms_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  showToast(isCollapsed ? 'Side menu collapsed (Click ☰ to reopen)' : 'Side menu expanded', 'info');
}

// Alias for toggleSidebar
function toggleSidebar() {
  toggleSidebarCollapse();
}

// Restore saved sidebar state on page load
document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth > 992) {
    const savedState = localStorage.getItem('mangohrms_sidebar_collapsed');
    if (savedState === 'true') {
      const sidebar = document.getElementById('appSidebar');
      const appLayout = document.querySelector('.app-layout');
      if (sidebar) sidebar.classList.add('collapsed');
      if (appLayout) appLayout.classList.add('sidebar-collapsed');
    }
  }
});

// Toggle Dark / Light Theme Mode
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }

  showToast(`Switched to ${newTheme.toUpperCase()} mode`, 'info');
}

// Toast Notification System
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ServiceNow PDI Configuration Modal
function showServiceNowConfigModal() {
  alert(
    `🎫 ServiceNow Service Catalog & ITSM Integration Status\n\n` +
    `• Instance URL: https://ven04528.service-now.com\n` +
    `• Username: AE_Dev_Vaibhav_Tore\n` +
    `• Instance Status: Connected (Online)\n` +
    `• Integration: Service Catalog API & REQ/RITM Workflow\n\n` +
    `--- Active Lifecycle Automation ---\n` +
    `1. Candidate fills details & uploads documents -> ServiceNow creates REQ & RITM for HR verification.\n` +
    `2. HR approves from Portal OR ServiceNow -> Candidate receives verified notification.\n` +
    `3. Approval creates Laptop / IT Asset Provisioning Ticket (ITSM-ASSET-XXXX).`
  );
}
