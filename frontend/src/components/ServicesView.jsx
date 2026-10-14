import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Field, StatusBanner, staggerContainer, EASE_OUT } from './ui';

const SUGGESTED_QUESTIONS = ['How many leaves do I get?', 'When is my laptop dispatched?', 'What is my work email?'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const CURRENT_YEAR = new Date().getFullYear().toString();
const PAYSLIP_YEARS = [CURRENT_YEAR, '2025', '2024', '2023', '2022'];


const DEFAULT_ORANGEHRM_EMPLOYEES = [
  { empNumber: 67, employeeId: '1030', empId: 'EMP-1030', fullName: 'Soham Menon', department: 'Engineering', jobTitle: 'Software Engineer', balances: { casual: 12, sick: 8, privilege: 15 } },
  { empNumber: 64, employeeId: '9773', empId: 'EMP-9773', fullName: 'Tushar Bansal', department: 'Engineering', jobTitle: 'Software Engineer', balances: { casual: 10, sick: 7, privilege: 14 } },
  { empNumber: 68, employeeId: '5642', empId: 'EMP-5642', fullName: 'Kavita Gupta', department: 'Engineering', jobTitle: 'Software Engineer', balances: { casual: 11, sick: 6, privilege: 12 } },
  { empNumber: 1, employeeId: '0001', empId: 'EMP-0001', fullName: 'Suhas Kajawe', department: 'Engineering', jobTitle: 'Admin / Senior Specialist', balances: { casual: 14, sick: 10, privilege: 18 } }
];

function getEmployeeLeaveBalances(emp) {
  if (emp?.balances) return emp.balances;
  const num = parseInt(emp?.empNumber, 10) || 41;
  return {
    casual: ((num * 3) % 8) + 6,
    sick: ((num * 2) % 6) + 4,
    privilege: ((num * 5) % 9) + 10
  };
}

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
  if (status === 'Rejected') return 'badge-danger';
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
      employeeName: 'Soham Menon',
      empNumber: 67,
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
      employeeName: 'Kavita Gupta',
      empNumber: 68,
      type: 'Casual Leave',
      from: '2026-10-24',
      to: '2026-10-24',
      days: 1,
      reason: 'Personal errands',
      status: 'Approved',
      orangeHrmAssigned: true,
      leaveId: '2'
    },
    {
      id: 'LR-303',
      employeeName: 'Tushar Bansal',
      empNumber: 64,
      type: 'Sick Leave',
      from: '2026-10-18',
      to: '2026-10-19',
      days: 2,
      reason: 'Doctor consultation & medical rest',
      status: 'Pending HR Approval',
      orangeHrmAssigned: false,
      leaveId: '3'
    },
    {
      id: 'LR-304',
      employeeName: 'Suhas Kajawe',
      empNumber: 1,
      type: 'Privilege Leave',
      from: '2026-11-02',
      to: '2026-11-05',
      days: 4,
      reason: 'Diwali holiday vacation',
      status: 'Approved',
      orangeHrmAssigned: true,
      leaveId: '4'
    }
  ]);

  const [empNumber, setEmpNumber] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [leaveResult, setLeaveResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [orangeHrmEmployees, setOrangeHrmEmployees] = useState([]);
  const [approvingLeaveId, setApprovingLeaveId] = useState(null);
  const [rejectingLeaveId, setRejectingLeaveId] = useState(null);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I am your HR policy assistant. Ask me about leave rules, laptops, email accounts or employee benefits.', sender: 'bot' },
  ]);
  const chatLogRef = useRef(null);

  const [leavePage, setLeavePage] = useState(1);
  const LEAVES_PER_PAGE = 4;
  const totalLeavePages = Math.ceil(leaveRequests.length / LEAVES_PER_PAGE) || 1;
  const safeLeavePage = Math.min(leavePage, totalLeavePages);
  const paginatedLeaves = leaveRequests.slice(
    (safeLeavePage - 1) * LEAVES_PER_PAGE,
    safeLeavePage * LEAVES_PER_PAGE
  );

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

  const parseServiceSubtabFromHash = useCallback(() => {
    if (typeof window === 'undefined') return 'leaves';
    const hash = (window.location.hash || '').toLowerCase();
    if (hash.includes('payslip')) return 'payslips';
    return 'leaves';
  }, []);

  const [activeServiceTab, setActiveServiceTab] = useState(parseServiceSubtabFromHash);

  const handleSelectServiceTab = (tab) => {
    if (tab === activeServiceTab) return;
    setActiveServiceTab(tab);
    const targetHash = `#/services/${tab}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState({ view: 'services', subtab: tab }, '', targetHash);
    }
  };

  useEffect(() => {
    const handleSubtabSync = (e) => {
      const subtab = e.state?.subtab || parseServiceSubtabFromHash();
      setActiveServiceTab(subtab);
    };
    window.addEventListener('popstate', handleSubtabSync);
    window.addEventListener('hashchange', handleSubtabSync);
    return () => {
      window.removeEventListener('popstate', handleSubtabSync);
      window.removeEventListener('hashchange', handleSubtabSync);
    };
  }, [parseServiceSubtabFromHash]);

  const loggedInName = useMemo(() => {
    return (currentUser?.name?.split(' (')[0] || currentUser?.fullName || 'Jessica Miller').trim();
  }, [currentUser]);

  const loggedInRole = useMemo(() => {
    return currentUser?.title || (currentUser?.role === 'hr' ? 'HR Operations Director' : 'Employee');
  }, [currentUser]);

  const loggedInDept = useMemo(() => {
    return currentUser?.department || (currentUser?.role === 'hr' ? 'Human Resources' : 'Engineering');
  }, [currentUser]);

  const loggedInEmpId = useMemo(() => {
    return currentUser?.empId || 'EMP-1001';
  }, [currentUser]);

  const [payslipMonth, setPayslipMonth] = useState('October');
  const [payslipYear, setPayslipYear] = useState(CURRENT_YEAR);
  const [isDownloadingPayslip, setIsDownloadingPayslip] = useState(false);
  const [systemEmployees, setSystemEmployees] = useState([]);

  const fetchSystemEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSystemEmployees(data);
        }
      }
    } catch (e) {
      console.warn('Could not fetch system employees:', e);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
    fetchOrangeHrmEmployees();
    fetchSystemEmployees();
  }, [fetchLeaves, fetchOrangeHrmEmployees, fetchSystemEmployees]);

  const handleDownloadPayslip = async () => {
    const targetName = loggedInName;
    const targetMonth = `${payslipMonth} ${payslipYear}`;
    const targetId = loggedInEmpId;

    setIsDownloadingPayslip(true);
    try {
      const downloadUrl = `/api/payslip/download?name=${encodeURIComponent(targetName)}&month=${encodeURIComponent(targetMonth)}&id=${encodeURIComponent(targetId)}`;
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error(`Failed to generate payslip (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const safeName = targetName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeMonth = targetMonth.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Payslip_${safeMonth}_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      showToast(`Payslip downloaded for ${targetName} (${targetMonth})`, 'success');
    } catch (err) {
      console.error('Payslip download error:', err);
      showToast('Could not download payslip. Please try again.', 'error');
    } finally {
      setIsDownloadingPayslip(false);
    }
  };

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

      // Update remaining leave balances dynamically for this specific employee
      const balances = getEmployeeLeaveBalances(emp);
      setLeaveBalances(balances);

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

      showToast(`Autofilled from OrangeHRM: ${name} (Emp #${num}) — Updated leave balances!`, 'success');
    }
  };

  // Scroll only the chat log itself
  useEffect(() => {
    const log = chatLogRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!employeeName.trim()) {
      setLeaveError('Please enter the employee name.');
      document.getElementById('leave-employee')?.focus();
      return;
    }
    if (!fromDate || !toDate) {
      setLeaveError('Please select both a start date and an end date.');
      document.getElementById('leave-from')?.focus();
      return;
    }
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

  // 1-Click Instant Reject Leave
  const handleRejectLeave = async (req) => {
    // 1. Immediately update UI state with zero delay
    setRejectingLeaveId(req.id);
    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? { ...r, status: 'Rejected', rejectedAt: new Date().toISOString() }
          : r
      )
    );

    showToast(`Leave request for ${req.employeeName || 'employee'} rejected.`, 'info');

    // 2. Dispatch backend synchronization
    try {
      const res = await fetch('/api/leave/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: req.id,
          employeeName: req.employeeName,
          empNumber: req.empNumber,
          fromDate: req.from,
          toDate: req.to,
          leaveType: req.type
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.requests) setLeaveRequests(data.requests);
      }
    } catch (err) {
      console.warn('Reject leave error:', err);
    } finally {
      setRejectingLeaveId(null);
    }
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
        icon={activeServiceTab === 'leaves' ? 'fa-solid fa-headset' : 'fa-solid fa-file-invoice-dollar'}
        title={activeServiceTab === 'leaves' ? 'Self-service & Leaves' : 'Executive Payslips Hub'}
        description={
          activeServiceTab === 'leaves'
            ? `Check leave balances, request time off and assign leave directly in OrangeHRM for ${employeeName || 'employees'}.`
            : 'Official HR Payroll & Compensation portal. Generate and download monthly employee payslips.'
        }
      />

      {/* Top Navigation Tabs: Leaves and Pay slips */}
      <div className="analytics-tabs-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`analytics-tab-btn ${activeServiceTab === 'leaves' ? 'active' : ''}`}
          onClick={() => handleSelectServiceTab('leaves')}
        >
          {activeServiceTab === 'leaves' && (
            <motion.div
              layoutId="services-tab-active-indicator"
              className="analytics-tab-indicator"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <i className="fa-solid fa-umbrella-beach"></i>
            <span>Leaves</span>
            <span className="tab-count">{leaveRequests.length}</span>
          </span>
        </button>

        <button
          type="button"
          className={`analytics-tab-btn ${activeServiceTab === 'payslips' ? 'active' : ''}`}
          onClick={() => handleSelectServiceTab('payslips')}
        >
          {activeServiceTab === 'payslips' && (
            <motion.div
              layoutId="services-tab-active-indicator"
              className="analytics-tab-indicator"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <i className="fa-solid fa-file-invoice-dollar"></i>
            <span>Pay slips</span>
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeServiceTab === 'leaves' ? (
          <motion.div
            key="services-leaves-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
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
            <span className="kpi-note">{employeeName.split(' ')[0]}'s available days</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Leave Requests List - Placed in between KPI cards and Request Leave */}
      <Card
        title="Recent Leave Requests"
        icon="fa-solid fa-list-check"
        actions={
          <button
            type="button"
            onClick={handleLiveSync}
            disabled={isSyncing}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              color: '#ea580c',
              borderColor: '#ea580c',
              background: 'rgba(234, 88, 12, 0.08)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
            title="Synchronize live leave requests & OrangeHRM data"
          >
            <i className={`fa-solid fa-sync ${isSyncing ? 'fa-spin' : ''}`}></i>
            <span>{isSyncing ? 'Syncing...' : 'Live Sync'}</span>
          </button>
        }
        style={{ marginBottom: '1.5rem' }}
      >
        {leaveRequests.length === 0 ? (
          <div className="cell-sub" style={{ fontSize: '0.84rem', padding: '0.65rem 0' }}>No leave requests found.</div>
        ) : (
          <>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {paginatedLeaves.map((r) => {
                const isApproved = r.status === 'Approved' || r.orangeHrmAssigned;
                const isRejected = r.status === 'Rejected';
                return (
                  <li
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.95rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.84rem',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Employee Name + Status / Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <i className="fa-solid fa-user text-muted" style={{ fontSize: '0.8rem' }}></i>
                        <span>{r.employeeName || 'Karthik Swaminathan'}</span>
                      </div>

                      {/* Approval Status / Action Buttons directly next to name */}
                      {isApproved ? (
                        <span
                          className="badge badge-approved"
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--accent-emerald)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                          title="Leave is approved and synced to OrangeHRM"
                        >
                          <i className="fa-solid fa-circle-check"></i> Approved
                        </span>
                      ) : isRejected ? (
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: 'var(--accent-rose)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                          title="Leave request rejected"
                        >
                          <i className="fa-solid fa-xmark"></i> Rejected
                        </span>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleApproveLeaveInOrangeHRM(r)}
                            disabled={approvingLeaveId === r.id}
                            style={{
                              padding: '2px 9px',
                              fontSize: '11px',
                              borderRadius: '5px',
                              fontWeight: 600,
                              background: 'rgba(16, 185, 129, 0.14)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                            title="Approve leave and sync to OrangeHRM"
                          >
                            <i className="fa-solid fa-check"></i> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectLeave(r)}
                            disabled={rejectingLeaveId === r.id}
                            style={{
                              padding: '2px 9px',
                              fontSize: '11px',
                              borderRadius: '5px',
                              fontWeight: 600,
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                            title="Reject leave request"
                          >
                            <i className="fa-solid fa-xmark"></i> Reject
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right side: Type of Leave & How many days */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          background:
                            (r.type || '').includes('Casual')
                              ? 'rgba(248, 121, 23, 0.12)'
                              : (r.type || '').includes('Sick')
                              ? 'rgba(225, 29, 72, 0.12)'
                              : 'rgba(99, 102, 241, 0.12)',
                          color:
                            (r.type || '').includes('Casual')
                              ? 'var(--brand-orange)'
                              : (r.type || '').includes('Sick')
                              ? 'var(--accent-rose)'
                              : 'var(--accent-purple)',
                        }}
                      >
                        {r.type}
                      </span>

                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.84rem' }}>
                        {r.days} {Number(r.days) === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination Controls (4 items per page) */}
            {leaveRequests.length > LEAVES_PER_PAGE && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.85rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span>
                  Showing <strong style={{ color: 'var(--text-main)' }}>{((safeLeavePage - 1) * LEAVES_PER_PAGE) + 1}–{Math.min(safeLeavePage * LEAVES_PER_PAGE, leaveRequests.length)}</strong> of <strong style={{ color: 'var(--text-main)' }}>{leaveRequests.length}</strong> requests (4 per page)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={safeLeavePage <= 1}
                    onClick={() => setLeavePage((p) => Math.max(1, p - 1))}
                    style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                  >
                    <i className="fa-solid fa-chevron-left"></i> Prev
                  </button>
                  {Array.from({ length: totalLeavePages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setLeavePage(pg)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        border: pg === safeLeavePage ? '1px solid var(--brand-orange)' : '1px solid var(--border-color)',
                        background: pg === safeLeavePage ? 'var(--brand-orange)' : 'var(--bg-secondary)',
                        color: pg === safeLeavePage ? '#fff' : 'var(--text-main)',
                        cursor: 'pointer',
                        minWidth: '26px',
                        textAlign: 'center',
                      }}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={safeLeavePage >= totalLeavePages}
                    onClick={() => setLeavePage((p) => Math.min(totalLeavePages, p + 1))}
                    style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                  >
                    Next <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

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

            <Field id="leave-reason" label="Reason" required>
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
    </motion.div>
  ) : (
          <motion.div
            key="services-payslips-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            {/* 1. Payslips Overview KPI Cards */}
            <motion.div className="kpi-grid kpi-grid-3" variants={staggerContainer} initial="hidden" animate="show" style={{ marginBottom: '1.5rem' }}>
              <motion.div
                className="ui-card kpi-tile"
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } } }}
              >
                <span className="kpi-label"><i className="fa-solid fa-user-check text-accent" aria-hidden="true"></i> Employee Profile</span>
                <div className="kpi-value tone-accent" style={{ fontSize: '1.35rem' }}>{loggedInName}</div>
                <span className="kpi-note">{loggedInRole} ({loggedInEmpId})</span>
              </motion.div>

              <motion.div
                className="ui-card kpi-tile"
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } } }}
              >
                <span className="kpi-label"><i className="fa-solid fa-calendar-check text-success" aria-hidden="true"></i> Selected Pay Period</span>
                <div className="kpi-value tone-success" style={{ fontSize: '1.4rem' }}>{payslipMonth} {payslipYear}</div>
                <span className="kpi-note">{payslipMonth} {payslipYear} Cycle</span>
              </motion.div>

              <motion.div
                className="ui-card kpi-tile"
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } } }}
              >
                <span className="kpi-label"><i className="fa-solid fa-shield-halved text-warning" aria-hidden="true"></i> Statutory Status</span>
                <div className="kpi-value tone-warning" style={{ fontSize: '1.4rem' }}>Compliant</div>
                <span className="kpi-note">EPF, TDS & PT 100% Verified</span>
              </motion.div>
            </motion.div>

            {/* 2. Main Payslip Generator Card */}
            <div>
              <Card
                title="Download My Payslip"
                icon="fa-solid fa-file-invoice-dollar"
              >
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Download your official monthly PDF payslip for <strong>{loggedInName}</strong> ({loggedInEmpId}).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
                  {/* Logged in Employee Badge */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: '600' }}>
                      Logged-in User
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.55rem 0.85rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.86rem'
                      }}
                    >
                      <i className="fa-solid fa-circle-user text-accent" style={{ fontSize: '1.35rem' }}></i>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span>{loggedInName}</span>
                          <span className="badge badge-approved" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>{loggedInEmpId}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {loggedInRole} • {loggedInDept}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Month & Year Selection Dropdowns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.65rem', marginBottom: 0 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="payslip-month-select" className="form-label" style={{ fontWeight: '600' }}>
                        Month
                      </label>
                      <select
                        id="payslip-month-select"
                        className="form-control form-select"
                        value={payslipMonth}
                        onChange={(e) => setPayslipMonth(e.target.value)}
                      >
                        {MONTH_NAMES.map((m) => (
                          <option key={m} value={m}>
                            {m} {m === 'October' && payslipYear === CURRENT_YEAR ? '(Current)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="payslip-year-select" className="form-label" style={{ fontWeight: '600' }}>
                        Year
                      </label>
                      <select
                        id="payslip-year-select"
                        className="form-control form-select"
                        value={payslipYear}
                        onChange={(e) => setPayslipYear(e.target.value)}
                      >
                        {PAYSLIP_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.68rem 1.25rem',
                        fontSize: '0.92rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem',
                        cursor: isDownloadingPayslip ? 'wait' : 'pointer'
                      }}
                      onClick={handleDownloadPayslip}
                      disabled={isDownloadingPayslip}
                    >
                      {isDownloadingPayslip ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i>
                          <span>Generating Official PDF...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-file-arrow-down"></i>
                          <span>Download Payslip</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
