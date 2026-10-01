/* Authentication & Role Management Controller (HR vs Candidate) */

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

function initAuth() {
  const savedUser = localStorage.getItem('mangohrms_user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      applyUserRole(currentUser);
    } catch (e) {
      showLoginScreen();
    }
  } else {
    // Default to Login view if not logged in
    showLoginScreen();
  }
}

function selectLoginRole(role) {
  const btnHR = document.getElementById('btnRoleHR');
  const btnCand = document.getElementById('btnRoleCandidate');
  const sectionHR = document.getElementById('formSectionHR');
  const sectionCand = document.getElementById('formSectionCandidate');

  if (role === 'hr') {
    if (btnHR) btnHR.classList.add('active');
    if (btnCand) btnCand.classList.remove('active');
    if (sectionHR) sectionHR.style.display = 'block';
    if (sectionCand) sectionCand.style.display = 'none';
  } else {
    if (btnCand) btnCand.classList.add('active');
    if (btnHR) btnHR.classList.remove('active');
    if (sectionCand) sectionCand.style.display = 'block';
    if (sectionHR) sectionHR.style.display = 'none';
  }
}

function showLoginScreen() {
  currentUser = null;
  localStorage.removeItem('mangohrms_user');
  
  const loginView = document.getElementById('loginView');
  const appContainer = document.querySelector('.app-container');
  const appLayout = document.querySelector('.app-layout');
  const sidebar = document.querySelector('.sidebar');
  
  if (loginView) loginView.style.display = 'flex';
  if (appContainer) appContainer.style.display = 'none';
  if (appLayout) appLayout.style.display = 'none';
  if (sidebar) sidebar.style.display = 'none';
}

function loginAs(role, email, name) {
  let userObj = {};

  if (role === 'hr') {
    userObj = {
      role: 'hr',
      name: name || 'Victoria Vance (HR Operations Director)',
      email: email || 'hr.admin@mangohrms.com',
      avatar: 'V',
      badge: 'HR Administrator'
    };
  } else {
    userObj = {
      role: 'candidate',
      name: name || 'Sarah Jenkins',
      email: email || 'sarah.jenkins@mangohrms.com',
      avatar: 'S',
      badge: 'Candidate / New Hire'
    };
  }

  currentUser = userObj;
  localStorage.setItem('mangohrms_user', JSON.stringify(currentUser));
  applyUserRole(currentUser);

  showToast(`👋 Welcome back, ${currentUser.name}! (${currentUser.badge})`, 'success');
}

function applyUserRole(user) {
  const loginView = document.getElementById('loginView');
  const appContainer = document.querySelector('.app-container');
  const appLayout = document.querySelector('.app-layout');
  const sidebar = document.querySelector('.sidebar');
  
  if (loginView) loginView.style.display = 'none';
  if (appContainer) appContainer.style.display = 'block';
  if (appLayout) appLayout.style.display = 'flex';
  if (sidebar) sidebar.style.display = 'flex';

  // Update Sidebar User Info
  const userProfileEl = document.getElementById('navUserProfile');
  if (userProfileEl) {
    userProfileEl.innerHTML = `
      <div class="sidebar-user-card">
        <div class="avatar" style="width: 36px; height: 36px; font-size: 0.95rem; font-weight: 700; background: var(--accent-gradient); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(234, 88, 12, 0.25);">
          ${user.avatar || user.name.charAt(0)}
        </div>
        <div class="user-meta" style="flex: 1; min-width: 0; line-height: 1.2;">
          <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${user.name.split(' (')[0]}
          </div>
          <span class="badge ${user.role === 'hr' ? 'badge-verified' : 'badge-pending'}" style="font-size: 0.62rem; padding: 1px 6px; margin-top: 2px;">
            ${user.role === 'hr' ? 'HR Manager' : 'Candidate'}
          </span>
        </div>
        <button class="icon-btn" onclick="logout()" style="padding: 0.45rem; font-size: 0.85rem; border-radius: 6px; color: var(--accent-rose); background: rgba(225, 29, 72, 0.08); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Logout / Switch Account">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    `;
  }

  // Role based Nav Tabs Visibility
  const hrOnlyTabs = ['tabRecruitment', 'tabDashboard', 'tabApprovals', 'tabServices', 'tabExit', 'tabAnalytics'];
  
  if (user.role === 'hr') {
    hrOnlyTabs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'flex';
    });
    // HR default view: Approvals or Directory
    switchView('approvals');
    loadApprovals();
  } else {
    // Candidate view: Hide HR only tabs, show Onboarding
    hrOnlyTabs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const wizardTab = document.getElementById('tabWizard');
    if (wizardTab) wizardTab.style.display = 'flex';
    switchView('wizard');
  }
}

function logout() {
  localStorage.removeItem('mangohrms_user');
  currentUser = null;
  showToast('Logged out successfully', 'info');
  showLoginScreen();
}
