import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';

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

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: '👋 Hello! I am your AI HR Policy Assistant. Ask me anything about Leave rules, Payslips, Health insurance, or Employee benefits!', sender: 'bot' },
  ]);

  const handleApplyLeave = (e) => {
    e.preventDefault();
    const newReq = {
      id: 'LR-' + Math.floor(100 + Math.random() * 900),
      type: leaveType,
      from: fromDate,
      to: toDate,
      days: 2,
      status: 'Pending Manager Approval',
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
    showToast(`✓ Leave request submitted (${fromDate} to ${toDate}).`, 'success');
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setMessages((prev) => [...prev, { id: Date.now(), text: userMsg, sender: 'user' }]);
    setChatInput('');

    setTimeout(() => {
      let botReply = 'I can help answer questions regarding OrangeHRM attendance, ServiceNow asset requests, and standard leave policies.';
      const lower = userMsg.toLowerCase();
      if (lower.includes('leave') || lower.includes('holiday')) {
        botReply = '🌴 Full-time employees are entitled to 18 Privilege Leaves, 12 Casual Leaves, and 10 Sick Leaves annually with rollover options.';
      } else if (lower.includes('laptop') || lower.includes('asset') || lower.includes('hardware')) {
        botReply = '💻 Workstations are standard Apple MacBook Pro M3 Max or Dell XPS models dispatched automatically via ServiceNow ITSM upon onboarding approval.';
      } else if (lower.includes('email') || lower.includes('office') || lower.includes('365')) {
        botReply = '📧 Corporate Microsoft 365 accounts are provisioned under @automationedge.ai domain and synchronized directly with your OrangeHRM profile.';
      }
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: botReply, sender: 'bot' }]);
    }, 600);
  };

  return (
    <section className="view-section active">
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h2><i className="fa-solid fa-headset text-accent"></i> Employee Self-Service & AI Support</h2>
        <p style={{ color: 'var(--text-muted)' }}>Leave balance tracking, requests submission, and AI HR Policy Assistant.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Leave Balances & Form */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-calendar-days text-accent"></i> Apply for Leave</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--brand-orange)' }}>{leaveBalances.casual}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Casual Leaves</span>
            </div>
            <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>{leaveBalances.sick}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sick Leaves</span>
            </div>
            <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0284c7' }}>{leaveBalances.privilege}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Privilege Leaves</span>
            </div>
          </div>

          <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label>Leave Type</label>
              <select className="form-control" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                <option>Casual Leave</option>
                <option>Sick Leave</option>
                <option>Privilege Leave</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label>From Date</label>
                <input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>To Date</label>
                <input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label>Reason</label>
              <textarea className="form-control" rows="2" value={reason} onChange={(e) => setReason(e.target.value)} required></textarea>
            </div>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent-gradient)', borderColor: 'transparent', fontWeight: 800 }}>
              <i className="fa-solid fa-paper-plane"></i> Submit Leave Request
            </button>
          </form>
        </div>

        {/* AI HR Policy Assistant */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-robot text-accent"></i> AI HR Policy Assistant</h3>
          <div
            style={{
              flex: 1,
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              minHeight: '220px',
              maxHeight: '300px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              marginBottom: '1rem',
              border: '1px solid var(--border-color)',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: m.sender === 'user' ? 'var(--accent-gradient)' : 'var(--bg-card)',
                  color: m.sender === 'user' ? '#fff' : 'var(--text-main)',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  fontSize: '0.85rem',
                  border: m.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                }}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Ask HR policy question (e.g. leave, laptop, insurance)..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="btn btn-primary" onClick={handleSendMessage} style={{ padding: '0 1rem' }}>
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
