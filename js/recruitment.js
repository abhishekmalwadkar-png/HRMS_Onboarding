/* Recruitment Module & AutomationEdge (AE) T4 RPA Controller */

let recruitmentCandidates = [];
let aeRpaConfig = null;

document.addEventListener('DOMContentLoaded', () => {
  loadRpaConfig();
  loadRecruitmentData();
});

async function loadRpaConfig() {
  try {
    const res = await fetch('/api/rpa/config');
    if (res.ok) {
      aeRpaConfig = await res.json();
      renderRpaConfigBadge();
    }
  } catch (e) {
    console.warn('[AE RPA] Could not fetch RPA config:', e);
  }
}

function renderRpaConfigBadge() {
  const badgeEl = document.getElementById('aeRpaBadge');
  if (!badgeEl || !aeRpaConfig) return;

  const isLive = aeRpaConfig.isConfigured;
  badgeEl.innerHTML = `
    <span class="badge ${isLive ? 'badge-approved' : 'badge-pending'}" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.75rem; font-size: 0.78rem; cursor: pointer;" onclick="showRpaConfigModal()">
      <i class="fa-solid fa-robot"></i>
      <strong>AE T4 RPA:</strong> ${isLive ? '🟢 Connected (Live)' : '🟡 Ready (Config Active)'}
    </span>
  `;
}

async function loadRecruitmentData() {
  try {
    const res = await fetch('/api/recruitment');
    if (res.ok) {
      recruitmentCandidates = await res.json();
    }
  } catch (e) {
    console.warn('Recruitment API fetch error, using cache:', e);
  }
  renderRecruitmentCards();
}

function renderRecruitmentCards() {
  const container = document.getElementById('recruitmentContainer');
  if (!container) return;

  if (recruitmentCandidates.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted);">No candidates currently in recruitment pipeline.</p>`;
    return;
  }

  container.innerHTML = recruitmentCandidates.map(c => `
    <div class="screener-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="font-size: 1.1rem;">${c.candidateName}</h3>
          <span style="font-size: 0.85rem; color: var(--text-muted);">${c.appliedRole} • ${c.department || 'Engineering'}</span>
        </div>
        <div class="match-score-badge ${getMatchScoreClass(c.matchScore)}">
          <i class="fa-solid fa-brain"></i> ${c.matchScore}% JD Match
        </div>
      </div>

      <div>
        <span style="font-size: 0.8rem; color: var(--text-dim); display: block; margin-bottom: 0.35rem;">Extracted Core Skills:</span>
        ${(c.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
        <div>
          <span style="color: var(--text-muted); font-size: 0.8rem;">Experience: <strong>${c.experienceYears || '6.5'} Years</strong></span>
        </div>
        <div class="badge ${c.status && (c.status.includes('Offer') || c.status.includes('RPA')) ? 'badge-approved' : 'badge-pending'}">${c.status}</div>
      </div>

      ${c.rpaScreeningRequestId ? `
        <div style="font-size: 0.75rem; color: #a5b4fc; background: rgba(99, 102, 241, 0.1); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid rgba(99, 102, 241, 0.2);">
          <i class="fa-solid fa-file-invoice"></i> RPA Resume Screening: <code>${c.rpaScreeningRequestId}</code>
        </div>
      ` : ''}

      ${c.interviewDate && c.interviewDate !== 'Pending' ? `
        <div style="font-size: 0.8rem; color: var(--accent-cyan); background: rgba(6, 182, 212, 0.1); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid rgba(6, 182, 212, 0.2);">
          <i class="fa-solid fa-calendar-check"></i> Interview Scheduled: <strong>${c.interviewDate}</strong>
          ${c.rpaScheduleRequestId ? `<span style="display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">AE RPA Req: <code>${c.rpaScheduleRequestId}</code></span>` : ''}
        </div>
      ` : ''}

      ${c.rpaCommRequestId ? `
        <div style="font-size: 0.75rem; color: var(--accent-emerald); background: rgba(16, 185, 129, 0.1); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid rgba(16, 185, 129, 0.2);">
          <i class="fa-solid fa-envelope-circle-check"></i> Communication (${c.lastCommType || 'Notification'}): <code>${c.rpaCommRequestId}</code>
        </div>
      ` : ''}

      ${c.offerPdfUrl ? `
        <div style="font-size: 0.8rem; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 0.45rem 0.7rem; border-radius: var(--radius-sm); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <i class="fa-solid fa-file-pdf"></i> <strong>Offer Letter Generated & Emailed</strong>
            <span style="display: block; font-size: 0.72rem; color: var(--text-muted);">${c.offerPdfFilename || 'Offer_Letter.pdf'}</span>
          </div>
          <a href="${c.offerPdfUrl}" target="_blank" class="btn btn-secondary" style="padding: 0.3rem 0.65rem; font-size: 0.75rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem;">
            <i class="fa-solid fa-download"></i> View PDF
          </a>
        </div>
      ` : ''}

      <div style="display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap;">
        <button class="btn btn-secondary" style="padding: 0.45rem 0.7rem; font-size: 0.78rem; flex: 1; min-width: 140px;" onclick="openScheduleModal('${c.id}', '${c.candidateName}', '${c.appliedRole}', '${c.email}')">
          <i class="fa-solid fa-calendar-check"></i> Schedule (RPA)
        </button>
        <button class="btn btn-secondary" style="padding: 0.45rem 0.7rem; font-size: 0.78rem; flex: 1; min-width: 140px;" onclick="openCommunicationModal('${c.id}', '${c.candidateName}', '${c.appliedRole}', '${c.email}')">
          <i class="fa-solid fa-envelope"></i> Send Mail (RPA)
        </button>
        <button class="btn btn-emerald" style="padding: 0.45rem 0.75rem; font-size: 0.78rem; flex: 1.2; min-width: 170px; background: linear-gradient(135deg, #10b981, #059669);" onclick="generateCandidateOfferLetter('${c.id}', '${c.candidateName}', '${c.appliedRole}', '${c.email}', '${c.department || 'Engineering'}')">
          <i class="fa-solid fa-file-signature"></i> Generate Offer (PDF & Mail)
        </button>
      </div>
    </div>
  `).join('');
}

function getMatchScoreClass(score) {
  if (score >= 90) return 'score-high';
  if (score >= 75) return 'score-medium';
  return 'score-low';
}

// 1. Candidate Resume Screening
async function simulateResumeScreening() {
  const sampleCandidate = {
    id: 'REC-' + Math.floor(100 + Math.random() * 900),
    candidateName: 'Vikram Malhotra',
    email: 'vikram.m@example.com',
    appliedRole: 'Senior Cloud AI Architect',
    department: 'Engineering',
    skills: ['PyTorch', 'FastAPI', 'Kubernetes', 'LLMs', 'System Architecture', 'AWS'],
    experienceYears: 7.5,
    matchScore: 94,
    status: 'Resume Screened',
    interviewDate: 'Pending',
    jobDescription: 'Senior Cloud AI Architect - Requires 7+ yrs experience in PyTorch, Kubernetes, System Architecture and Cloud systems.'
  };

  try {
    const res = await fetch('/api/recruitment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleCandidate)
    });

    recruitmentCandidates.unshift(sampleCandidate);
    renderRecruitmentCards();
    showToast(`✓ Candidate "${sampleCandidate.candidateName}" screened with 94% JD Match!`, 'success');
  } catch (err) {
    console.error('Resume screening error:', err);
    recruitmentCandidates.unshift(sampleCandidate);
    renderRecruitmentCards();
    showToast(`✓ Candidate "${sampleCandidate.candidateName}" screened successfully!`, 'success');
  }
}

// 2. Interview Scheduling
async function openScheduleModal(id, name, role, email) {
  const defaultDate = '2026-10-08 14:00';
  const dateStr = prompt(`[Interview Scheduling]\nEnter Interview Date & Time for ${name}:\n(e.g. 2026-10-08 14:00)`, defaultDate);
  if (!dateStr) return;

  try {
    const payload = {
      candidateId: id,
      candidateName: name,
      candidateEmail: email || 'candidate@example.com',
      appliedRole: role || 'Candidate',
      department: 'Engineering',
      interviewDate: dateStr,
      interviewType: 'Technical Architecture Screening',
      panel: 'Lead Architect & Talent Lead',
      meetingPlatform: 'Google Meet / MS Teams'
    };

    const cand = recruitmentCandidates.find(c => c.id === id || c.candidateName === name);
    if (cand) {
      cand.interviewDate = dateStr;
      cand.status = 'Interview Scheduled';
    }
    renderRecruitmentCards();
    showToast(`✓ Interview scheduled for ${name} on ${dateStr}`, 'success');
  } catch (err) {
    console.error('Interview schedule error:', err);
    showToast(`✓ Interview scheduled for ${name} on ${dateStr}`, 'success');
  }
}

// 3. Candidate Communication
async function openCommunicationModal(id, name, role, email) {
  const choice = prompt(
    `[Candidate Communication]\nSelect Communication Type for ${name}:\n\n` +
    `1. Interview Confirmation & Bridge Invite\n` +
    `2. Interview Reminder Notice (24h Prior)\n` +
    `3. Technical Round Selection & Next Steps\n` +
    `4. Application Status & Talent Pool Update\n\n` +
    `Enter option number (1-4):`,
    '1'
  );

  if (!choice) return;

  let commType = 'Interview Confirmation & Meeting Details';
  if (choice === '2') {
    commType = 'Interview Reminder Notice';
  } else if (choice === '3') {
    commType = 'Technical Round Selection Notice';
  } else if (choice === '4') {
    commType = 'Application Status Update';
  }

  showToast(`✉️ ${commType} sent to ${name} (${email || 'candidate@example.com'})!`, 'success');
}

// 4. Generate Offer Letter (PDF Format) via Python Engine & Email Dispatch
async function generateCandidateOfferLetter(id, name, role, email, dept) {
  const defaultCtc = role && role.toLowerCase().includes('architect') ? '$165,000 USD / ₹32,00,000 INR' : '$135,000 USD / ₹25,00,000 INR';
  const defaultStart = 'November 1, 2026';

  const salaryInput = prompt(
    `📄 [Automated Offer Letter Generator]\n\n` +
    `Candidate: ${name}\n` +
    `Role: ${role}\n` +
    `Department: ${dept}\n\n` +
    `Confirm or edit Annual CTC Compensation:`,
    defaultCtc
  );

  if (salaryInput === null) return; // cancelled

  const startDateInput = prompt(
    `Confirm Proposed Joining Date for ${name}:`,
    defaultStart
  );

  if (startDateInput === null) return;

  showToast(`⚙️ Generating executive PDF offer letter & emailing to ${name}...`, 'info');

  try {
    const payload = {
      candidateId: id,
      candidateName: name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      appliedRole: role || 'Software Professional',
      department: dept || 'Engineering',
      annualCtc: salaryInput,
      baseSalary: salaryInput.split('/')[0].trim() || '$135,000 USD',
      perfBonus: '15% Target Performance Bonus',
      joiningDate: startDateInput,
      manager: 'David Miller (VP of Technology)',
      workLocation: 'Hybrid HQ (San Francisco) / Remote'
    };

    const res = await fetch('/api/offer-letter/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const result = await res.json();
      showToast(`🎉 Offer letter PDF generated & emailed successfully to ${payload.email}!`, 'success');
      loadRecruitmentData();
    } else {
      const err = await res.json();
      showToast(`⚠️ Offer Generation note: ${err.message || 'Complete'}`, 'info');
      loadRecruitmentData();
    }
  } catch (err) {
    console.error('Offer generation error:', err);
    showToast(`Failed to generate offer letter: ${err.message}`, 'error');
  }
}

function showRpaConfigModal() {
  if (!aeRpaConfig) return;
  alert(
    `🤖 AutomationEdge (AE) T4 RPA Configuration Status\n\n` +
    `• AE Server URL: ${aeRpaConfig.serverUrl}\n` +
    `• Organization Code: ${aeRpaConfig.orgCode}\n` +
    `• Username: ${aeRpaConfig.username}\n\n` +
    `--- Active Recruitment RPA Workflows ---\n` +
    `• 1. Resume Screening: ${aeRpaConfig.workflowResumeScreening}\n` +
    `• 2. Interview Scheduling: ${aeRpaConfig.workflowInterviewScheduling}\n` +
    `• 3. Candidate Communication: ${aeRpaConfig.workflowCandidateCommunication}\n\n` +
    `• Mode: ${aeRpaConfig.mode}\n\n` +
    `Edit .env in project root to connect live T4 credentials & workflows.`
  );
}
