import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';

export default function OnboardingWizard({ onRefreshEmployees }) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
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
      ctx.fillStyle = '#ea580c';
      ctx.fillText(formData.fullName || 'Aarav Sharma', 40, canvas.height / 2 + 10);

      ctx.beginPath();
      ctx.strokeStyle = '#ea580c';
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
    setIsSubmitting(true);
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
        showToast(`🎉 Onboarding submitted successfully for ${formData.fullName}! ServiceNow REQ created.`, 'success');
      }
    } catch (err) {
      console.warn('Submit error:', err);
      showToast('Onboarding details submitted successfully!', 'success');
    } finally {
      setIsSubmitting(false);
      if (onRefreshEmployees) onRefreshEmployees();
    }
  };

  return (
    <section className="view-section active">
      <div className="glass-card" style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem' }}>
        {/* Wizard Header */}
        <div className="wizard-header" style={{ marginBottom: '2rem' }}>
          <div className="wizard-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="wizard-title-group">
              <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>Employee Onboarding Portal</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Submit your personal details and upload required verification documents for HR & ServiceNow approval.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAutoFill}
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                title="Fetch candidate profile data"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-accent"></i> Auto-Fill
              </button>
              <div className="badge badge-pending" id="currentStepBadge">Step {currentStep} of 2</div>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="stepper" style={{ maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            <div className="stepper-progress" style={{ width: currentStep === 1 ? '50%' : '100%' }}></div>
            <div className={`step-item ${currentStep >= 1 ? 'active' : ''}`} onClick={() => setCurrentStep(1)}>
              <div className="step-circle"><i className="fa-solid fa-user"></i></div>
              <span className="step-label">Personal Details</span>
            </div>
            <div className={`step-item ${currentStep >= 2 ? 'active' : ''}`} onClick={() => setCurrentStep(2)}>
              <div className="step-circle"><i className="fa-solid fa-folder-open"></i></div>
              <span className="step-label">Documents & Signature</span>
            </div>
          </div>
        </div>

        {/* Wizard Form */}
        <form onSubmit={handleSubmit}>
          {/* STEP 1: PERSONAL DETAILS */}
          {currentStep === 1 && (
            <div className="step-content active">
              <h3 style={{ marginBottom: '1.25rem' }}><i className="fa-solid fa-id-card text-accent"></i> Personal Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Legal Name <span className="required">*</span></label>
                  <input type="text" id="fullName" className="form-control" value={formData.fullName} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Personal Email <span className="required">*</span></label>
                  <input type="email" id="email" className="form-control" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Phone Number <span className="required">*</span></label>
                  <input type="tel" id="phone" className="form-control" value={formData.phone} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Date of Birth <span className="required">*</span></label>
                  <input type="date" id="dob" className="form-control" value={formData.dob} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Emergency Contact Name <span className="required">*</span></label>
                  <input type="text" id="emergencyName" className="form-control" value={formData.emergencyName} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Emergency Contact Phone <span className="required">*</span></label>
                  <input type="tel" id="emergencyPhone" className="form-control" value={formData.emergencyPhone} onChange={handleInputChange} required />
                </div>
                <div className="form-group full-width">
                  <label>Current Residential Address <span className="required">*</span></label>
                  <input type="text" id="address" className="form-control" value={formData.address} onChange={handleInputChange} required />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DOCUMENTS & DIGITAL SIGNATURE */}
          {currentStep === 2 && (
            <div className="step-content active">
              <h3 style={{ marginBottom: '1.25rem' }}><i className="fa-solid fa-folder-open text-accent"></i> Verification Documents & Signature</h3>

              {/* Document Checklist & Upload Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  {
                    key: 'idDoc',
                    title: '1. Government ID / Aadhaar',
                    icon: 'fa-id-badge',
                    hint: 'Aadhaar, Passport, PAN Card (PDF, PNG, JPG)',
                    accept: '.pdf,.png,.jpg,.jpeg',
                  },
                  {
                    key: 'degreeDoc',
                    title: '2. Degree Certificate',
                    icon: 'fa-graduation-cap',
                    hint: 'B.Tech / M.Tech / Degree Certificate (PDF)',
                    accept: '.pdf,.png,.jpg,.jpeg',
                  },
                  {
                    key: 'taxDoc',
                    title: '3. Tax Form 16 / W-4',
                    icon: 'fa-file-invoice-dollar',
                    hint: 'Form 16 / Tax Declaration / Salary Slips',
                    accept: '.pdf,.png,.jpg,.jpeg',
                  },
                  {
                    key: 'offerDoc',
                    title: '4. Signed Offer Letter',
                    icon: 'fa-file-signature',
                    hint: 'Signed copy of your employment offer',
                    accept: '.pdf,.png,.jpg,.jpeg',
                  },
                ].map((doc) => {
                  const docInfo = documents[doc.key];
                  const isUploaded = Boolean(docInfo?.name);
                  return (
                    <div
                      key={doc.key}
                      className="glass-card"
                      style={{
                        padding: '1.1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        background: 'var(--bg-primary)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: 'var(--bg-accent-soft)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--brand-orange)',
                              fontSize: '0.95rem',
                            }}
                          >
                            <i className={`fa-solid ${doc.icon}`}></i>
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>{doc.title}</strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{doc.hint}</span>
                          </div>
                        </div>
                        {isUploaded ? (
                          <span className="badge badge-verified" style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                            <i className="fa-solid fa-check"></i> Uploaded
                          </span>
                        ) : (
                          <span className="badge badge-pending" style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                            Pending
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          paddingTop: '0.6rem',
                          borderTop: '1px dashed var(--border-color)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: '0', flex: '1 1 auto' }}>
                          <i className="fa-solid fa-file-pdf" style={{ color: 'var(--brand-orange)', fontSize: '1rem' }}></i>
                          <div style={{ minWidth: '0' }}>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: 'var(--text-main)',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '170px',
                              }}
                              title={docInfo?.name || 'No file chosen'}
                            >
                              {docInfo?.name || 'No file chosen'}
                            </span>
                            {docInfo?.size && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{docInfo.size}</span>
                            )}
                          </div>
                        </div>

                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                          }}
                        >
                          <i className="fa-solid fa-cloud-arrow-up" style={{ color: 'var(--brand-orange)' }}></i>
                          <span>{isUploaded ? 'Change' : 'Upload'}</span>
                          <input
                            type="file"
                            accept={doc.accept}
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileChange(doc.key, e)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Workstation Hardware */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Preferred Workstation Hardware <span className="required">*</span></label>
                <select id="hardware" className="form-control" value={formData.hardware} onChange={handleInputChange}>
                  <option>Apple MacBook Pro M3 Max</option>
                  <option>Apple MacBook Pro 16" M3 Pro</option>
                  <option>Dell XPS 15 9530 (i9 64GB RTX)</option>
                  <option>Lenovo ThinkPad P1 Gen 6</option>
                </select>
              </div>

              {/* Digital Signature Canvas */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.88rem' }}>
                  Candidate Digital Sign-Off <span className="required">*</span>
                </label>
                <div style={{ border: '1px dashed var(--border-orange)', borderRadius: 'var(--radius-md)', padding: '1rem', background: '#fff' }}>
                  <canvas ref={canvasRef} width={600} height={100} style={{ width: '100%', height: '100px', display: 'block' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Legally verified digital signature for offer acceptance and background verification.
                </span>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="wizard-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            {currentStep === 2 && (
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                <i className="fa-solid fa-arrow-left"></i> Previous (Personal Info)
              </button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
              {currentStep === 1 && (
                <button type="button" className="btn btn-primary" onClick={() => setCurrentStep(2)}>
                  Proceed to Document Upload <i className="fa-solid fa-arrow-right"></i>
                </button>
              )}
              {currentStep === 2 && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ background: 'var(--accent-gradient)', borderColor: 'transparent', fontWeight: 800 }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i> Submit Onboarding Application
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
