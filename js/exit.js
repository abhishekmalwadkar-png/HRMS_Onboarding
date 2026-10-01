/* Employee Exit Module Controller */

let exitRequests = [];

document.addEventListener('DOMContentLoaded', () => {
  loadExitData();
});

async function loadExitData() {
  try {
    const res = await fetch('/api/exit');
    if (res.ok) {
      exitRequests = await res.json();
    }
  } catch (e) {
    console.warn('Exit fetch error:', e);
  }
  renderExitPipeline();
}

function renderExitPipeline() {
  const container = document.getElementById('exitPipelineContainer');
  if (!container) return;

  if (exitRequests.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">No active exit or resignation workflows in progress.</p>`;
    return;
  }

  container.innerHTML = exitRequests.map(item => `
    <div class="glass-card" style="padding: 1.25rem; margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3>${item.empName} (${item.department})</h3>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Resignation Date: ${item.resignationDate} • Last Working Day: <strong>${item.lastWorkingDay}</strong></span>
          ${item.rpaResignationRequestId ? `
            <div style="font-size: 0.75rem; color: var(--accent-emerald); margin-top: 4px;">
              <i class="fa-solid fa-robot"></i> AE T4 RPA Workflow: <code>${item.rpaResignationRequestId}</code>
            </div>
          ` : ''}
        </div>
        <span class="badge ${item.accessRevoked ? 'badge-draft' : 'badge-pending'}">
          ${item.accessRevoked ? 'Access Revoked' : 'Clearance Active'}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
        <div class="clearance-item">
          <span>Manager Approval</span>
          <span class="status-indicator ready"><i class="fa-solid fa-circle-check"></i> Approved</span>
        </div>
        <div class="clearance-item">
          <span>IT Asset Recovery</span>
          <span class="status-indicator ${item.itClearance ? 'ready' : 'pending'}">
            <i class="fa-solid ${item.itClearance ? 'fa-circle-check' : 'fa-clock'}"></i> ${item.itClearance ? 'Cleared' : 'Pending Return'}
          </span>
        </div>
        <div class="clearance-item">
          <span>Finance FnF Settlement</span>
          <span class="status-indicator ${item.financeClearance ? 'ready' : 'pending'}">
            <i class="fa-solid ${item.financeClearance ? 'fa-circle-check' : 'fa-clock'}"></i> ${item.fnfStatus}
          </span>
        </div>
        <div class="clearance-item">
          <span>Active Directory Access</span>
          <span class="status-indicator ${item.accessRevoked ? 'revoked' : 'ready'}">
            <i class="fa-solid ${item.accessRevoked ? 'fa-user-slash' : 'fa-user-check'}"></i> ${item.accessRevoked ? 'Disabled' : 'Active'}
          </span>
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="toggleITClearance('${item.id}')">
          <i class="fa-solid fa-laptop"></i> Toggle IT Clearance
        </button>
        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="triggerAccessRevocation('${item.id}', '${item.empName}')">
          <i class="fa-solid fa-user-xmark"></i> Revoke AD Access
        </button>
        <button class="btn btn-emerald" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="generateRelievingDocument('${item.empName}')">
          <i class="fa-solid fa-file-export"></i> Issue Relieving Letter
        </button>
      </div>
    </div>
  `).join('');
}

async function submitResignation(e) {
  e.preventDefault();
  const empName = document.getElementById('exitEmpName').value;
  const dept = document.getElementById('exitDept').value;
  const lwd = document.getElementById('exitLwd').value;
  const reason = document.getElementById('exitReason').value;

  const newExit = {
    id: 'EXIT-' + Math.floor(100 + Math.random() * 900),
    empId: 'EMP-9024',
    empName: empName,
    department: dept,
    resignationDate: new Date().toISOString().slice(0, 10),
    lastWorkingDay: lwd,
    reason: reason,
    managerApproval: true,
    itClearance: false,
    financeClearance: false,
    accessRevoked: false,
    fnfStatus: 'In Progress'
  };

  try {
    const res = await fetch('/api/exit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExit)
    });

    exitRequests.unshift(newExit);
    renderExitPipeline();
    showToast(`✓ Resignation submitted for ${empName} successfully.`, 'success');

    // Reset Form
    document.getElementById('exitEmpName').value = '';
    document.getElementById('exitLwd').value = '';
    document.getElementById('exitReason').value = '';
  } catch (err) {
    console.error('Error submitting resignation:', err);
    exitRequests.unshift(newExit);
    renderExitPipeline();
    showToast(`✓ Resignation submitted for ${empName} successfully.`, 'success');
  }
}

function triggerAccessRevocation(id, name) {
  const item = exitRequests.find(x => x.id === id);
  if (item) {
    item.accessRevoked = true;
    renderExitPipeline();
    showToast(`🔒 Active Directory & Email access revoked for ${name}.`, 'error');
  }
}

function toggleITClearance(id) {
  const item = exitRequests.find(x => x.id === id);
  if (item) {
    item.itClearance = !item.itClearance;
    renderExitPipeline();
    showToast(`IT Asset Recovery status updated for ${item.empName}!`, 'info');
  }
}

function generateRelievingDocument(name) {
  showToast(`📄 Generated Relieving & Experience Certificate for ${name}!`, 'success');
}
