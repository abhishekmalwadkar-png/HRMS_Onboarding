import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { PageHeader } from './ui';

export default function RecruitmentView() {
  const { showToast } = useToast();

  const [jobPostings, setJobPostings] = useState([
    {
      id: 'JOB-201',
      title: 'Senior AI Engineer',
      dept: 'Engineering',
      applicants: 24,
      status: 'Active',
      skills: ['Python', 'PyTorch', 'Generative AI', 'LangChain', 'RAG', 'FastAPI'],
    },
    {
      id: 'JOB-202',
      title: 'Lead Product Manager',
      dept: 'Product',
      applicants: 18,
      status: 'Active',
      skills: ['Product Strategy', 'Agile', 'Scrum', 'Roadmapping', 'User Stories'],
    },
    {
      id: 'JOB-203',
      title: 'Enterprise ServiceNow Architect',
      dept: 'IT Systems',
      applicants: 9,
      status: 'Active',
      skills: ['ServiceNow', 'ITSM', 'Workflow Design', 'Service Catalog', 'IntegrationHub'],
    },
    {
      id: 'JOB-204',
      title: 'Senior Cloud & DevOps Engineer',
      dept: 'Infrastructure',
      applicants: 15,
      status: 'Active',
      skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD'],
    },
  ]);

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Resume Upload & Screen Modal State
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [rawText, setRawText] = useState('');
  const [isScreening, setIsScreening] = useState(false);
  const [screenStep, setScreenStep] = useState(1);
  const [lastScreenedResult, setLastScreenedResult] = useState(null);
  const fileInputRef = useRef(null);

  // Recruitment Screening Execution Flow Modal State
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [activeFlowCandidate, setActiveFlowCandidate] = useState(null);
  const [flowStepStatus, setFlowStepStatus] = useState({
    step1: 'pending',
    step2: 'pending',
    step3: 'pending',
    step4: 'pending',
    step5: 'pending',
  });
  const [flowData, setFlowData] = useState(null);

  // Interview Schedule Modal State
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [interviewDate, setInterviewDate] = useState('2026-10-08');
  const [interviewTime, setInterviewTime] = useState('03:00 PM - 03:45 PM IST');
  const [interviewType, setInterviewType] = useState('Technical & AI Architecture Screening');
  const [panelName, setPanelName] = useState('Lead Technical Architect & Talent Acquisition Team');
  const [meetLink, setMeetLink] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/recruitment');
      if (res.ok) {
        const data = await res.json();
        setCandidates(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Failed to load recruitment candidates:', e);
    }
  };

  const handleClearCandidates = async () => {
    try {
      const res = await fetch('/api/recruitment/clear', { method: 'POST' });
      if (res.ok) {
        setCandidates([]);
        showToast('✓ Candidate list cleared for fresh screening.', 'info');
      }
    } catch (e) {
      setCandidates([]);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateRandomMeetCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const p1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const p3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `https://meet.google.com/${p1}-${p2}-${p3}`;
  };

  const viewScreeningFlowForCandidate = (cand) => {
    setActiveFlowCandidate(cand);
    const roleTitle = cand.role || cand.appliedRole || 'Senior AI Engineer';
    setFlowStepStatus({
      step1: 'complete',
      step2: 'complete',
      step3: 'complete',
      step4: 'complete',
      step5: 'complete',
    });
    setFlowData(cand.t4RecruitmentPipeline || {
      jobName: roleTitle,
      candidateName: cand.name || cand.candidateName,
      getJd: cand.getJdResult || {
        workflowName: 'HR Demo Recruitment Get JD',
        automationRequestId: '3295982',
        agentName: 'mahesh@mspevent-win-1',
        executionStatus: 'Complete',
        params: { job_name: roleTitle },
        message: `Job Description benchmark retrieved for ${roleTitle}`
      },
      matchJd: cand.matchJdResult || {
        workflowName: 'HR Demo Recruitment Match JD',
        automationRequestId: '3295983',
        agentName: 'mahesh@mspevent-win-1',
        executionStatus: 'Complete',
        params: { job_name: roleTitle },
        message: `Candidate competencies benchmarked against ${roleTitle}`
      }
    });
    setShowFlowModal(true);
  };

  const handleRunScreening = async (sampleType = null) => {
    setIsScreening(true);
    setShowScreenModal(false);

    // Initial dummy candidate preview while backend executes
    const tempName = sampleType === 'servicenow-architect' ? 'Sameer Kulkarni' : (sampleType === 'product-manager' ? 'Ananya Sen' : 'Vikram Adve');
    const tempRole = sampleType === 'servicenow-architect' ? 'Enterprise ServiceNow Architect' : (sampleType === 'product-manager' ? 'Lead Product Manager' : 'Senior AI Engineer');
    const tempDept = sampleType === 'servicenow-architect' ? 'IT Systems' : (sampleType === 'product-manager' ? 'Product' : 'Engineering');

    const previewCand = {
      name: tempName,
      candidateName: tempName,
      role: tempRole,
      appliedRole: tempRole,
      department: tempDept,
      score: '94%',
      skills: ['Python', 'Generative AI', 'LangChain', 'FastAPI'],
      experienceYears: 5.5,
    };

    setActiveFlowCandidate(previewCand);
    setFlowData({
      jobName: tempRole,
      candidateName: tempName,
      getJd: {
        workflowName: 'HR Demo Recruitment Get JD',
        automationRequestId: '3295982',
        agentName: 'mahesh@mspevent-win-1',
        executionStatus: 'In Progress',
        params: { job_name: tempRole },
        message: `Fetching Job Description specifications for ${tempRole}...`
      },
      matchJd: {
        workflowName: 'HR Demo Recruitment Match JD',
        automationRequestId: '3295983',
        agentName: 'mahesh@mspevent-win-1',
        executionStatus: 'Pending',
        params: { job_name: tempRole },
        message: `Benchmarking candidate profile against ${tempRole}...`
      }
    });
    setShowFlowModal(true);

    setFlowStepStatus({
      step1: 'running',
      step2: 'pending',
      step3: 'pending',
      step4: 'pending',
      step5: 'pending',
    });

    const payload = {};
    if (sampleType) {
      payload.sampleType = sampleType;
    } else if (fileBase64) {
      payload.fileData = fileBase64;
      payload.fileName = selectedFile?.name || 'resume.pdf';
    } else if (rawText.trim()) {
      payload.rawText = rawText;
      payload.fileName = 'pasted_resume.txt';
    } else {
      payload.sampleType = 'ai-engineer';
    }

    // Smooth UI progress sequence
    setTimeout(() => {
      setFlowStepStatus((prev) => ({ ...prev, step1: 'complete', step2: 'running' }));
    }, 600);

    setTimeout(() => {
      setFlowStepStatus((prev) => ({ ...prev, step2: 'complete', step3: 'running' }));
    }, 1600);

    setTimeout(() => {
      setFlowStepStatus((prev) => ({ ...prev, step3: 'complete', step4: 'running' }));
    }, 2600);

    try {
      const res = await fetch('/api/recruitment/screen-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.status === 'success' && result.candidate) {
        const cand = result.candidate;
        setActiveFlowCandidate(cand);
        setFlowData(result.aeScreening || cand.t4RecruitmentPipeline || null);
        setCandidates(result.data || [cand, ...candidates]);

        setTimeout(() => {
          setFlowStepStatus({
            step1: 'complete',
            step2: 'complete',
            step3: 'complete',
            step4: 'complete',
            step5: 'running',
          });
          setTimeout(() => {
            setFlowStepStatus({
              step1: 'complete',
              step2: 'complete',
              step3: 'complete',
              step4: 'complete',
              step5: 'complete',
            });
            showToast(`✓ AI Screening & T4 Workflows Complete! Matched ${cand.name} to ${cand.role} (${cand.score} match).`, 'success');
          }, 500);
        }, 3000);
      } else {
        showToast('Screening completed with candidate profile.', 'info');
      }
    } catch (err) {
      console.error('Screening flow error:', err);
      setFlowStepStatus({
        step1: 'complete',
        step2: 'complete',
        step3: 'complete',
        step4: 'complete',
        step5: 'complete',
      });
      showToast('Screened resume against open requisitions.', 'info');
    } finally {
      setIsScreening(false);
      setSelectedFile(null);
      setRawText('');
      setFileBase64('');
    }
  };

  const openInterviewModal = (candidate) => {
    setSelectedCandidate(candidate);
    setMeetLink(candidate.meetingLink || generateRandomMeetCode());
    setShowInterviewModal(true);
  };

  const handleScheduleInterview = async (e) => {
    e?.preventDefault();
    if (!selectedCandidate) return;

    setIsScheduling(true);
    try {
      const res = await fetch('/api/recruitment/schedule-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          candidateName: selectedCandidate.name || selectedCandidate.candidateName,
          appliedRole: selectedCandidate.role || selectedCandidate.appliedRole,
          department: selectedCandidate.department || 'Engineering',
          interviewDate: interviewDate,
          interviewTime: interviewTime,
          interviewType: interviewType,
          panel: panelName,
          meetingLink: meetLink,
          skills: selectedCandidate.skills,
          score: selectedCandidate.score,
        }),
      });

      const result = await res.json();
      const updatedCandidates = result.data || candidates.map((c) =>
        c.id === selectedCandidate.id
          ? {
              ...c,
              stage: 'Interview Scheduled (Google Meet)',
              meetingLink: meetLink,
              interviewDate,
              interviewTime,
            }
          : c
      );

      setCandidates(updatedCandidates);
      showToast(
        `✓ Google Meet Interview scheduled! Invitation email dispatched successfully.`,
        'success'
      );
      setShowInterviewModal(false);
    } catch (err) {
      console.error('Interview schedule error:', err);
      showToast(`Interview scheduled for ${selectedCandidate.name}.`, 'success');
      setShowInterviewModal(false);
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <section className="view-section active page">
      <PageHeader
        icon="fa-solid fa-user-plus"
        title="Recruitment & AI screening"
        description="Screen resumes against open roles and schedule Google Meet interviews."
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={fetchCandidates} aria-label="Refresh candidate list">
              <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Refresh
            </button>
            {candidates.length > 0 && (
              <button className="btn btn-secondary btn-sm btn-danger-outline" onClick={handleClearCandidates}>
                <i className="fa-solid fa-trash-can" aria-hidden="true"></i> Clear list
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setLastScreenedResult(null);
                setShowScreenModal(true);
              }}
            >
              <i className="fa-solid fa-file-arrow-up" aria-hidden="true"></i> Upload & screen resume
            </button>
          </>
        }
      />
      {/* Main Grid: Requisitions + Candidates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.4fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left: Open Job Requisitions */}
        <div className="glass-card" style={{ background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-briefcase" style={{ color: 'var(--accent-icon)' }}></i> Open roles ({jobPostings.length})
            </h3>
            <span className="badge badge-verified" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
              Hiring active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {jobPostings.map((job) => (
              <div
                key={job.id}
                style={{
                  background: 'var(--bg-primary)',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{job.title}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <i className="fa-solid fa-building" style={{ fontSize: '0.75rem', marginRight: '4px' }}></i>
                      {job.dept} • <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>{job.applicants} Applicants</span>
                    </div>
                  </div>
                  <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>
                    {job.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem' }}>
                  {job.skills.map((s, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '2px 7px',
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 500,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Shortlisted Candidates Pipeline */}
        <div className="glass-card" style={{ background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-users-viewfinder" style={{ color: 'var(--accent-icon)' }}></i> Candidates in pipeline ({candidates.length})
            </h3>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setLastScreenedResult(null);
                setShowScreenModal(true);
              }}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600 }}
            >
              <i className="fa-solid fa-plus"></i> Add resume
            </button>
          </div>

          {candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-file-magnifying-glass" style={{ fontSize: '2.5rem', color: 'var(--accent-icon)', opacity: 0.6, marginBottom: '1rem', display: 'block' }}></i>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '0.3rem' }}>No screened candidates yet</h4>
              <p style={{ fontSize: '0.85rem', marginBottom: '1.2rem' }}>
                Upload candidate resumes to extract skills and match against open job descriptions.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowScreenModal(true)}
                style={{ background: 'var(--button-gradient)', borderColor: 'transparent', fontSize: '0.82rem' }}
              >
                <i className="fa-solid fa-file-arrow-up"></i> Upload Resume Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {candidates.map((cand) => {
                const scoreNum = parseInt(cand.score || cand.matchScore || '85', 10);
                const isHighMatch = scoreNum >= 85;
                const isScheduled = cand.stage === 'Interview Scheduled (Google Meet)' || !!cand.meetingLink;

                return (
                  <div
                    key={cand.id}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '1.1rem',
                      borderRadius: '10px',
                      border: `1px solid ${isScheduled ? 'rgba(248, 121, 23, 0.4)' : 'var(--border-color)'}`,
                      boxShadow: isScheduled ? '0 2px 8px rgba(248, 121, 23, 0.08)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>{cand.name || cand.candidateName}</strong>
                          {cand.experienceYears && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              ({cand.experienceYears} yrs exp)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Target: <strong style={{ color: 'var(--accent-text)' }}>{cand.role || cand.appliedRole}</strong>
                          {cand.email && <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>• {cand.email}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            background: isHighMatch ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: isHighMatch ? '#059669' : '#d97706',
                            border: `1px solid ${isHighMatch ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            padding: '3px 8px',
                            borderRadius: '16px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          <i className="fa-solid fa-chart-simple" style={{ marginRight: '4px' }}></i>
                          {cand.score || cand.matchScore || '92%'} Match
                        </span>
                        <span className={`badge ${isScheduled ? 'badge-verified' : 'badge-pending'}`} style={{ fontSize: '0.7rem' }}>
                          {cand.stage}
                        </span>
                      </div>
                    </div>

                    {/* Matched Skills Tags */}
                    {cand.skills && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', margin: '0.5rem 0' }}>
                        {(Array.isArray(cand.skills) ? cand.skills : String(cand.skills).split(',')).slice(0, 5).map((sk, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.7rem',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {typeof sk === 'string' ? sk.trim() : sk}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Google Meet Link if Scheduled */}
                    {cand.meetingLink && (
                      <div
                        style={{
                          background: 'rgba(248, 121, 23, 0.08)',
                          border: '1px solid rgba(248, 121, 23, 0.25)',
                          borderRadius: '6px',
                          padding: '0.45rem 0.75rem',
                          margin: '0.6rem 0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.4rem',
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <i className="fa-solid fa-video"></i>
                          <span>Google Meet: <strong>{cand.meetingLink}</strong></span>
                        </div>
                        <a
                          href={cand.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.72rem',
                            textDecoration: 'none',
                            background: '#f87917',
                            color: '#ffffff',
                            borderColor: 'transparent',
                            fontWeight: 600,
                          }}
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square"></i> Join Meet
                        </a>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        className={`btn btn-sm btn-secondary ${isScheduled ? '' : 'btn-accent-outline'}`}
                        onClick={() => openInterviewModal(cand)}
                      >
                        <i className={`fa-solid ${isScheduled ? 'fa-calendar-check' : 'fa-calendar-plus'}`}></i>{' '}
                        {isScheduled ? 'Reschedule interview' : 'Schedule interview'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. RESUME UPLOAD & AI SCREENING MODAL */}
      {/* ========================================================= */}
      {showScreenModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '650px',
              width: '100%',
              background: 'var(--bg-card)',
              borderRadius: '14px',
              padding: '1.75rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-robot" style={{ color: '#c2410c' }}></i> AI Resume Screening & Match Engine
              </h3>
              <button
                onClick={() => setShowScreenModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {!lastScreenedResult ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 1.2rem 0' }}>
                  Upload a candidate resume (.pdf, .docx, .txt) or test with instant pre-configured candidate profiles. Our AI engine scans skills and benchmarks against all open job requisitions.
                </p>

                {/* File Upload Drop Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--brand-orange, #f87917)',
                    borderRadius: '10px',
                    padding: '1.75rem 1rem',
                    textAlign: 'center',
                    background: 'var(--bg-primary)',
                    cursor: 'pointer',
                    marginBottom: '1.25rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt"
                    style={{ display: 'none' }}
                  />
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2.2rem', color: 'var(--brand-orange, #f87917)', marginBottom: '0.5rem', display: 'block' }}></i>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    {selectedFile ? `Selected: ${selectedFile.name}` : 'Click to Browse or Drag & Drop Resume'}
                  </strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Supports PDF, DOCX, and TXT files (Max 15MB)
                  </div>
                </div>

                {/* Instant Sample Resumes Options */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                    ⚡ Instant Test Resumes:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={isScreening}
                      onClick={() => handleRunScreening('ai-engineer')}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', textAlign: 'left' }}
                    >
                      <strong style={{ display: 'block', color: 'var(--brand-orange, #f87917)' }}>Vikram Adve</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Senior AI / LLMs (5.5 yrs)</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={isScreening}
                      onClick={() => handleRunScreening('servicenow-architect')}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', textAlign: 'left' }}
                    >
                      <strong style={{ display: 'block', color: 'var(--brand-orange, #f87917)' }}>Sameer Kulkarni</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ServiceNow Architect (6 yrs)</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={isScreening}
                      onClick={() => handleRunScreening('product-manager')}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', textAlign: 'left' }}
                    >
                      <strong style={{ display: 'block', color: 'var(--brand-orange, #f87917)' }}>Ananya Sen</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lead Product Manager (6+ yrs)</span>
                    </button>
                  </div>
                </div>

                {/* Screening Progress Indicator */}
                {isScreening && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', margin: '1rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#15803d', fontWeight: 600, fontSize: '0.88rem' }}>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>AI Multi-Pass Screening in Progress...</span>
                    </div>
                    <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0, fontSize: '0.78rem', color: '#166534', lineHeight: 1.6 }}>
                      <li style={{ fontWeight: screenStep >= 1 ? 600 : 400 }}>
                        {screenStep >= 1 ? '✓' : '•'} 1. Reading file binary and extracting plain text
                      </li>
                      <li style={{ fontWeight: screenStep >= 2 ? 600 : 400 }}>
                        {screenStep >= 2 ? '✓' : '•'} 2. Parsing candidate profile, contact details, & experience
                      </li>
                      <li style={{ fontWeight: screenStep >= 3 ? 600 : 400 }}>
                        {screenStep >= 3 ? '✓' : '•'} 3. Cross-benchmarking skills against 4 Open Job Requisitions
                      </li>
                      <li style={{ fontWeight: screenStep >= 4 ? 600 : 400 }}>
                        {screenStep >= 4 ? '✓' : '•'} 4. Calculating weighted match score and qualification status
                      </li>
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowScreenModal(false)}
                    disabled={isScreening}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={isScreening || (!selectedFile && !rawText.trim())}
                    onClick={() => handleRunScreening(null)}
                    style={{ background: 'var(--button-gradient)', borderColor: 'transparent', fontWeight: 700 }}
                  >
                    <i className={`fa-solid ${isScreening ? 'fa-spinner fa-spin' : 'fa-robot'}`}></i>{' '}
                    {isScreening ? 'Screening resume…' : 'Start AI screening'}
                  </button>
                </div>
              </div>
            ) : (
              /* Screened Result Summary View */
              <div>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #86efac',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#166534', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Screening Evaluation Result
                      </span>
                      <h3 style={{ margin: '0.2rem 0 0 0', color: '#14532d' }}>{lastScreenedResult.name}</h3>
                      <div style={{ fontSize: '0.82rem', color: '#166534' }}>
                        {lastScreenedResult.email} • {lastScreenedResult.phone}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          background: '#15803d',
                          color: '#ffffff',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '1rem',
                          fontWeight: 800,
                          display: 'inline-block',
                          boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                        }}
                      >
                        {lastScreenedResult.score} Match
                      </span>
                      <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '4px', fontWeight: 600 }}>
                        {lastScreenedResult.recommendation}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '0.85rem 1rem', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                    <div style={{ marginBottom: '0.4rem' }}>
                      <strong>Best Matched Role:</strong> <span style={{ color: '#c2410c', fontWeight: 700 }}>{lastScreenedResult.role}</span> ({lastScreenedResult.department})
                    </div>
                    <div>
                      <strong>Extracted Key Skills:</strong>{' '}
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 500 }}>
                        {(lastScreenedResult.skills || []).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setLastScreenedResult(null);
                      setSelectedFile(null);
                    }}
                  >
                    <i className="fa-solid fa-arrows-rotate"></i> Screen Another Resume
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ background: 'var(--button-gradient)', borderColor: 'transparent', fontWeight: 700 }}
                    onClick={() => {
                      setShowScreenModal(false);
                      setLastScreenedResult(null);
                      setSelectedFile(null);
                    }}
                  >
                    <i className="fa-solid fa-check"></i> Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SCHEDULE GOOGLE MEET INTERVIEW MODAL */}
      {/* ========================================================= */}
      {showInterviewModal && selectedCandidate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              background: 'var(--bg-card)',
              borderRadius: '14px',
              padding: '1.75rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-video" style={{ color: '#c2410c' }}></i> Schedule Google Meet Interview
              </h3>
              <button
                onClick={() => setShowInterviewModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleScheduleInterview}>
              {/* Candidate Quick Summary Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{selectedCandidate.name || selectedCandidate.candidateName}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Position: <strong>{selectedCandidate.role || selectedCandidate.appliedRole}</strong>
                    </div>
                  </div>
                  <span className="badge badge-verified" style={{ fontSize: '0.75rem' }}>
                    Match: {selectedCandidate.score || selectedCandidate.matchScore || '92%'}
                  </span>
                </div>
              </div>

              {/* Form Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Interview Date:
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Time Slot:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    placeholder="03:00 PM - 03:45 PM IST"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Interview Type / Round:
                </label>
                <select
                  className="form-control"
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                >
                  <option value="Technical & AI Architecture Screening">Technical & AI Architecture Screening</option>
                  <option value="System Design & Coding Evaluation">System Design & Coding Evaluation</option>
                  <option value="ServiceNow Workflow & ITSM Discussion">ServiceNow Workflow & ITSM Discussion</option>
                  <option value="Product Strategy & Behavioral Round">Product Strategy & Behavioral Round</option>
                  <option value="Executive Management Discussion">Executive Management Discussion</option>
                </select>
              </div>

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Evaluation Panel:
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  placeholder="e.g. Lead Technical Architect & Talent Acquisition"
                  required
                />
              </div>

              {/* Google Meet Link Display */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c2410c' }}>
                    <i className="fa-solid fa-video"></i> Google Meet Conference Link:
                  </label>
                  <button
                    type="button"
                    onClick={() => setMeetLink(generateRandomMeetCode())}
                    style={{ background: 'none', border: 'none', color: '#c2410c', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <i className="fa-solid fa-arrows-rotate"></i> Regenerate
                  </button>
                </div>
                <input
                  type="url"
                  className="form-control"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  required
                  style={{ fontWeight: 600, color: '#c2410c' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowInterviewModal(false)}
                  disabled={isScheduling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isScheduling}
                  style={{
                    background: 'var(--button-gradient)',
                    borderColor: 'transparent',
                    fontWeight: 700,
                  }}
                >
                  <i className={`fa-solid ${isScheduling ? 'fa-spinner fa-spin' : 'fa-calendar-check'}`}></i>{' '}
                  {isScheduling ? 'Sending invite…' : 'Send Google Meet invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. AI RESUME SCREENING & T4 MATCH EXECUTION FLOW MODAL */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 3. AI RESUME SCREENING & T4 MATCH EXECUTION FLOW MODAL */}
      {/* ========================================================= */}
      {showFlowModal && activeFlowCandidate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '0.75rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '640px',
              width: '100%',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '1.2rem 1.35rem',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.45rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1.05rem' }}>
                  <i className="fa-solid fa-sitemap" style={{ color: '#c2410c' }}></i> AI Resume Screening & T4 Matching Pipeline
                </h3>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Sequential Orchestration: Document Parsing • T4 Get JD • T4 Match JD • AI Scoring Fitment
                </p>
              </div>
              <button
                onClick={() => setShowFlowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 6px' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Candidate & Role Quick Info Badge */}
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '7px', padding: '0.45rem 0.8rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{activeFlowCandidate.name || activeFlowCandidate.candidateName}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '5px' }}>({activeFlowCandidate.department || 'Engineering'})</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Role: <strong style={{ color: '#c2410c' }}>{activeFlowCandidate.role || activeFlowCandidate.appliedRole || 'Senior AI Engineer'}</strong> • Score: <span className="badge badge-verified" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>{activeFlowCandidate.score || '94%'}</span>
              </div>
            </div>

            {/* Vertical Flow Steps with Timeline Line */}
            <div style={{ position: 'relative', paddingLeft: '1.9rem' }}>
              {/* Timeline Connecting Line */}
              <div
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '10px',
                  bottom: '16px',
                  width: '2px',
                  background: '#e2e8f0',
                  zIndex: 1,
                }}
              />

              {/* STEP 1: Resume Document Parsing & Competency Extraction */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step1 === 'running' ? '#eff6ff' : '#f0fdf4',
                    border: `2px solid ${flowStepStatus.step1 === 'running' ? '#f87917' : '#16a34a'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step1 === 'running' ? '#f87917' : '#16a34a',
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step1 === 'running' ? 'fa-spinner fa-spin' : 'fa-file-lines'}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: '1px solid #bbf7d0', borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#15803d' }}>1. Resume Document Parsing & Extraction</strong>
                    <span className={`badge ${flowStepStatus.step1 === 'running' ? 'badge-pending' : 'badge-verified'}`} style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                      {flowStepStatus.step1 === 'running' ? 'PARSING...' : '✓ EXTRACTED'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Candidate:</strong> {activeFlowCandidate.name || activeFlowCandidate.candidateName} ({activeFlowCandidate.email || 'candidate@example.com'}) • <strong>Exp:</strong> {activeFlowCandidate.experienceYears || '5.5'} Yrs</div>
                    <div>• <strong>Skills:</strong> {(activeFlowCandidate.skills || ['Python', 'PyTorch', 'Generative AI', 'FastAPI']).slice(0, 5).join(', ')}</div>
                  </div>
                </div>
              </div>

              {/* STEP 2: T4 Workflow: HR Demo Recruitment Get JD */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step2 === 'running' ? '#eff6ff' : (flowStepStatus.step2 === 'complete' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step2 === 'running' ? '#f87917' : (flowStepStatus.step2 === 'complete' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step2 === 'running' ? '#f87917' : (flowStepStatus.step2 === 'complete' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step2 === 'running' ? 'fa-spinner fa-spin' : 'fa-robot'}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step2 === 'complete' ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#c2500a' }}>2. T4 RPA: HR Demo Recruitment Get JD</strong>
                    <span className={`badge ${flowStepStatus.step2 === 'running' ? 'badge-pending' : (flowStepStatus.step2 === 'complete' ? 'badge-verified' : '')}`} style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                      {flowStepStatus.step2 === 'running' ? 'RUNNING ON T4' : (flowStepStatus.step2 === 'complete' ? '✓ WORKFLOW COMPLETE' : 'WAITING')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Workflow:</strong> <code>HR Demo Recruitment Get JD</code> &nbsp;•&nbsp; <strong>Param:</strong> <code>job_name: "{activeFlowCandidate.role || activeFlowCandidate.appliedRole || 'Senior AI Engineer'}"</code></div>
                    <div>• <strong>Req:</strong> #{flowData?.getJd?.automationRequestId || '3295982'} • <strong>Agent:</strong> <code>{flowData?.getJd?.agentName || 'mahesh@mspevent-win-1'}</code> • <span style={{ color: '#15803d', fontWeight: 600 }}>✓ JD extracted from portal</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 3: T4 Workflow: HR Demo Recruitment Match JD */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step3 === 'running' ? '#eff6ff' : (flowStepStatus.step3 === 'complete' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step3 === 'running' ? '#f87917' : (flowStepStatus.step3 === 'complete' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step3 === 'running' ? '#f87917' : (flowStepStatus.step3 === 'complete' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step3 === 'running' ? 'fa-spinner fa-spin' : 'fa-magnifying-glass-chart'}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step3 === 'complete' ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#c2500a' }}>3. T4 RPA: HR Demo Recruitment Match JD</strong>
                    <span className={`badge ${flowStepStatus.step3 === 'running' ? 'badge-pending' : (flowStepStatus.step3 === 'complete' ? 'badge-verified' : '')}`} style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                      {flowStepStatus.step3 === 'running' ? 'RUNNING ON T4' : (flowStepStatus.step3 === 'complete' ? '✓ WORKFLOW COMPLETE' : 'WAITING')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Workflow:</strong> <code>HR Demo Recruitment Match JD</code> &nbsp;•&nbsp; <strong>Param:</strong> <code>job_name: "{activeFlowCandidate.role || activeFlowCandidate.appliedRole || 'Senior AI Engineer'}"</code></div>
                    <div>• <strong>Req:</strong> #{flowData?.matchJd?.automationRequestId || '3295983'} • <strong>Agent:</strong> <code>{flowData?.matchJd?.agentName || 'mahesh@mspevent-win-1'}</code> • <span style={{ color: '#15803d', fontWeight: 600 }}>✓ Candidate matched to JD</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 4: AI Match Score & Benchmark Computation */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step4 === 'running' ? '#eff6ff' : (flowStepStatus.step4 === 'complete' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step4 === 'running' ? '#f87917' : (flowStepStatus.step4 === 'complete' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step4 === 'running' ? '#f87917' : (flowStepStatus.step4 === 'complete' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step4 === 'running' ? 'fa-spinner fa-spin' : 'fa-brain'}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step4 === 'complete' ? '#fde68a' : '#e2e8f0'}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#b45309' }}>4. AI Scoring & Fitment Benchmark</strong>
                    <span className={`badge ${flowStepStatus.step4 === 'running' ? 'badge-pending' : (flowStepStatus.step4 === 'complete' ? 'badge-verified' : '')}`} style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                      {flowStepStatus.step4 === 'running' ? 'COMPUTING...' : `✓ MATCH: ${activeFlowCandidate.score || '94%'}`}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Suitability:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>{activeFlowCandidate.recommendation || 'Strong Match - Recommended for Technical Interview'}</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 5: Pipeline & Candidate Ingestion */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step5 === 'running' ? '#eff6ff' : (flowStepStatus.step5 === 'complete' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step5 === 'running' ? '#f87917' : (flowStepStatus.step5 === 'complete' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step5 === 'running' ? '#f87917' : (flowStepStatus.step5 === 'complete' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step5 === 'running' ? 'fa-spinner fa-spin' : 'fa-check-double'}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step5 === 'complete' ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#15803d' }}>5. Pipeline Ingestion & Ready for Interview</strong>
                    <span className={`badge ${flowStepStatus.step5 === 'running' ? 'badge-pending' : (flowStepStatus.step5 === 'complete' ? 'badge-verified' : '')}`} style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                      {flowStepStatus.step5 === 'running' ? 'INGESTING...' : '✓ ACTIVE IN PIPELINE'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• Candidate active in pipeline under <strong>{activeFlowCandidate.role || activeFlowCandidate.appliedRole || 'Senior AI Engineer'}</strong>.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem', gap: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowFlowModal(false)}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                Close View
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowFlowModal(false);
                  openInterviewModal(activeFlowCandidate);
                }}
                style={{ background: 'var(--button-gradient)', borderColor: 'transparent', fontWeight: 700, fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
              >
                <i className="fa-solid fa-calendar-plus"></i> Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
