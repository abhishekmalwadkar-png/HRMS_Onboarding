/* Simplified 2-Step Onboarding Wizard Controller (Personal Info & Document Upload) */

let currentStep = 1;
const totalSteps = 2;
let selectedHardware = 'Apple MacBook Pro M3 Max';
let uploadedFiles = {
  idCard: null,
  educationDoc: null,
  taxForm: null,
  offerLetter: null
};

document.addEventListener('DOMContentLoaded', () => {
  updateStepUI();
  setupDropzoneEvents();
});

// Step navigation
function changeStep(direction) {
  const newStep = currentStep + direction;
  
  // Validate current step before moving forward
  if (direction > 0 && !validateCurrentStep()) {
    return;
  }

  if (newStep >= 1 && newStep <= totalSteps) {
    currentStep = newStep;
    updateStepUI();
  }
}

function jumpToStep(targetStep) {
  if (targetStep < currentStep || validateCurrentStep()) {
    currentStep = targetStep;
    updateStepUI();
  }
}

function updateStepUI() {
  // Update Step Badges & Buttons
  const stepBadge = document.getElementById('currentStepBadge');
  if (stepBadge) stepBadge.textContent = `Step ${currentStep} of ${totalSteps}`;

  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnSubmit = document.getElementById('btnSubmit');

  if (btnPrev) btnPrev.style.display = currentStep === 1 ? 'none' : 'inline-flex';
  if (btnNext) btnNext.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
  if (btnSubmit) btnSubmit.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';

  // Update Progress Bar % (0% on step 1, 100% on step 2)
  const progressPct = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const stepperProgress = document.getElementById('stepperProgress');
  if (stepperProgress) stepperProgress.style.width = `${progressPct}%`;

  // Update Stepper Circles
  document.querySelectorAll('.step-item').forEach(item => {
    const stepNum = parseInt(item.getAttribute('data-step'));
    item.classList.remove('active', 'completed');
    if (stepNum === currentStep) {
      item.classList.add('active');
    } else if (stepNum < currentStep) {
      item.classList.add('completed');
    }
  });

  // Update Step Content Panels
  document.querySelectorAll('.step-content').forEach(content => {
    content.classList.remove('active');
    if (parseInt(content.getAttribute('data-step-content')) === currentStep) {
      content.classList.add('active');
    }
  });
}

// Validation logic for active step inputs
function validateCurrentStep() {
  const activePanel = document.querySelector(`.step-content[data-step-content="${currentStep}"]`);
  if (!activePanel) return true;

  const requiredInputs = activePanel.querySelectorAll('[required]');
  let isValid = true;

  requiredInputs.forEach(input => {
    if (!input.value || input.value.trim() === '') {
      isValid = false;
      input.style.borderColor = 'var(--accent-rose)';
    } else {
      input.style.borderColor = 'var(--border-color)';
    }
  });

  if (!isValid) {
    showToast('Please fill in all required fields marked with *', 'error');
  }

  return isValid;
}

// File Upload Handlers & Drag Drop
function triggerFileUpload(inputId) {
  const el = document.getElementById(inputId);
  if (el) el.click();
}

function handleFileSelected(event, previewId) {
  const file = event.target.files[0];
  if (!file) return;

  const previewEl = document.getElementById(previewId);
  if (previewEl) {
    previewEl.style.display = 'flex';
    previewEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-file-pdf" style="color: var(--brand-orange); font-size: 1.2rem;"></i>
        <span><strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)</span>
      </div>
      <span class="badge badge-verified"><i class="fa-solid fa-circle-check"></i> Uploaded</span>
    `;
  }
  showToast(`✓ File "${file.name}" uploaded successfully!`, 'success');
}

function setupDropzoneEvents() {
  const dropzones = [
    { zoneId: 'dropzoneId', fileId: 'fileId', prevId: 'previewId' },
    { zoneId: 'dropzoneEdu', fileId: 'fileEdu', prevId: 'previewEdu' },
    { zoneId: 'dropzoneTax', fileId: 'fileTax', prevId: 'previewTax' },
    { zoneId: 'dropzoneOffer', fileId: 'fileOffer', prevId: 'previewOffer' }
  ];

  dropzones.forEach(dz => {
    const el = document.getElementById(dz.zoneId);
    if (!el) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      el.addEventListener(eventName, (e) => { e.preventDefault(); el.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      el.addEventListener(eventName, (e) => { e.preventDefault(); el.classList.remove('dragover'); });
    });
    el.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const fileInput = document.getElementById(dz.fileId);
        if (fileInput) fileInput.files = files;
        handleFileSelected({ target: { files: files } }, dz.prevId);
      }
    });
  });
}

// Auto-fill Demo Data from the 'autofill' database (/api/autofill)
let lastAutofillIndex = -1;

async function autoFillDemoData(specificIndex) {
  // Ensure user is on the Onboarding Wizard view
  if (typeof switchView === 'function') {
    switchView('wizard');
  }

  let profile = null;

  try {
    const res = await fetch('/api/autofill?t=' + Date.now());
    if (res.ok) {
      const db = await res.json();
      const profiles = db.autofillProfiles || [];
      if (profiles.length > 0) {
        let idx;
        if (specificIndex !== undefined) {
          idx = specificIndex % profiles.length;
        } else {
          // Select a random profile different from the last one
          if (profiles.length === 1) {
            idx = 0;
          } else {
            do {
              idx = Math.floor(Math.random() * profiles.length);
            } while (idx === lastAutofillIndex && profiles.length > 1);
          }
        }
        lastAutofillIndex = idx;
        profile = profiles[idx];
      }
    }
  } catch (err) {
    console.warn('[AutoFill] API error, using default Indian demo profile:', err);
  }

  // Fallback Indian profiles if DB is unavailable
  if (!profile) {
    const fallbackIndianProfiles = [
      {
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '+91 98230 45671',
        dob: '1994-06-15',
        emergencyName: 'Sunita Sharma (Mother)',
        emergencyPhone: '+91 98230 45670',
        address: 'Flat 402, Marvel Palms, Baner, Pune, Maharashtra 411045',
        department: 'Engineering',
        jobTitle: 'Staff AI Systems Engineer',
        manager: 'Amit Deshmukh (VP of Engineering)',
        startDate: '2026-10-15',
        bankAccount: '918230491029',
        routingCode: 'HDFC0001234',
        hardware: 'Apple MacBook Pro M3 Max',
        idDocumentName: 'Aadhaar_Card_Aarav_Sharma_Verified.pdf',
        educationDocName: 'BTech_Computer_Science_Degree.pdf',
        taxDocumentName: 'Form16_Tax_Compliance_2026.pdf',
        offerDocumentName: 'Signed_Offer_Letter_Aarav.pdf'
      },
      {
        fullName: 'Rohan Kulkarni',
        email: 'rohan.kulkarni@example.com',
        phone: '+91 98221 65432',
        dob: '1993-04-18',
        emergencyName: 'Sneha Kulkarni (Spouse)',
        emergencyPhone: '+91 98221 65430',
        address: 'B-303, Rohan Tarang, Wakad, Pune, Maharashtra 411057',
        department: 'Engineering',
        jobTitle: 'Full Stack DevOps Engineer',
        manager: 'David Miller (Director of Engineering)',
        startDate: '2026-10-25',
        bankAccount: '771239845612',
        routingCode: 'KKBK0001890',
        hardware: 'Dell XPS 16 Developer Edition',
        idDocumentName: 'PAN_Card_Rohan_Kulkarni.pdf',
        educationDocName: 'BE_Information_Technology_Degree.pdf',
        taxDocumentName: 'Form16_Tax_Deduction_Proof.pdf',
        offerDocumentName: 'Signed_Employment_Offer_Rohan.pdf'
      },
      {
        fullName: 'Ananya Iyer',
        email: 'ananya.iyer@example.com',
        phone: '+91 97654 32109',
        dob: '1995-12-08',
        emergencyName: 'Ramaswamy Iyer (Father)',
        emergencyPhone: '+91 97654 32100',
        address: 'Tower 8, Apt 1104, Blue Ridge Town, Hinjawadi Phase 2, Pune 411057',
        department: 'Engineering',
        jobTitle: 'Senior Machine Learning Specialist',
        manager: 'Amit Deshmukh (VP of Engineering)',
        startDate: '2026-10-20',
        bankAccount: '552109847123',
        routingCode: 'SBIN0008765',
        hardware: 'Apple MacBook Pro M3 Max',
        idDocumentName: 'Aadhaar_National_ID_Ananya_Iyer.pdf',
        educationDocName: 'MS_Data_Science_Degree_Certificate.pdf',
        taxDocumentName: 'Tax_Form16_Signed_Compliance.pdf',
        offerDocumentName: 'Signed_Offer_Letter_Ananya_Iyer.pdf'
      }
    ];
    profile = fallbackIndianProfiles[Math.floor(Math.random() * fallbackIndianProfiles.length)];
  }

  // 1. Personal & Role Info
  if (document.getElementById('fullName')) document.getElementById('fullName').value = profile.fullName || '';
  if (document.getElementById('email')) document.getElementById('email').value = profile.email || '';
  if (document.getElementById('phone')) document.getElementById('phone').value = profile.phone || '';
  if (document.getElementById('dob')) document.getElementById('dob').value = profile.dob || '';
  if (document.getElementById('emergencyName')) document.getElementById('emergencyName').value = profile.emergencyName || '';
  if (document.getElementById('emergencyPhone')) document.getElementById('emergencyPhone').value = profile.emergencyPhone || profile.phone || '';
  if (document.getElementById('address')) document.getElementById('address').value = profile.address || '';
  if (document.getElementById('department')) document.getElementById('department').value = profile.department || 'Engineering';
  if (document.getElementById('jobTitle')) document.getElementById('jobTitle').value = profile.jobTitle || 'Senior Software Engineer';
  if (document.getElementById('manager')) document.getElementById('manager').value = profile.manager || 'Amit Deshmukh';
  if (document.getElementById('startDate')) document.getElementById('startDate').value = profile.startDate || '2026-10-15';
  
  if (document.getElementById('hardwareSelect') && profile.hardware) {
    document.getElementById('hardwareSelect').value = profile.hardware;
    if (typeof selectedHardware !== 'undefined') {
      selectedHardware = profile.hardware;
    }
  }

  // 2. Documents & Banking Previews
  if (document.getElementById('bankAccount')) document.getElementById('bankAccount').value = profile.bankAccount || '918230491029';
  if (document.getElementById('routingCode')) document.getElementById('routingCode').value = profile.routingCode || 'HDFC0001234';
  
  const idPreview = document.getElementById('previewId');
  if (idPreview) {
    idPreview.style.display = 'flex';
    idPreview.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-file-shield" style="color: var(--brand-orange); font-size: 1.2rem;"></i>
        <span><strong>${profile.idDocumentName || 'Aadhaar_Passport_Verified.pdf'}</strong> (2.4 MB)</span>
      </div>
      <span class="badge badge-verified"><i class="fa-solid fa-circle-check"></i> DB Verified</span>
    `;
  }

  const eduPreview = document.getElementById('previewEdu');
  if (eduPreview) {
    eduPreview.style.display = 'flex';
    eduPreview.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-graduation-cap" style="color: var(--brand-orange); font-size: 1.2rem;"></i>
        <span><strong>${profile.educationDocName || 'Degree_Certificate.pdf'}</strong> (3.1 MB)</span>
      </div>
      <span class="badge badge-verified"><i class="fa-solid fa-circle-check"></i> DB Verified</span>
    `;
  }

  const taxPreview = document.getElementById('previewTax');
  if (taxPreview) {
    taxPreview.style.display = 'flex';
    taxPreview.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-file-invoice-dollar" style="color: var(--accent-emerald); font-size: 1.2rem;"></i>
        <span><strong>${profile.taxDocumentName || 'Form16_Tax_Compliance.pdf'}</strong> (1.1 MB)</span>
      </div>
      <span class="badge badge-verified"><i class="fa-solid fa-circle-check"></i> DB Verified</span>
    `;
  }

  const offerPreview = document.getElementById('previewOffer');
  if (offerPreview) {
    offerPreview.style.display = 'flex';
    offerPreview.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-file-signature" style="color: var(--accent-emerald); font-size: 1.2rem;"></i>
        <span><strong>${profile.offerDocumentName || 'Signed_Offer_Letter.pdf'}</strong> (1.8 MB)</span>
      </div>
      <span class="badge badge-verified"><i class="fa-solid fa-circle-check"></i> DB Verified</span>
    `;
  }

  // Clear validation borders
  document.querySelectorAll('.form-control').forEach(inp => inp.style.borderColor = 'var(--border-color)');
}

// Form Submission: Calls ServiceNow Service Catalog API & triggers Sequential Onboarding Pipeline
async function handleFormSubmit(e) {
  e.preventDefault();

  const btnSubmit = document.getElementById('btnSubmit');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting to ServiceNow...`;
  }

  const newCandidate = {
    id: 'EMP-' + Math.floor(1000 + Math.random() * 9000),
    fullName: document.getElementById('fullName') ? document.getElementById('fullName').value : 'Sneha Rao',
    email: document.getElementById('email') ? document.getElementById('email').value : 'sneha.rao@mangohrms.com',
    phone: document.getElementById('phone') ? document.getElementById('phone').value : '+91 97777 66554',
    dob: document.getElementById('dob') ? document.getElementById('dob').value : '1994-07-22',
    emergencyName: document.getElementById('emergencyName') ? document.getElementById('emergencyName').value : 'Arun Rao (Spouse)',
    emergencyPhone: document.getElementById('emergencyPhone') ? document.getElementById('emergencyPhone').value : '+91 97777 66550',
    address: document.getElementById('address') ? document.getElementById('address').value : 'Villa 14, Palm Meadows, Hinjewadi Phase 1, Pune, MH 411057',
    department: 'Engineering',
    jobTitle: 'Staff AI Systems Engineer',
    manager: 'David Miller (VP of Technology)',
    startDate: '2026-10-15',
    hardware: selectedHardware || 'Apple MacBook Pro M3 Max',
    status: 'Pending Review',
    hardwareDispatched: false,
    submittedAt: new Date().toLocaleDateString()
  };

  showToast(`🎫 [ServiceNow] Submitting Employee Onboarding Catalog Item to ServiceNow (ven04528)...`, 'info');

  const result = await saveNewCandidateToJSON(newCandidate);
  const snReq = (result && result.serviceNow && result.serviceNow.reqNumber) || `REQ001${Math.floor(1000 + Math.random() * 9000)}`;
  const snRitm = (result && result.serviceNow && result.serviceNow.ritmNumber) || `RITM001${Math.floor(1000 + Math.random() * 9000)}`;

  setTimeout(() => {
    showToast(`✓ [ServiceNow REQ Created] Ticket ${snReq} (${snRitm}) created for HR: "Candidate uploaded documents and filled personal details. Please verify and approve."`, 'success');
  }, 400);

  setTimeout(() => {
    showToast(`🎉 Onboarding Request Logged in ServiceNow (${snReq}) for HR Document Verification!`, 'success');
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Submit to ServiceNow (Verify Docs & Request Laptop)`;
    }
    
    if (typeof loadApprovals === 'function') loadApprovals();
    
    if (currentUser && currentUser.role === 'candidate') {
      showToast(`✓ Your application (${snReq}) is now in the HR Approvals queue. Once approved, your laptop will be provisioned!`, 'info');
    } else {
      switchView('approvals');
    }
    renderCandidatesTable();
  }, 1200);
}
