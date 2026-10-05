import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';
import { PageHeader, Card, Field, StatusBanner, EASE_OUT } from './ui';

const STEPS = [
  { num: 1, title: 'Personal details', subtitle: 'Identity & emergency contact' },
  { num: 2, title: 'Documents & signature', subtitle: 'Verification files & sign-off' },
];

const PERSONAL_FIELDS = [
  { id: 'fullName', label: 'Full legal name', type: 'text', autoComplete: 'name' },
  { id: 'email', label: 'Personal email', type: 'email', autoComplete: 'email' },
  { id: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel' },
  { id: 'dob', label: 'Date of birth', type: 'date', autoComplete: 'bday' },
  { id: 'emergencyName', label: 'Emergency contact name', type: 'text' },
  { id: 'emergencyPhone', label: 'Emergency contact phone', type: 'tel' },
  { id: 'address', label: 'Current residential address', type: 'text', autoComplete: 'street-address', full: true },
];

const DOCUMENTS = [
  { key: 'idDoc', title: 'Government ID / Aadhaar', icon: 'fa-id-badge', hint: 'Aadhaar, Passport or PAN card' },
  { key: 'degreeDoc', title: 'Degree certificate', icon: 'fa-graduation-cap', hint: 'B.Tech / M.Tech / degree certificate' },
  { key: 'taxDoc', title: 'Tax Form 16 / W-4', icon: 'fa-file-invoice-dollar', hint: 'Form 16, tax declaration or salary slips' },
  { key: 'offerDoc', title: 'Signed offer letter', icon: 'fa-file-signature', hint: 'Signed copy of the employment offer' },
];

const HARDWARE_OPTIONS = [
  'Apple MacBook Pro M3 Max',
  'Apple MacBook Pro 16" M3 Pro',
  'Dell XPS 15 9530 (i9 64GB RTX)',
  'Lenovo ThinkPad P1 Gen 6',
];

// Field-level validation, run on blur and before leaving step 1 (design system: validate on blur, error next to field)
function validateField(id, value) {
  const v = (value || '').trim();
  if (!v) return 'This field is required.';
  if (id === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address, e.g. name@example.com.';
  if ((id === 'phone' || id === 'emergencyPhone') && v.replace(/\D/g, '').length < 10) return 'Enter at least 10 digits.';
  return '';
}

export default function OnboardingWizard({ onRefreshEmployees, onNavigate }) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitResult, setSubmitResult] = useState(null); // { tone, title, message }
  const canvasRef = useRef(null);
  const lastIndexRef = useRef(-1);

  // Form State
  const [formData, setFormData] = useState({
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+91 98230 45671',
    dob: '1994-06-15',
    pan: 'ABCDE1234F',
    aadhaar: '4532 8901 2345',
    emergencyName: 'Sunita Sharma (Mother)',
    emergencyPhone: '+91 98230 45670',
    address: 'Flat 402, Marvel Palms, Baner, Pune, Maharashtra 411045',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '918230491029',
    routingCode: 'HDFC0001234',
    hardware: 'Apple MacBook Pro M3 Max',
    department: 'Engineering',
    jobTitle: 'Staff AI Systems Engineer',
    manager: 'Amit Deshmukh (VP of Engineering)',
    startDate: '2026-10-15',
    salary: '$185,000 / annum',
    agreeOffer: true,
    agreeBgv: true,
    agreePolicy: true,
  });

  const [documents, setDocuments] = useState({
    idDoc: { name: 'Aadhaar_Card_Aarav_Sharma_Verified.pdf', size: '2.4 MB' },
    degreeDoc: { name: 'BTech_Computer_Science_Degree.pdf', size: '3.1 MB' },
    taxDoc: { name: 'Form16_Tax_Compliance_2026.pdf', size: '1.2 MB' },
    offerDoc: { name: 'Signed_Offer_Letter_Aarav_Sharma.pdf', size: '1.8 MB' },
  });

  const handleFileChange = (docKey, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setDocuments((prev) => ({
        ...prev,
        [docKey]: {
          name: file.name,
          size: sizeStr,
        },
      }));
    }
  };

  // Setup signature canvas
  useEffect(() => {
    if (currentStep === 2 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "italic bold 32px 'Caveat', cursive, 'Brush Script MT', sans-serif";
      ctx.fillStyle = '#c2410c';
      ctx.fillText(formData.fullName || 'Aarav Sharma', 40, canvas.height / 2 + 10);

      ctx.beginPath();
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 2.5;
      ctx.moveTo(35, canvas.height / 2 + 25);
      ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + 40, canvas.width - 60, canvas.height / 2 + 20);
      ctx.stroke();
    }
  }, [currentStep, formData.fullName]);

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
    // Clear a field's error as soon as the user fixes it
    if (errors[id] && !validateField(id, value)) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    setErrors((prev) => ({ ...prev, [id]: validateField(id, value) }));
  };

  const validateStep1 = () => {
    const next = {};
    PERSONAL_FIELDS.forEach((f) => {
      const msg = validateField(f.id, formData[f.id]);
      if (msg) next[f.id] = msg;
    });
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return false;
    }
    return true;
  };

  const goToStep = (step) => {
    if (step === 2 && !validateStep1()) return;
    setCurrentStep(step);
  };

  const handleAutoFill = async () => {
    try {
      const res = await fetch('/api/autofill?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        const profiles = data.autofillProfiles || (Array.isArray(data) ? data : [data]);
        let profile = data;

        if (profiles.length > 0) {
          let nextIdx;
          if (profiles.length === 1) {
            nextIdx = 0;
          } else {
            do {
              nextIdx = Math.floor(Math.random() * profiles.length);
            } while (nextIdx === lastIndexRef.current && profiles.length > 1);
          }
          lastIndexRef.current = nextIdx;
          profile = profiles[nextIdx];
        }

        const bank = profile.bankName || (
          profile.routingCode?.startsWith('HDFC') ? 'HDFC Bank' :
          profile.routingCode?.startsWith('ICIC') ? 'ICICI Bank' :
          profile.routingCode?.startsWith('SBIN') ? 'State Bank of India' :
          profile.routingCode?.startsWith('AXIS') || profile.routingCode?.startsWith('UTIB') ? 'Axis Bank' :
          profile.routingCode?.startsWith('KKBK') ? 'Kotak Mahindra Bank' : 'HDFC Bank'
        );

        setFormData((prev) => ({
          ...prev,
          fullName: profile.fullName || 'Aarav Sharma',
          email: profile.email || `${(profile.fullName || 'candidate').toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: profile.phone || '+91 98230 45671',
          dob: profile.dob || '1994-06-15',
          pan: profile.pan || (profile.id ? 'ABCDE' + profile.id.replace(/\D/g, '') + 'F' : 'ABCDE1234F'),
          aadhaar: profile.aadhaar || '4532 8901 2345',
          emergencyName: profile.emergencyName || 'Sunita Sharma (Mother)',
          emergencyPhone: profile.emergencyPhone || '+91 98230 45670',
          address: profile.address || 'Flat 402, Marvel Palms, Baner, Pune, Maharashtra 411045',
          bankName: bank,
          accountNumber: profile.bankAccount || profile.accountNumber || '918230491029',
          routingCode: profile.routingCode || 'HDFC0001234',
          hardware: profile.hardware || 'Apple MacBook Pro M3 Max',
          department: profile.department || 'Engineering',
          jobTitle: profile.jobTitle || 'Staff AI Systems Engineer',
          manager: profile.manager || 'Amit Deshmukh (VP of Engineering)',
          startDate: profile.startDate || '2026-10-15',
          salary: profile.salary || '$185,000 / annum',
        }));

        setDocuments({
          idDoc: { name: profile.idDocumentName || `Aadhaar_Passport_${(profile.fullName || 'Verified').replace(/\s+/g, '_')}.pdf`, size: '2.4 MB' },
          degreeDoc: { name: profile.educationDocName || `Degree_Certificate_${(profile.fullName || 'Verified').replace(/\s+/g, '_')}.pdf`, size: '3.1 MB' },
          taxDoc: { name: profile.taxDocumentName || 'Form16_Tax_Compliance_2026.pdf', size: '1.2 MB' },
          offerDoc: { name: profile.offerDocumentName || `Signed_Offer_Letter_${(profile.fullName || 'Candidate').replace(/\s+/g, '_')}.pdf`, size: '1.8 MB' },
        });
        setErrors({});
        setSubmitResult(null);
      }
    } catch (err) {
      console.warn('AutoFill fetch failed:', err);
    }
  };

  useEffect(() => {
    const handleAutofillEvent = () => {
      handleAutoFill();
    };
    window.addEventListener('mangohrms-trigger-autofill', handleAutofillEvent);
    return () => window.removeEventListener('mangohrms-trigger-autofill', handleAutofillEvent);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    setIsSubmitting(true);
    setSubmitResult(null);
    showToast('Submitting candidate profile to ServiceNow...', 'info');

    const newCandidate = {
      id: 'EMP-' + Math.floor(1000 + Math.random() * 9000),
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      dob: formData.dob,
      pan: formData.pan,
      aadhaar: formData.aadhaar,
      emergencyName: formData.emergencyName,
      emergencyPhone: formData.emergencyPhone,
      address: formData.address,
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      routingCode: formData.routingCode,
      hardware: formData.hardware,
      idDocumentName: documents.idDoc?.name || 'Aadhaar_Verified.pdf',
      educationDocName: documents.degreeDoc?.name || 'Degree_Certificate.pdf',
      taxDocumentName: documents.taxDoc?.name || 'Form16_Tax_Compliance.pdf',
      offerDocumentName: documents.offerDoc?.name || 'Signed_Offer_Letter.pdf',
      department: formData.department || 'Engineering',
      jobTitle: formData.jobTitle || 'Staff AI Systems Engineer',
      manager: formData.manager || 'Amit Deshmukh (VP of Engineering)',
      startDate: formData.startDate || '2026-10-15',
      salary: formData.salary || '$185,000 / annum',
      status: 'Pending Review',
      serviceNowReq: `REQ001${Math.floor(1000 + Math.random() * 9000)}`,
      serviceNowRitm: `RITM001${Math.floor(1000 + Math.random() * 9000)}`,
      submittedAt: new Date().toLocaleString(),
    };

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate),
      });

      if (res.ok) {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        showToast(`Onboarding submitted for ${formData.fullName}.`, 'success');
        setSubmitResult({
          tone: 'success',
          title: `Application submitted for ${formData.fullName}`,
          message: 'The candidate is now waiting for HR review in Approvals.',
        });
      } else {
        setSubmitResult({
          tone: 'error',
          title: 'Submission failed',
          message: `The server returned an error (HTTP ${res.status}). Nothing was saved. Please try again.`,
        });
      }
    } catch (err) {
      console.warn('Submit error:', err);
      setSubmitResult({
        tone: 'error',
        title: 'Could not reach the HRMS server',
        message: 'Check that "python server.py" is running, then submit again.',
      });
    } finally {
      setIsSubmitting(false);
      if (onRefreshEmployees) onRefreshEmployees();
    }
  };

  const step1Done = currentStep > 1;

  return (
    <section className="view-section active page-narrow">
      <PageHeader
        icon="fa-solid fa-user-plus"
        title="Employee onboarding"
        description="Register a candidate and upload verification documents for HR approval."
        actions={
          <button type="button" className="btn btn-secondary" onClick={handleAutoFill} title="Fill the form with a sample candidate profile">
            <i className="fa-solid fa-wand-magic-sparkles text-accent" aria-hidden="true"></i> Auto-fill sample
          </button>
        }
      />

      <AnimatePresence>
        {submitResult && (
          <StatusBanner tone={submitResult.tone} title={submitResult.title} onDismiss={() => setSubmitResult(null)}>
            {submitResult.message}
            {submitResult.tone === 'success' && onNavigate && (
              <>
                {' '}
                <button type="button" className="link-btn" onClick={() => onNavigate('approvals')}>
                  Go to Approvals <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </button>
              </>
            )}
          </StatusBanner>
        )}
      </AnimatePresence>

      {/* Step indicator (buttons, so it is keyboard reachable) */}
      <nav aria-label="Onboarding progress">
        <ol className="wizard-steps">
          {STEPS.map((s) => {
            const isCurrent = currentStep === s.num;
            const isDone = s.num === 1 && step1Done;
            return (
              <li key={s.num}>
                <button
                  type="button"
                  className={`wizard-step ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''}`}
                  onClick={() => goToStep(s.num)}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="wizard-step-num" aria-hidden="true">
                    {isDone ? <i className="fa-solid fa-check"></i> : s.num}
                  </span>
                  <span className="wizard-step-text">
                    <strong>Step {s.num} of {STEPS.length}: {s.title}</strong>
                    <span>{s.subtitle}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <Card animated={false}>
        <form onSubmit={handleSubmit} noValidate>
          <AnimatePresence mode="wait" initial={false}>
            {/* STEP 1: PERSONAL DETAILS */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
              >
                <h2 className="wizard-section-title">
                  <i className="fa-solid fa-id-card text-accent" aria-hidden="true"></i> Personal details
                </h2>
                <div className="form-grid-2">
                  {PERSONAL_FIELDS.map((f) => (
                    <Field key={f.id} id={f.id} label={f.label} required error={errors[f.id]} full={f.full}>
                      <input
                        type={f.type}
                        className="form-control"
                        value={formData[f.id]}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        autoComplete={f.autoComplete}
                        required
                      />
                    </Field>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2: DOCUMENTS & DIGITAL SIGNATURE */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
              >
                <h2 className="wizard-section-title">
                  <i className="fa-solid fa-folder-open text-accent" aria-hidden="true"></i> Verification documents
                </h2>

                <div className="doc-grid">
                  {DOCUMENTS.map((doc) => {
                    const docInfo = documents[doc.key];
                    const isUploaded = Boolean(docInfo?.name);
                    const inputId = `upload-${doc.key}`;
                    return (
                      <div key={doc.key} className={`doc-card ${isUploaded ? 'is-uploaded' : ''}`}>
                        <div className="doc-card-head">
                          <div className="doc-card-title">
                            <span className="doc-card-icon" aria-hidden="true"><i className={`fa-solid ${doc.icon}`}></i></span>
                            <div>
                              <strong>{doc.title}</strong>
                              <span>{doc.hint} (PDF, PNG, JPG)</span>
                            </div>
                          </div>
                          {isUploaded ? (
                            <span className="badge badge-approved"><i className="fa-solid fa-check" aria-hidden="true"></i> Uploaded</span>
                          ) : (
                            <span className="badge badge-pending">Missing</span>
                          )}
                        </div>

                        <div className="doc-card-file">
                          <div className="doc-file-name">
                            <i className="fa-solid fa-file-pdf text-accent" aria-hidden="true"></i>
                            <span title={docInfo?.name || 'No file chosen'}>{docInfo?.name || 'No file chosen'}</span>
                            {docInfo?.size && <small>{docInfo.size}</small>}
                          </div>
                          <label htmlFor={inputId} className="btn btn-secondary btn-sm upload-btn">
                            <i className="fa-solid fa-cloud-arrow-up text-accent" aria-hidden="true"></i>
                            {isUploaded ? 'Replace' : 'Upload'}
                            <span className="sr-only"> {doc.title}</span>
                            <input
                              id={inputId}
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) => handleFileChange(doc.key, e)}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="form-grid-2" style={{ marginBottom: '1.25rem' }}>
                  <Field id="hardware" label="Preferred workstation hardware" required full>
                    <select className="form-control" value={formData.hardware} onChange={handleInputChange}>
                      {HARDWARE_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="field">
                  <span className="field-label" id="signature-label">
                    Candidate digital sign-off <span className="required" aria-hidden="true">*</span>
                  </span>
                  <div className="signature-box">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={100}
                      role="img"
                      aria-label={`Signature of ${formData.fullName}`}
                    />
                  </div>
                  <span className="field-hint">Generated from the candidate's legal name for offer acceptance and background verification.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Controls */}
          <div className="wizard-footer">
            {currentStep === 2 && (
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                <i className="fa-solid fa-arrow-left" aria-hidden="true"></i> Back
              </button>
            )}
            <div className="wizard-footer-end">
              {currentStep === 1 && (
                <button type="button" className="btn btn-primary" onClick={() => goToStep(2)}>
                  Continue to documents <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </button>
              )}
              {currentStep === 2 && (
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} aria-busy={isSubmitting}>
                  {isSubmitting ? (
                    <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Submitting…</>
                  ) : (
                    <><i className="fa-solid fa-paper-plane" aria-hidden="true"></i> Submit application</>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </section>
  );
}
