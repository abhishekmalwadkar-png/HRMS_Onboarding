import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, Card, EmptyState, StatusBanner, staggerContainer } from './ui';

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
    <motion.div
      className={`flow-step is-${status}`}
      style={{ position: 'relative', marginBottom: '0.55rem' }}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: STEP_OPACITY[status] ?? 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
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
          reqNumber: cand.serviceNowReq || `REQ001${Math.floor(1000 + Math.random() * 9000)}`,
          approvalSource: 'HR Portal',
        }),
      });

      clearInterval(stepTimerRef.current);

      if (res.ok) {
        const result = await res.json();
        const laptopOk = (result.laptopProvisioning?.ticketNumber || '').startsWith('INC') || result.aeT4Laptop?.status === 'success';
        const statuses = {
          step1: result.status === 'success' ? 'completed' : 'error',
          step2: engineStatus(result.aeT4Ad),
          step3: engineStatus(result.office365),
          step4: engineStatus(result.orangeHrm),
          step5: laptopOk ? 'completed' : 'error',
        };
        const sources = { step1: result, step2: result.aeT4Ad, step3: result.office365, step4: result.orangeHrm, step5: result.aeT4Laptop };
        const errors = {};
        FLOW_STEPS.forEach((s) => {
          if (statuses[s] !== 'completed') errors[s] = sources[s]?.message;
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

  const inspectApprovalFlow = (cand) => {
    setActiveFlowCandidate(cand);
    setFlowStepStatus(allSteps('completed'));
    setFlowStepErrors({});
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
        description="Review submitted candidates. Approving provisions ServiceNow, Active Directory, Microsoft 365, OrangeHRM and a laptop ticket in sequence."
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
              { label: 'Degree certificate', icon: 'fa-graduation-cap', file: cand.educationDocName },
              { label: 'Tax form (W-4 / Form 16)', icon: 'fa-file-invoice-dollar', file: cand.taxDocumentName },
              { label: 'Signed offer letter', icon: 'fa-file-signature', file: cand.offerDocumentName },
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

      {/* ========================================================================= */}
      {/* RIGHT-SIDE LINE FLOW DRAWER (Shows triggered workflows & changes) */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* RIGHT-SIDE LINE FLOW CARD (Shows triggered workflows & changes) */}
      {/* ========================================================================= */}
      <AnimatePresence>
      {activeFlowCandidate && (
        <motion.div
          key="flow-panel"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.18, ease: 'easeIn' } }}
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
              <div style={{ color: 'var(--accent-text)', fontSize: '0.9rem', opacity: 0.8, display: 'flex', alignItems: 'center' }}>
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
              <div className={`animated-flow-line ${approvingId !== activeFlowCandidate?.id && !Object.values(flowStepStatus).some(s => s === 'running') ? 'completed-static' : ''} ${flowHasErrors ? 'has-errors' : ''}`}>
                <div className="flow-line-base"></div>
                {(approvingId === activeFlowCandidate?.id || Object.values(flowStepStatus).some(s => s === 'running')) && (
                  <div className="flow-stream-pulse"></div>
                )}
              </div>

              {/* STEP 1: ServiceNow Service Catalog Approval */}
              <FlowStep status={flowStepStatus.step1} index={0}>
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
                    <strong style={{ fontSize: '0.82rem', color: '#c2410c' }}>1. ServiceNow Request</strong>
                    <StepBadge status={flowStepStatus.step1}>
                      <span className="badge badge-verified" style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem' }}>
                        <i className="fa-solid fa-check"></i> APPROVED
                      </span>
                    </StepBadge>
                  </div>
                  {flowStepStatus.step1 === 'error' ? <StepError message={flowStepErrors.step1} /> : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Request:</strong> <code>{activeFlowCandidate.serviceNowReq || 'REQ0010042'}</code> marked <strong>Approved</strong></div>
                    <div>• <strong>Catalog Item:</strong> <span>Employee Onboarding Request</span></div>
                    {flowStepStatus.step1 === 'completed' && (
                      <div style={{ color: '#15803d', fontSize: '0.68rem', marginTop: '1px', fontWeight: 600 }}>
                        ✓ HR Verification Approved in ServiceNow Service Catalog
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </FlowStep>

              {/* STEP 2: Active Directory (AutomationEdge T4) */}
              <FlowStep status={flowStepStatus.step2} index={1}>
                {/* Node Icon */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-2.25rem',
                    top: '2px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#fff7ed',
                    border: '2px solid #f87917',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c2410c',
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
                    <StepBadge status={flowStepStatus.step2}>
                      <span className="badge" style={{ background: '#ffedd5', color: '#c2410c', fontSize: '0.62rem', padding: '0.15rem 0.4rem', border: '1px solid #fed7aa' }}>
                        <i className="fa-solid fa-circle-check"></i> WORKFLOW COMPLETE
                      </span>
                    </StepBadge>
                  </div>
                  {flowStepStatus.step2 === 'error' ? <StepError message={flowStepErrors.step2} /> : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>T4 Workflow:</strong> <code>{flowData?.aeT4Ad?.workflowName || activeFlowCandidate.aeT4Workflow || 'AD-Create User and Assin Role'}</code></div>
                    <div>• <strong>Automation Request:</strong> <strong>#{flowData?.aeT4Ad?.automationRequestId || activeFlowCandidate.aeT4RequestId || '3294476'}</strong></div>
                    <div>• <strong>RPA Agent:</strong> <code>{flowData?.aeT4Ad?.agentName || activeFlowCandidate.aeT4Agent || 'mahesh@mspevent-win-1'}</code></div>
                    {flowStepStatus.step2 === 'completed' && (
                      <div style={{ color: '#15803d', fontSize: '0.68rem', marginTop: '1px', fontWeight: 600 }}>
                        ✓ Domain User & Role assigned in Active Directory
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </FlowStep>

              {/* STEP 3: Microsoft 365 / Entra ID */}
              <FlowStep status={flowStepStatus.step3} index={2}>
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
                    <StepBadge status={flowStepStatus.step3}>
                      <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.62rem', padding: '0.15rem 0.4rem', border: '1px solid #93c5fd' }}>
                        <i className="fa-solid fa-circle-check"></i> ENTRA ID ACTIVE
                      </span>
                    </StepBadge>
                  </div>
                  {flowStepStatus.step3 === 'error' ? <StepError message={flowStepErrors.step3} /> : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Generated Work Email:</strong> <strong style={{ color: '#1d4ed8' }}>{flowData?.office365?.userPrincipalName || activeFlowCandidate.o365Email || `${activeFlowCandidate.fullName ? activeFlowCandidate.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}@automationedge.ai`}</strong></div>
                    <div>• <strong>Tenant Domain:</strong> <code>automationedge.ai</code></div>
                    {flowStepStatus.step3 === 'completed' && <div>• <strong>Status:</strong> Cloud Mailbox & Teams Provisioned</div>}
                    {flowStepStatus.step3 === 'warning' && <StepError message={flowStepErrors.step3} />}
                  </div>
                  )}
                </div>
              </FlowStep>

              {/* STEP 4: OrangeHRM PIM */}
              <FlowStep status={flowStepStatus.step4} index={3}>
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
                    <StepBadge status={flowStepStatus.step4}>
                      <span className="badge badge-verified" style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderColor: '#a7f3d0', color: '#059669', background: '#ecfdf5' }}>
                        <i className="fa-solid fa-check"></i> PIM CREATED
                      </span>
                    </StepBadge>
                  </div>
                  {flowStepStatus.step4 === 'error' ? <StepError message={flowStepErrors.step4} /> : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>PIM Employee Number:</strong> <strong>#{flowData?.orangeHrm?.empNumber || activeFlowCandidate.orangeHrmEmpNumber || '17'}</strong></div>
                    <div>• <strong>Synced Email:</strong> <span>{flowData?.office365?.userPrincipalName || activeFlowCandidate.o365Email || `${activeFlowCandidate.fullName ? activeFlowCandidate.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}@automationedge.ai`}</span></div>
                    {flowStepStatus.step4 === 'completed' && (
                      <div style={{ color: '#059669', fontSize: '0.68rem', marginTop: '1px', fontWeight: 600 }}>
                        ✓ Profile created & linked with Microsoft 365 workEmail
                      </div>
                    )}
                    {flowStepStatus.step4 === 'warning' && <StepError message={flowStepErrors.step4} />}
                  </div>
                  )}
                </div>
              </FlowStep>

              {/* STEP 5: ServiceNow ITSM Hardware Incident (Triggered AFTER OrangeHRM) */}
              <FlowStep status={flowStepStatus.step5} index={4}>
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
                    border: '2px solid #f87917',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c2410c',
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
                    border: '1px solid #fed7aa',
                    borderRadius: 'var(--radius-sm, 6px)',
                    padding: '0.5rem 0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#c2410c' }}>5. ServiceNow Laptop Incident</strong>
                    <StepBadge status={flowStepStatus.step5}>
                      <span className="badge" style={{ background: '#ffedd5', color: '#c2500a', fontSize: '0.62rem', padding: '0.15rem 0.4rem', border: '1px solid #fed7aa' }}>
                        <i className="fa-solid fa-box"></i> CATEGORY: HARDWARE
                      </span>
                    </StepBadge>
                  </div>
                  {flowStepStatus.step5 === 'error' ? <StepError message={flowStepErrors.step5} /> : (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Laptop Incident Ticket:</strong> <strong style={{ color: '#059669' }}>{flowData?.laptopProvisioning?.ticketNumber || activeFlowCandidate.laptopTicket || 'INC0040420'}</strong></div>
                    <div>• <strong>Category:</strong> <span className="badge badge-verified" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>Hardware</span></div>
                    <div>• <strong>Hardware:</strong> {activeFlowCandidate.hardware || 'Apple MacBook Pro M3 Max'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '1px' }}>
                      <i className="fa-solid fa-truck-fast"></i> Dispatched to IT Desk with OrangeHRM Employee #{flowData?.orangeHrm?.empNumber || activeFlowCandidate.orangeHrmEmpNumber || '17'}
                    </div>
                  </div>
                  )}
                </div>
              </FlowStep>

              {/* FAILURE END NODE: shown when the run finished but one or more steps did not complete */}
              {flowFinished && flowHasErrors && (
                <div className="flow-summary flow-summary-error">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <div>
                    <strong>Finished with {Object.keys(flowStepErrors).length} step(s) needing attention</strong>
                    <div>Fix the failed system and approve again, or complete it manually.</div>
                  </div>
                </div>
              )}

              {/* COMPLETION END NODE: Green Tick Mark Milestone */}
              {flowFinished && !flowHasErrors && (
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
              )}

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
                background: 'var(--button-gradient)',
                borderColor: 'transparent',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i> Open OrangeHRM
            </a>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </section>
  );
}
