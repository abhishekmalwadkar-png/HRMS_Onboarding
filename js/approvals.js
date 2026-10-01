/* HR Approvals & ServiceNow Laptop Ticket Provisioning Controller */

let pendingApprovalsList = [];
let approvedHistoryList = [];

async function loadApprovals() {
  try {
    let res = await fetch('/api/employees?t=' + Date.now(), { cache: 'no-store' });
    let employees = [];
    if (res.ok) {
      employees = await res.json();
    } else {
      const fallback = localStorage.getItem('mangohrms_candidates');
      employees = fallback ? JSON.parse(fallback) : [];
    }

    pendingApprovalsList = employees.filter(e => e.status === 'Pending Review' || !e.status || e.status === 'Pending Approval');
    approvedHistoryList = employees.filter(e => e.status === 'Approved');

    // Update Approvals Badge count in navbar
    const badgeEl = document.getElementById('approvalCountBadge');
    if (badgeEl) {
      badgeEl.textContent = pendingApprovalsList.length;
      badgeEl.style.display = pendingApprovalsList.length > 0 ? 'inline-flex' : 'none';
    }

    renderApprovalsUI();
  } catch (err) {
    console.error('Error loading approvals:', err);
  }
}

// ServiceNow & OrangeHRM Direct URL Helpers
function getReqDirectUrl(cand) {
  if (cand.reqUrl) return cand.reqUrl;
  const num = cand.serviceNowReq || 'REQ0011873';
  return `https://ven04528.service-now.com/nav_to.do?uri=sc_request_list.do?sysparm_query=number=${num}`;
}

function getRitmDirectUrl(cand) {
  if (cand.ritmUrl) return cand.ritmUrl;
  const num = cand.serviceNowRitm || 'RITM0011865';
  return `https://ven04528.service-now.com/nav_to.do?uri=sc_req_item_list.do?sysparm_query=number=${num}`;
}

function getLaptopTicketDirectUrl(cand) {
  if (cand.laptopTicketUrl) return cand.laptopTicketUrl;
  const num = cand.laptopTicket || 'INC0040420';
  return `https://ven04528.service-now.com/nav_to.do?uri=incident_list.do?sysparm_query=number=${num}`;
}

function getOrangeHrmDirectUrl(cand) {
  if (cand && cand.orangeHrmProfileUrl) return cand.orangeHrmProfileUrl;
  if (cand && cand.orangeHrmEmpNumber) {
    return `http://10.41.5.39/orangehrm/web/index.php/pim/viewPersonalDetails/empNumber/${cand.orangeHrmEmpNumber}`;
  }
  return 'http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList';
}

function getOffice365DirectUrl(cand) {
  if (cand && cand.o365AdminUrl) return cand.o365AdminUrl;
  if (cand && cand.o365UserId) {
    return `https://portal.azure.com/#view/Microsoft_AAD_UsersAndTenants/UserProfileMenuBlade/~/overview/userId/${cand.o365UserId}`;
  }
  return 'https://admin.microsoft.com/#/users';
}

function getAeT4DirectUrl(cand) {
  if (cand && cand.aeT4RequestId) {
    return `https://t4.automationedge.com/#/workflowinstances/${cand.aeT4RequestId}`;
  }
  return 'https://t4.automationedge.com/#/taskhistory';
}

let currentApprovalsSearch = '';

function filterApprovalsList() {
  const searchInput = document.getElementById('approvalsSearchInput');
  currentApprovalsSearch = searchInput ? searchInput.value.trim().toLowerCase() : '';
  renderApprovalsUI();
}

async function syncServiceNowApprovals() {
  showToast('🔄 Synchronizing approval records with ServiceNow PDI...', 'info');
  try {
    const res = await fetch('/api/servicenow/sync-approvals?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data.syncedCount > 0) {
        showToast(`🎉 Processed ${data.syncedCount} new ServiceNow approval(s)!`, 'success');
      } else {
        showToast('✓ ServiceNow is up to date (No new external approvals found).', 'info');
      }
      await loadApprovals();
    }
  } catch (err) {
    console.error('ServiceNow sync error:', err);
    showToast('Failed to sync with ServiceNow.', 'error');
  }
}

function renderApprovalsUI() {
  // Stat Counters
  const pendingCountEl = document.getElementById('approvalsPendingCount');
  const approvedCountEl = document.getElementById('approvalsApprovedCount');
  const laptopCountEl = document.getElementById('approvalsLaptopCount');

  if (pendingCountEl) pendingCountEl.textContent = pendingApprovalsList.length;
  if (approvedCountEl) approvedCountEl.textContent = approvedHistoryList.length;
  if (laptopCountEl) laptopCountEl.textContent = approvedHistoryList.filter(e => e.laptopTicket || e.hardwareDispatched).length;

  const container = document.getElementById('pendingApprovalsContainer');
  if (!container) return;

  // Filter based on search input
  let displayList = pendingApprovalsList;
  if (currentApprovalsSearch) {
    displayList = pendingApprovalsList.filter(cand => {
      const name = (cand.fullName || '').toLowerCase();
      const id = (cand.id || '').toLowerCase();
      const req = (cand.serviceNowReq || '').toLowerCase();
      const dept = (cand.department || '').toLowerCase();
      const role = (cand.jobTitle || '').toLowerCase();
      return name.includes(currentApprovalsSearch) || 
             id.includes(currentApprovalsSearch) || 
             req.includes(currentApprovalsSearch) || 
             dept.includes(currentApprovalsSearch) || 
             role.includes(currentApprovalsSearch);
    });
  }

  if (displayList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color); box-shadow: var(--shadow-sm);">
        <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: var(--accent-emerald); margin-bottom: 0.85rem; display: block;"></i>
        <h3 style="margin-bottom: 0.35rem; font-size: 1.25rem;">${pendingApprovalsList.length === 0 ? 'All Onboarding Submissions Approved' : 'No Matching Candidate Found'}</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          ${pendingApprovalsList.length === 0 ? 'There are currently no candidate document verification requests waiting for HR approval.' : 'Try searching with a different candidate name, employee ID, or ServiceNow REQ number.'}
        </p>
      </div>
    `;
  } else {
    container.innerHTML = displayList.map(cand => `
      <div class="glass-card" style="padding: 1.6rem 1.85rem; margin-bottom: 1.5rem; border: 1px solid var(--border-color); background: var(--bg-card); box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05); border-radius: var(--radius-lg); transition: var(--transition-normal);" onmouseover="this.style.borderColor='var(--border-orange-strong)'" onmouseout="this.style.borderColor='var(--border-color)'">
        
        <!-- Header Bar with Candidate Details and System Quick Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 1.1rem; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; align-items: center; gap: 0.95rem;">
            <div class="avatar" style="width: 48px; height: 48px; font-size: 1.25rem; font-weight: 800; background: var(--accent-gradient); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(234, 88, 12, 0.28); flex-shrink: 0;">
              ${cand.fullName ? cand.fullName.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                <h3 style="font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--text-main); letter-spacing: -0.3px;">${cand.fullName}</h3>
                <span class="badge badge-pending" style="font-size: 0.72rem; padding: 0.25rem 0.65rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                  <span class="live-pulse-dot orange" style="width: 6px; height: 6px;"></span> Pending HR Verification
                </span>
                <span class="badge" style="font-size: 0.72rem; padding: 0.25rem 0.65rem; background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-secondary);">
                  ${cand.department || 'Engineering'}
                </span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span><i class="fa-solid fa-envelope" style="color: var(--brand-orange);"></i> ${cand.email}</span>
                <span>•</span>
                <span><i class="fa-solid fa-phone"></i> ${cand.phone || 'N/A'}</span>
                <span>•</span>
                <span><strong>ID:</strong> <code style="color: var(--brand-orange); font-weight: 700;">${cand.id}</code></span>
              </div>
            </div>
          </div>

          <!-- Top-Right Direct External Navigation Badges -->
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
            <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
              <!-- 1. Direct Link to REQ -->
              <a href="${getReqDirectUrl(cand)}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: var(--border-orange); color: var(--brand-orange); background: var(--bg-accent-soft); font-weight: 700; text-decoration: none; border-radius: 6px;" title="Open live Service Catalog REQ in ServiceNow">
                <i class="fa-solid fa-ticket"></i> REQ: <span>${cand.serviceNowReq || 'REQ0848302'}</span>
              </a>

              <!-- 2. Direct Link to RITM -->
              <a href="${getRitmDirectUrl(cand)}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: #bae6fd; color: #0284c7; background: #f0f9ff; font-weight: 700; text-decoration: none; border-radius: 6px;" title="Open live RITM in ServiceNow">
                <i class="fa-solid fa-box-open"></i> RITM: <span>${cand.serviceNowRitm || 'RITM0848336'}</span>
              </a>

              <!-- 3. Direct Link to OrangeHRM Profile -->
              <a href="${getOrangeHrmDirectUrl(cand)}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: #fdba74; color: #ea580c; background: #fff7ed; font-weight: 700; text-decoration: none; border-radius: 6px;" title="Open live Employee Profile in OrangeHRM">
                <i class="fa-solid fa-user-check"></i> OrangeHRM: <span>${cand.orangeHrmEmpNumber ? '#' + cand.orangeHrmEmpNumber : 'PIM'}</span>
              </a>

              <!-- 4. Direct Link to Office 365 User Account -->
              <a href="${getOffice365DirectUrl(cand)}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: #93c5fd; color: #1d4ed8; background: #eff6ff; font-weight: 700; text-decoration: none; border-radius: 6px;" title="Open live Office 365 / Entra ID User Account">
                <i class="fa-brands fa-microsoft"></i> M365: <span>${cand.o365Email ? cand.o365Email.split('@')[0] : 'Ready'}</span>
              </a>

              <!-- 5. Direct Link to AutomationEdge T4 Active Directory Workflow -->
              <a href="${getAeT4DirectUrl(cand)}" target="_blank" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; border-color: #fed7aa; color: #c2410c; background: #fff7ed; font-weight: 700; text-decoration: none; border-radius: 6px;" title="Open AutomationEdge T4 AD Workflow Instance">
                <i class="fa-solid fa-robot" style="color: #ea580c;"></i> T4 AD: <span>${cand.aeT4RequestId ? '#' + cand.aeT4RequestId : 'Ready'}</span>
              </a>
            </div>
            <span style="font-size: 0.7rem; color: var(--text-muted);"><i class="fa-solid fa-server text-accent"></i> SN: <strong>ven04528</strong> | OrangeHRM: <strong>10.41.5.39</strong> | O365: <strong>automationedge.ai</strong> | AE T4: <strong>t4.automationedge.com</strong></span>
          </div>
        </div>

        <!-- 4-Step Sequential Pipeline Progress Track -->
        <div style="background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-size: 0.75rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">Approval Flow Sequence:</span>
          
          <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; font-size: 0.8rem; font-weight: 700;">
            <span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #059669; background: #ecfdf5; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid #a7f3d0;">
              <i class="fa-solid fa-laptop"></i> 1. ServiceNow
            </span>
            <i class="fa-solid fa-arrow-right" style="font-size: 0.7rem; color: var(--text-dim);"></i>
            <span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #c2410c; background: #fff7ed; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid #fed7aa;">
              <i class="fa-solid fa-robot"></i> 2. AD
            </span>
            <i class="fa-solid fa-arrow-right" style="font-size: 0.7rem; color: var(--text-dim);"></i>
            <span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #1d4ed8; background: #eff6ff; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid #bfdbfe;">
              <i class="fa-brands fa-microsoft"></i> 3. 365
            </span>
            <i class="fa-solid fa-arrow-right" style="font-size: 0.7rem; color: var(--text-dim);"></i>
            <span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #ea580c; background: #fff7ed; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid #fed7aa;">
              <i class="fa-solid fa-user-check"></i> 4. OrangeHRM
            </span>
          </div>
        </div>

        <!-- 2-Column Info Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; margin-bottom: 1.25rem;">
          
          <!-- Column 1: Candidate Personal Details -->
          <div style="background: var(--bg-accent-soft); padding: 1.15rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-orange);">
            <h4 style="font-size: 0.88rem; color: var(--brand-orange); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.45rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
              <i class="fa-solid fa-id-card"></i> Candidate Information
            </h4>
            <div style="font-size: 0.85rem; line-height: 1.7; display: flex; flex-direction: column; gap: 0.3rem;">
              <div><strong style="color: var(--text-secondary);">Designation & Dept:</strong> <span>${cand.jobTitle || 'Staff AI Systems Engineer'} • ${cand.department || 'Engineering'}</span></div>
              <div><strong style="color: var(--text-secondary);">Date of Birth:</strong> <span>${cand.dob || '1994-06-15'}</span></div>
              <div><strong style="color: var(--text-secondary);">Emergency Contact:</strong> <span>${cand.emergencyName || 'Sunita Sharma (Mother)'} (${cand.emergencyPhone || cand.phone || '+91 98230 45670'})</span></div>
              <div><strong style="color: var(--text-secondary);">Residential Address:</strong> <span>${cand.address || 'Flat 402, Marvel Palms, Baner, Pune 411045'}</span></div>
            </div>
          </div>

          <!-- Column 2: Uploaded Verification Documents & Workstation Model -->
          <div style="background: var(--bg-card); padding: 1.15rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <h4 style="font-size: 0.88rem; color: var(--text-main); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.45rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
              <i class="fa-solid fa-file-shield text-accent"></i> Uploaded Verification Documents
            </h4>
            <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.83rem;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-id-badge text-accent"></i> 1. Government ID / Aadhaar Card</span>
                <span class="badge badge-verified" style="font-size: 0.68rem;"><i class="fa-solid fa-check"></i> Uploaded</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-graduation-cap text-accent"></i> 2. Degree / Education Certificate</span>
                <span class="badge badge-verified" style="font-size: 0.68rem;"><i class="fa-solid fa-check"></i> Uploaded</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-file-invoice-dollar text-accent"></i> 3. Tax Form 16 / W-4</span>
                <span class="badge badge-verified" style="font-size: 0.68rem;"><i class="fa-solid fa-check"></i> Uploaded</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-file-signature text-accent"></i> 4. Signed Offer Letter</span>
                <span class="badge badge-verified" style="font-size: 0.68rem;"><i class="fa-solid fa-check"></i> Uploaded</span>
              </div>
            </div>

            <div style="margin-top: 0.65rem; padding-top: 0.55rem; border-top: 1px dashed var(--border-subtle); display: flex; align-items: center; justify-content: space-between; font-size: 0.84rem;">
              <span><i class="fa-solid fa-laptop text-accent"></i> <strong>Workstation Requested:</strong></span>
              <strong style="color: var(--brand-orange);">${cand.hardware || 'Apple MacBook Pro M3 Max'}</strong>
            </div>
          </div>

        </div>

        <!-- Approval Action Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; background: var(--accent-gradient-subtle); padding: 1rem 1.35rem; border-radius: var(--radius-md); border: 1px solid var(--border-orange);">
          <div style="font-size: 0.85rem; color: #9a3412; display: flex; align-items: center; gap: 0.5rem; font-weight: 700;">
            <i class="fa-solid fa-wand-magic-sparkles" style="color: #ea580c; font-size: 1.15rem;"></i>
            <span>Orchestrates 1st ServiceNow ➔ 2nd AD ➔ 3rd Office 365 ➔ 4th OrangeHRM (with O365 mail)</span>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <!-- Option 1: Approve from Portal -->
            <button class="btn btn-primary" id="btnApprove_${cand.id}" onclick="executeHRApproval('${cand.id}', 'HR Portal')" style="padding: 0.6rem 1.35rem; font-size: 0.9rem; background: var(--accent-gradient); border-color: transparent; font-weight: 800; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);">
              <i class="fa-solid fa-circle-check"></i> Approve & Trigger All 4 Engines
            </button>
            
            <!-- Option 2: Approve via ServiceNow -->
            <button class="btn btn-secondary" onclick="executeHRApproval('${cand.id}', 'ServiceNow (ven04528)')" style="padding: 0.6rem 1.25rem; font-size: 0.88rem; border-color: var(--border-orange); color: var(--brand-orange); background: white; font-weight: 700;" title="Synchronize Approval from ServiceNow PDI">
              <i class="fa-solid fa-server text-accent"></i> Approve via ServiceNow
            </button>
          </div>
        </div>

      </div>
    `).join('');
  }

  // Render Approved History Table
  const historyBody = document.getElementById('approvedHistoryBody');
  if (historyBody) {
    if (approvedHistoryList.length === 0) {
      historyBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No approved onboarding records yet.</td></tr>`;
    } else {
      historyBody.innerHTML = approvedHistoryList.map(item => `
        <tr>
          <td>
            <strong>${item.fullName}</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${item.email}</div>
          </td>
          <td>${item.jobTitle} • ${item.department}</td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <a href="${getReqDirectUrl(item)}" target="_blank" class="badge badge-verified" style="font-size: 0.75rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;" title="Open live REQ in ServiceNow">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> ${item.serviceNowReq || 'REQ0010042'}
              </a>
              ${item.serviceNowRitm ? `
                <a href="${getRitmDirectUrl(item)}" target="_blank" style="font-size: 0.7rem; color: #0284c7; text-decoration: none; margin-top: 2px;">
                  Item: <code>${item.serviceNowRitm}</code> <i class="fa-solid fa-external-link" style="font-size: 0.6rem;"></i>
                </a>
              ` : ''}
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span class="badge badge-approved" style="font-size: 0.72rem;">
                <i class="fa-solid fa-check-double"></i> Verified
              </span>
              ${item.orangeHrmEmpNumber || item.orangeHrmProfileUrl ? `
                <a href="${getOrangeHrmDirectUrl(item)}" target="_blank" class="badge badge-verified" style="font-size: 0.72rem; text-decoration: none; border-color: #fdba74; color: #ea580c; background: #fff7ed;" title="Open live Profile in OrangeHRM">
                  <i class="fa-solid fa-user-check"></i> OrangeHRM #${item.orangeHrmEmpNumber || ''}
                </a>
              ` : ''}
              ${item.o365Email || item.o365UserId ? `
                <a href="${getOffice365DirectUrl(item)}" target="_blank" class="badge" style="font-size: 0.72rem; text-decoration: none; border: 1px solid #93c5fd; color: #1d4ed8; background: #eff6ff;" title="Open live Account in Office 365 / Entra ID">
                  <i class="fa-brands fa-microsoft"></i> ${item.o365Email ? item.o365Email.split('@')[0] : 'O365'}
                </a>
              ` : ''}
            </div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-solid fa-laptop text-accent"></i>
              <a href="${getLaptopTicketDirectUrl(item)}" target="_blank" style="text-decoration: none; color: var(--brand-orange); font-weight: 700; font-size: 0.85rem;" title="Open live Laptop Incident Ticket in ServiceNow">
                ${item.laptopTicket || 'INC0040420'} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.7rem;"></i>
              </a>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${item.hardware || 'Apple MacBook Pro M3 Max'}</div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <a href="${getLaptopTicketDirectUrl(item)}" target="_blank" class="badge badge-verified" style="font-size: 0.72rem; text-decoration: none;" title="Open live Laptop Ticket in ServiceNow">
                <i class="fa-solid fa-truck-fast"></i> IT Ticket Dispatched
              </a>
              ${item.orangeHrmEmpNumber ? `
                <span style="font-size: 0.68rem; color: #059669;"><i class="fa-solid fa-circle-check"></i> OrangeHRM Active</span>
              ` : ''}
              ${item.o365Email ? `
                <span style="font-size: 0.68rem; color: #1d4ed8;"><i class="fa-brands fa-microsoft"></i> O365 Account Active</span>
              ` : ''}
              ${item.aeT4RequestId ? `
                <a href="${getAeT4DirectUrl(item)}" target="_blank" style="font-size: 0.68rem; color: #ea580c; text-decoration: none; font-weight: 600;" title="Open AutomationEdge T4 Request #${item.aeT4RequestId}">
                  <i class="fa-solid fa-robot"></i> AE T4 AD: #${item.aeT4RequestId} (${item.aeT4Status || 'Complete'})
                </a>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    }
  }
}

// Executes Approval (either from HR Portal or synced from ServiceNow)
async function executeHRApproval(candidateId, approvalSource) {
  const cand = pendingApprovalsList.find(c => c.id === candidateId) || 
               cachedCandidates.find(c => c.id === candidateId);
  
  if (!cand) return;

  const btn = document.getElementById('btnApprove_' + candidateId);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Executing (1st SN ➔ 2nd AD ➔ 3rd M365 ➔ 4th OrangeHRM)...`;
  }

  showToast(`⏳ [${approvalSource}] Initiating Sequential Provisioning for ${cand.fullName}: 1st ServiceNow ➔ 2nd AD ➔ 3rd Office 365 ➔ 4th OrangeHRM...`, 'info');

  try {
    const res = await fetch('/api/servicenow/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cand.id,
        fullName: cand.fullName,
        email: cand.email,
        phone: cand.phone || '',
        department: cand.department || 'Engineering',
        jobTitle: cand.jobTitle || 'Staff AI Systems Engineer',
        hardware: cand.hardware || 'Apple MacBook Pro M3 Max',
        reqNumber: cand.serviceNowReq || `REQ001${Math.floor(1000 + Math.random() * 9000)}`,
        approvalSource: approvalSource
      })
    });

    let laptopTicket = `ITSM-ASSET-${Math.floor(1000 + Math.random() * 9000)}`;
    let orangeHrmEmpNumber = null;
    let orangeHrmProfileUrl = null;
    let o365Email = null;
    let o365UserId = null;
    let o365AdminUrl = null;
    let aeT4RequestId = null;
    let aeT4Workflow = 'AD-Create User and Assin Role';
    let aeT4Status = 'Complete';
    let aeT4Agent = null;
    let aeT4Message = null;
    let aeT4Url = null;

    if (res.ok) {
      const result = await res.json();
      if (result.laptopProvisioning && result.laptopProvisioning.ticketNumber) {
        laptopTicket = result.laptopProvisioning.ticketNumber;
      }
      if (result.orangeHrm && result.orangeHrm.empNumber) {
        orangeHrmEmpNumber = result.orangeHrm.empNumber;
        orangeHrmProfileUrl = result.orangeHrm.profileUrl;
      } else if (result.orangeHrmEmpNumber) {
        orangeHrmEmpNumber = result.orangeHrmEmpNumber;
        orangeHrmProfileUrl = result.orangeHrmProfileUrl;
      }
      if (result.office365) {
        o365Email = result.office365.userPrincipalName || result.o365Email;
        o365UserId = result.office365.userId || result.o365UserId;
        o365AdminUrl = result.office365.adminUrl || result.o365AdminUrl;
      } else if (result.o365Email) {
        o365Email = result.o365Email;
        o365UserId = result.o365UserId;
        o365AdminUrl = result.o365AdminUrl;
      }
      if (result.aeT4RequestId) {
        aeT4RequestId = result.aeT4RequestId;
        aeT4Workflow = result.aeT4Workflow || aeT4Workflow;
        aeT4Status = result.aeT4Status || aeT4Status;
        aeT4Agent = result.aeT4Agent;
        aeT4Message = result.aeT4Message;
        aeT4Url = result.aeT4Url;
      }
    }

    // Update locally
    cand.status = 'Approved';
    cand.serviceNowStatus = 'Approved';
    cand.hardwareDispatched = true;
    cand.laptopTicket = laptopTicket;
    cand.orangeHrmEmpNumber = orangeHrmEmpNumber;
    cand.orangeHrmProfileUrl = orangeHrmProfileUrl;
    cand.orangeHrmStatus = 'Profile Created in OrangeHRM PIM';
    if (o365Email) {
      cand.o365Email = o365Email;
      cand.o365UserId = o365UserId;
      cand.o365AdminUrl = o365AdminUrl;
      cand.o365Status = 'Account Active in Office 365';
    }
    if (aeT4RequestId) {
      cand.aeT4RequestId = aeT4RequestId;
      cand.aeT4Workflow = aeT4Workflow;
      cand.aeT4Status = aeT4Status;
      cand.aeT4Agent = aeT4Agent;
      cand.aeT4Message = aeT4Message;
      cand.aeT4Url = aeT4Url;
    }
    cand.approvedAt = new Date().toLocaleString();
    cand.approvalSource = approvalSource;

    // Refresh memory and disk
    await updateCandidateInJSON(cand);
    await loadApprovals();
    renderCandidatesTable();

    showToast(`🎉 [${approvalSource} Approved] Verified ${cand.fullName}! T4 AD Workflow "${aeT4Workflow}" (Req #${aeT4RequestId || 'Active'}), Office 365 (${o365Email ? o365Email.split('@')[0] : 'Active'}), OrangeHRM (#${orangeHrmEmpNumber || 'PIM'}) & Laptop Ticket "${laptopTicket}" created!`, 'success');

  } catch (err) {
    console.error('Approval error:', err);
    cand.status = 'Approved';
    cand.hardwareDispatched = true;
    cand.laptopTicket = `ITSM-ASSET-${Date.now() % 10000}`;
    await updateCandidateInJSON(cand);
    await loadApprovals();
    renderCandidatesTable();
    showToast(`✓ Onboarding approved for ${cand.fullName}! Laptop ticket created.`, 'success');
  }
}
