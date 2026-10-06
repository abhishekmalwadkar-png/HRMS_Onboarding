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
  { id: 'aadhaar', label: 'Aadhaar number', type: 'text' },
  { id: 'uan', label: 'EPFO UAN number', type: 'text' },
  { id: 'emergencyName', label: 'Emergency contact name', type: 'text' },
  { id: 'emergencyPhone', label: 'Emergency contact phone', type: 'tel' },
  { id: 'address', label: 'Current residential address', type: 'text', autoComplete: 'street-address', full: true },
];

const DOCUMENTS = [
  { key: 'idDoc', title: 'Government ID / Aadhaar', icon: 'fa-id-badge', hint: 'Aadhaar, Passport or PAN card' },
  { key: 'uanDoc', title: 'EPFO UAN Card', icon: 'fa-id-card-clip', hint: 'Universal Account Number (UAN) Card' },
  { key: 'salaryDoc', title: 'Salary Slip', icon: 'fa-file-invoice-dollar', hint: 'Recent 3 months payslip / salary statement' },
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

// =========================================================================
// AUTHENTIC UIDAI E-AADHAAR SVG & PORTRAIT COMPONENTS
// =========================================================================
function AshokaEmblemSvg({ size = 30 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size * 1.25} viewBox="0 0 100 125" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Central Lion Head */}
        <path d="M50 6C42 6 36 12 36 20C36 25 39 28 42 30C39 32 37 35 37 40C37 45 41 49 48 50V54H32C30 54 28 56 28 58C28 60 30 62 32 62H68C70 62 72 60 72 58C72 56 70 54 68 54H52V50C59 49 63 45 63 40C63 35 61 32 58 30C61 28 64 25 64 20C64 12 58 6 50 6Z" fill="#0f172a"/>
        {/* Left & Right Lions */}
        <path d="M25 22C20 22 16 26 16 31C16 34 18 37 20 39C18 41 17 43 17 46C17 50 20 53 25 54V58H18C16 58 14 60 14 62H34V58H28V54C31 53 33 50 33 46C33 43 32 41 30 39C32 37 34 34 34 31C34 26 30 22 25 22Z" fill="#334155"/>
        <path d="M75 22C70 22 66 26 66 31C66 34 68 37 70 39C68 41 67 43 67 46C67 50 70 53 75 54V58H66V62H86C86 60 84 58 82 58H76V54C81 53 84 50 84 46C84 43 83 41 81 39C83 37 85 34 85 31C85 26 80 22 75 22Z" fill="#334155"/>
        {/* Abacus Base with Ashoka Chakra */}
        <rect x="14" y="66" width="72" height="24" rx="2" fill="#0f172a"/>
        <circle cx="50" cy="78" r="8.5" fill="#ffffff"/>
        <circle cx="50" cy="78" r="2.5" fill="#0f172a"/>
        {/* Pedestal Base */}
        <path d="M10 94H90V100C90 104 86 108 82 108H18C14 108 10 104 10 100V94Z" fill="#334155"/>
      </svg>
      <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.2px', marginTop: '1px' }}>
        सत्यमेव जयते
      </span>
      <span style={{ fontSize: '0.52rem', fontWeight: 700, color: '#334155' }}>
        भारत सरकार
      </span>
    </div>
  );
}

function AadhaarSunSvg({ width = 42, text = 'आधार' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={width} height={width * 0.62} viewBox="0 0 100 62" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 4C28 4 10 22 10 44H16C16 25 31 10 50 10C69 10 84 25 84 44H90C90 22 72 4 50 4Z" fill="#ea580c"/>
        <path d="M50 14C33 14 20 27 20 44H25C25 30 36 19 50 19C64 19 75 30 75 44H80C80 27 67 14 50 14Z" fill="#f59e0b"/>
        <path d="M50 23C39 23 30 32 30 44H34C34 35 41 28 50 28C59 28 66 35 66 44H70C70 32 61 23 50 23Z" fill="#dc2626"/>
        <path d="M50 32C43 32 38 38 38 44H42C42 40 46 36 50 36C54 36 58 40 58 44H62C62 38 57 32 50 32Z" fill="#b91c1c"/>
        <line x1="50" y1="1" x2="50" y2="7" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="28" y1="6" x2="32" y2="12" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="72" y1="6" x2="68" y2="12" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="12" y1="18" x2="18" y2="22" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="88" y1="18" x2="82" y2="22" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', letterSpacing: text === 'AADHAAR' ? '0.8px' : '0.4px', marginTop: '-1px' }}>
        {text}
      </span>
    </div>
  );
}

function AadhaarQrSvg({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#ffffff"/>
      {/* Corner 1 */}
      <rect x="6" y="6" width="28" height="28" fill="#0f172a"/>
      <rect x="11" y="11" width="18" height="18" fill="#ffffff"/>
      <rect x="15" y="15" width="10" height="10" fill="#0f172a"/>
      {/* Corner 2 */}
      <rect x="66" y="6" width="28" height="28" fill="#0f172a"/>
      <rect x="71" y="11" width="18" height="18" fill="#ffffff"/>
      <rect x="75" y="15" width="10" height="10" fill="#0f172a"/>
      {/* Corner 3 */}
      <rect x="6" y="66" width="28" height="28" fill="#0f172a"/>
      <rect x="11" y="71" width="18" height="18" fill="#ffffff"/>
      <rect x="15" y="75" width="10" height="10" fill="#0f172a"/>
      {/* Matrix data dots */}
      <rect x="40" y="8" width="5" height="5" fill="#0f172a"/>
      <rect x="48" y="12" width="6" height="6" fill="#0f172a"/>
      <rect x="56" y="8" width="5" height="5" fill="#0f172a"/>
      <rect x="42" y="24" width="8" height="4" fill="#0f172a"/>
      <rect x="52" y="22" width="6" height="8" fill="#0f172a"/>
      <rect x="8" y="42" width="6" height="6" fill="#0f172a"/>
      <rect x="18" y="48" width="8" height="5" fill="#0f172a"/>
      <rect x="28" y="40" width="5" height="8" fill="#0f172a"/>
      <rect x="40" y="40" width="20" height="20" fill="#0f172a"/>
      <rect x="44" y="44" width="12" height="12" fill="#ffffff"/>
      <rect x="47" y="47" width="6" height="6" fill="#0f172a"/>
      <rect x="68" y="42" width="8" height="6" fill="#0f172a"/>
      <rect x="80" y="46" width="12" height="5" fill="#0f172a"/>
      <rect x="68" y="54" width="6" height="8" fill="#0f172a"/>
      <rect x="42" y="68" width="6" height="6" fill="#0f172a"/>
      <rect x="52" y="72" width="8" height="5" fill="#0f172a"/>
      <rect x="40" y="82" width="6" height="10" fill="#0f172a"/>
      <rect x="66" y="68" width="10" height="6" fill="#0f172a"/>
      <rect x="80" y="66" width="6" height="12" fill="#0f172a"/>
      <rect x="70" y="80" width="14" height="6" fill="#0f172a"/>
      <rect x="86" y="82" width="8" height="10" fill="#0f172a"/>
    </svg>
  );
}

function PassportPhotoAvatar() {
  return (
    <div style={{ width: '64px', height: '76px', background: '#e0f2fe', border: '1px solid #64748b', borderRadius: '2px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="50" height="62" viewBox="0 0 50 62" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Head */}
        <circle cx="25" cy="21" r="12" fill="#d97706"/>
        {/* Torso & Suit */}
        <path d="M6 56C6 41 13 37 25 37C37 37 44 41 44 56V62H6V56Z" fill="#1e293b"/>
        {/* Collar & Tie */}
        <path d="M21 37L25 48L29 37" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M25 45L23 58H27L25 45Z" fill="#dc2626"/>
        {/* Hair */}
        <path d="M13 19C13 11 18 8 25 8C32 8 37 11 37 19C37 14 34 11 25 11C16 11 13 14 13 19Z" fill="#0f172a"/>
      </svg>
    </div>
  );
}

function EpfoEmblemSvg({ size = 68 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Blue Cog / Gear Wheel */}
      <circle cx="50" cy="50" r="48" fill="#1e3a8a"/>
      {/* Gear teeth */}
      {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((deg) => (
        <rect
          key={deg}
          x="47"
          y="0.5"
          width="6"
          height="6"
          rx="1"
          fill="#1e3a8a"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
      {/* White Ring */}
      <circle cx="50" cy="50" r="41" fill="#ffffff"/>
      <circle cx="50" cy="50" r="39" fill="#1e3a8a"/>
      <circle cx="50" cy="50" r="34" fill="#ffffff"/>
      {/* Red Center Emblem */}
      <circle cx="50" cy="50" r="28" fill="#dc2626"/>
      {/* Central Sun, Hands & Sprout Graphic */}
      <path d="M50 32 L50 26 M42 34 L37 30 M58 34 L63 30 M38 41 L33 39 M62 41 L67 39" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="50" cy="38" r="5.5" fill="#ffffff"/>
      <path d="M38 50 C41 44 46 42 50 42 C54 42 59 44 62 50 C62 56 56 64 50 70 C44 64 38 56 38 50 Z" fill="#ffffff"/>
      <path d="M50 46 V62" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
      <path d="M43 52 C46 54 50 54 50 54 C50 54 54 54 57 52" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="40" y="68" width="20" height="4" rx="1.5" fill="#ffffff"/>
      <rect x="36" y="73" width="28" height="3" rx="1" fill="#ffffff"/>
    </svg>
  );
}

export default function OnboardingWizard({ onRefreshEmployees, onNavigate }) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitResult, setSubmitResult] = useState(null); // { tone, title, message }
  const [previewDocKey, setPreviewDocKey] = useState(null); // 'idDoc' | 'uanDoc' | 'salaryDoc'
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
    uan: '1012 9845 2310',
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
    salary: '₹32,00,000 INR / annum (₹32.0 LPA)',
    agreeOffer: true,
    agreeBgv: true,
    agreePolicy: true,
  });

  const [documents, setDocuments] = useState({
    idDoc: { name: 'Aadhaar_Card_Aarav_Sharma_Verified.pdf', size: '2.4 MB' },
    uanDoc: { name: 'UAN_Card_Aarav_Sharma_EPFO.pdf', size: '1.6 MB' },
    salaryDoc: { name: 'Salary_Slip_Recent_Months_Aarav_Sharma.pdf', size: '1.4 MB' },
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
          uan: profile.uan || '1012 ' + Math.floor(1000 + Math.random() * 9000) + ' ' + Math.floor(1000 + Math.random() * 9000),
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
          salary: profile.salary || '₹32,00,000 INR / annum (₹32.0 LPA)',
        }));

        setDocuments({
          idDoc: { name: profile.idDocumentName || `Aadhaar_Passport_${(profile.fullName || 'Verified').replace(/\s+/g, '_')}.pdf`, size: '2.4 MB' },
          uanDoc: { name: profile.uanDocumentName || `UAN_Card_${(profile.fullName || 'Candidate').replace(/\s+/g, '_')}_EPFO.pdf`, size: '1.6 MB' },
          salaryDoc: { name: profile.salarySlipDocName || `Salary_Slip_${(profile.fullName || 'Candidate').replace(/\s+/g, '_')}_Recent.pdf`, size: '1.4 MB' },
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
      uan: formData.uan || '1012 9845 2310',
      emergencyName: formData.emergencyName,
      emergencyPhone: formData.emergencyPhone,
      address: formData.address,
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      routingCode: formData.routingCode,
      hardware: formData.hardware,
      idDocumentName: documents.idDoc?.name || 'Aadhaar_Verified.pdf',
      uanDocumentName: documents.uanDoc?.name || 'UAN_Card_EPFO.pdf',
      salarySlipDocName: documents.salaryDoc?.name || 'Salary_Slip_Recent.pdf',
      department: formData.department || 'Engineering',
      jobTitle: formData.jobTitle || 'Staff AI Systems Engineer',
      manager: formData.manager || 'Amit Deshmukh (VP of Engineering)',
      startDate: formData.startDate || '2026-10-15',
      salary: formData.salary || '₹32,00,000 INR / annum (₹32.0 LPA)',
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPreviewDocKey(doc.key)}
                              title={`Preview dummy ${doc.title} with entered candidate details`}
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                            >
                              <i className="fa-solid fa-eye text-accent" aria-hidden="true"></i> View
                            </button>
                            <label htmlFor={inputId} className="btn btn-secondary btn-sm upload-btn" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}>
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

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW MODAL (DYNAMIC DATA BOUND TO ENTERED PERSONAL DETAILS) */}
      {/* ========================================================================= */}
      {previewDocKey && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewDocKey(null);
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: previewDocKey === 'idDoc' ? '820px' : '680px',
              width: '100%',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '1.25rem 1.4rem',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
                  <i className="fa-solid fa-file-invoice text-accent"></i> Document Preview: {DOCUMENTS.find((d) => d.key === previewDocKey)?.title}
                </h3>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Dynamic preview rendered with personal details for <strong>{formData.fullName || 'Candidate'}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocKey(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 6px' }}
                title="Close Preview"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* PREVIEW 1: GOVERNMENT ID / AADHAAR CARD (EXACT PDF FORMAT REPLICA) */}
            {previewDocKey === 'idDoc' && (
              <div style={{ background: '#ffffff', borderRadius: '4px', border: '2px solid #000000', overflow: 'hidden', color: '#000000', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                {/* Dual Column Aadhaar Sheet */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '660px', fontSize: '0.74rem' }}>
                  
                  {/* LEFT PANEL: FRONT OF E-AADHAAR LETTER */}
                  <div style={{ padding: '0.85rem 0.95rem', borderRight: '2px solid #000000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                    <div>
                      {/* Top Header with Lion & Aadhaar Sun */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <AshokaEmblemSvg size={32} />
                        <AadhaarSunSvg width={44} text="आधार" />
                      </div>

                      {/* Tricolor Official UIDAI Header Bar */}
                      <div style={{ textAlign: 'center', marginBottom: '0.5rem', border: '1px solid #ea580c' }}>
                        <div style={{ background: '#f05a22', color: '#ffffff', fontWeight: 800, fontSize: '0.74rem', padding: '2px 4px' }}>
                          भारतीय विशिष्ट पहचान प्राधिकरण
                        </div>
                        <div style={{ background: '#ffffff', color: '#000000', padding: '2px 4px' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>भारत सरकार</div>
                          <div style={{ fontWeight: 800, fontSize: '0.72rem', color: '#c02626' }}>Unique Identification Authority of India</div>
                        </div>
                        <div style={{ background: '#00923f', color: '#ffffff', fontWeight: 800, fontSize: '0.74rem', padding: '2px 4px' }}>
                          Government of India
                        </div>
                      </div>

                      {/* Enrolment Number */}
                      <div style={{ fontSize: '0.68rem', color: '#000000', fontWeight: 700, marginBottom: '0.45rem' }}>
                        नामांकन क्रमांक / Enrolment No.: <span style={{ fontWeight: 800 }}>XXXX/XXXXX/XXXXX</span>
                      </div>

                      {/* Recipient Letter Section + Left Margin Date Stamps */}
                      <div style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: '0.45rem', marginBottom: '0.35rem' }}>
                        {/* Vertical Date Stamp */}
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '0.44rem', color: '#334155', fontWeight: 700, letterSpacing: '0.2px', textAlign: 'center' }}>
                          Download Date: 12/01/2018 | Generation Date: 01/01/2018
                        </div>

                        {/* Recipient Details & QR Box */}
                        <div>
                          <div style={{ fontSize: '0.66rem', lineHeight: 1.35, color: '#000000' }}>
                            <div style={{ fontSize: '0.62rem' }}>To</div>
                            <div style={{ fontWeight: 700 }}>{formData.fullName}</div>
                            <div style={{ fontWeight: 700 }}>{formData.fullName}</div>
                            <div>
                              S/O: {formData.emergencyName ? formData.emergencyName.split(' (')[0] : 'Suresh Chandra Sharma'}
                            </div>
                            <div>
                              {formData.address}
                            </div>
                          </div>

                          {/* Digital Signature Box & QR Code in mid section matching PDF */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.45rem' }}>
                            <div style={{ fontSize: '0.48rem', color: '#000000', lineHeight: 1.25, border: '1px solid #cbd5e1', padding: '3px 5px', borderRadius: '2px', background: '#fafafa', maxWidth: '140px' }}>
                              <div style={{ color: '#ca8a04', fontWeight: 800 }}>Signature Not Verified</div>
                              <div style={{ color: '#475569' }}>Digitally signed by</div>
                              <div style={{ fontWeight: 700 }}>UNIQUE IDENTIFICATION AUTHORITY OF INDIA 03</div>
                              <div>Date: 2018.01.12 14:41:10 IST</div>
                            </div>
                            <div style={{ border: '1px solid #000000', padding: '2px' }}>
                              <AadhaarQrSvg size={54} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Middle Aadhaar Highlight Bar */}
                      <div style={{ textAlign: 'center', margin: '0.4rem 0 0.2rem 0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#000000' }}>
                          आपका <span style={{ color: '#c02626', fontWeight: 700 }}>आधार</span> क्रमांक / Your <span style={{ color: '#c02626', fontWeight: 700 }}>Aadhaar</span> No. :
                        </div>
                        <div style={{ fontSize: '1.28rem', fontWeight: 800, letterSpacing: '3px', color: '#000000', margin: '2px 0' }}>
                          {formData.aadhaar || '3938 3894 7474'}
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c02626', borderBottom: '1.5px solid #c02626', display: 'inline-block', paddingBottom: '1px' }}>
                          मेरा <span style={{ color: '#c02626' }}>आधार</span>, मेरी पहचान
                        </div>
                      </div>
                    </div>

                    {/* Cut Line with Scissors */}
                    <div style={{ position: 'relative', margin: '0.35rem 0', borderTop: '1.5px dashed #000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ position: 'absolute', background: '#ffffff', padding: '0 4px', fontSize: '0.68rem', color: '#000000' }}>
                        ✂ - - - - - - - - - - - - - - - - - - - - - - - -
                      </span>
                    </div>

                    {/* BOTTOM CARD: FRONT */}
                    <div style={{ border: '1.5px solid #000000', borderRadius: '2px', padding: '0.45rem', background: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AshokaEmblemSvg size={20} />
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#15803d' }}>
                            भारत सरकार / Government of India
                          </div>
                        </div>
                        <AadhaarSunSvg width={32} text="आधार" />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 50px', gap: '0.45rem', alignItems: 'center' }}>
                        {/* Realistic Photo */}
                        <PassportPhotoAvatar />

                        {/* Details */}
                        <div style={{ fontSize: '0.65rem', lineHeight: 1.3, color: '#000000' }}>
                          <div style={{ fontWeight: 700 }}>{formData.fullName}</div>
                          <div style={{ fontWeight: 800, fontSize: '0.76rem' }}>{formData.fullName}</div>
                          <div>जन्म तिथि/DOB: <strong>{formData.dob || '02/05/1983'}</strong></div>
                          <div>पुरुष/ MALE</div>
                        </div>

                        {/* QR Code */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ border: '1px solid #000000', padding: '1px', display: 'inline-block' }}>
                            <AadhaarQrSvg size={44} />
                          </div>
                          <span style={{ fontSize: '0.38rem', color: '#334155', display: 'block', lineHeight: 1, marginTop: '2px' }}>QR Code with Photograph</span>
                        </div>
                      </div>

                      {/* Aadhaar Number Highlight Box */}
                      <div style={{ marginTop: '0.3rem', paddingTop: '0.25rem', borderTop: '1px solid #000000', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.18rem', fontWeight: 800, letterSpacing: '2.5px', color: '#000000' }}>
                          {formData.aadhaar || '3938 3894 7474'}
                        </div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#c02626', borderBottom: '1.5px solid #c02626', display: 'inline-block', paddingBottom: '1px' }}>
                          मेरा <span style={{ color: '#c02626' }}>आधार</span>, मेरी पहचान
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT PANEL: BACK OF E-AADHAAR LETTER & INFORMATION */}
                  <div style={{ padding: '0.85rem 0.95rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
                    <div>
                      {/* Top Header with Lion & AADHAAR Sun */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <AshokaEmblemSvg size={32} />
                        <div style={{ height: '3px', width: '80px', background: 'linear-gradient(to right, #ff9933, #ffffff, #138808)', borderRadius: '2px' }}></div>
                        <AadhaarSunSvg width={44} text="AADHAAR" />
                      </div>

                      {/* सूचना / INFORMATION Section */}
                      <div style={{ background: '#fff', padding: '0.35rem 0.2rem', marginBottom: '0.35rem' }}>
                        <div style={{ textAlign: 'center', fontWeight: 800, color: '#c02626', fontSize: '0.74rem', marginBottom: '2px' }}>
                          सूचना
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.35rem 0', fontSize: '0.62rem', color: '#000000', lineHeight: 1.35 }}>
                          <li style={{ marginBottom: '2px' }}>■ <strong style={{ color: '#c02626' }}>आधार</strong> पहचान का प्रमाण है, नागरिकता का नहीं।</li>
                          <li style={{ marginBottom: '2px' }}>■ पहचान का प्रमाण ऑनलाइन ऑथेंटिकेशन द्वारा प्राप्त करें।</li>
                          <li>■ यह एक इलेक्ट्रॉनिक प्रक्रिया द्वारा बना हुआ पत्र है।</li>
                        </ul>

                        <div style={{ textAlign: 'center', fontWeight: 800, color: '#c02626', fontSize: '0.74rem', marginBottom: '2px' }}>
                          INFORMATION
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.62rem', color: '#000000', lineHeight: 1.35 }}>
                          <li style={{ marginBottom: '2px' }}>■ <strong style={{ color: '#c02626' }}>Aadhaar</strong> is a proof of identity, not of citizenship.</li>
                          <li style={{ marginBottom: '2px' }}>■ To establish identity, authenticate online.</li>
                          <li>■ This is electronically generated letter.</li>
                        </ul>
                      </div>

                      {/* Bordered Key Notice Box */}
                      <div style={{ border: '1.5px solid #000000', padding: '0.45rem', fontSize: '0.62rem', color: '#000000', background: '#ffffff', marginBottom: '0.35rem' }}>
                        <div style={{ marginBottom: '2px' }}>■ <span style={{ color: '#c02626', fontWeight: 700 }}>आधार</span> देश भर में मान्य है।</div>
                        <div style={{ marginBottom: '3px' }}>■ <span style={{ color: '#c02626', fontWeight: 700 }}>आधार</span> भविष्य में सरकारी और गैर-सरकारी सेवाओं का लाभ उठाने में उपयोगी होगा।</div>
                        <div style={{ marginBottom: '2px' }}>■ <span style={{ color: '#c02626', fontWeight: 700 }}>Aadhaar</span> is valid throughout the country.</div>
                        <div>■ <span style={{ color: '#c02626', fontWeight: 700 }}>Aadhaar</span> will be helpful in availing Government and Non-Government services in future.</div>
                      </div>
                    </div>

                    {/* Cut Line with Scissors */}
                    <div style={{ position: 'relative', margin: '0.35rem 0', borderTop: '1.5px dashed #000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ position: 'absolute', background: '#ffffff', padding: '0 4px', fontSize: '0.68rem', color: '#000000' }}>
                        ✂ - - - - - - - - - - - - - - - - - - - - - - - -
                      </span>
                    </div>

                    {/* BOTTOM CARD: BACK */}
                    <div style={{ border: '1.5px solid #000000', borderRadius: '2px', padding: '0.45rem', background: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '3px' }}>
                        <AadhaarSunSvg width={32} text="आधार" />
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#ea580c' }}>भारतीय विशिष्ट पहचान प्राधिकरण</div>
                          <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#16a34a' }}>Unique Identification Authority of India</div>
                        </div>
                      </div>

                      {/* Dual Address Grid matching PDF */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', alignItems: 'start', fontSize: '0.6rem', lineHeight: 1.3, color: '#000000' }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>Address:</div>
                          <div>
                            S/O: {formData.emergencyName ? formData.emergencyName.split(' (')[0] : 'Suresh Chandra Sharma'}, {formData.address}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 800 }}>पता:</div>
                          <div>
                            आत्मज: {formData.emergencyName ? formData.emergencyName.split(' (')[0] : 'सुरेश चंद्र शर्मा'}, {formData.address}
                          </div>
                        </div>
                      </div>

                      {/* Aadhaar Number */}
                      <div style={{ marginTop: '0.3rem', paddingTop: '0.25rem', borderTop: '1px solid #000000', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.18rem', fontWeight: 800, letterSpacing: '2.5px', color: '#000000' }}>
                          {formData.aadhaar || '3938 3894 7474'}
                        </div>
                      </div>

                      {/* Bottom Official Contact Strip */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #000000', marginTop: '2px', paddingTop: '2px', fontSize: '0.52rem', color: '#000000' }}>
                        <span>📞 1947</span>
                        <span>✉ help@uidai.gov.in</span>
                        <span>🌐 www.uidai.gov.in</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* PREVIEW 2: EPFO UAN CARD (EXACT REPLICA OF USER SCREENSHOT) */}
            {previewDocKey === 'uanDoc' && (
              <div style={{ background: '#f1f5f9', padding: '1rem 0.5rem', display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    border: '3px solid #1e293b',
                    color: '#000000',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                    fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                    padding: '1.6rem 2rem',
                    width: '100%',
                    maxWidth: '560px',
                    position: 'relative',
                  }}
                >
                  {/* Header Row: Circular Logo + Gray Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.6rem' }}>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <EpfoEmblemSvg size={70} />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        background: '#c5c8cc',
                        borderRadius: '4px',
                        padding: '0.65rem 0.85rem',
                        textAlign: 'center',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#111827', letterSpacing: '0.2px', lineHeight: 1.35 }}>
                        कर्मचारी भविष्य निधि संगठन, भारत
                      </div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#111827', marginTop: '2px', lineHeight: 1.35 }}>
                        Employees' Provident Fund Organisation, India
                      </div>
                    </div>
                  </div>

                  {/* Content Table / Rows Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', fontSize: '0.95rem' }}>
                    
                    {/* Row 1: Universal Account Number (UAN) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center' }}>
                      <div style={{ lineHeight: 1.35, color: '#000000' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>यूनिवर्सल खाता संख्या</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Universal Account Number (UAN)</div>
                      </div>
                      <div style={{ color: '#e11d48', fontWeight: 900, fontSize: '1.55rem', letterSpacing: '0.5px' }}>
                        {formData.uan ? formData.uan.replace(/\s+/g, '') : '100102226664'}
                      </div>
                    </div>

                    {/* Row 2: Name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center' }}>
                      <div style={{ lineHeight: 1.35, color: '#000000' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>नाम</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Name</div>
                      </div>
                      <div style={{ lineHeight: 1.35, color: '#000000' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>{formData.fullName || 'सैम्पल कुमार'}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{formData.fullName || 'Sample Kumar'}</div>
                      </div>
                    </div>

                    {/* Row 3: Father's / Husband's Name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center' }}>
                      <div style={{ lineHeight: 1.35, color: '#000000' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>पिता / पति का नाम</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Father's / Husband's Name</div>
                      </div>
                      <div style={{ lineHeight: 1.35, color: '#000000' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                          श्री {formData.emergencyName ? formData.emergencyName.split(' (')[0] : 'सैम्पल्स कुमार'}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>
                          Sh. {formData.emergencyName ? formData.emergencyName.split(' (')[0] : 'Samples Kumar'}
                        </div>
                      </div>
                    </div>

                    {/* Row 4: K.Y.C. */}
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center' }}>
                      <div style={{ lineHeight: 1.35, color: '#000000' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>के.वाई.सी.</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>K.Y.C.</div>
                      </div>
                      <div style={{ lineHeight: 1.35, color: '#000000' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>हां</div>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>YES</div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}

            {/* PREVIEW 3: SALARY SLIP / PAYSLIP */}
            {previewDocKey === 'salaryDoc' && (
              <div style={{ background: '#ffffff', borderRadius: '8px', border: '2px solid #cbd5e1', overflow: 'hidden', color: '#0f172a', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
                {/* Payslip Top Banner */}
                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '0.85rem 1.25rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: 'var(--button-gradient)', color: '#1c1f2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem' }}>
                      AE
                    </div>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.4px' }}>AutomationEdge Technologies Pvt. Ltd.</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tower B, Cyber City, Baner, Pune, Maharashtra 411045</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800, display: 'inline-block', marginBottom: '2px' }}>
                      CONFIDENTIAL PAYSLIP
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Payslip for Month: <strong>September 2026</strong></div>
                  </div>
                </div>

                <div style={{ padding: '1rem 1.2rem', fontSize: '0.76rem' }}>
                  {/* Candidate / Employee Information Grid */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem 0.75rem', lineHeight: 1.4 }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Employee Name:</span>
                        <strong style={{ color: '#0f172a' }}>{formData.fullName}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Employee ID:</span>
                        <strong style={{ color: '#0f172a' }}>EMP-4819</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Designation:</span>
                        <strong style={{ color: '#0f172a' }}>{formData.jobTitle || 'Staff AI Systems Engineer'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Department:</span>
                        <strong style={{ color: '#0f172a' }}>{formData.department || 'Engineering'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>PAN Number:</span>
                        <strong style={{ color: '#0f172a' }}>{formData.pan || 'ABCDE1234F'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>EPFO UAN:</span>
                        <strong style={{ color: '#0f172a' }}>{formData.uan || '1012 9845 2310'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Bank Account:</span>
                        <strong style={{ color: '#0f172a' }}>{formData.bankName || 'HDFC Bank'} (••{formData.accountNumber ? formData.accountNumber.slice(-4) : '1029'})</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Paid Days / LOP:</span>
                        <strong style={{ color: '#059669' }}>30 Days / 0 LOP</strong>
                      </div>
                    </div>
                  </div>

                  {/* Earnings & Deductions Tables */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    {/* Earnings Box */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ background: '#f1f5f9', padding: '0.4rem 0.65rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>EARNINGS</span>
                        <span>AMOUNT (INR)</span>
                      </div>
                      <div style={{ padding: '0.5rem 0.65rem', lineHeight: 1.8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Basic Salary</span>
                          <strong>₹1,33,333.00</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>House Rent Allowance (HRA)</span>
                          <strong>₹53,333.00</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Special Allowance</span>
                          <strong>₹65,000.00</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Conveyance & Medical</span>
                          <strong>₹15,000.00</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem', marginTop: '0.2rem', fontWeight: 800, color: '#0f172a' }}>
                          <span>Total Gross Earnings</span>
                          <span style={{ color: '#0284c7' }}>₹2,66,666.00</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions Box */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ background: '#f1f5f9', padding: '0.4rem 0.65rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>DEDUCTIONS</span>
                        <span>AMOUNT (INR)</span>
                      </div>
                      <div style={{ padding: '0.5rem 0.65rem', lineHeight: 1.8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Employee PF Contribution</span>
                          <strong>₹1,800.00</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Professional Tax (PT)</span>
                          <strong>₹200.00</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Income Tax (TDS)</span>
                          <strong>₹18,450.00</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Corporate Health Cover</span>
                          <strong>₹1,200.00</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem', marginTop: '0.2rem', fontWeight: 800, color: '#0f172a' }}>
                          <span>Total Deductions</span>
                          <span style={{ color: '#dc2626' }}>₹21,650.00</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary Highlight Box */}
                  <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                        NET SALARY PAYABLE (CREDITED VIA NEFT / DIRECT DEPOSIT)
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#047857', letterSpacing: '0.5px', marginTop: '2px' }}>
                        ₹2,45,016.00
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#059669', fontStyle: 'italic' }}>
                        In words: Two Lakhs Forty-Five Thousand Sixteen Rupees Only
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#065f46' }}>
                      <div>Txn Ref: <strong>HDFC-NEFT-9281048192</strong></div>
                      <div>Status: <strong style={{ color: '#047857' }}>✓ Processed & Credited</strong></div>
                    </div>
                  </div>

                  {/* Footer Notes & Digital Stamp */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', fontSize: '0.68rem', color: '#64748b' }}>
                    <span>Note: This is a computer-generated payslip and requires no physical signature.</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>● AutomationEdge Finance & Payroll Dept</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setPreviewDocKey(null)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 1.1rem' }}
              >
                <i className="fa-solid fa-check" aria-hidden="true"></i> Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
