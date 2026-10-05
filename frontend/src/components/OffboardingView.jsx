import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function OffboardingView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [exitRequests, setExitRequests] = useState([
    {
      id: 'EXIT-101',
      empName: 'Aarav Patel',
      department: 'Engineering',
      resignationDate: '2026-09-28',
      lastWorkingDay: '2026-10-31',
      itClearance: true,
      financeClearance: false,
      accessRevoked: false,
      fnfStatus: 'Pending Final Run',
      rpaResignationRequestId: '10390',
    },
    {
      id: 'EXIT-102',
      empName: 'Vikram Joshi',
      department: 'Product',
      resignationDate: '2026-10-01',
      lastWorkingDay: '2026-11-15',
      itClearance: false,
      financeClearance: false,
      accessRevoked: false,
      fnfStatus: 'In Review',
      rpaResignationRequestId: null,
    },
  ]);

  const [formName, setFormName] = useState(currentUser?.name?.split(' (')[0] || 'Sneha Rao');
  const [formDept, setFormDept] = useState('Engineering');
  const [formLwd, setFormLwd] = useState('2026-11-30');
  const [formReason, setFormReason] = useState('Pursuing new professional opportunity.');

  const handleSubmitResignation = (e) => {
    e.preventDefault();
    const newExit = {
      id: 'EXIT-' + Math.floor(100 + Math.random() * 900),
      empName: formName,
      department: formDept,
      resignationDate: new Date().toISOString().split('T')[0],
      lastWorkingDay: formLwd,
      itClearance: false,
      financeClearance: false,
      accessRevoked: false,
      fnfStatus: 'Pending Initiation',
      rpaResignationRequestId: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
    };

    setExitRequests((prev) => [newExit, ...prev]);
    showToast(`✓ Resignation submitted for ${formName}. Clearance workflow initiated.`, 'success');
  };

  const toggleITClearance = (id) => {
    setExitRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, itClearance: !item.itClearance } : item))
    );
    showToast('IT Asset Clearance status updated.', 'info');
  };

  const triggerAccessRevocation = (id, empName) => {
    setExitRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, accessRevoked: true } : item))
    );
    showToast(`🔒 AutomationEdge T4: AD & Office 365 access revoked for ${empName}!`, 'success');
  };

  const issueRelievingLetter = (empName) => {
    showToast(`📄 Issued relieving & experience certificate for ${empName}!`, 'success');
  };

  return (
    <section className="view-section active">
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h2><i className="fa-solid fa-person-walking-arrow-right text-accent"></i> Employee Exit & Offboarding Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Resignation tracking, clearance approvals, Active Directory access revocation, and FnF settlement.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Resignation Submission Form */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-file-signature text-accent"></i> Initiate Resignation Workflow</h3>
          <form onSubmit={handleSubmitResignation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Employee Name</label>
              <input
                type="text"
                className="form-control"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Department</label>
              <select className="form-control" value={formDept} onChange={(e) => setFormDept(e.target.value)} required>
                <option>Engineering</option>
                <option>Product</option>
                <option>Design</option>
                <option>Finance</option>
                <option>People & Culture</option>
              </select>
            </div>
            <div className="form-group">
              <label>Last Working Day (LWD)</label>
              <input
                type="date"
                className="form-control"
                value={formLwd}
                onChange={(e) => setFormLwd(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Reason for Resignation</label>
              <textarea
                className="form-control"
                rows="3"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                required
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent-gradient)', borderColor: 'transparent', fontWeight: 800 }}>
              <i className="fa-solid fa-paper-plane"></i> Submit Resignation
            </button>
          </form>
        </div>

        {/* Active Clearances Pipeline */}
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Active Exit & Offboarding Clearances</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {exitRequests.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{item.empName} ({item.department})</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Resignation Date: {item.resignationDate} • Last Working Day: <strong>{item.lastWorkingDay}</strong>
                    </span>
                    {item.rpaResignationRequestId && (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>
                        <i className="fa-solid fa-robot"></i> AE T4 RPA Workflow: <code>{item.rpaResignationRequestId}</code>
                      </div>
                    )}
                  </div>
                  <span className={`badge ${item.accessRevoked ? 'badge-draft' : 'badge-pending'}`}>
                    {item.accessRevoked ? 'Access Revoked' : 'Clearance Active'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="clearance-item" style={{ background: 'var(--bg-primary)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Manager Approval</div>
                    <span style={{ color: '#10b981', fontWeight: 700 }}><i className="fa-solid fa-circle-check"></i> Approved</span>
                  </div>
                  <div className="clearance-item" style={{ background: 'var(--bg-primary)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>IT Asset Recovery</div>
                    <span style={{ color: item.itClearance ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                      <i className={`fa-solid ${item.itClearance ? 'fa-circle-check' : 'fa-clock'}`}></i> {item.itClearance ? 'Cleared' : 'Pending Return'}
                    </span>
                  </div>
                  <div className="clearance-item" style={{ background: 'var(--bg-primary)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>FnF Settlement</div>
                    <span style={{ color: item.financeClearance ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                      <i className={`fa-solid ${item.financeClearance ? 'fa-circle-check' : 'fa-clock'}`}></i> {item.fnfStatus}
                    </span>
                  </div>
                  <div className="clearance-item" style={{ background: 'var(--bg-primary)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Active Directory</div>
                    <span style={{ color: item.accessRevoked ? '#e11d48' : '#10b981', fontWeight: 700 }}>
                      <i className={`fa-solid ${item.accessRevoked ? 'fa-user-slash' : 'fa-user-check'}`}></i> {item.accessRevoked ? 'Disabled' : 'Active'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }} onClick={() => toggleITClearance(item.id)}>
                    <i className="fa-solid fa-laptop"></i> Toggle IT Clearance
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }} onClick={() => triggerAccessRevocation(item.id, item.empName)}>
                    <i className="fa-solid fa-user-xmark"></i> Revoke AD Access
                  </button>
                  <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: 'var(--accent-gradient)', borderColor: 'transparent' }} onClick={() => issueRelievingLetter(item.empName)}>
                    <i className="fa-solid fa-file-export"></i> Issue Relieving Letter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
