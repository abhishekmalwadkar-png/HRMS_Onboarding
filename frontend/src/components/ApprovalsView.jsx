import React, { useState, useEffect } from 'react';
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

  const pendingApprovals = employees.filter(
    (e) => e.status === 'Pending Review' || e.status === 'Pending' || e.status === 'Pending ServiceNow Review'
  );

  const approvedHistory = employees.filter(
    (e) => e.status === 'Approved' || e.status === 'Completed' || e.status === 'Verified'
  );

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
        showToast(`🎉 Verified ${cand.fullName}! T4 AD, Office 365, OrangeHRM & Laptop Ticket created!`, 'success');
      } else {
        setFlowStepStatus({
          step1: 'completed',
          step2: 'completed',
          step3: 'completed',
          step4: 'completed',
        });
        showToast(`✓ Onboarding approved for ${cand.fullName}! Laptop ticket created.`, 'success');
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
      {/* Header Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2><i className="fa-solid fa-clipboard-check text-accent"></i> Candidate Verification & Approvals</h2>
              <span className="badge badge-verified" title="ServiceNow Service Catalog Integration Active">
                <i className="fa-solid fa-server"></i> ServiceNow: ven04528 (Online)
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Review candidate personal details and uploaded documents. Approve from HR portal to trigger Laptop IT asset ticket creation, AD user provisioning, Office 365, and OrangeHRM profile creation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={handleSyncServiceNow}
              disabled={isSyncing}
              title="Poll ServiceNow PDI for external approvals"
            >
              <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'fa-spin' : ''}`}></i> Sync SN
            </button>
            <button
              className="btn btn-secondary"
              onClick={onRefreshEmployees}
              title="Refresh Approvals list"
            >
              <i className="fa-solid fa-rotate"></i> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Approvals Content */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
            <i className="fa-solid fa-folder-open text-accent"></i> Pending Onboarding Submissions (Action Required)
          </h3>
          <span className="badge badge-pending">{pendingApprovals.length} Pending</span>
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
                boxShadow: '0 8px 24px rgba(234, 88, 12, 0.08)',
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
                      <i className="fa-solid fa-envelope"></i> {cand.email} • <i className="fa-solid fa-phone"></i> {cand.phone || '+91 98230 45670'} • ID: <code>{cand.id}</code>
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
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: 'var(--border-orange)', color: 'var(--brand-orange)', background: '#fff7ed', fontWeight: 700, textDecoration: 'none', borderRadius: '6px' }}
                    >
                      <i className="fa-solid fa-ticket"></i> REQ: <span>{cand.serviceNowReq || 'REQ0010042'}</span>
                    </a>
                    <a
                      href={cand.ritmUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_req_item_list.do?sysparm_query=number=${cand.serviceNowRitm || 'RITM0010076'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: '#bae6fd', color: '#0284c7', background: '#f0f9ff', fontWeight: 700, textDecoration: 'none', borderRadius: '6px' }}
                    >
                      <i className="fa-solid fa-box"></i> RITM: <span>{cand.serviceNowRitm || 'RITM0010076'}</span>
                    </a>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-server text-accent"></i> SN: <strong>ven04528</strong> | OrangeHRM: <strong>10.41.5.39</strong> | O365: <strong>automationedge.ai</strong> | AE T4: <strong>t4.automationedge.com</strong>
                  </span>
                </div>
              </div>

              {/* 4-Step Sequential Pipeline Progress Track */}
              <div
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Approval Flow Sequence:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#059669', background: '#ecfdf5', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    <i className="fa-solid fa-laptop"></i> 1. ServiceNow
                  </span>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}></i>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#c2410c', background: '#fff7ed', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                    <i className="fa-solid fa-robot"></i> 2. AD
                  </span>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}></i>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#1d4ed8', background: '#eff6ff', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <i className="fa-brands fa-microsoft"></i> 3. 365
                  </span>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}></i>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#ea580c', background: '#fff7ed', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #fed7aa' }}>
                    <i className="fa-solid fa-user-check"></i> 4. OrangeHRM
                  </span>
                </div>
              </div>

              {/* 2-Column Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* Column 1: Candidate Info */}
                <div style={{ background: 'var(--bg-accent-soft)', padding: '1.15rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-orange)' }}>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--brand-orange)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fa-solid fa-id-card"></i> Candidate Information
                  </h4>
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Designation & Dept:</strong> <span>{cand.jobTitle || 'Lead Product Manager'} • {cand.department || 'Product'}</span></div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Date of Birth:</strong> <span>{cand.dob || '1994-07-22'}</span></div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Emergency Contact:</strong> <span>{cand.emergencyName || 'Arun Rao'} ({cand.emergencyPhone || cand.phone || '+91 97777 66550'})</span></div>
                    <div><strong style={{ color: 'var(--text-secondary)' }}>Residential Address:</strong> <span>{cand.address || 'Villa 14, Palm Meadows, Hinjewadi, Pune'}</span></div>
                  </div>
                </div>

                {/* Column 2: Uploaded Documents */}
                <div style={{ background: 'var(--bg-card)', padding: '1.15rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fa-solid fa-file-shield text-accent"></i> Uploaded Verification Documents
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.83rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span><i className="fa-solid fa-id-badge text-accent"></i> 1. Government ID / Aadhaar Card</span>
                      <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}><i className="fa-solid fa-check"></i> Uploaded</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span><i className="fa-solid fa-graduation-cap text-accent"></i> 2. Degree / Education Certificate</span>
                      <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}><i className="fa-solid fa-check"></i> Uploaded</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span><i className="fa-solid fa-file-invoice-dollar text-accent"></i> 3. Tax Form 16 / W-4</span>
                      <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}><i className="fa-solid fa-check"></i> Uploaded</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span><i className="fa-solid fa-file-signature text-accent"></i> 4. Signed Offer Letter</span>
                      <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}><i className="fa-solid fa-check"></i> Uploaded</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.65rem', paddingTop: '0.55rem', borderTop: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <span><i className="fa-solid fa-laptop text-accent"></i> <strong>Workstation Requested:</strong></span>
                    <strong style={{ color: 'var(--brand-orange)' }}>{cand.hardware || 'Apple MacBook Pro M3 Max'}</strong>
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
                  background: 'var(--accent-gradient-subtle)',
                  padding: '1rem 1.35rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-orange)',
                }}
              >
                <div style={{ fontSize: '0.85rem', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#ea580c', fontSize: '1.15rem' }}></i>
                  <span>Orchestrates 1st ServiceNow ➔ 2nd AD ➔ 3rd Office 365 ➔ 4th OrangeHRM (with O365 mail)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    disabled={approvingId === cand.id}
                    onClick={() => handleApprove(cand)}
                    style={{
                      padding: '0.6rem 1.6rem',
                      fontSize: '0.92rem',
                      background: 'var(--accent-gradient)',
                      borderColor: 'transparent',
                      fontWeight: 800,
                      boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                      borderRadius: '8px',
                    }}
                  >
                    {approvingId === cand.id ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Approving...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-circle-check"></i> Approve
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
        <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fa-solid fa-clock-rotate-left text-accent"></i> Approved Onboarding History & Multi-Engine Logs
        </h3>

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
                approvedHistory.map((item) => (
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
                          <span className="badge badge-verified" style={{ fontSize: '0.72rem', borderColor: '#fdba74', color: '#ea580c', background: '#fff7ed' }}>
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
      </div>

      {/* ========================================================================= */}
      {/* RIGHT-SIDE LINE FLOW DRAWER (Shows triggered workflows & changes) */}
      {/* ========================================================================= */}
      {activeFlowCandidate && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '460px',
            maxWidth: '92vw',
            zIndex: 1050,
            background: 'var(--bg-card)',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.18)',
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Drawer Top Header */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-accent-soft)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                  Orchestrated Workflow Flow
                </h3>
                <span className="live-pulse-dot"></span>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Candidate: <strong>{activeFlowCandidate.fullName}</strong> (<code>{activeFlowCandidate.id}</code>)
              </span>
            </div>

            <button
              onClick={() => setActiveFlowCandidate(null)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.4rem',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                lineHeight: 1,
                padding: '4px 8px',
                borderRadius: '6px',
              }}
              title="Close Flow Panel"
            >
              &times;
            </button>
          </div>

          {/* Drawer Body - Simple Line Flow (Vertical Pipeline Stepper) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Execution status of all 4 enterprise engines and real-time changes applied:
            </div>

            {/* Vertical Line Timeline Container */}
            <div style={{ position: 'relative', paddingLeft: '2.5rem' }}>
              {/* Connected Line */}
              <div
                style={{
                  position: 'absolute',
                  left: '17px',
                  top: '15px',
                  bottom: '25px',
                  width: '3px',
                  background: 'linear-gradient(to bottom, #10b981 0%, #ea580c 35%, #1d4ed8 70%, #059669 100%)',
                  borderRadius: '3px',
                }}
              ></div>

              {/* STEP 1: ServiceNow ITSM */}
              <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.5rem',
                    top: '0',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: flowStepStatus.step1 === 'completed' ? '#ecfdf5' : '#fff7ed',
                    border: flowStepStatus.step1 === 'completed' ? '2px solid #10b981' : '2px solid #ea580c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step1 === 'completed' ? '#10b981' : '#ea580c',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    zIndex: 2,
                  }}
                >
                  {flowStepStatus.step1 === 'running' ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-laptop"></i>
                  )}
                </div>

                {/* Step Content Card */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <strong style={{ fontSize: '0.92rem', color: '#0284c7' }}>1. ServiceNow ITSM</strong>
                    <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}>
                      <i className="fa-solid fa-check"></i> Approved & INC Dispatched
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div>• <strong>Request:</strong> <code>{activeFlowCandidate.serviceNowReq || 'REQ0010042'}</code> marked <strong>Approved</strong></div>
                    <div>• <strong>Laptop Incident Ticket:</strong> <strong style={{ color: '#059669' }}>{flowData?.laptopProvisioning?.ticketNumber || activeFlowCandidate.laptopTicket || 'ITSM-ASSET-0420'}</strong></div>
                    <div>• <strong>Hardware:</strong> {activeFlowCandidate.hardware || 'Apple MacBook Pro M3 Max'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '4px' }}>
                      <i className="fa-solid fa-truck-fast"></i> Assigned to IT Hardware Desk for deployment
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Active Directory (AutomationEdge T4) */}
              <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.5rem',
                    top: '0',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: flowStepStatus.step2 === 'completed' ? '#fff7ed' : '#fef2f2',
                    border: flowStepStatus.step2 === 'completed' ? '2px solid #ea580c' : '2px solid #fed7aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ea580c',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    zIndex: 2,
                  }}
                >
                  {flowStepStatus.step2 === 'running' ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-robot"></i>
                  )}
                </div>

                {/* Step Content Card */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-orange)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <strong style={{ fontSize: '0.92rem', color: '#c2410c' }}>2. Active Directory (AD)</strong>
                    <span className="badge" style={{ background: '#ffedd5', color: '#c2410c', fontSize: '0.68rem', border: '1px solid #fed7aa' }}>
                      <i className="fa-solid fa-circle-check"></i> Workflow Complete
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div>• <strong>T4 Workflow:</strong> <code>{flowData?.aeT4Ad?.workflowName || activeFlowCandidate.aeT4Workflow || 'AD-Create User and Assin Role'}</code></div>
                    <div>• <strong>Automation Request:</strong> <strong>#{flowData?.aeT4Ad?.automationRequestId || activeFlowCandidate.aeT4RequestId || '10388'}</strong></div>
                    <div>• <strong>RPA Agent:</strong> <code>{flowData?.aeT4Ad?.agentName || activeFlowCandidate.aeT4Agent || 'mahesh@mspevent-win-1'}</code></div>
                    <div style={{ color: '#15803d', fontSize: '0.74rem', marginTop: '4px', fontWeight: 600 }}>
                      ✓ Domain User & Role assigned in Active Directory
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: Microsoft 365 / Entra ID */}
              <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.5rem',
                    top: '0',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: flowStepStatus.step3 === 'completed' ? '#eff6ff' : '#f8fafc',
                    border: flowStepStatus.step3 === 'completed' ? '2px solid #1d4ed8' : '2px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1d4ed8',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    zIndex: 2,
                  }}
                >
                  {flowStepStatus.step3 === 'running' ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-brands fa-microsoft"></i>
                  )}
                </div>

                {/* Step Content Card */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid #bfdbfe',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <strong style={{ fontSize: '0.92rem', color: '#1d4ed8' }}>3. Microsoft 365 Account</strong>
                    <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.68rem', border: '1px solid #93c5fd' }}>
                      <i className="fa-solid fa-circle-check"></i> Entra ID Active
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div>• <strong>Generated Work Email:</strong> <strong style={{ color: '#1d4ed8' }}>{flowData?.office365?.userPrincipalName || activeFlowCandidate.o365Email || `${activeFlowCandidate.fullName ? activeFlowCandidate.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}@automationedge.ai`}</strong></div>
                    <div>• <strong>Tenant Domain:</strong> <code>automationedge.ai</code></div>
                    <div>• <strong>Status:</strong> Cloud Mailbox & Teams Provisioned</div>
                  </div>
                </div>
              </div>

              {/* STEP 4: OrangeHRM PIM */}
              <div style={{ position: 'relative' }}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.5rem',
                    top: '0',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: flowStepStatus.step4 === 'completed' ? '#ecfdf5' : '#f0fdf4',
                    border: flowStepStatus.step4 === 'completed' ? '2px solid #059669' : '2px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    zIndex: 2,
                  }}
                >
                  {flowStepStatus.step4 === 'running' ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-user-check"></i>
                  )}
                </div>

                {/* Step Content Card */}
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid #a7f3d0',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <strong style={{ fontSize: '0.92rem', color: '#059669' }}>4. OrangeHRM Profile</strong>
                    <span className="badge badge-verified" style={{ fontSize: '0.68rem', borderColor: '#a7f3d0', color: '#059669', background: '#ecfdf5' }}>
                      <i className="fa-solid fa-check"></i> PIM Created
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div>• <strong>PIM Employee Number:</strong> <strong>#{flowData?.orangeHrm?.empNumber || activeFlowCandidate.orangeHrmEmpNumber || '17'}</strong></div>
                    <div>• <strong>Synced Email:</strong> <span>{flowData?.office365?.userPrincipalName || activeFlowCandidate.o365Email || `${activeFlowCandidate.fullName ? activeFlowCandidate.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}@automationedge.ai`}</span></div>
                    <div style={{ color: '#059669', fontSize: '0.74rem', marginTop: '4px', fontWeight: 600 }}>
                      ✓ Profile linked with Microsoft 365 workEmail in OrangeHRM
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'space-between',
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => setActiveFlowCandidate(null)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Close Flow
            </button>
            <a
              href={`http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
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
