import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, Card, EmptyState, StatusBanner, Modal, staggerContainer, EASE_OUT } from './ui';

// Flow steps in execution order: ServiceNow -> AD -> Office 365 -> OrangeHRM -> Laptop Incident
const FLOW_STEPS = ['step1', 'step2', 'step3', 'step4', 'step5'];
const STEP_ADVANCE_MS = 2500;

const allSteps = (status) => Object.fromEntries(FLOW_STEPS.map((s) => [s, status]));

// Maps a backend engine result ({ status: 'success' | 'warning' | 'error', message }) to a step status
const engineStatus = (result) => {
  if (!result) return 'error';
  if (result.status === 'success' || result.status === 'Triggered') return 'completed';
  if (result.status === 'warning') return 'warning';
  return 'error';
};

const STEP_OPACITY = { idle: 0.45, processed: 0.8 };

// One step row in the flow timeline; animates in and dims/undims as its status changes
function FlowStep({ status, index, children }) {
  return (
    <motion.li
      className={`flow-step is-${status}`}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: STEP_OPACITY[status] ?? 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: EASE_OUT }}
    >
      {children}
    </motion.li>
  );
}

// Shows the real step state; the success badge (children) only appears once the step has completed
function StepBadge({ status, children }) {
  // Re-keyed on status so each state change pops in instead of swapping instantly
  return (
    <motion.span
      key={status}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ display: 'inline-flex' }}
    >
      <StepBadgeContent status={status}>{children}</StepBadgeContent>
    </motion.span>
  );
}

function StepBadgeContent({ status, children }) {
  if (status === 'running') {
    return <span className="badge flow-badge flow-badge-running"><i className="fa-solid fa-spinner fa-spin"></i> RUNNING</span>;
  }
  if (status === 'processed') {
    // Visually passed while the request is still in flight; the real result replaces this when it arrives
    return <span className="badge flow-badge flow-badge-idle"><i className="fa-solid fa-hourglass-half"></i> AWAITING RESULT</span>;
  }
  if (status === 'idle') {
    return <span className="badge flow-badge flow-badge-idle"><i className="fa-regular fa-clock"></i> WAITING</span>;
  }
  if (status === 'error') {
    return <span className="badge flow-badge flow-badge-error"><i className="fa-solid fa-xmark"></i> FAILED</span>;
  }
  if (status === 'warning') {
    return <span className="badge flow-badge flow-badge-warning"><i className="fa-solid fa-triangle-exclamation"></i> WARNING</span>;
  }
  return children;
}

function StepError({ message }) {
  return (
    <div className="flow-step-error">
      <i className="fa-solid fa-circle-exclamation"></i>
      <span>{message || 'This step did not complete. Check the server log for details.'}</span>
    </div>
  );
}

export default function ApprovalsView({ employees, onRefreshEmployees }) {
  const { showToast } = useToast();
  const [approvingId, setApprovingId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Right-side line flow drawer state
  const [activeFlowCandidate, setActiveFlowCandidate] = useState(null);
  const [flowStepStatus, setFlowStepStatus] = useState(allSteps('idle')); // 'idle' | 'running' | 'completed' | 'warning' | 'error'
  const [flowStepErrors, setFlowStepErrors] = useState({});
  const [flowData, setFlowData] = useState(null);
  const stepTimerRef = useRef(null);

  useEffect(() => () => clearInterval(stepTimerRef.current), []);

  const flowFinished = Object.values(flowStepStatus).every((s) => s !== 'running' && s !== 'processed') && !approvingId;
  const flowHasErrors = Object.keys(flowStepErrors).length > 0;

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
        setSyncResult({ tone: 'success', title: 'Approved history cleared' });
      } else {
        setSyncResult({ tone: 'error', title: 'Could not clear history', message: `The server returned HTTP ${res.status}.` });
      }
    } catch (err) {
      console.warn('Clear history error:', err);
      setSyncResult({ tone: 'error', title: 'Could not reach the HRMS server', message: 'History was not cleared.' });
    }
  };

  const handleApprove = async (cand) => {
    setApprovingId(cand.id);
    setActiveFlowCandidate(cand);
    setFlowStepStatus({ ...allSteps('idle'), step1: 'running' });
    setFlowStepErrors({});
    setFlowData(null);

    // The backend runs every step inside one request, so advance the visual cursor one step at a time
    // while it works, holding on the last step until the real results arrive.
    let cursor = 0;
    clearInterval(stepTimerRef.current);
    stepTimerRef.current = setInterval(() => {
      if (cursor >= FLOW_STEPS.length - 1) return;
      cursor += 1;
      setFlowStepStatus(Object.fromEntries(FLOW_STEPS.map((s, i) => [s, i < cursor ? 'processed' : i === cursor ? 'running' : 'idle'])));
    }, STEP_ADVANCE_MS);

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

      clearInterval(stepTimerRef.current);

      if (res.ok) {
        const result = await res.json();
        const laptopOk = (result.laptopProvisioning?.ticketNumber || '').startsWith('INC') || result.aeT4Laptop?.status === 'success';
        const offerOk = result.offerLetter?.status === 'success' || Boolean(result.offerLetter?.sent);
        // Step 5 covers the laptop ticket and the offer-letter email: both ok -> done, one ok -> warning
        const step5 = laptopOk && offerOk ? 'completed' : laptopOk || offerOk ? 'warning' : 'error';
        const step5Message = !laptopOk
          ? `Laptop ticket was not created. ${result.aeT4Laptop?.message || ''}`.trim()
          : `Offer letter email was not sent. ${result.offerLetter?.message || ''}`.trim();
        const statuses = {
          step1: result.status === 'success' ? 'completed' : 'error',
          step2: engineStatus(result.aeT4Ad),
          step3: engineStatus(result.office365),
          step4: engineStatus(result.orangeHrm),
          step5,
        };
        const messages = {
          step1: result.message,
          step2: result.aeT4Ad?.message,
          step3: result.office365?.message,
          step4: result.orangeHrm?.message,
          step5: step5Message,
        };
        const errors = {};
        FLOW_STEPS.forEach((s) => {
          if (statuses[s] !== 'completed') errors[s] = messages[s];
        });

        setFlowData(result);
        setFlowStepStatus(statuses);
        setFlowStepErrors(errors);

        const failedCount = Object.keys(errors).length;
        if (failedCount === 0) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
          showToast(`Onboarding completed for ${cand.fullName}.`, 'success');
        } else {
          showToast(`${cand.fullName}: ${failedCount} step(s) need attention.`, 'error');
        }
      } else {
        setFlowStepStatus({ ...allSteps('idle'), step1: 'error' });
        setFlowStepErrors({ step1: `The server returned an error (HTTP ${res.status}). No systems were provisioned.` });
        showToast(`Approval failed for ${cand.fullName}.`, 'error');
      }
    } catch (err) {
      console.error('Approval error:', err);
      clearInterval(stepTimerRef.current);
      setFlowStepStatus({ ...allSteps('idle'), step1: 'error' });
      setFlowStepErrors({ step1: 'Could not reach the HRMS server. Check that "python server.py" is running.' });
      showToast(`Approval failed for ${cand.fullName}.`, 'error');
    } finally {
      setApprovingId(null);
      if (onRefreshEmployees) onRefreshEmployees();
    }
  };

  // Re-opens the flow for an already-approved employee, showing only what was actually recorded
  const inspectApprovalFlow = (cand) => {
    const recorded = {
      step1: true,
      step2: Boolean(cand.aeT4RequestId),
      step3: Boolean(cand.o365Email),
      step4: Boolean(cand.orangeHrmEmpNumber),
      step5: Boolean(cand.laptopTicket) && Boolean(cand.offerLetterEmailed),
    };
    const notRecorded = {
      step2: 'No Active Directory (T4) request was recorded for this employee.',
      step3: 'No Microsoft 365 account was recorded for this employee.',
      step4: 'No OrangeHRM profile was recorded for this employee.',
      step5: !cand.laptopTicket ? 'No laptop ticket was recorded for this employee.' : 'No offer-letter email was recorded for this employee.',
    };
    const errors = {};
    FLOW_STEPS.forEach((s) => {
      if (!recorded[s]) errors[s] = notRecorded[s];
    });

    setActiveFlowCandidate(cand);
    setFlowStepStatus(Object.fromEntries(FLOW_STEPS.map((s) => [s, recorded[s] ? 'completed' : 'warning'])));
    setFlowStepErrors(errors);
    setFlowData({
      serviceNow: {
        reqNumber: cand.serviceNowReq,
        approvalStatus: 'Approved',
      },
      laptopProvisioning: {
        ticketNumber: cand.laptopTicket,
        hardwareItem: cand.hardware,
        ticketUrl: cand.laptopTicketUrl,
      },
      aeT4Ad: {
        automationRequestId: cand.aeT4RequestId,
        workflowName: cand.aeT4Workflow || 'AD-Create User and Assin Role',
        agentName: cand.aeT4Agent,
        executionStatus: cand.aeT4Status,
      },
      office365: {
        userPrincipalName: cand.o365Email,
      },
      orangeHrm: {
        empNumber: cand.orangeHrmEmpNumber,
        profileUrl: cand.orangeHrmProfileUrl,
      },
      offerLetter: {
        sent: Boolean(cand.offerLetterEmailed),
        recipient: cand.offerLetterRecipient,
      },
    });
  };

  const handleSyncServiceNow = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/servicenow/sync-approvals');
      if (res.ok) {
        const data = await res.json();
        if (data.syncedCount > 0) {
          confetti({ particleCount: 50 });
          setSyncResult({ tone: 'success', title: `Synced ${data.syncedCount} candidate(s) approved in ServiceNow`, message: 'Their provisioning has been started.' });
        } else {
          setSyncResult({ tone: 'info', title: 'Already up to date', message: 'No new approvals were found in ServiceNow.' });
        }
      } else {
        setSyncResult({ tone: 'error', title: 'ServiceNow sync failed', message: `The server returned HTTP ${res.status}.` });
      }
    } catch (err) {
      console.warn('Sync error:', err);
      setSyncResult({ tone: 'error', title: 'Could not reach the HRMS server', message: 'Check that "python server.py" is running.' });
    } finally {
      setIsSyncing(false);
      if (onRefreshEmployees) onRefreshEmployees();
    }
  };

  return (
    <section className="view-section active page" style={{ position: 'relative' }}>
      <PageHeader
        icon="fa-solid fa-clipboard-check"
        title="HR approvals"
        description="Review candidates. Approving provisions every connected system in sequence."
        actions={
          <>
            <button className="btn btn-secondary" onClick={handleSyncServiceNow} disabled={isSyncing} aria-busy={isSyncing}>
              <i className={`fa-solid fa-cloud-arrow-down ${isSyncing ? 'fa-bounce' : ''}`} aria-hidden="true"></i>
              {isSyncing ? 'Syncing…' : 'Sync from ServiceNow'}
            </button>
            <button className="btn btn-secondary" onClick={onRefreshEmployees} aria-label="Refresh approvals list">
              <i className="fa-solid fa-rotate" aria-hidden="true"></i> Refresh
            </button>
          </>
        }
      />

      <AnimatePresence>
        {syncResult && (
          <StatusBanner tone={syncResult.tone} title={syncResult.title} onDismiss={() => setSyncResult(null)}>
            {syncResult.message}
          </StatusBanner>
        )}
      </AnimatePresence>

      {/* Pending submissions */}
      <div className="section-heading">
        <h2>
          Pending review <span className="count-pill">{pendingApprovals.length}</span>
        </h2>
      </div>

      {pendingApprovals.length === 0 ? (
        <Card animated={false}>
          <EmptyState icon="fa-solid fa-circle-check" title="All caught up">
            No candidate submissions are waiting for review. New submissions from Onboarding appear here.
          </EmptyState>
        </Card>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show">
          {pendingApprovals.map((cand) => {
            const docs = [
              { label: 'Government ID / Aadhaar', icon: 'fa-id-badge', file: cand.idDocumentName },
              { label: 'EPFO UAN Card', icon: 'fa-building-columns', file: cand.uanDocumentName },
              { label: 'Salary Slip', icon: 'fa-file-invoice-dollar', file: cand.salarySlipDocName || cand.offerDocumentName },
            ];
            const missingDocs = docs.filter((d) => !d.file).length;
            const isApproving = approvingId === cand.id;

            return (
              <Card key={cand.id} className="candidate-card">
                {/* Header Row */}
                <div className="candidate-head">
                  <div className="candidate-identity">
                    <span className="candidate-avatar" aria-hidden="true">
                      {cand.fullName ? cand.fullName.charAt(0).toUpperCase() : 'C'}
                    </span>
                    <div className="candidate-meta">
                      <div className="candidate-name-row">
                        <h3>{cand.fullName}</h3>
                        <span className="badge badge-pending">Pending review</span>
                        <span className="badge badge-draft">{cand.department || 'Engineering'}</span>
                      </div>
                      <div className="candidate-contact">
                        <span><i className="fa-solid fa-envelope" aria-hidden="true"></i> {cand.email}</span>
                        <span><i className="fa-solid fa-phone" aria-hidden="true"></i> {cand.phone || '—'}</span>
                        <span><i className="fa-solid fa-hashtag" aria-hidden="true"></i> {cand.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="candidate-links">
                    <a
                      href={cand.reqUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_request_list.do?sysparm_query=number=${cand.serviceNowReq || 'REQ0010042'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <i className="fa-solid fa-ticket text-accent" aria-hidden="true"></i> {cand.serviceNowReq || 'ServiceNow request'}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    <a
                      href={cand.ritmUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_req_item_list.do?sysparm_query=number=${cand.serviceNowRitm || 'RITM0010076'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <i className="fa-solid fa-box text-accent" aria-hidden="true"></i> Catalog item
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                </div>

                {/* Details */}
                <div className="candidate-body">
                  <div className="detail-panel">
                    <h4 className="detail-panel-title"><i className="fa-solid fa-id-card" aria-hidden="true"></i> Candidate information</h4>
                    <dl className="detail-list">
                      <div><dt>Role</dt><dd>{cand.jobTitle || '—'}</dd></div>
                      <div><dt>Department</dt><dd>{cand.department || '—'}</dd></div>
                      <div><dt>Date of birth</dt><dd>{cand.dob || '—'}</dd></div>
                      <div><dt>Emergency contact</dt><dd>{cand.emergencyName || '—'}{cand.emergencyPhone ? ` (${cand.emergencyPhone})` : ''}</dd></div>
                      <div><dt>Address</dt><dd>{cand.address || '—'}</dd></div>
                      <div><dt>Workstation</dt><dd>{cand.hardware || '—'}</dd></div>
                    </dl>
                  </div>

                  <div className="detail-panel">
                    <h4 className="detail-panel-title">
                      <i className="fa-solid fa-file-shield" aria-hidden="true"></i> Documents
                      <span className={`badge ${missingDocs ? 'badge-pending' : 'badge-approved'}`}>
                        {missingDocs ? `${missingDocs} missing` : 'All received'}
                      </span>
                    </h4>
                    <ul className="doc-list">
                      {docs.map((d) => (
                        <li key={d.label}>
                          <span className="doc-list-label">
                            <i className={`fa-solid ${d.icon} text-accent`} aria-hidden="true"></i>
                            <span>
                              {d.label}
                              {d.file && <small title={d.file}>{d.file}</small>}
                            </span>
                          </span>
                          {d.file ? (
                            <span className="badge badge-approved"><i className="fa-solid fa-check" aria-hidden="true"></i> Received</span>
                          ) : (
                            <span className="badge badge-pending">Missing</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="candidate-actions">
                  <p>
                    <i className="fa-solid fa-circle-info text-accent" aria-hidden="true"></i>
                    Approving runs: ServiceNow → Active Directory → Microsoft 365 → OrangeHRM → laptop ticket, then emails the offer letter.
                  </p>
                  <button className="btn btn-primary" disabled={isApproving} aria-busy={isApproving} onClick={() => handleApprove(cand)}>
                    {isApproving ? (
                      <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Provisioning…</>
                    ) : (
                      <><i className="fa-solid fa-circle-check" aria-hidden="true"></i> Approve & provision</>
                    )}
                  </button>
                </div>
              </Card>
            );
          })}
        </motion.div>
      )}

      {/* Approved History Table */}
      <Card
        animated={false}
        title={`Approved history (${approvedHistory.length})`}
        icon="fa-solid fa-clock-rotate-left"
        actions={
          approvedHistory.length > 0 && (
            confirmClear ? (
              <>
                <span className="confirm-text">Delete all {approvedHistory.length} records?</span>
                <button className="btn btn-danger btn-sm" onClick={() => { setConfirmClear(false); handleClearApprovalHistory(); }}>
                  Yes, delete
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmClear(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn btn-secondary btn-sm btn-danger-outline" onClick={() => setConfirmClear(true)}>
                <i className="fa-solid fa-trash-can" aria-hidden="true"></i> Clear history
              </button>
            )
          )
        }
      >
        {approvedHistory.length === 0 ? (
          <EmptyState icon="fa-solid fa-clock-rotate-left" title="No approvals yet">
            Approved candidates and their provisioning results will be listed here.
          </EmptyState>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Candidate</th>
                    <th scope="col">Role & department</th>
                    <th scope="col">ServiceNow</th>
                    <th scope="col">Provisioned accounts</th>
                    <th scope="col">Laptop ticket</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApprovedHistory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.fullName}</strong>
                        <div className="cell-sub">{item.email}</div>
                      </td>
                      <td>
                        {item.jobTitle || '—'}
                        <div className="cell-sub">{item.department || '—'}</div>
                      </td>
                      <td>
                        <span className="badge badge-approved"><i className="fa-solid fa-check" aria-hidden="true"></i> {item.serviceNowReq || '—'}</span>
                        {item.serviceNowRitm && <div className="cell-sub">Item {item.serviceNowRitm}</div>}
                      </td>
                      <td>
                        <div className="badge-stack">
                          {item.o365Email ? (
                            <span className="badge badge-ms"><i className="fa-brands fa-microsoft" aria-hidden="true"></i> {item.o365Email.split('@')[0]}</span>
                          ) : (
                            <span className="badge badge-draft">No O365 account</span>
                          )}
                          {item.orangeHrmEmpNumber ? (
                            <span className="badge badge-verified"><i className="fa-solid fa-user-check" aria-hidden="true"></i> OrangeHRM #{item.orangeHrmEmpNumber}</span>
                          ) : (
                            <span className="badge badge-draft">No OrangeHRM profile</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong className="cell-accent">{item.laptopTicket || '—'}</strong>
                        <div className="cell-sub">{item.hardware || '—'}</div>
                      </td>
                      <td className="cell-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => inspectApprovalFlow(item)}>
                          <i className="fa-solid fa-timeline text-accent" aria-hidden="true"></i> View flow
                          <span className="sr-only"> for {item.fullName}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <nav className="pagination" aria-label="Approved history pages">
              <span className="pagination-summary">
                Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + ITEMS_PER_PAGE, approvedHistory.length)}</strong> of{' '}
                <strong>{approvedHistory.length}</strong>
              </span>
              <div className="pagination-controls">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={validCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`page-btn ${pageNum === validCurrentPage ? 'is-current' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === validCurrentPage ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={validCurrentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </button>
              </div>
            </nav>
          </>
        )}
      </Card>

      {/* Provisioning pipeline dialog (centered, screen-fitted; statuses come from the real backend result) */}
      <Modal
        open={Boolean(activeFlowCandidate)}
        onClose={() => setActiveFlowCandidate(null)}
        size="md"
        icon={<span className="page-title-icon" aria-hidden="true"><i className="fa-solid fa-sitemap"></i></span>}
        title="Onboarding provisioning pipeline"
        subtitle="ServiceNow → Active Directory → Microsoft 365 → OrangeHRM → laptop & offer letter"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setActiveFlowCandidate(null)}>Close</button>
            <button
              onClick={() => {
                const targetUrl = flowData?.orangeHrm?.profileUrl || 'http://10.41.5.39/orangehrm/web/index.php/auth/login';
                if (navigator?.clipboard?.writeText) {
                  navigator.clipboard.writeText('Admin@1234').catch(() => {});
                }
                showToast('🔑 OrangeHRM: User: admin | Pass: Admin@1234 (Copied to clipboard)', 'success');
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
              }}
              className="btn btn-primary"
              title="Open OrangeHRM (Credentials: admin / Admin@1234 copied to clipboard)"
            >
              <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Open OrangeHRM
            </button>
          </>
        }
      >
        {activeFlowCandidate && (() => {
          const cand = activeFlowCandidate;
          const isRunning = approvingId === cand.id;
          const steps = [
            {
              key: 'step1',
              icon: 'fa-file-signature',
              title: 'ServiceNow request & catalog approval',
              done: 'Approved',
              details: (
                <>
                  <div>Request <code>{flowData?.serviceNow?.reqNumber || flowData?.reqNumber || cand.serviceNowReq || '—'}</code> marked approved</div>
                  <div>Catalog item: Employee onboarding request</div>
                </>
              ),
            },
            {
              key: 'step2',
              icon: 'fa-robot',
              title: 'Active Directory (AutomationEdge T4)',
              done: 'Domain user created',
              details: (
                <>
                  <div>Workflow <code>{flowData?.aeT4Ad?.workflowName || cand.aeT4Workflow || 'AD-Create User and Assin Role'}</code></div>
                  {(flowData?.aeT4Ad?.automationRequestId || cand.aeT4RequestId) && (
                    <div>Automation request <strong>#{flowData?.aeT4Ad?.automationRequestId || cand.aeT4RequestId}</strong>
                      {(flowData?.aeT4Ad?.agentName || cand.aeT4Agent) && <> · agent <code>{flowData?.aeT4Ad?.agentName || cand.aeT4Agent}</code></>}
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'step3',
              icon: 'fa-envelope-circle-check',
              title: 'Microsoft 365 & Entra ID account',
              done: 'Mailbox active',
              details: (
                <div>Work email <strong>{flowData?.office365?.userPrincipalName || cand.o365Email || 'created on approval'}</strong></div>
              ),
            },
            {
              key: 'step4',
              icon: 'fa-user-check',
              title: 'OrangeHRM PIM profile',
              done: 'Profile created',
              details: (
                <div>Employee number <strong>{flowData?.orangeHrm?.empNumber || cand.orangeHrmEmpNumber ? `#${flowData?.orangeHrm?.empNumber || cand.orangeHrmEmpNumber}` : 'assigned on approval'}</strong>, linked to the Microsoft 365 email</div>
              ),
            },
            {
              key: 'step5',
              icon: 'fa-laptop',
              title: 'Laptop ticket & offer letter',
              done: 'Offer letter sent',
              details: (
                <>
                  <div>Laptop incident <strong>{flowData?.laptopProvisioning?.ticketNumber || cand.laptopTicket || 'created on approval'}</strong> ({cand.hardware || 'workstation'})</div>
                  <div>Offer letter PDF with INR breakdown emailed{flowData?.offerLetter?.recipient ? ` to ${flowData.offerLetter.recipient}` : ''}</div>
                </>
              ),
            },
          ];

          return (
            <>
              {/* Candidate summary chip */}
              <div className="flow-candidate">
                <div>
                  <strong>{cand.fullName}</strong>
                  <span>{cand.jobTitle || '—'} · {cand.department || '—'}</span>
                </div>
                <div className="flow-candidate-meta">
                  <span>ID <strong>{cand.id}</strong></span>
                  <span>CTC <strong>{cand.salary || '—'}</strong></span>
                </div>
              </div>

              {/* Vertical timeline */}
              <ol className={`flow-timeline ${isRunning ? 'is-running' : ''} ${flowFinished && flowHasErrors ? 'has-errors' : ''}`}>
                {steps.map((step, i) => {
                  const status = flowStepStatus[step.key];
                  const nodeIcon =
                    status === 'running' ? 'fa-spinner fa-spin'
                      : status === 'completed' ? 'fa-check'
                        : status === 'error' ? 'fa-xmark'
                          : status === 'warning' ? 'fa-exclamation'
                            : `fa-solid ${step.icon}`;
                  return (
                    <FlowStep key={step.key} status={status} index={i}>
                      <span className={`flow-node is-${status}`} aria-hidden="true">
                        <i className={`fa-solid ${nodeIcon}`}></i>
                      </span>
                      <div className="flow-step-card">
                        <div className="flow-step-head">
                          <strong>{i + 1}. {step.title}</strong>
                          <StepBadge status={status}>
                            <span className="badge badge-approved flow-badge"><i className="fa-solid fa-check" aria-hidden="true"></i> {step.done}</span>
                          </StepBadge>
                        </div>
                        {status === 'error' ? (
                          <StepError message={flowStepErrors[step.key]} />
                        ) : (
                          <div className="flow-step-details">
                            {step.details}
                            {status === 'warning' && <StepError message={flowStepErrors[step.key]} />}
                          </div>
                        )}
                      </div>
                    </FlowStep>
                  );
                })}
              </ol>

              {/* Outcome */}
              {flowFinished && (
                flowHasErrors ? (
                  <StatusBanner tone="warning" title={`Finished with ${Object.keys(flowStepErrors).length} step(s) needing attention`}>
                    Fix the affected system and approve again, or complete those steps manually.
                  </StatusBanner>
                ) : (
                  <StatusBanner tone="success" title="All steps completed">
                    End-to-end provisioning finished for {cand.fullName}.
                  </StatusBanner>
                )
              )}
            </>
          );
        })()}
      </Modal>
    </section>
  );
}
