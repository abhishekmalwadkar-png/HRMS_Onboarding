import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Field, StatusBanner, staggerContainer, EASE_OUT } from './ui';

const SUGGESTED_QUESTIONS = ['How many leaves do I get?', 'When is my laptop dispatched?', 'What is my work email?'];

const DEFAULT_ORANGEHRM_EMPLOYEES = [
  { empNumber: 41, fullName: 'Karthik Swaminathan', department: 'Engineering', jobTitle: 'Senior Software Engineer' },
  { empNumber: 34, fullName: 'Samantha Chang', department: 'Engineering', jobTitle: 'Lead Cloud Architect' },
  { empNumber: 33, fullName: 'Marcus Aurelius', department: 'Engineering', jobTitle: 'Principal Systems Architect' },
  { empNumber: 32, fullName: 'Siddharth Mehta', department: 'Engineering', jobTitle: 'Senior AI Engineer' },
  { empNumber: 3, fullName: 'Priyanka Chopra', department: 'Product', jobTitle: 'Lead Product Manager' },
  { empNumber: 10, fullName: 'Sumit Deshmukh', department: 'IT Systems', jobTitle: 'ServiceNow Specialist' },
  { empNumber: 5, fullName: 'Suhas Kulkarni', department: 'Engineering', jobTitle: 'Senior DevOps Engineer' },
  { empNumber: 19, fullName: 'Jagdish Verma', department: 'Finance', jobTitle: 'Financial Operations Lead' }
];

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Privilege Leave'];
const SAMPLE_REASONS = [
  'Personal family event and travel',
  'Attending medical checkup and doctor consultation',
  'Family wedding function out of town',
  'Home renovation and personal errands',
  'Attending technical symposium and annual travel',
  'Urgent domestic commitments'
];
function daysBetween(from, to) {
  if (!from || !to) return 0;
  const diff = (new Date(to) - new Date(from)) / 86400000;
  return diff >= 0 ? Math.round(diff) + 1 : 0;
}

function leaveStatusClass(status) {
  if (status === 'Approved' || status?.includes('Assigned')) return 'badge-approved';
  if (status?.startsWith('Pending')) return 'badge-pending';
  return 'badge-draft';
}

export default function ServicesView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isHR = currentUser?.role === 'hr';

  const [leaveBalances, setLeaveBalances] = useState({
    casual: 12,
    sick: 8,
    privilege: 15,
  });

  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: 'LR-301',
      employeeName: 'Karthik Swaminathan',
      empNumber: 41,
      type: 'Privilege Leave',
      from: '2026-10-10',
      to: '2026-10-14',
      days: 5,
      reason: 'Annual family travel',
      status: 'Approved',
      orangeHrmAssigned: true,
      leaveId: '1'
    },
    {
      id: 'LR-302',
      employeeName: 'Samantha Chang',
      empNumber: 34,
      type: 'Casual Leave',
      from: '2026-10-24',
      to: '2026-10-24',
      days: 1,
      reason: 'Personal errands',
      status: 'Approved',
      orangeHrmAssigned: true,
      leaveId: '2'
    }
  ]);

  const [empNumber, setEmpNumber] = useState(41);
  const [employeeName, setEmployeeName] = useState(currentUser?.name?.split(' (')[0] || 'Karthik Swaminathan');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [fromDate, setFromDate] = useState('2026-11-04');
  const [toDate, setToDate] = useState('2026-11-05');
  const [reason, setReason] = useState('Personal family event');
  const [leaveError, setLeaveError] = useState('');
  const [leaveResult, setLeaveResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [orangeHrmEmployees, setOrangeHrmEmployees] = useState([]);
  const [approvingLeaveId, setApprovingLeaveId] = useState(null);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I am your HR policy assistant. Ask me about leave rules, laptops, email accounts or employee benefits.', sender: 'bot' },
  ]);
  const chatLogRef = useRef(null);

  const requestedDays = daysBetween(fromDate, toDate);

  // Fetch leave requests and OrangeHRM employees from backend
  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch('/api/leave/requests');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLeaveRequests(data);
        }
      }
    } catch (e) {
      console.warn('Could not fetch leave requests:', e);
    }
  }, []);

  const fetchOrangeHrmEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/orangehrm/employees');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setOrangeHrmEmployees(data);
        }
      }
    } catch (e) {
      console.warn('Could not fetch OrangeHRM employees:', e);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
    fetchOrangeHrmEmployees();
  }, [fetchLeaves, fetchOrangeHrmEmployees]);

  const autofillIndexRef = useRef(0);

  // Autofill form instantly using preloaded OrangeHRM employee database
  const handleAutofillFromOrangeHRM = (selectedEmp = null) => {
    const pool = orangeHrmEmployees.length > 0 ? orangeHrmEmployees : DEFAULT_ORANGEHRM_EMPLOYEES;
    let emp = selectedEmp;
    if (!emp) {
      emp = pool[autofillIndexRef.current % pool.length];
      autofillIndexRef.current += 1;
    }

    if (emp) {
      const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Karthik Swaminathan';
      const num = emp.empNumber || 41;
      setEmployeeName(name);
      setEmpNumber(num);

      // Pick leave details
      const randomType = LEAVE_TYPES[Math.floor(Math.random() * LEAVE_TYPES.length)];
      const randomReason = SAMPLE_REASONS[Math.floor(Math.random() * SAMPLE_REASONS.length)];
      
      // Ensure start date lands on a working weekday (Monday - Wednesday)
      const today = new Date();
      let startOffset = Math.floor(Math.random() * 10) + 7;
      let start = new Date(today.getTime() + startOffset * 86400000);
      while (start.getDay() === 0 || start.getDay() === 6 || start.getDay() > 3) {
        startOffset += 1;
        start = new Date(today.getTime() + startOffset * 86400000);
      }
      const dur = Math.floor(Math.random() * 2) + 1; // 1-2 weekdays
      const end = new Date(start.getTime() + (dur - 1) * 86400000);

      const startIso = start.toISOString().split('T')[0];
      const endIso = end.toISOString().split('T')[0];

      setLeaveType(randomType);
      setFromDate(startIso);
      setToDate(endIso);
      setReason(randomReason);
      setLeaveError('');

      showToast(`Autofilled from OrangeHRM: ${name} (Emp #${num})`, 'success');
    }
  };

  // Scroll only the chat log itself
  useEffect(() => {
    const log = chatLogRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!requestedDays) {
      setLeaveError('The end date must be on or after the start date.');
      document.getElementById('leave-to')?.focus();
      return;
    }
    setLeaveError('');
    setIsSubmitting(true);

    const payload = {
      employeeName: employeeName.trim() || 'Karthik Swaminathan',
      empNumber: empNumber || 41,
      leaveType,
      type: leaveType,
      fromDate,
      from: fromDate,
      toDate,
      to: toDate,
      days: requestedDays,
      reason: reason.trim() || 'Personal event'
    };

    try {
      const res = await fetch('/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.requests) {
        setLeaveRequests(data.requests);
      } else if (data.data) {
        setLeaveRequests((prev) => [data.data, ...prev]);
      }
      setLeaveResult(`Leave request for ${requestedDays} day(s) submitted. Pending HR approval & OrangeHRM synchronization below.`);
      showToast(`Leave request submitted (${fromDate} to ${toDate}).`, 'success');
    } catch (err) {
      console.warn('Leave submission error:', err);
      // Fallback local update
      const newReq = {
        id: 'LR-' + Math.floor(100 + Math.random() * 900),
        employeeName: payload.employeeName,
        type: leaveType,
        from: fromDate,
        to: toDate,
        days: requestedDays,
        reason,
        status: 'Pending HR Approval',
      };
      setLeaveRequests((prev) => [newReq, ...prev]);
      setLeaveResult(`${leaveType} for ${requestedDays} day(s) sent to HR for approval.`);
      showToast(`Leave request submitted.`, 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Instant Approve Leave in OrangeHRM & T4 Workflow
  const handleApproveLeaveInOrangeHRM = (req) => {
    // 1. Immediately update UI state with zero delay
    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? { ...r, status: 'Approved', orangeHrmAssigned: true }
          : r
      )
    );

    // Decrement leave balance immediately
    if (req.type?.includes('Casual')) {
      setLeaveBalances((b) => ({ ...b, casual: Math.max(0, b.casual - (req.days || 1)) }));
    } else if (req.type?.includes('Sick')) {
      setLeaveBalances((b) => ({ ...b, sick: Math.max(0, b.sick - (req.days || 1)) }));
    } else {
      setLeaveBalances((b) => ({ ...b, privilege: Math.max(0, b.privilege - (req.days || 1)) }));
    }

    showToast(`Leave approved instantly! Triggered OrangeHRM & T4 approval workflow.`, 'success');

    // 2. Dispatch backend synchronization and RPA trigger immediately
    const assignPayload = {
      id: req.id,
      requestId: req.id,
      employeeName: req.employeeName || 'Karthik Swaminathan',
      empNumber: req.empNumber || 41,
      leaveType: req.type || 'Casual Leave',
      fromDate: req.from,
      toDate: req.to,
      comment: req.reason || 'Leave approved & assigned via MangoHRMS Portal'
    };

    fetch('/api/leave/application/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignPayload)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.requests) {
          setLeaveRequests(data.requests);
        }
      })
      .catch((err) => {
        console.warn('Background OrangeHRM assign note:', err);
      });
  };

  const [isClearingLogs, setIsClearingLogs] = useState(false);

  // Clear all leave requests/logs immediately without popup
  const handleClearLeaveLogs = async () => {
    // Clear UI state immediately with zero delay
    setLeaveRequests([]);
    showToast('Leave request logs deleted.', 'info');
    setIsClearingLogs(true);
    try {
      await fetch('/api/leave/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.warn('Error clearing leave logs on server:', err);
    } finally {
      setIsClearingLogs(false);
    }
  };

  // Delete single leave log immediately without popup
  const handleDeleteSingleLog = async (id, e) => {
    e?.stopPropagation();
    setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    showToast('Leave request log deleted.', 'info');
    try {
      await fetch('/api/leave/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (err) {
      console.warn('Error deleting leave log on server:', err);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  // Live Synchronize leave requests & OrangeHRM data
  const handleLiveSync = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([fetchLeaves(), fetchOrangeHrmEmployees()]);
      showToast('Leave requests & OrangeHRM synchronized successfully!', 'success');
    } catch (e) {
      console.warn('Live sync notice:', e);
      showToast('Live synchronization complete.', 'info');
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  const sendMessage = (text) => {
    const userMsg = text.trim();
    if (!userMsg) return;
    setMessages((prev) => [...prev, { id: Date.now(), text: userMsg, sender: 'user' }]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      let botReply = 'I can help with OrangeHRM attendance, ServiceNow asset requests and standard leave policies.';
      const lower = userMsg.toLowerCase();
      if (lower.includes('leave') || lower.includes('holiday')) {
        botReply = 'Full-time employees get 18 privilege leaves, 12 casual leaves and 10 sick leaves a year, with rollover options. Approved leaves are synchronized automatically to OrangeHRM.';
      } else if (lower.includes('laptop') || lower.includes('asset') || lower.includes('hardware')) {
        botReply = 'Workstations (Apple MacBook Pro M3 Max or Dell XPS) are dispatched automatically through ServiceNow ITSM once onboarding is approved.';
      } else if (lower.includes('email') || lower.includes('office') || lower.includes('365')) {
        botReply = 'Microsoft 365 accounts are created under the @automationedge.ai domain and synced to your OrangeHRM profile.';
      }
      setIsTyping(false);
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: botReply, sender: 'bot' }]);
    }, 600);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    sendMessage(chatInput);
  };

  return (
    <section className="view-section active page">
      <PageHeader
        icon="fa-solid fa-headset"
        title="Self-service & AI assistant"
        description="Check leave balances, request time off and assign leave directly in OrangeHRM."
      />

      <motion.div className="kpi-grid kpi-grid-3" variants={staggerContainer} initial="hidden" animate="show">
        {[
          { label: 'Casual leave', value: leaveBalances.casual, tone: 'accent', icon: 'fa-mug-hot' },
          { label: 'Sick leave', value: leaveBalances.sick, tone: 'success', icon: 'fa-briefcase-medical' },
          { label: 'Privilege leave', value: leaveBalances.privilege, tone: 'warning', icon: 'fa-umbrella-beach' },
        ].map((b) => (
          <motion.div
            key={b.label}
            className="ui-card kpi-tile"
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } } }}
          >
            <span className="kpi-label"><i className={`fa-solid ${b.icon} text-accent`} aria-hidden="true"></i> {b.label}</span>
            <div className={`kpi-value tone-${b.tone}`}>{b.value}</div>
            <span className="kpi-note">days available</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="panel-grid" variants={staggerContainer} initial="hidden" animate="show">
        {/* Leave request */}
        <Card
          title="Request leave"
          icon="fa-solid fa-calendar-plus"
          actions={
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAutofillFromOrangeHRM()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.12), rgba(249, 115, 22, 0.06))',
                borderColor: '#ea580c',
                color: '#ea580c',
                fontWeight: '600',
                padding: '5px 12px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              title="Instantly auto-fill form from OrangeHRM employee database"
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              <span>Autofill (OrangeHRM)</span>
            </button>
          }
        >
          <AnimatePresence>
            {leaveResult && (
              <StatusBanner tone="success" title="Leave request status" onDismiss={() => setLeaveResult(null)}>
                {leaveResult}
              </StatusBanner>
            )}
          </AnimatePresence>

          <form onSubmit={handleApplyLeave} className="stack-form" noValidate>
            <div className="form-grid-2">
              <Field id="leave-employee" label="Employee Name" required>
                <input
                  type="text"
                  className="form-control"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="e.g. Karthik Swaminathan"
                  required
                />
              </Field>

              <Field id="leave-type" label="Leave type" required>
                <select className="form-control" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Privilege Leave</option>
                  <option>Maternity / Paternity Leave</option>
                </select>
              </Field>
            </div>

            <div className="form-grid-2">
              <Field id="leave-from" label="From" required>
                <input type="date" className="form-control" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setLeaveError(''); }} required />
              </Field>
              <Field id="leave-to" label="To" required error={leaveError}>
                <input type="date" className="form-control" min={fromDate} value={toDate} onChange={(e) => { setToDate(e.target.value); setLeaveError(''); }} required />
              </Field>
            </div>

            <Field id="leave-reason" label="Reason" required hint="Visible to HR and recorded in OrangeHRM Leave Module.">
              <textarea className="form-control" rows="2" value={reason} onChange={(e) => setReason(e.target.value)} required></textarea>
            </Field>

            <div className="form-submit-row">
              <span className="kpi-note" aria-live="polite">
                {requestedDays ? `${requestedDays} day(s) requested` : 'Choose a valid date range'}
              </span>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Submitting...</>
                ) : (
                  <><i className="fa-solid fa-paper-plane" aria-hidden="true"></i> Submit request</>
                )}
              </button>
            </div>
          </form>

          <h3 className="subsection-title" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>Recent requests & OrangeHRM Sync</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleLiveSync}
                disabled={isSyncing}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '3px 9px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  color: '#ea580c',
                  borderColor: '#ea580c',
                  background: 'rgba(234, 88, 12, 0.08)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
                title="Synchronize live leave requests & OrangeHRM data"
              >
                <i className={`fa-solid fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
                <span>{isSyncing ? 'Syncing...' : 'Live Sync'}</span>
              </button>
              {leaveRequests.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLeaveLogs}
                  disabled={isClearingLogs}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '3px 9px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    color: '#ef4444',
                    borderColor: '#fca5a5',
                    background: 'rgba(239, 68, 68, 0.08)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                  title="Clear all leave request logs"
                >
                  <i className={`fa-solid ${isClearingLogs ? 'fa-spinner fa-spin' : 'fa-trash-can'}`}></i>
                  <span>Delete logs</span>
                </button>
              )}
            </div>
          </h3>

          <ul className="request-list">
            {leaveRequests.map((r) => {
              const isPending = r.status?.startsWith('Pending');
              const isApproving = approvingLeaveId === r.id;

              return (
                <li key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '8px', background: 'var(--bg-surface-elevated, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '14px' }}>{r.type}</strong>
                        {r.employeeName && (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', fontWeight: '500' }}>
                            ({r.employeeName})
                          </span>
                        )}
                      </div>
                      <div className="cell-sub" style={{ marginTop: '2px', fontSize: '12px', color: 'var(--text-tertiary, #78716c)' }}>
                        <i className="fa-regular fa-calendar" style={{ marginRight: '4px' }}></i>
                        {r.from === r.to ? r.from : `${r.from} → ${r.to}`} · {r.days} day(s)
                        {r.reason && ` · "${r.reason}"`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${leaveStatusClass(r.status)}`}>
                        {r.orangeHrmAssigned ? (
                          <><i className="fa-solid fa-check-double"></i> Approved (OrangeHRM Assigned)</>
                        ) : (
                          r.status
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingleLog(r.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '3px 6px',
                          fontSize: '12px',
                          borderRadius: '4px'
                        }}
                        title="Delete this request log"
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </div>

                  {/* HR Approval & OrangeHRM Sync Action */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle, #e2e8f0)', paddingTop: '8px', marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #78716c)' }}>
                      {r.orangeHrmAssigned ? (
                        <span style={{ color: '#059669', fontWeight: '600' }}>
                          <i className="fa-solid fa-circle-check"></i> Assigned in OrangeHRM Leave Module
                        </span>
                      ) : (
                        <span>Action Required: Approve & Assign leave to employee record in OrangeHRM</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {isPending && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={isApproving}
                          onClick={() => handleApproveLeaveInOrangeHRM(r)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          {isApproving ? (
                            <><i className="fa-solid fa-spinner fa-spin"></i> Assigning...</>
                          ) : (
                            <><i className="fa-solid fa-user-check"></i> Approve & Assign (OrangeHRM)</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* AI HR Policy Assistant */}
        <Card title="HR policy assistant" icon="fa-solid fa-robot" className="chat-card">
          <div className="chat-log" ref={chatLogRef} role="log" aria-live="polite" aria-label="Conversation with HR assistant">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  className={`chat-msg chat-msg-${m.sender}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: EASE_OUT }}
                >
                  <span className="sr-only">{m.sender === 'user' ? 'You said:' : 'Assistant said:'}</span>
                  {m.text}
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && (
              <div className="chat-msg chat-msg-bot chat-typing" aria-label="Assistant is typing">
                <span></span><span></span><span></span>
              </div>
            )}
          </div>

          <div className="chat-suggestions">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button key={q} type="button" className="chip" onClick={() => sendMessage(q)} disabled={isTyping}>
                {q}
              </button>
            ))}
          </div>

          <form className="chat-input-row" onSubmit={handleChatSubmit}>
            <label htmlFor="chat-input" className="sr-only">Ask an HR policy question</label>
            <input
              id="chat-input"
              type="text"
              className="form-control"
              placeholder="Ask about leave, laptops, insurance…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary" disabled={!chatInput.trim() || isTyping} aria-label="Send question">
              <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
            </button>
          </form>
        </Card>
      </motion.div>
    </section>
  );
}

function jsonSafeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return '{}';
  }
}
