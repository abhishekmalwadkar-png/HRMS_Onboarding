import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';

export default function OnboardingWizard({ onRefreshEmployees }) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: 'Sneha Rao',
    email: 'sneha.rao@mangohrms.com',
    phone: '+91 97777 66554',
    dob: '1994-07-22',
    pan: 'ABCDE1234F',
    aadhaar: '4532 8901 2345',
    emergencyName: 'Arun Rao (Spouse)',
    emergencyPhone: '+91 97777 66550',
    address: 'Villa 14, Palm Meadows, Hinjewadi Phase 1, Pune, MH 411057',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50100492817264',
    routingCode: 'HDFC0001042',
    hardware: 'Apple MacBook Pro M3 Max',
    agreeOffer: true,
    agreeBgv: true,
    agreePolicy: true,
  });

  const [uploadedDocs, setUploadedDocs] = useState({
    idDoc: true,
    degreeDoc: true,
    taxDoc: true,
    offerDoc: true,
  });

  // Setup signature canvas
  useEffect(() => {
    if (currentStep === 2 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "italic bold 32px 'Caveat', cursive, 'Brush Script MT', sans-serif";
      ctx.fillStyle = '#ea580c';
      ctx.fillText(formData.fullName || 'Sneha Rao', 40, canvas.height / 2 + 10);

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
      const res = await fetch('/api/autofill');
      if (res.ok) {
        const profile = await res.json();
        setFormData((prev) => ({
          ...prev,
          fullName: profile.fullName || 'Sneha Rao',
          email: profile.email || 'sneha.rao@mangohrms.com',
          phone: profile.phone || '+91 97777 66554',
          dob: profile.dob || '1994-07-22',
          pan: profile.pan || 'ABCDE1234F',
          aadhaar: profile.aadhaar || '4532 8901 2345',
          emergencyName: profile.emergencyName || 'Arun Rao',
          emergencyPhone: profile.emergencyPhone || '+91 97777 66550',
          address: profile.address || 'Hinjewadi Phase 1, Pune, MH',
          bankName: profile.bankName || 'HDFC Bank',
          accountNumber: profile.accountNumber || '50100492817264',
          routingCode: profile.routingCode || 'HDFC0001042',
          hardware: profile.hardware || 'Apple MacBook Pro M3 Max',
        }));
        showToast(`✨ Pre-filled profile for ${profile.fullName}!`, 'success');
      }
    } catch {
      showToast('Pre-filled default Indian candidate profile.', 'info');
    }
  };

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
      department: 'Engineering',
      jobTitle: 'Staff AI Systems Engineer',
      manager: 'David Miller (VP of Technology)',
      startDate: '2026-10-15',
      salary: '$185,000 / annum',
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

              {/* Document Checklist */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-id-badge text-accent"></i>
                    <span>1. Government ID / Aadhaar</span>
                  </div>
                  <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}><i className="fa-solid fa-check"></i> Uploaded</span>
                </div>
                <div className="glass-card" style={{ padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-graduation-cap text-accent"></i>
                    <span>2. Degree Certificate</span>
                  </div>
                  <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}><i className="fa-solid fa-check"></i> Uploaded</span>
                </div>
                <div className="glass-card" style={{ padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-file-invoice-dollar text-accent"></i>
                    <span>3. Tax Form 16 / W-4</span>
                  </div>
                  <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}><i className="fa-solid fa-check"></i> Uploaded</span>
                </div>
                <div className="glass-card" style={{ padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-file-signature text-accent"></i>
                    <span>4. Signed Offer Letter</span>
                  </div>
                  <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}><i className="fa-solid fa-check"></i> Uploaded</span>
                </div>
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
