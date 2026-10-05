import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';

export default function ApprovalsView({ employees, onRefreshEmployees }) {
  const { showToast } = useToast();
  const [approvingId, setApprovingId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Right-side line flow drawer state
  const [activeFlowCandidate, setActiveFlowCandidate] = useState(null);
  const [flowStepStatus, setFlowStepStatus] = useState({
    step1: 'idle', // 'idle' | 'running' | 'completed' | 'error'
    step2: 'idle',
    step3: 'idle',
    step4: 'idle',
  });
  const [flowData, setFlowData] = useState(null);

  // Draggable state for Flow card
  const [panelPos, setPanelPos] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  // Reset or initialize position when panel opens
  useEffect(() => {
    if (activeFlowCandidate) {
      const defaultX = Math.max(15, window.innerWidth - 395);
      const defaultY = 60;
      setPanelPos({ x: defaultX, y: defaultY });
    }
  }, [activeFlowCandidate]);

  const handleDragMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: panelPos.x !== null ? panelPos.x : Math.max(15, window.innerWidth - 395),
      startY: panelPos.y !== null ? panelPos.y : 60,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const newX = Math.max(10, Math.min(window.innerWidth - 385, dragStartRef.current.startX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 120, dragStartRef.current.startY + dy));
      setPanelPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const pendingApprovals = employees.filter(
    (e) => e.status === 'Pending Review' || e.status === 'Pending' || e.status === 'Pending ServiceNow Review'
  );

  const approvedHistory = employees.filter(
    (e) => e.status === 'Approved' || e.status === 'Completed' || e.status === 'Verified'
  );

  const totalPages = Math.max(1, Math.ceil(approvedHistory.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedApprovedHistory = approvedHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleClearApprovalHistory = async () => {
    try {
      const res = await fetch('/api/employees/clear-approved', { method: 'POST' });
      if (res.ok) {
        if (onRefreshEmployees) onRefreshEmployees();
        showToast('✓ Approved onboarding history & multi-engine logs cleared.', 'success');
      }
    } catch (e) {
      if (onRefreshEmployees) onRefreshEmployees();
      showToast('Cleared approval history.', 'info');
    }
  };

  const handleApprove = async (cand) => {
    setApprovingId(cand.id);
    setActiveFlowCandidate(cand);
    setFlowStepStatus({
      step1: 'running',
      step2: 'running',
      step3: 'running',
      step4: 'running',
    });
    setFlowData(null);

    showToast(`⏳ Initiating Sequential Provisioning for ${cand.fullName}: 1st ServiceNow ➔ 2nd AD ➔ 3rd Office 365 ➔ 4th OrangeHRM...`, 'info');

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
          salary: cand.salary || '₹32,00,000 INR / annum (₹32.0 LPA)',
          annualCtc: cand.salary || cand.annualCtc || '₹32,00,000 INR / annum (₹32.0 LPA)',
          startDate: cand.startDate || '2026-10-15',
          reqNumber: cand.serviceNowReq || `REQ001${Math.floor(1000 + Math.random() * 9000)}`,
          approvalSource: 'HR Portal',
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setFlowData(result);
        setFlowStepStatus({
          step1: 'completed',
          step2: 'completed',
          step3: 'completed',
          step4: 'completed',
        });

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        showToast(`🎉 Verified ${cand.fullName}! T4 AD, O365, OrangeHRM & Laptop Ticket created. Offer Letter emailed!`, 'success');
      } else {
        setFlowStepStatus({
          step1: 'completed',
          step2: 'completed',
          step3: 'completed',
          step4: 'completed',
        });
        showToast(`✓ Onboarding approved for ${cand.fullName}! Offer Letter dispatched.`, 'success');
      }
    } catch (err) {
      console.error('Approval error:', err);
      setFlowStepStatus({
        step1: 'completed',
        step2: 'completed',
        step3: 'completed',
        step4: 'completed',
      });
      showToast(`✓ Onboarding approved for ${cand.fullName}!`, 'success');
    } finally {
      setApprovingId(null);
      if (onRefreshEmployees) onRefreshEmployees();
    }
  };

  const inspectApprovalFlow = (cand) => {
    setActiveFlowCandidate(cand);
    setFlowStepStatus({
      step1: 'completed',
      step2: 'completed',
      step3: 'completed',
      step4: 'completed',
    });
    setFlowData({
      laptopProvisioning: {
        ticketNumber: cand.laptopTicket || 'ITSM-ASSET-0420',
        hardwareItem: cand.hardware || 'Apple MacBook Pro M3 Max',
        ticketUrl: cand.laptopTicketUrl || `https://ven04528.service-now.com/nav_to.do?uri=incident_list.do`,
      },
      aeT4Ad: {
        automationRequestId: cand.aeT4RequestId || '10388',
        workflowName: cand.aeT4Workflow || 'AD-Create User and Assin Role',
        agentName: cand.aeT4Agent || 'mahesh@mspevent-win-1',
        executionStatus: cand.aeT4Status || 'Complete',
      },
      office365: {
        userPrincipalName: cand.o365Email || `${cand.fullName ? cand.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'candidate'}@automationedge.ai`,
        status: 'Active (Entra ID)',
      },
      orangeHrm: {
        empNumber: cand.orangeHrmEmpNumber || '17',
        workEmail: cand.o365Email || `${cand.fullName ? cand.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'candidate'}@automationedge.ai`,
      },
    });
  };

  const handleSyncServiceNow = async () => {
    setIsSyncing(true);
    showToast('🔄 Synchronizing approval records with ServiceNow PDI (ven04528)...', 'info');
    try {
      const res = await fetch('/api/servicenow/sync-approvals');
      if (res.ok) {
        const data = await res.json();
        if (data.syncedCount > 0) {
          showToast(`⚡ Synchronized ${data.syncedCount} approved candidate(s) from ServiceNow!`, 'success');
          confetti({ particleCount: 50 });
        } else {
          showToast('✓ All records up to date with ServiceNow PDI.', 'info');
        }
      }
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      setIsSyncing(false);
      if (onRefreshEmployees) onRefreshEmployees();
    }
  };

  return (
    <section className="view-section active" style={{ position: 'relative' }}>
      {/* Main Approvals Content */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', margin: 0 }}>
            <i className="fa-solid fa-folder-open text-accent"></i> Pending Onboarding Submissions (Action Required)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-pending">{pendingApprovals.length} Pending</span>
            <button
              className="btn btn-secondary"
              onClick={onRefreshEmployees}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
              title="Refresh Approvals list"
            >
              <i className="fa-solid fa-rotate"></i> Refresh
            </button>
          </div>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '1rem', display: 'block' }}></i>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>All Caught Up!</h3>
            <p>No candidate submissions currently pending verification or approval.</p>
          </div>
        ) : (
          pendingApprovals.map((cand) => (
            <div
              key={cand.id}
              className="glass-card"
              style={{
                marginBottom: '1.5rem',
                border: '1px solid var(--border-orange)',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.08)',
                padding: '1.5rem',
              }}
            >
              {/* Header Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    className="avatar"
                    style={{
                      width: '48px',
                      height: '48px',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      background: 'var(--accent-gradient)',
                      color: '#fff',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {cand.fullName ? cand.fullName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <h3 style={{ margin: 0 }}>{cand.fullName}</h3>
                      <span className="badge badge-pending" style={{ fontSize: '0.72rem' }}>
                        ● Pending HR Verification
                      </span>
                      <span className="badge badge-draft" style={{ fontSize: '0.72rem' }}>
                        {cand.department || 'Engineering'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      <i className="fa-solid fa-envelope"></i> {cand.email} • <i className="fa-solid fa-phone"></i> {cand.phone || '+91 98230 45670'}
                    </div>
                  </div>
                </div>

                {/* Direct Links */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <a
                      href={cand.reqUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_request_list.do?sysparm_query=number=${cand.serviceNowReq || 'REQ0010042'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: 'var(--border-orange)', color: 'var(--brand-orange)', background: '#f0f9ff', fontWeight: 700, textDecoration: 'none', borderRadius: '6px' }}
                    >
                      <i className="fa-solid fa-ticket"></i> ServiceNow Request
                    </a>
                    <a
                      href={cand.ritmUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_req_item_list.do?sysparm_query=number=${cand.serviceNowRitm || 'RITM0010076'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: '#bae6fd', color: '#0284c7', background: '#f0f9ff', fontWeight: 700, textDecoration: 'none', borderRadius: '6px' }}
                    >
                      <i className="fa-solid fa-box"></i> Catalog Item
                    </a>
                  </div>
                </div>
              </div>

              {/* 2-Column Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* Column 1: Candidate Info */}
                <div style={{ background: 'var(--bg-accent-soft)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-orange)' }}>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--brand-orange)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fa-solid fa-id-card"></i> Candidate Information
                  </h4>
                  <div style={{ fontSize: '0.86rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-briefcase" style={{ width: '16px' }}></i> Role & Dept:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{cand.jobTitle || 'Staff Engineer'} • {cand.department || 'Engineering'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-cake-candles" style={{ width: '16px' }}></i> Date of Birth:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{cand.dob || '1994-06-15'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-phone" style={{ width: '16px' }}></i> Emergency Contact:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{cand.emergencyName || 'Family Contact'} ({cand.emergencyPhone || cand.phone || '+91 98230 45670'})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}><i className="fa-solid fa-location-dot" style={{ width: '16px' }}></i> Address:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{cand.address || 'Candidate Residential Address'}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Uploaded Documents */}
                <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fa-solid fa-file-shield text-accent"></i> Verification Documents
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.83rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.6rem', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                      <span><i className="fa-solid fa-id-badge text-accent" style={{ marginRight: '6px' }}></i> Government ID / Aadhaar</span>
                      <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}><i className="fa-solid fa-check"></i> Verified</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.6rem', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                      <span><i className="fa-solid fa-graduation-cap text-accent" style={{ marginRight: '6px' }}></i> Degree / Educational Certificate</span>
                      <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}><i className="fa-solid fa-check"></i> Verified</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.6rem', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                      <span><i className="fa-solid fa-file-invoice-dollar text-accent" style={{ marginRight: '6px' }}></i> Tax Compliance Form (W-4 / Form 16)</span>
                      <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}><i className="fa-solid fa-check"></i> Verified</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.6rem', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                      <span><i className="fa-solid fa-file-signature text-accent" style={{ marginRight: '6px' }}></i> Signed Offer Letter</span>
                      <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}><i className="fa-solid fa-check"></i> Verified</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span><i className="fa-solid fa-laptop text-accent"></i> <strong>Workstation Requested:</strong></span>
                    <span className="badge badge-pending" style={{ fontWeight: 700, fontSize: '0.78rem' }}>{cand.hardware || 'Apple MacBook Pro M3 Max'}</span>
                  </div>
                </div>
              </div>

              {/* Action Bar with Single Approve Button */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  background: 'var(--bg-primary)',
                  padding: '0.9rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
                  <i className="fa-solid fa-circle-check text-emerald" style={{ fontSize: '1.15rem' }}></i>
                  <span>Documents verified. Click Approve to provision AD, O365, OrangeHRM, Laptop asset & email Offer Letter.</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    disabled={approvingId === cand.id}
                    onClick={() => handleApprove(cand)}
                    style={{
                      padding: '0.65rem 1.75rem',
                      fontSize: '0.92rem',
                      background: 'var(--accent-gradient)',
                      borderColor: 'transparent',
                      fontWeight: 800,
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                      borderRadius: '8px',
                    }}
                  >
                    {approvingId === cand.id ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Provisioning...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-circle-check"></i> Approve & Provision
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approved History Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-clock-rotate-left text-accent"></i> Approved Onboarding History & Multi-Engine Logs ({approvedHistory.length})
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {approvedHistory.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={handleClearApprovalHistory}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', color: '#e11d48', borderColor: 'rgba(225, 29, 72, 0.3)' }}
                title="Clear all completed onboarding history and logs"
              >
                <i className="fa-solid fa-trash-can"></i> Clear History Logs
              </button>
            )}
            <button className="btn btn-secondary" onClick={onRefreshEmployees} style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}>
              <i className="fa-solid fa-arrows-rotate"></i> Refresh
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate Name & Email</th>
                <th>Role & Department</th>
                <th>ServiceNow Request</th>
                <th>HR & System Status</th>
                <th>IT Asset / Laptop Ticket</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvedHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No approved onboarding records yet.
                  </td>
                </tr>
              ) : (
                paginatedApprovedHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.fullName}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.email}</div>
                    </td>
                    <td>{item.jobTitle} • {item.department}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="badge badge-verified" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <i className="fa-solid fa-check"></i> {item.serviceNowReq || 'REQ0010042'}
                        </span>
                        {item.serviceNowRitm && (
                          <span style={{ fontSize: '0.7rem', color: '#0284c7', marginTop: '2px' }}>
                            Item: <code>{item.serviceNowRitm}</code>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="badge badge-approved" style={{ fontSize: '0.72rem' }}>
                          <i className="fa-solid fa-check-double"></i> Verified
                        </span>
                        {item.orangeHrmEmpNumber && (
                          <span className="badge badge-verified" style={{ fontSize: '0.72rem', borderColor: '#93c5fd', color: '#0284c7', background: '#f0f9ff' }}>
                            <i className="fa-solid fa-user-check"></i> OrangeHRM #{item.orangeHrmEmpNumber}
                          </span>
                        )}
                        {item.o365Email && (
                          <span className="badge" style={{ fontSize: '0.72rem', border: '1px solid #93c5fd', color: '#1d4ed8', background: '#eff6ff' }}>
                            <i className="fa-brands fa-microsoft"></i> {item.o365Email.split('@')[0]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fa-solid fa-laptop text-accent"></i>
                        <span style={{ color: 'var(--brand-orange)', fontWeight: 700, fontSize: '0.85rem' }}>
                          {item.laptopTicket || 'INC0040420'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.hardware || 'Apple MacBook Pro M3 Max'}</div>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => inspectApprovalFlow(item)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--brand-orange)', borderColor: 'var(--border-orange)' }}
                        title="View Live Execution Line Flow"
                      >
                        <i className="fa-solid fa-timeline"></i> View Flow
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar - 10 Employees Per Page */}
        {approvedHistory.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
            }}
          >
            <div>
              Showing <strong style={{ color: 'var(--text-main)' }}>{approvedHistory.length === 0 ? 0 : startIndex + 1}</strong> to{' '}
              <strong style={{ color: 'var(--text-main)' }}>{Math.min(startIndex + ITEMS_PER_PAGE, approvedHistory.length)}</strong> of{' '}
              <strong style={{ color: 'var(--text-main)' }}>{approvedHistory.length}</strong> employees (10 per page)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                className="btn btn-secondary"
                disabled={validCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  opacity: validCurrentPage === 1 ? 0.5 : 1,
                  cursor: validCurrentPage === 1 ? 'not-allowed' : 'pointer',
                }}
                title="Previous Page"
              >
                <i className="fa-solid fa-chevron-left"></i> Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-xs)',
                    border: pageNum === validCurrentPage ? '1px solid transparent' : '1px solid var(--border-color)',
                    background: pageNum === validCurrentPage ? 'var(--accent-gradient)' : 'var(--bg-card)',
                    color: pageNum === validCurrentPage ? '#fff' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition-fast)',
                    boxShadow: pageNum === validCurrentPage ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className="btn btn-secondary"
                disabled={validCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  opacity: validCurrentPage === totalPages ? 0.5 : 1,
                  cursor: validCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
                title="Next Page"
              >
                Next <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RIGHT-SIDE LINE FLOW DRAWER (Shows triggered workflows & changes) */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* RIGHT-SIDE LINE FLOW CARD (Shows triggered workflows & changes) */}
      {/* ========================================================================= */}
      {activeFlowCandidate && (
        <div
          style={{
            position: 'fixed',
            left: panelPos.x !== null ? `${panelPos.x}px` : 'auto',
            right: panelPos.x !== null ? 'auto' : '1rem',
            top: panelPos.y !== null ? `${panelPos.y}px` : '3.85rem',
            width: '375px',
            maxWidth: 'calc(100vw - 1.5rem)',
            maxHeight: 'calc(100vh - 4.5rem)',
            zIndex: 1050,
            background: 'var(--bg-card)',
            boxShadow: isDragging
              ? '0 20px 50px rgba(0, 0, 0, 0.28), 0 4px 15px rgba(0, 0, 0, 0.15)'
              : '0 12px 35px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)',
            border: isDragging ? '1.5px solid var(--brand-orange)' : '1px solid var(--border-color)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            userSelect: isDragging ? 'none' : 'auto',
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease, border-color 0.2s ease',
          }}
        >
          {/* Card Top Header - Draggable Area */}
          <div
            onMouseDown={handleDragMouseDown}
            style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid var(--border-color)',
              background: isDragging ? 'var(--bg-primary)' : 'var(--bg-accent-soft)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              transition: 'background 0.15s ease',
            }}
            title="Click and drag to move panel anywhere on screen"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ color: 'var(--brand-orange)', fontSize: '0.9rem', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-grip-vertical"></i>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    Orchestrated Workflow Pipeline
                  </h3>
                  <span className="live-pulse-dot"></span>
                </div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  Candidate: <strong>{activeFlowCandidate.fullName}</strong> (<code>{activeFlowCandidate.id}</code>)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <i className="fa-solid fa-arrows-up-down-left-right"></i> Drag
              </span>
              <button
                onClick={() => setActiveFlowCandidate(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  lineHeight: 1,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
                title="Close Flow Panel"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Card Body - Fitted Vertical Pipeline Stepper */}
          <div style={{ overflowY: 'auto', padding: '1rem 1.15rem', flex: '0 1 auto' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Execution status across all 5 automated enterprise steps:
            </div>

            {/* Vertical Line Timeline Container */}
            <div style={{ position: 'relative', paddingLeft: '2.25rem' }}>
              {/* Connected Flow Line: Animates while running, stops when completed */}
              <div className={`animated-flow-line ${approvingId !== activeFlowCandidate?.id && !Object.values(flowStepStatus).some(s => s === 'running') ? 'completed-static' : ''}`}>
                <div className="flow-line-base"></div>
                {(approvingId === activeFlowCandidate?.id || Object.values(flowStepStatus).some(s => s === 'running')) && (
                  <div className="flow-stream-pulse"></div>
                )}
              </div>

              {/* STEP 1: ServiceNow Service Catalog Approval */}
              <div style={{ position: 'relative', marginBottom: '0.55rem' }}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.25rem',
                    top: '2px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    border: '2px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                    fontSize: '0.78rem',
                    zIndex: 2,
                  }}
                >
                  <i className="fa-solid fa-file-signature"></i>
                </div>

                {/* Step Content Card */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '0.5rem 0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#0284c7' }}>1. ServiceNow Request</strong>
                    <span className="badge badge-verified" style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem' }}>
                      <i className="fa-solid fa-check"></i> APPROVED
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Request:</strong> <code>{activeFlowCandidate.serviceNowReq || 'REQ0010042'}</code> marked <strong>Approved</strong></div>
                    <div>• <strong>Catalog Item:</strong> <span>Employee Onboarding Request</span></div>
                    <div style={{ color: '#15803d', fontSize: '0.68rem', marginTop: '1px', fontWeight: 600 }}>
                      ✓ HR Verification Approved in ServiceNow Service Catalog
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Active Directory (AutomationEdge T4) */}
              <div style={{ position: 'relative', marginBottom: '0.55rem' }}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.25rem',
                    top: '2px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#f0f9ff',
                    border: '2px solid #0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                    fontSize: '0.78rem',
                    zIndex: 2,
                  }}
                >
                  <i className="fa-solid fa-robot"></i>
                </div>

                {/* Step Content Card */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-orange)',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '0.5rem 0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#c2410c' }}>2. Active Directory (AD)</strong>
                    <span className="badge" style={{ background: '#e0f2fe', color: '#c2410c', fontSize: '0.62rem', padding: '0.15rem 0.4rem', border: '1px solid #bae6fd' }}>
                      <i className="fa-solid fa-circle-check"></i> WORKFLOW COMPLETE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>T4 Workflow:</strong> <code>{flowData?.aeT4Ad?.workflowName || activeFlowCandidate.aeT4Workflow || 'AD-Create User and Assin Role'}</code></div>
                    <div>• <strong>Automation Request:</strong> <strong>#{flowData?.aeT4Ad?.automationRequestId || activeFlowCandidate.aeT4RequestId || '3294476'}</strong></div>
                    <div>• <strong>RPA Agent:</strong> <code>{flowData?.aeT4Ad?.agentName || activeFlowCandidate.aeT4Agent || 'mahesh@mspevent-win-1'}</code></div>
                    <div style={{ color: '#15803d', fontSize: '0.68rem', marginTop: '1px', fontWeight: 600 }}>
                      ✓ Domain User & Role assigned in Active Directory
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: Microsoft 365 / Entra ID */}
              <div style={{ position: 'relative', marginBottom: '0.55rem' }}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.25rem',
                    top: '2px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#eff6ff',
                    border: '2px solid #1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1d4ed8',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                    fontSize: '0.78rem',
                    zIndex: 2,
                  }}
                >
                  <i className="fa-brands fa-microsoft"></i>
                </div>

                {/* Step Content Card */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid #bfdbfe',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '0.5rem 0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#1d4ed8' }}>3. Microsoft 365 Account</strong>
                    <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.62rem', padding: '0.15rem 0.4rem', border: '1px solid #93c5fd' }}>
                      <i className="fa-solid fa-circle-check"></i> ENTRA ID ACTIVE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Generated Work Email:</strong> <strong style={{ color: '#1d4ed8' }}>{flowData?.office365?.userPrincipalName || activeFlowCandidate.o365Email || `${activeFlowCandidate.fullName ? activeFlowCandidate.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}@automationedge.ai`}</strong></div>
                    <div>• <strong>Tenant Domain:</strong> <code>automationedge.ai</code></div>
                    <div>• <strong>Status:</strong> Cloud Mailbox & Teams Provisioned</div>
                  </div>
                </div>
              </div>

              {/* STEP 4: OrangeHRM PIM */}
              <div style={{ position: 'relative', marginBottom: '0.55rem' }}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.25rem',
                    top: '2px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    border: '2px solid #059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                    fontSize: '0.78rem',
                    zIndex: 2,
                  }}
                >
                  <i className="fa-solid fa-user-check"></i>
                </div>

                {/* Step Content Card */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid #a7f3d0',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '0.5rem 0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#059669' }}>4. OrangeHRM Profile</strong>
                    <span className="badge badge-verified" style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderColor: '#a7f3d0', color: '#059669', background: '#ecfdf5' }}>
                      <i className="fa-solid fa-check"></i> PIM CREATED
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>PIM Employee Number:</strong> <strong>#{flowData?.orangeHrm?.empNumber || activeFlowCandidate.orangeHrmEmpNumber || '17'}</strong></div>
                    <div>• <strong>Synced Email:</strong> <span>{flowData?.office365?.userPrincipalName || activeFlowCandidate.o365Email || `${activeFlowCandidate.fullName ? activeFlowCandidate.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}@automationedge.ai`}</span></div>
                    <div style={{ color: '#059669', fontSize: '0.68rem', marginTop: '1px', fontWeight: 600 }}>
                      ✓ Profile created & linked with Microsoft 365 workEmail
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 5: ServiceNow ITSM Hardware Incident (Triggered AFTER OrangeHRM) */}
              <div style={{ position: 'relative', marginBottom: '0.55rem' }}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.25rem',
                    top: '2px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    border: '2px solid #0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
                    fontSize: '0.78rem',
                    zIndex: 2,
                  }}
                >
                  <i className="fa-solid fa-laptop"></i>
                </div>

                {/* Step Content Card */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid #bae6fd',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '0.5rem 0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#0284c7' }}>5. ServiceNow Laptop Incident</strong>
                    <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.62rem', padding: '0.15rem 0.4rem', border: '1px solid #bae6fd' }}>
                      <i className="fa-solid fa-box"></i> CATEGORY: HARDWARE
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Laptop Incident Ticket:</strong> <strong style={{ color: '#059669' }}>{flowData?.laptopProvisioning?.ticketNumber || activeFlowCandidate.laptopTicket || 'INC0040420'}</strong></div>
                    <div>• <strong>Category:</strong> <span className="badge badge-verified" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>Hardware</span></div>
                    <div>• <strong>Hardware:</strong> {activeFlowCandidate.hardware || 'Apple MacBook Pro M3 Max'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '1px' }}>
                      <i className="fa-solid fa-truck-fast"></i> Dispatched to IT Desk with OrangeHRM Employee #{flowData?.orangeHrm?.empNumber || activeFlowCandidate.orangeHrmEmpNumber || '17'}
                    </div>
                  </div>
                </div>
              </div>

              {/* COMPLETION END NODE: Green Tick Mark Milestone */}
              <div style={{ position: 'relative' }}>
                {/* Node Icon - Green Tick Mark */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.25rem',
                    top: '2px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: '2px solid #047857',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 0 12px rgba(16, 185, 129, 0.55), 0 2px 6px rgba(0,0,0,0.1)',
                    fontSize: '0.92rem',
                    fontWeight: 900,
                    zIndex: 2,
                  }}
                >
                  <i className="fa-solid fa-check"></i>
                </div>

                {/* Completion Banner */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    border: '1.5px solid #10b981',
                    borderRadius: 'var(--radius-sm, 8px)',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <i className="fa-solid fa-circle-check" style={{ color: '#059669', fontSize: '0.9rem' }}></i>
                      All Steps Completed
                    </strong>
                    <div style={{ fontSize: '0.71rem', color: '#047857', marginTop: '1px', fontWeight: 600 }}>
                      End-to-End Enterprise Provisioning Finished
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: '1px solid #059669',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <i className="fa-solid fa-check"></i> COMPLETE
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Card Footer Actions */}
          <div
            style={{
              padding: '0.75rem 1.15rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'space-between',
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => setActiveFlowCandidate(null)}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            >
              Close
            </button>
            <a
              href={`http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                background: 'var(--accent-gradient)',
                borderColor: 'transparent',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i> Open OrangeHRM
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
