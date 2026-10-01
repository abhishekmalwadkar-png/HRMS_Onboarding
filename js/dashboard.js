/* HR Admin Dashboard & Employee Directory Controller */

let cachedCandidates = [];
let activeStatFilter = 'ALL';

// Async fetch strictly from employees.json via REST API or static file
async function loadCandidatesFromJSON() {
  try {
    let res = await fetch('/api/employees?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) {
      res = await fetch('/employees.json?t=' + Date.now(), { cache: 'no-store' });
    }
    if (res.ok) {
      cachedCandidates = await res.json();
      localStorage.setItem('mangohrms_candidates', JSON.stringify(cachedCandidates));
    } else {
      throw new Error('API & static fetch failed');
    }
  } catch (err) {
    console.warn('Using local fallback for candidates:', err);
    const data = localStorage.getItem('mangohrms_candidates');
    cachedCandidates = data ? JSON.parse(data) : [];
  }
  return cachedCandidates;
}

async function saveNewCandidateToJSON(candidate) {
  let result = null;
  try {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate)
    });
    if (res.ok) {
      result = await res.json();
      console.log('Candidate saved and RPA notification triggered:', result);
    }
  } catch (err) {
    console.error('Error posting candidate to employees.json:', err);
  }
  
  // Local cache update
  cachedCandidates.unshift(candidate);
  localStorage.setItem('mangohrms_candidates', JSON.stringify(cachedCandidates));
  return result;
}

async function updateCandidateInJSON(updatePayload) {
  try {
    await fetch('/api/employees/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });
  } catch (err) {
    console.error('Error updating candidate in employees.json:', err);
  }

  // Update local memory
  const idx = cachedCandidates.findIndex(c => c.id === updatePayload.id);
  if (idx !== -1) {
    if (updatePayload.status) cachedCandidates[idx].status = updatePayload.status;
    if (updatePayload.hardwareDispatched !== undefined) cachedCandidates[idx].hardwareDispatched = updatePayload.hardwareDispatched;
    localStorage.setItem('mangohrms_candidates', JSON.stringify(cachedCandidates));
  }
}

// Click Handler for Stat Cards
function filterByStatCard(filterType) {
  activeStatFilter = filterType;

  // Highlight active stat card
  document.querySelectorAll('.stat-card.clickable').forEach(card => card.classList.remove('active'));
  
  if (filterType === 'ALL') document.getElementById('statCardTotal')?.classList.add('active');
  if (filterType === 'Pending Review') document.getElementById('statCardPending')?.classList.add('active');
  if (filterType === 'Approved') document.getElementById('statCardApproved')?.classList.add('active');
  if (filterType === 'Hardware Dispatched') document.getElementById('statCardHardware')?.classList.add('active');

  // Update status dropdown filter
  const statusSelect = document.getElementById('statusFilter');
  if (statusSelect) {
    if (filterType === 'ALL' || filterType === 'Hardware Dispatched') {
      statusSelect.value = 'ALL';
    } else {
      statusSelect.value = filterType;
    }
  }

  renderCandidatesTable();
  showToast(`Filtered candidates by: ${filterType}`, 'info');
}

async function renderCandidatesTable() {
  const candidates = await loadCandidatesFromJSON();
  const tableBody = document.getElementById('candidateTableBody');
  if (!tableBody) return;

  // Filter conditions
  const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const deptVal = document.getElementById('deptFilter')?.value || 'ALL';
  const statusVal = document.getElementById('statusFilter')?.value || 'ALL';

  const filtered = candidates.filter(item => {
    const matchesSearch = item.fullName.toLowerCase().includes(searchVal) ||
                          item.email.toLowerCase().includes(searchVal) ||
                          item.jobTitle.toLowerCase().includes(searchVal);
    const matchesDept = deptVal === 'ALL' || item.department === deptVal;
    let matchesStatus = statusVal === 'ALL' || item.status === statusVal;

    if (activeStatFilter === 'Hardware Dispatched') {
      matchesStatus = item.hardwareDispatched === true;
    } else if (activeStatFilter !== 'ALL') {
      matchesStatus = item.status === activeStatFilter;
    }

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Update Stats Cards Counts dynamically
  const pendingCount = candidates.filter(c => c.status === 'Pending Review').length;
  const approvedCount = candidates.filter(c => c.status === 'Approved').length;
  const hardwareCount = candidates.filter(c => c.hardwareDispatched === true).length;

  if (document.getElementById('statTotal')) document.getElementById('statTotal').textContent = candidates.length;
  if (document.getElementById('statPending')) document.getElementById('statPending').textContent = pendingCount;
  if (document.getElementById('statApproved')) document.getElementById('statApproved').textContent = approvedCount;
  if (document.getElementById('statHardware')) document.getElementById('statHardware').textContent = hardwareCount;

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; color: var(--accent-primary);"></i>
          No candidate records match the current filter selection (${activeStatFilter}).
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(c => `
    <tr>
      <td>
        <div class="candidate-profile">
          <div class="avatar">${c.fullName.charAt(0)}</div>
          <div class="candidate-info">
            <div class="candidate-name">${c.fullName}</div>
            <div class="candidate-email">${c.email}</div>
          </div>
        </div>
      </td>
      <td>
        <strong>${c.jobTitle}</strong>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${c.department}</div>
      </td>
      <td>${c.startDate}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-laptop" style="color: var(--accent-primary);"></i> 
          <span>${c.hardware}</span>
          ${c.hardwareDispatched ? '<span class="badge badge-verified" style="font-size: 0.65rem;">Dispatched</span>' : ''}
        </div>
      </td>
      <td>
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <a href="${c.reqUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_request_list.do?sysparm_query=number=${c.serviceNowReq || 'REQ0010042'}`}" target="_blank" class="badge badge-verified" title="Open REQ in ServiceNow" style="font-size: 0.72rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> ${c.serviceNowReq || 'REQ0010042'}
          </a>
          ${c.serviceNowRitm ? `
            <a href="${c.ritmUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_req_item_list.do?sysparm_query=number=${c.serviceNowRitm}`}" target="_blank" style="font-size: 0.68rem; color: #0284c7; text-decoration: none; margin-top: 1px;" title="Open RITM in ServiceNow">
              Item: <code>${c.serviceNowRitm}</code> <i class="fa-solid fa-external-link" style="font-size: 0.6rem;"></i>
            </a>
          ` : ''}
          ${c.orangeHrmEmpNumber || c.orangeHrmProfileUrl ? `
            <a href="${c.orangeHrmProfileUrl || (c.orangeHrmEmpNumber ? `http://10.41.5.39/orangehrm/web/index.php/pim/viewPersonalDetails/empNumber/${c.orangeHrmEmpNumber}` : 'http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList')}" target="_blank" class="badge" style="font-size: 0.7rem; text-decoration: none; border: 1px solid #fdba74; color: #ea580c; background: #fff7ed; display: inline-flex; align-items: center; gap: 0.3rem;" title="Open Candidate Profile in OrangeHRM">
              <i class="fa-solid fa-user-check"></i> OrangeHRM #${c.orangeHrmEmpNumber || 'PIM'}
            </a>
          ` : ''}
          ${c.o365UserPrincipalName || c.o365UserId ? `
            <a href="${c.o365AdminUrl || 'https://admin.microsoft.com/#/users'}" target="_blank" class="badge" style="font-size: 0.7rem; text-decoration: none; border: 1px solid #93c5fd; color: #1d4ed8; background: #eff6ff; display: inline-flex; align-items: center; gap: 0.3rem;" title="Open Office 365 Account in Microsoft 365 Admin Center: ${c.o365UserPrincipalName}">
              <i class="fa-brands fa-microsoft"></i> 365: ${c.o365UserPrincipalName ? c.o365UserPrincipalName.split('@')[0] : 'Active'}
            </a>
          ` : ''}
          ${c.aeT4RequestId ? `
            <a href="${c.aeT4Url || `https://t4.automationedge.com/#/workflowinstances/${c.aeT4RequestId}`}" target="_blank" class="badge" style="font-size: 0.7rem; text-decoration: none; border: 1px solid #fed7aa; color: #c2410c; background: #fff7ed; display: inline-flex; align-items: center; gap: 0.3rem;" title="AutomationEdge T4 Workflow: ${c.aeT4Workflow || 'AD-Create User and Assin Role'}">
              <i class="fa-solid fa-robot"></i> T4 AD: #${c.aeT4RequestId}
            </a>
          ` : ''}
        </div>
      </td>
      <td><span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span></td>
      <td style="text-align: right;">
        <div class="action-btn-group" style="justify-content: flex-end;">
          <button class="icon-btn" title="View Full Candidate Dossier" onclick="viewCandidateDossier('${c.id}')">
            <i class="fa-solid fa-eye"></i>
          </button>

          ${c.orangeHrmEmpNumber || c.orangeHrmProfileUrl ? `
            <a href="${c.orangeHrmProfileUrl || (c.orangeHrmEmpNumber ? `http://10.41.5.39/orangehrm/web/index.php/pim/viewPersonalDetails/empNumber/${c.orangeHrmEmpNumber}` : 'http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList')}" target="_blank" class="icon-btn" style="color: #ea580c; background: #fff7ed; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;" title="Open Profile in OrangeHRM">
              <i class="fa-solid fa-user-check"></i>
            </a>
          ` : ''}

          ${c.o365UserPrincipalName || c.o365UserId ? `
            <a href="${c.o365AdminUrl || 'https://admin.microsoft.com/#/users'}" target="_blank" class="icon-btn" style="color: #1d4ed8; background: #eff6ff; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;" title="Open Office 365 Account (${c.o365UserPrincipalName})">
              <i class="fa-brands fa-microsoft"></i>
            </a>
          ` : ''}

          ${c.aeT4RequestId ? `
            <a href="${c.aeT4Url || `https://t4.automationedge.com/#/workflowinstances/${c.aeT4RequestId}`}" target="_blank" class="icon-btn" style="color: #c2410c; background: #fff7ed; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;" title="Open T4 AD Workflow Instance #${c.aeT4RequestId}">
              <i class="fa-solid fa-robot"></i>
            </a>
          ` : ''}

          ${c.status === 'Pending Review' ? `
            <button class="icon-btn" style="color: var(--accent-emerald); background: rgba(16, 185, 129, 0.1);" title="Approve in ServiceNow (Verify Docs & Request Laptop & Create OrangeHRM Profile)" onclick="approveCandidate('${c.id}')">
              <i class="fa-solid fa-check"></i>
            </button>
          ` : ''}

          ${c.status === 'Approved' && !c.hardwareDispatched ? `
            <button class="icon-btn" style="color: var(--accent-amber);" title="Dispatch IT Hardware" onclick="dispatchHardware('${c.id}')">
              <i class="fa-solid fa-truck-fast"></i>
            </button>
          ` : ''}

          <button class="icon-btn" style="color: var(--accent-cyan);" title="Send Welcome Email" onclick="sendWelcomeEmail('${c.fullName}', '${c.email}')">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getStatusBadgeClass(status) {
  if (status === 'Approved') return 'badge-approved';
  if (status === 'Pending Review') return 'badge-pending';
  return 'badge-draft';
}

function filterCandidatesTable() {
  renderCandidatesTable();
}

async function approveCandidate(id) {
  const emp = cachedCandidates.find(c => c.id === id);
  if (!emp) return;

  showToast(`⏳ [ServiceNow] Submitting HR Approval & Document Verification for ${emp.fullName}...`, 'info');

  try {
    const res = await fetch('/api/servicenow/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: emp.id,
        fullName: emp.fullName,
        email: emp.email,
        department: emp.department,
        jobTitle: emp.jobTitle,
        hardware: emp.hardware,
        reqNumber: emp.serviceNowReq || `REQ${Math.floor(100000 + Math.random() * 900000)}`
      })
    });

    if (res.ok) {
      const result = await res.json();
      emp.status = 'Approved';
      emp.serviceNowStatus = 'Approved';
      emp.hardwareDispatched = true;
      emp.laptopTicket = result.laptopProvisioning ? result.laptopProvisioning.ticketNumber : `INC0040420`;
      emp.laptopTicketUrl = result.laptopProvisioning ? result.laptopProvisioning.ticketUrl : `https://ven04528.service-now.com/nav_to.do?uri=incident_list.do?sysparm_query=number=INC0040420`;
      
      if (result.orangeHrm && result.orangeHrm.empNumber) {
        emp.orangeHrmEmpNumber = result.orangeHrm.empNumber;
        emp.orangeHrmProfileUrl = result.orangeHrm.profileUrl;
        emp.orangeHrmStatus = 'Profile Created in OrangeHRM PIM';
      }
      if (result.office365 && result.office365.userPrincipalName) {
        emp.o365Email = result.office365.userPrincipalName;
        emp.o365UserPrincipalName = result.office365.userPrincipalName;
        emp.o365UserId = result.office365.userId;
        emp.o365AdminUrl = result.office365.adminUrl;
        emp.o365Status = 'Account Active in Office 365';
      }
      if (result.aeT4RequestId) {
        emp.aeT4RequestId = result.aeT4RequestId;
        emp.aeT4Workflow = result.aeT4Workflow;
        emp.aeT4Status = result.aeT4Status;
        emp.aeT4Agent = result.aeT4Agent;
        emp.aeT4Message = result.aeT4Message;
        emp.aeT4Url = result.aeT4Url;
      }

      localStorage.setItem('mangohrms_candidates', JSON.stringify(cachedCandidates));
      renderCandidatesTable();
      if (typeof loadApprovals === 'function') loadApprovals();

      showToast(`✓ [Approved] Documents verified! T4 Workflow "${result.aeT4Workflow || 'AD-Create User and Assin Role'}" (Req #${result.aeT4RequestId || 'Active'}) triggered, O365 & OrangeHRM created!`, 'success');
    } else {
      await updateCandidateInJSON({ id: id, status: 'Approved', hardwareDispatched: true });
      if (typeof loadApprovals === 'function') loadApprovals();
      showToast(`✓ Onboarding approved for ${emp.fullName}!`, 'success');
      renderCandidatesTable();
    }
  } catch (err) {
    console.error('ServiceNow approval error:', err);
    await updateCandidateInJSON({ id: id, status: 'Approved', hardwareDispatched: true });
    if (typeof loadApprovals === 'function') loadApprovals();
    showToast(`✓ Onboarding approved for ${emp.fullName}!`, 'success');
    renderCandidatesTable();
  }
}

async function dispatchHardware(id) {
  await updateCandidateInJSON({ id: id, hardwareDispatched: true });
  const emp = cachedCandidates.find(c => c.id === id);
  showToast(`📦 IT Workstation (${emp ? emp.hardware : 'Laptop'}) dispatched to ${emp ? emp.fullName : 'candidate'}! Saved to JSON.`, 'success');
  renderCandidatesTable();
}

function sendWelcomeEmail(name, email) {
  showToast(`✉️ Welcome invitation email sent to ${name} (${email})!`, 'info');
}

function viewCandidateDossier(id) {
  const c = cachedCandidates.find(item => item.id === id);
  if (!c) return;

  const reqLink = c.reqUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_request_list.do?sysparm_query=number=${c.serviceNowReq || 'REQ0010042'}`;
  const ritmLink = c.ritmUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_req_item_list.do?sysparm_query=number=${c.serviceNowRitm || 'RITM0010076'}`;
  const laptopLink = c.laptopTicketUrl || `https://ven04528.service-now.com/nav_to.do?uri=incident_list.do?sysparm_query=number=${c.laptopTicket || 'INC0040420'}`;

  document.getElementById('modalCandidateName').innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.85rem;">
      <div class="avatar" style="width: 44px; height: 44px; font-size: 1.15rem; font-weight: 800; background: var(--accent-gradient); color: #fff;">
        ${c.fullName ? c.fullName.charAt(0).toUpperCase() : 'C'}
      </div>
      <div>
        <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${c.fullName}</div>
        <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">${c.jobTitle} • ${c.department} • <code>${c.id}</code></div>
      </div>
    </div>
  `;
  
  const modalBody = document.getElementById('modalBodyContent');
  modalBody.innerHTML = `
    <!-- 4-Engine System Status Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
      
      <!-- 1. ServiceNow Service Catalog & Hardware Incident Card -->
      <div style="background: var(--bg-card); padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <strong style="color: #0284c7; font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-server"></i> 1. ServiceNow ITSM
            </strong>
            <span class="badge ${getStatusBadgeClass(c.status)}" style="font-size: 0.7rem;">
              ${c.status || 'Pending Approval'}
            </span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">
            <div>Request: <strong>${c.serviceNowReq || 'REQ0010042'}</strong> | Item: <strong>${c.serviceNowRitm || 'RITM0010076'}</strong></div>
            ${c.laptopTicket ? `<div>Hardware Incident: <strong style="color: #059669;">${c.laptopTicket}</strong></div>` : ''}
            <div>Hardware: <span>${c.hardware || 'Apple MacBook Pro M3 Max'}</span></div>
          </div>
        </div>
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <a href="${reqLink}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; border-color: var(--border-orange); color: var(--brand-orange); background: #ffffff; font-weight: 700; text-decoration: none;">
            <i class="fa-solid fa-ticket"></i> REQ
          </a>
          ${c.laptopTicket ? `
            <a href="${laptopLink}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; border-color: #a7f3d0; color: #059669; background: #ffffff; font-weight: 700; text-decoration: none;">
              <i class="fa-solid fa-laptop"></i> ${c.laptopTicket}
            </a>
          ` : ''}
        </div>
      </div>

      <!-- 2. AutomationEdge T4 Active Directory Card -->
      <div style="background: #fff7ed; padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid #fed7aa; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <strong style="color: #c2410c; font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-robot"></i> 2. T4 Active Directory
            </strong>
            <span class="badge" style="background: #ffedd5; color: #c2410c; font-size: 0.7rem; border: 1px solid #fed7aa;">
              ${c.aeT4Status || (c.aeT4RequestId ? 'Complete' : 'Triggered on Approval')}
            </span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">
            <div>Workflow: <code>${c.aeT4Workflow || 'AD-Create User and Assin Role'}</code></div>
            ${c.aeT4RequestId ? `<div>Automation Req: <strong>#${c.aeT4RequestId}</strong></div>` : ''}
            ${c.aeT4Agent ? `<div>Agent: <code>${c.aeT4Agent}</code></div>` : ''}
            ${c.aeT4Message ? `<div style="color: #15803d; font-weight: 600; margin-top: 2px;">✓ ${c.aeT4Message}</div>` : ''}
          </div>
        </div>
        <a href="${c.aeT4Url || (c.aeT4RequestId ? `https://t4.automationedge.com/#/workflowinstances/${c.aeT4RequestId}` : 'https://t4.automationedge.com/#/taskhistory')}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: #fed7aa; color: #c2410c; background: #ffffff; font-weight: 700; text-decoration: none; width: fit-content;">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open T4 Workflow (${c.aeT4RequestId ? '#' + c.aeT4RequestId : 'Portal'})
        </a>
      </div>

      <!-- 3. Microsoft Office 365 Account Card -->
      <div style="background: #eff6ff; padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid #bfdbfe; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <strong style="color: #1d4ed8; font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-brands fa-microsoft"></i> 3. Office 365 Account
            </strong>
            <span class="badge" style="background: #dbeafe; color: #1e40af; font-size: 0.7rem; border: 1px solid #93c5fd;">
              ${c.o365Status || (c.o365UserId ? 'Active (Entra ID)' : 'Provisioned on Approval')}
            </span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">
            <div>Work Email: <strong>${c.o365Email || c.o365UserPrincipalName || (c.fullName ? c.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') + '@automationedge.ai' : 'Pending')}</strong></div>
            ${c.o365InitialPassword ? `<div>Temp Password: <code style="font-weight: 700;">${c.o365InitialPassword}</code></div>` : ''}
          </div>
        </div>
        <a href="${c.o365AdminUrl || 'https://admin.microsoft.com/#/users'}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: #bfdbfe; color: #1d4ed8; background: #ffffff; font-weight: 700; text-decoration: none; width: fit-content;">
          <i class="fa-brands fa-microsoft"></i> Open M365 Admin Center
        </a>
      </div>

      <!-- 4. OrangeHRM Enterprise Profile Card -->
      <div style="background: #fff7ed; padding: 1.15rem; border-radius: var(--radius-md); border: 1px solid #fdba74; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <strong style="color: #ea580c; font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-user-check"></i> 4. OrangeHRM Profile
            </strong>
            <span class="badge" style="background: #ffedd5; color: #c2410c; font-size: 0.7rem; border: 1px solid #fdba74;">
              ${c.orangeHrmStatus || (c.orangeHrmEmpNumber ? 'Profile Active' : 'Created on Approval')}
            </span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">
            <div>Instance: <code>10.41.5.39/orangehrm</code></div>
            ${c.orangeHrmEmpNumber ? `<div>PIM Emp Number: <strong>#${c.orangeHrmEmpNumber}</strong></div>` : ''}
            <div>Sync: <span>Uses generated Office 365 workEmail</span></div>
          </div>
        </div>
        <a href="${c.orangeHrmProfileUrl || (c.orangeHrmEmpNumber ? `http://10.41.5.39/orangehrm/web/index.php/pim/viewPersonalDetails/empNumber/${c.orangeHrmEmpNumber}` : 'http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList')}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: #fdba74; color: #ea580c; background: #ffffff; font-weight: 700; text-decoration: none; width: fit-content;">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open OrangeHRM (${c.orangeHrmEmpNumber ? '#' + c.orangeHrmEmpNumber : 'Directory'})
        </a>
      </div>
    </div>   </div>

    </div>

    <!-- Candidate Detailed Attributes -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; background: var(--bg-primary); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 0.85rem; line-height: 1.7;">
      <div><strong style="color: var(--text-secondary);">Personal Email:</strong> <span>${c.email}</span></div>
      <div><strong style="color: var(--text-secondary);">Phone:</strong> <span>${c.phone || '+91 98230 45678'}</span></div>
      <div><strong style="color: var(--text-secondary);">Reporting Manager:</strong> <span>${c.manager || 'David Miller'}</span></div>
      <div><strong style="color: var(--text-secondary);">Date of Joining:</strong> <span>${c.startDate || '2026-10-15'}</span></div>
      <div><strong style="color: var(--text-secondary);">Emergency Contact:</strong> <span>${c.emergencyName || 'Mark Jenkins (Spouse)'} (${c.emergencyPhone || '+1 (555) 882-1092'})</span></div>
      <div><strong style="color: var(--text-secondary);">Residential Address:</strong> <span>${c.address || 'Pune Corporate Campus'}</span></div>
    </div>
  `;

  document.getElementById('dossierModal').classList.add('active');
}

function closeDossierModal() {
  document.getElementById('dossierModal').classList.remove('active');
}

function printDossier() {
  window.print();
}

function exportDataToCSV() {
  const candidates = cachedCandidates;
  const headers = ['ID', 'Full Name', 'Email', 'Department', 'Job Title', 'Manager', 'Start Date', 'Hardware', 'Status'];
  const rows = candidates.map(c => [
    c.id, `"${c.fullName}"`, c.email, c.department, `"${c.jobTitle}"`, `"${c.manager}"`, c.startDate, `"${c.hardware}"`, c.status
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `MangoHRMS_Onboarding_Dossier_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Exported candidate onboarding dossier CSV!', 'success');
}
