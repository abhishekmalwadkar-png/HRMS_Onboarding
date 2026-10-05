import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Field, StatusBanner, staggerContainer, EASE_OUT } from './ui';

const SUGGESTED_QUESTIONS = ['How many leaves do I get?', 'When is my laptop dispatched?', 'What is my work email?'];

// Inclusive day count between two ISO dates; 0 when the range is invalid
function daysBetween(from, to) {
  if (!from || !to) return 0;
  const diff = (new Date(to) - new Date(from)) / 86400000;
  return diff >= 0 ? Math.round(diff) + 1 : 0;
}

function leaveStatusClass(status) {
  if (status === 'Approved') return 'badge-approved';
  if (status?.startsWith('Pending')) return 'badge-pending';
  return 'badge-draft';
}

export default function ServicesView() {
  const { showToast } = useToast();

  const [leaveBalances] = useState({
    casual: 12,
    sick: 8,
    privilege: 15,
  });

  const [leaveRequests, setLeaveRequests] = useState([
    { id: 'LR-301', type: 'Privilege Leave', from: '2026-10-10', to: '2026-10-14', days: 5, status: 'Approved' },
    { id: 'LR-302', type: 'Casual Leave', from: '2026-10-24', to: '2026-10-24', days: 1, status: 'Pending Manager Approval' },
  ]);

  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [fromDate, setFromDate] = useState('2026-11-04');
  const [toDate, setToDate] = useState('2026-11-05');
  const [reason, setReason] = useState('Personal family event');
  const [leaveError, setLeaveError] = useState('');
  const [leaveResult, setLeaveResult] = useState(null);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! I am your HR policy assistant. Ask me about leave rules, laptops, email accounts or employee benefits.', sender: 'bot' },
  ]);
  const chatLogRef = useRef(null);

  const requestedDays = daysBetween(fromDate, toDate);

  // Scroll only the chat log itself. scrollIntoView() would also scroll every ancestor,
  // including the fixed app frame, which pushed the whole page up and hid the top bar.
  useEffect(() => {
    const log = chatLogRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!requestedDays) {
      setLeaveError('The end date must be on or after the start date.');
      document.getElementById('leave-to')?.focus();
      return;
    }
    setLeaveError('');
    const newReq = {
      id: 'LR-' + Math.floor(100 + Math.random() * 900),
      type: leaveType,
      from: fromDate,
      to: toDate,
      days: requestedDays,
      status: 'Pending Manager Approval',
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
    setLeaveResult(`${leaveType} for ${requestedDays} day(s) sent to your manager for approval.`);
    showToast(`Leave request submitted (${fromDate} to ${toDate}).`, 'success');
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
        botReply = 'Full-time employees get 18 privilege leaves, 12 casual leaves and 10 sick leaves a year, with rollover options.';
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
        description="Check leave balances, request time off and get instant answers to HR policy questions."
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
        <Card title="Request leave" icon="fa-solid fa-calendar-plus">
          <AnimatePresence>
            {leaveResult && (
              <StatusBanner tone="success" title="Leave request submitted" onDismiss={() => setLeaveResult(null)}>
                {leaveResult}
              </StatusBanner>
            )}
          </AnimatePresence>

          <form onSubmit={handleApplyLeave} className="stack-form" noValidate>
            <Field id="leave-type" label="Leave type" required>
              <select className="form-control" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                <option>Casual Leave</option>
                <option>Sick Leave</option>
                <option>Privilege Leave</option>
              </select>
            </Field>
            <div className="form-grid-2">
              <Field id="leave-from" label="From" required>
                <input type="date" className="form-control" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setLeaveError(''); }} required />
              </Field>
              <Field id="leave-to" label="To" required error={leaveError}>
                <input type="date" className="form-control" min={fromDate} value={toDate} onChange={(e) => { setToDate(e.target.value); setLeaveError(''); }} required />
              </Field>
            </div>
            <Field id="leave-reason" label="Reason" required hint="Visible to your manager.">
              <textarea className="form-control" rows="2" value={reason} onChange={(e) => setReason(e.target.value)} required></textarea>
            </Field>
            <div className="form-submit-row">
              <span className="kpi-note" aria-live="polite">
                {requestedDays ? `${requestedDays} day(s) requested` : 'Choose a valid date range'}
              </span>
              <button type="submit" className="btn btn-primary">
                <i className="fa-solid fa-paper-plane" aria-hidden="true"></i> Submit request
              </button>
            </div>
          </form>

          <h3 className="subsection-title">Recent requests</h3>
          <ul className="request-list">
            {leaveRequests.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.type}</strong>
                  <div className="cell-sub">{r.from === r.to ? r.from : `${r.from} → ${r.to}`} · {r.days} day(s)</div>
                </div>
                <span className={`badge ${leaveStatusClass(r.status)}`}>{r.status}</span>
              </li>
            ))}
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
