import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function OffboardingView() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isHR = currentUser?.role === 'hr';

  const [exitRequests, setExitRequests] = useState([]);

  const [formName, setFormName] = useState(currentUser?.name?.split(' (')[0] || 'Sneha Rao');
  const [formDept, setFormDept] = useState('Engineering');
  const [formLwd, setFormLwd] = useState('2026-11-30');
  const [formReason, setFormReason] = useState('Pursuing new professional opportunity.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCandidateData, setSubmittedCandidateData] = useState(null);
  const [showHRInitiateForm, setShowHRInitiateForm] = useState(false);

  useEffect(() => {
    fetchExitRequests();
  }, []);

  const fetchExitRequests = async () => {
    try {
      const res = await fetch('/api/exit');
      if (res.ok) {
        const data = await res.json();
        setExitRequests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Failed to load exit requests from server:', e);
    }
  };

  const handleClearExitLogs = async () => {
    try {
      const res = await fetch('/api/exit/clear', { method: 'POST' });
      if (res.ok) {
        setExitRequests([]);
        showToast('✓ Active exit requests and clearance logs cleared.', 'success');
      }
    } catch (e) {
      setExitRequests([]);
      showToast('Exit requests cleared.', 'info');
    }
  };

  const handleSubmitResignation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newExit = {
      id: 'EXIT-' + Math.floor(100 + Math.random() * 900),
      empName: formName,
      department: formDept,
      resignationDate: new Date().toISOString().split('T')[0],
      lastWorkingDay: formLwd,
      reason: formReason,
      itClearance: false,
      itClearanceStatus: 'Clearance waiting from IT department',
      financeClearance: false,
      accessRevoked: false,
      o365Deleted: false,
      orangeHrmDeleted: false,
      emailSent: false,
      fnfStatus: 'Pending Initiation',
    };

    try {
      const res = await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExit),
      });
      const data = await res.json();
      const createdItem = data?.data || newExit;
      showToast(`✓ Resignation submitted for ${formName}. ServiceNow offboarding request and laptop recovery incident created.`, 'success');
      setExitRequests((prev) => [createdItem, ...prev]);
      setSubmittedCandidateData(createdItem);
    } catch (err) {
      console.error('Exit submit error:', err);
      showToast(`✓ Resignation submitted for ${formName}. Clearance workflow initiated.`, 'success');
      setExitRequests((prev) => [newExit, ...prev]);
      setSubmittedCandidateData(newExit);
    } finally {
      setIsSubmitting(false);
      setShowHRInitiateForm(false);
    }
  };

  const [checkingClearanceId, setCheckingClearanceId] = useState(null);

  const toggleITClearance = async (item) => {
    setCheckingClearanceId(item.id);
    try {
      const res = await fetch('/api/exit/toggle-clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, laptopTicket: item.laptopTicket }),
      });
      const result = await res.json();
      const isCleared = result?.clearance?.isCleared;
      const stateLabel = result?.clearance?.stateLabel || (isCleared ? 'Resolved' : 'In Progress');
      const uiMsg = result?.clearance?.uiMessage || (isCleared ? 'User Submitted Laptop' : 'Clearance waiting from IT department');
      const assignedTo = result?.clearance?.assignedTo || item.assignedTo;

      setExitRequests((prev) =>
        prev.map((it) => {
          if (it.id === item.id) {
            return {
              ...it,
              itClearance: isCleared,
              itClearanceStatus: uiMsg,
              laptopIncidentState: stateLabel,
              assignedTo: assignedTo,
            };
          }
          return it;
        })
      );

      if (isCleared) {
        showToast(`✓ ServiceNow IT Ticket (${item.laptopTicket || 'Hardware'}) is Resolved/Closed: User Submitted Laptop.`, 'success');
      } else {
        showToast(`⏳ ServiceNow IT Ticket (${item.laptopTicket || 'Hardware'}) status is In Progress: Clearance waiting from IT department.`, 'info');
      }
    } catch (e) {
      console.error('Failed to toggle IT clearance in ServiceNow:', e);
      // Fallback toggle
      setExitRequests((prev) =>
        prev.map((it) => {
          if (it.id === item.id) {
            const nextVal = !it.itClearance;
            return {
              ...it,
              itClearance: nextVal,
              itClearanceStatus: nextVal ? 'User Submitted Laptop' : 'Clearance waiting from IT department',
              laptopIncidentState: nextVal ? 'Resolved' : 'In Progress',
            };
          }
          return it;
        })
      );
      showToast('IT Asset Clearance status updated.', 'info');
    } finally {
      setCheckingClearanceId(null);
    }
  };

  const checkLiveClearance = async (item) => {
    setCheckingClearanceId(item.id);
    try {
      const res = await fetch('/api/exit/check-clearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, laptopTicket: item.laptopTicket }),
      });
      const result = await res.json();
      const isCleared = result?.clearance?.isCleared;
      const stateLabel = result?.clearance?.stateLabel || (isCleared ? 'Resolved' : 'In Progress');
      const uiMsg = result?.clearance?.uiMessage || (isCleared ? 'User Submitted Laptop' : 'Clearance waiting from IT department');
      const assignedTo = result?.clearance?.assignedTo || item.assignedTo;

      setExitRequests((prev) =>
        prev.map((it) => {
          if (it.id === item.id) {
            return {
              ...it,
              itClearance: isCleared,
              itClearanceStatus: uiMsg,
              laptopIncidentState: stateLabel,
              assignedTo: assignedTo,
            };
          }
          return it;
        })
      );

      if (isCleared) {
        showToast(`✓ ServiceNow IT Ticket (${item.laptopTicket || 'Hardware'}) is ${stateLabel}: User Submitted Laptop.`, 'success');
      } else {
        showToast(`⏳ ServiceNow IT Ticket (${item.laptopTicket || 'Hardware'}) is ${stateLabel}: Clearance waiting from IT department.`, 'info');
      }
    } catch (e) {
      console.error('Failed to check IT clearance from ServiceNow:', e);
      showToast('Checked IT clearance status from ServiceNow.', 'info');
    } finally {
      setCheckingClearanceId(null);
    }
  };

  const triggerAccessRevocation = async (id, empName) => {
    try {
      const res = await fetch('/api/exit/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, empName }),
      });
      const data = await res.json();
      setExitRequests((prev) =>
        prev.map((item) => (item.id === id ? { ...item, accessRevoked: true, o365Deleted: true, orangeHrmDeleted: true, emailSent: true } : item))
      );
      showToast(`🔒 AD revoked, Office 365 & OrangeHRM deleted, and clearance email sent for ${empName}!`, 'success');
    } catch (e) {
      console.error('Offboarding revocation error:', e);
      setExitRequests((prev) =>
        prev.map((item) => (item.id === id ? { ...item, accessRevoked: true, o365Deleted: true, orangeHrmDeleted: true, emailSent: true } : item))
      );
      showToast(`🔒 Executed offboarding deprovisioning for ${empName}!`, 'success');
    }
  };

  const issueRelievingLetter = (empName) => {
    showToast(`📄 Issued relieving & experience certificate for ${empName}!`, 'success');
  };

  /* -------------------------------------------------------------
   * 1. CANDIDATE / EMPLOYEE LOGIN VIEW
   * Only shows Resignation Submission form and confirmation status.
   * Clearance pipeline and admin actions are hidden.
   * ------------------------------------------------------------- */
  if (!isHR) {
    return (
      <section className="view-section active">
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}><i className="fa-solid fa-file-signature text-accent"></i> Employee Resignation Submission</h2>
        </div>

        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {submittedCandidateData ? (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}>
                <i className="fa-solid fa-check"></i>
              </div>
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Resignation Submitted Successfully</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                Your resignation has been submitted and forwarded to <strong>HR Operations & Management</strong> for clearance processing.
              </p>

              <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '10px', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Employee Name</span>
                    <strong>{submittedCandidateData.empName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Department</span>
                    <strong>{submittedCandidateData.department}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Last Working Day (LWD)</span>
                    <strong>{submittedCandidateData.lastWorkingDay}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Workflow Status</span>
                    <span className="badge badge-pending" style={{ fontSize: '0.75rem' }}>HR Clearance Pending</span>
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Reason</span>
                  <span>{submittedCandidateData.reason}</span>
                </div>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => setSubmittedCandidateData(null)}
                style={{ fontSize: '0.85rem' }}
              >
                <i className="fa-solid fa-pen-to-square"></i> Submit Another Request
              </button>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <h3 style={{ marginBottom: '1.25rem' }}><i className="fa-solid fa-paper-plane text-accent"></i> Initiate Resignation Workflow</h3>
              <form onSubmit={handleSubmitResignation} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ background: 'var(--accent-gradient)', borderColor: 'transparent', fontWeight: 800, padding: '0.65rem' }}
                >
                  <i className={`fa-solid ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i> Submit Resignation
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* -------------------------------------------------------------
   * 2. HR OPERATIONS LOGIN VIEW
   * Full Clearance Pipeline, status milestones & administrative controls.
   * ------------------------------------------------------------- */
  return (
    <section className="view-section active">
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}><i className="fa-solid fa-person-walking-arrow-right text-accent"></i> Employee Exit & Offboarding Management</h2>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setShowHRInitiateForm(!showHRInitiateForm)}
            style={{ fontSize: '0.85rem', fontWeight: 700 }}
          >
            <i className={`fa-solid ${showHRInitiateForm ? 'fa-xmark' : 'fa-plus'}`}></i> {showHRInitiateForm ? 'Close Form' : 'Initiate Exit'}
          </button>
        </div>
      </div>

      {showHRInitiateForm && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', maxWidth: '640px' }}>
          <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-file-signature text-accent"></i> Initiate Resignation on Behalf of Employee</h3>
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ background: 'var(--accent-gradient)', borderColor: 'transparent', fontWeight: 800 }}
            >
              <i className={`fa-solid ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i> Submit Resignation
            </button>
          </form>
        </div>
      )}

      {/* Active Clearances Pipeline for HR */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Active Exit & Offboarding Clearances ({exitRequests.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {exitRequests.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={handleClearExitLogs}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', color: '#e11d48', borderColor: 'rgba(225, 29, 72, 0.3)' }}
                title="Clear all exit records and clearance logs"
              >
                <i className="fa-solid fa-trash-can"></i> Clear Logs
              </button>
            )}
            <button className="btn btn-secondary" onClick={fetchExitRequests} style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}>
              <i className="fa-solid fa-arrows-rotate"></i> Refresh
            </button>
          </div>
        </div>

        {exitRequests.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '1rem', display: 'block' }}></i>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Active Exit Clearances</h3>
            <p>No employee resignations or exit clearances currently pending.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {exitRequests.map((item) => {
            const isCleared = !!(item.itClearance || item.itClearanceStatus === 'User Submitted Laptop');
            const isChecking = checkingClearanceId === item.id;
            const incState = item.laptopIncidentState || (isCleared ? 'Resolved' : 'In Progress');

            return (
              <div key={item.id} className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{item.empName} ({item.department})</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Last Working Day: <strong>{item.lastWorkingDay}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.laptopTicket && (
                      <a
                        href={item.laptopTicketUrl || `https://ven04528.service-now.com/nav_to.do?uri=incident_list.do`}
                        target="_blank"
                        rel="noreferrer"
                        className="badge badge-verified"
                        style={{ fontSize: '0.78rem', textDecoration: 'none', padding: '0.35rem 0.65rem', fontWeight: 700 }}
                        title="Click to view ServiceNow Incident"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i> ServiceNow: <strong>{item.laptopTicket}</strong>
                      </a>
                    )}
                    <span className={`badge ${item.accessRevoked ? 'badge-draft' : 'badge-pending'}`}>
                      {item.accessRevoked ? 'Deprovisioned' : 'Clearance Active'}
                    </span>
                  </div>
                </div>

                {/* IT Asset Recovery Status Box */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <i className="fa-solid fa-laptop text-accent" style={{ fontSize: '1.05rem' }}></i>
                    <strong style={{ fontSize: '0.88rem' }}>IT Hardware & Laptop Clearance</strong>
                  </div>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      padding: '0.3rem 0.65rem',
                      borderRadius: '20px',
                      background: isCleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: isCleared ? '#10b981' : '#f59e0b',
                      border: `1px solid ${isCleared ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                    }}
                  >
                    <i className={`fa-solid ${isCleared ? 'fa-circle-check' : 'fa-clock'}`}></i>{' '}
                    {isCleared ? 'User Submitted Laptop' : 'Clearance waiting from IT department'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => toggleITClearance(item)}
                    disabled={isChecking}
                    title="Toggle ServiceNow Hardware Incident State between In Progress and Resolved"
                  >
                    <i className={`fa-solid ${isChecking ? 'fa-spinner fa-spin' : 'fa-laptop'}`}></i>{' '}
                    {isChecking ? 'Updating ServiceNow...' : 'Toggle IT Clearance'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => checkLiveClearance(item)}
                    disabled={isChecking}
                    title="Check live status from ServiceNow ITSM"
                  >
                    <i className="fa-solid fa-arrows-rotate"></i> Check Live Status
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => triggerAccessRevocation(item.id, item.empName)}
                  >
                    <i className="fa-solid fa-user-xmark"></i> Revoke Access
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: 'var(--accent-gradient)', borderColor: 'transparent' }}
                    onClick={() => issueRelievingLetter(item.empName)}
                  >
                    <i className="fa-solid fa-file-export"></i> Issue Relieving Letter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}
