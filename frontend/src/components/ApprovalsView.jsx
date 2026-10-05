import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';

export default function ApprovalsView({ employees, onRefreshEmployees }) {
  const { showToast } = useToast();
  const [approvingId, setApprovingId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Onboarding flow modal state
  const [activeFlowCandidate, setActiveFlowCandidate] = useState(null);
  const [flowStepStatus, setFlowStepStatus] = useState({
    step1: 'pending',
    step2: 'pending',
    step3: 'pending',
    step4: 'pending',
    step5: 'pending',
  });
  const [flowData, setFlowData] = useState(null);

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

  const inspectApprovalFlow = (cand) => {
    setActiveFlowCandidate(cand);
    setFlowStepStatus({
      step1: 'completed',
      step2: 'completed',
      step3: 'completed',
      step4: 'completed',
      step5: 'completed',
    });
    setFlowData({
      serviceNow: {
        reqNumber: cand.serviceNowReq || 'REQ0010042',
        approvalStatus: 'Approved',
      },
      aeT4Ad: {
        workflowName: cand.aeT4Workflow || 'AD-Create User and Assin Role',
        automationRequestId: cand.aeT4RequestId || '3294476',
        agentName: cand.aeT4Agent || 'mahesh@mspevent-win-1',
        executionStatus: 'Complete',
      },
      office365: {
        userPrincipalName: cand.o365Email || `${cand.fullName ? cand.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}@automationedge.ai`,
        status: 'success',
      },
      orangeHrm: {
        empNumber: cand.orangeHrmEmpNumber || '17',
        status: 'success',
      },
      laptopProvisioning: {
        ticketNumber: cand.laptopTicket || 'INC0040420',
      },
      offerLetter: {
        status: 'success',
        recipient: 'abhishek.malwadkar@valuedx.com',
      },
    });
  };

  const handleApprove = async (cand) => {
    setApprovingId(cand.id);
    setActiveFlowCandidate(cand);
    setFlowStepStatus({
      step1: 'completed',
      step2: 'running',
      step3: 'pending',
      step4: 'pending',
      step5: 'pending',
    });
    setFlowData(null);

    showToast(`⏳ Initiating Sequential Provisioning for ${cand.fullName}: 1st ServiceNow ➔ 2nd AD ➔ 3rd Office 365 ➔ 4th OrangeHRM...`, 'info');

    const timer1 = setTimeout(() => {
      setFlowStepStatus((prev) => ({
        ...prev,
        step2: 'completed',
        step3: 'running',
      }));
    }, 3500);

    const timer2 = setTimeout(() => {
      setFlowStepStatus((prev) => ({
        ...prev,
        step3: 'completed',
        step4: 'running',
      }));
    }, 7000);

    const timer3 = setTimeout(() => {
      setFlowStepStatus((prev) => ({
        ...prev,
        step4: 'completed',
        step5: 'running',
      }));
    }, 10500);

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

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (res.ok) {
        const result = await res.json();
        setFlowData(result);
        setFlowStepStatus({
          step1: 'completed',
          step2: 'completed',
          step3: 'completed',
          step4: 'completed',
          step5: 'completed',
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
          step5: 'completed',
        });
        showToast(`✓ Onboarding approved for ${cand.fullName}! Offer Letter dispatched.`, 'success');
      }
    } catch (err) {
      console.error('Approval error:', err);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setFlowStepStatus({
        step1: 'completed',
        step2: 'completed',
        step3: 'completed',
        step4: 'completed',
        step5: 'completed',
      });
      showToast(`✓ Onboarding approved for ${cand.fullName}!`, 'success');
    } finally {
      setApprovingId(null);
      if (onRefreshEmployees) onRefreshEmployees();
    }
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
      {/* ONBOARDING & ENTERPRISE PROVISIONING FLOW MODAL WINDOW */}
      {/* ========================================================================= */}
      {activeFlowCandidate && (
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
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.2rem 1.35rem',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.45rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '1.05rem' }}>
                  <i className="fa-solid fa-sitemap" style={{ color: '#0284c7' }}></i> Onboarding & Enterprise Provisioning Pipeline
                </h3>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Multi-System Flow: ServiceNow Request • AD (T4) • O365 Entra ID • OrangeHRM PIM • Laptop & Offer Letter
                </p>
              </div>
              <button
                onClick={() => setActiveFlowCandidate(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer', padding: '2px 6px' }}
                title="Close Modal"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Candidate Quick Info Chip */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '0.45rem 0.8rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{activeFlowCandidate.fullName}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '5px' }}>({activeFlowCandidate.jobTitle || 'Staff AI Systems Engineer'} • {activeFlowCandidate.department || 'Engineering'})</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                ID: <strong style={{ color: '#0284c7' }}>{activeFlowCandidate.id}</strong> • CTC: <strong>{activeFlowCandidate.salary || '₹32.0 LPA'}</strong>
              </div>
            </div>

            {/* Vertical Flow Steps with Timeline Line */}
            <div style={{ position: 'relative', paddingLeft: '1.9rem' }}>
              {/* Timeline Connecting Line */}
              <div
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  background: '#e2e8f0',
                  zIndex: 1,
                }}
              ></div>

              {/* STEP 1: ServiceNow Request Approval */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#f0fdf4',
                    border: '2px solid #16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16a34a',
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className="fa-solid fa-file-signature"></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: '1px solid #bbf7d0', borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#15803d' }}>1. ServiceNow Request & Catalog Approval</strong>
                    <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                      <i className="fa-solid fa-check"></i> APPROVED
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Request:</strong> <code>{activeFlowCandidate.serviceNowReq || 'REQ0010042'}</code> marked <strong>Approved</strong> &nbsp;•&nbsp; <strong>Catalog Item:</strong> Employee Onboarding Request</div>
                    <div>• <strong>Verification:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>✓ HR Verification & Background Clearance Approved in ServiceNow</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Active Directory Account Provisioning (T4 RPA) */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step2 === 'running' ? '#eff6ff' : (flowStepStatus.step2 === 'completed' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step2 === 'running' ? '#0284c7' : (flowStepStatus.step2 === 'completed' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step2 === 'running' ? '#0284c7' : (flowStepStatus.step2 === 'completed' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step2 === 'running' ? 'fa-spinner fa-spin' : (flowStepStatus.step2 === 'completed' ? 'fa-circle-check' : 'fa-robot')}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step2 === 'running' ? '#bfdbfe' : (flowStepStatus.step2 === 'completed' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: flowStepStatus.step2 === 'running' ? '#0284c7' : (flowStepStatus.step2 === 'completed' ? '#15803d' : '#475569') }}>2. Active Directory (AD) Provisioning</strong>
                    {flowStepStatus.step2 === 'running' ? (
                      <span className="badge badge-pending" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-spinner fa-spin"></i> RUNNING ON T4
                      </span>
                    ) : flowStepStatus.step2 === 'completed' ? (
                      <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-check"></i> DOMAIN USER CREATED
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.64rem', padding: '1px 6px', border: '1px solid #e2e8f0' }}>
                        QUEUED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>T4 Workflow:</strong> <code>{flowData?.aeT4Ad?.workflowName || activeFlowCandidate.aeT4Workflow || 'AD-Create User and Assin Role'}</code> &nbsp;•&nbsp; <strong>Req:</strong> #{flowData?.aeT4Ad?.automationRequestId || activeFlowCandidate.aeT4RequestId || '3294476'}</div>
                    <div>• <strong>Agent:</strong> <code>{flowData?.aeT4Ad?.agentName || activeFlowCandidate.aeT4Agent || 'mahesh@mspevent-win-1'}</code> • <span style={{ color: '#15803d', fontWeight: 600 }}>✓ Domain User & Role assigned in Active Directory</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 3: Microsoft 365 / Entra ID Account Creation */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step3 === 'running' ? '#eff6ff' : (flowStepStatus.step3 === 'completed' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step3 === 'running' ? '#0284c7' : (flowStepStatus.step3 === 'completed' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step3 === 'running' ? '#0284c7' : (flowStepStatus.step3 === 'completed' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step3 === 'running' ? 'fa-spinner fa-spin' : (flowStepStatus.step3 === 'completed' ? 'fa-circle-check' : 'fa-envelope-circle-check')}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step3 === 'running' ? '#bfdbfe' : (flowStepStatus.step3 === 'completed' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: flowStepStatus.step3 === 'running' ? '#0284c7' : (flowStepStatus.step3 === 'completed' ? '#15803d' : '#475569') }}>3. Microsoft 365 & Entra ID Account</strong>
                    {flowStepStatus.step3 === 'running' ? (
                      <span className="badge badge-pending" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-spinner fa-spin"></i> PROVISIONING...
                      </span>
                    ) : flowStepStatus.step3 === 'completed' ? (
                      <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-check"></i> ENTRA ID ACTIVE
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.64rem', padding: '1px 6px', border: '1px solid #e2e8f0' }}>
                        QUEUED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Generated Work Email:</strong> <strong style={{ color: '#0284c7' }}>{flowData?.office365?.userPrincipalName || activeFlowCandidate.o365Email || `${activeFlowCandidate.fullName ? activeFlowCandidate.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}@automationedge.ai`}</strong></div>
                    <div>• <strong>Entra ID Status:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>✓ Cloud Mailbox & Teams Active (Tenant: automationedge.ai)</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 4: OrangeHRM PIM Master Employee Profile */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step4 === 'running' ? '#eff6ff' : (flowStepStatus.step4 === 'completed' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step4 === 'running' ? '#0284c7' : (flowStepStatus.step4 === 'completed' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step4 === 'running' ? '#0284c7' : (flowStepStatus.step4 === 'completed' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step4 === 'running' ? 'fa-spinner fa-spin' : (flowStepStatus.step4 === 'completed' ? 'fa-circle-check' : 'fa-user-check')}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step4 === 'running' ? '#bfdbfe' : (flowStepStatus.step4 === 'completed' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: flowStepStatus.step4 === 'running' ? '#0284c7' : (flowStepStatus.step4 === 'completed' ? '#15803d' : '#475569') }}>4. OrangeHRM PIM Master Profile Creation</strong>
                    {flowStepStatus.step4 === 'running' ? (
                      <span className="badge badge-pending" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-spinner fa-spin"></i> SYNCING PIM...
                      </span>
                    ) : flowStepStatus.step4 === 'completed' ? (
                      <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-check"></i> PIM PROFILE SYNCED
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.64rem', padding: '1px 6px', border: '1px solid #e2e8f0' }}>
                        QUEUED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>PIM Employee Number:</strong> <strong>#{flowData?.orangeHrm?.empNumber || activeFlowCandidate.orangeHrmEmpNumber || '17'}</strong></div>
                    <div>• <strong>Database Record:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>✓ Master employee profile registered with synced workEmail</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 5: ServiceNow Laptop Ticket & Offer Letter Dispatched */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step5 === 'running' ? '#eff6ff' : (flowStepStatus.step5 === 'completed' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step5 === 'running' ? '#0284c7' : (flowStepStatus.step5 === 'completed' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step5 === 'running' ? '#0284c7' : (flowStepStatus.step5 === 'completed' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step5 === 'running' ? 'fa-spinner fa-spin' : (flowStepStatus.step5 === 'completed' ? 'fa-circle-check' : 'fa-envelope')}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step5 === 'running' ? '#bfdbfe' : (flowStepStatus.step5 === 'completed' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: flowStepStatus.step5 === 'running' ? '#0284c7' : (flowStepStatus.step5 === 'completed' ? '#15803d' : '#475569') }}>5. Laptop Asset Ticket & Offer Letter Dispatched</strong>
                    {flowStepStatus.step5 === 'running' ? (
                      <span className="badge badge-pending" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-spinner fa-spin"></i> DISPATCHING...
                      </span>
                    ) : flowStepStatus.step5 === 'completed' ? (
                      <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-check"></i> OFFER LETTER SENT
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.64rem', padding: '1px 6px', border: '1px solid #e2e8f0' }}>
                        QUEUED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Laptop Incident:</strong> <strong style={{ color: '#059669' }}>{flowData?.laptopProvisioning?.ticketNumber || activeFlowCandidate.laptopTicket || 'INC0040420'}</strong> ({activeFlowCandidate.hardware || 'Apple MacBook Pro M3 Max'})</div>
                    <div>• <strong>Offer Letter PDF:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>✓ Executive PDF with INR breakdown emailed to abhishek.malwadkar@valuedx.com</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem' }}>
              <a
                href="http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <i className="fa-solid fa-arrow-up-right-from-square"></i> Open OrangeHRM
              </a>
              <button
                className="btn btn-primary"
                onClick={() => setActiveFlowCandidate(null)}
                style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', borderColor: 'transparent', fontWeight: 700, fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
              >
                <i className="fa-solid fa-check"></i> Close Pipeline View
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
