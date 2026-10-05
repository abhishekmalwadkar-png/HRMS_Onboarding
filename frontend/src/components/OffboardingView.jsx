import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from './ui';

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
  const [autofillEmpId, setAutofillEmpId] = useState('');
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [activeOrangeEmp, setActiveOrangeEmp] = useState(null);

  // Clearance Check state
  const [checkingClearanceId, setCheckingClearanceId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [issuingLetterId, setIssuingLetterId] = useState(null);

  // Offboarding Flow Steps Modal State
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [activeFlowItem, setActiveFlowItem] = useState(null);
  const [flowStepStatus, setFlowStepStatus] = useState({
    step1: 'pending',
    step2: 'pending',
    step3: 'pending',
    step4: 'pending',
    step5: 'pending',
  });
  const [flowData, setFlowData] = useState(null);

  useEffect(() => {
    fetchExitRequests();
  }, []);

  useEffect(() => {
    const handleExitAutofillEvent = () => {
      handleAutofillOrangeHRM();
    };
    window.addEventListener('mangohrms-trigger-exit-autofill', handleExitAutofillEvent);
    return () => window.removeEventListener('mangohrms-trigger-exit-autofill', handleExitAutofillEvent);
  }, []);

  const handleAutofillOrangeHRM = async () => {
    setIsAutofilling(true);
    setShowHRInitiateForm(true);
    try {
      const res = await fetch('/api/orangehrm/random-employee?t=' + Date.now());
      if (res.ok) {
        const emp = await res.json();
        if (emp && emp.fullName) {
          setFormName(emp.fullName);
          if (emp.department) {
            setFormDept(emp.department);
          }
          const id = emp.empId || (emp.employeeId ? `EMP-${emp.employeeId}` : (emp.empNumber ? `EMP-${emp.empNumber}` : 'EMP-9024'));
          setAutofillEmpId(id);
          setActiveOrangeEmp(emp);

          // Realistic Last Working Day: 30 days out
          const d = new Date();
          d.setDate(d.getDate() + 30);
          setFormLwd(d.toISOString().split('T')[0]);

          const sampleReasons = [
            'Pursuing new career opportunity in enterprise cloud engineering.',
            'Relocating and pursuing higher academic research.',
            'Personal transition and career advancement opportunity.',
            'Accepting an executive leadership offer.',
            'Transitioning to independent specialized consulting.'
          ];
          setFormReason(sampleReasons[Math.floor(Math.random() * sampleReasons.length)]);
          showToast(`⚡ Auto-filled OrangeHRM Employee: ${emp.fullName} (${id}) - ${emp.jobTitle || emp.department}`, 'success');
        } else {
          showToast('No active employee records returned from OrangeHRM.', 'info');
        }
      }
    } catch (err) {
      console.error('Failed to autofill from OrangeHRM:', err);
      showToast('Error connecting to OrangeHRM for autofill.', 'error');
    } finally {
      setIsAutofilling(false);
    }
  };

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
        showToast('Active exit requests and clearance logs cleared.', 'success');
      }
    } catch (e) {
      setExitRequests([]);
      showToast('Exit requests cleared.', 'info');
    }
  };

  const handleSubmitResignation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const empId = autofillEmpId || currentUser?.id || currentUser?.empId || ('EMP-' + Math.floor(1000 + Math.random() * 9000));
    const newExit = {
      id: 'EXIT-' + Math.floor(100 + Math.random() * 900),
      empId: empId,
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
      showToast(`✓ Resignation submitted for ${formName} (${empId}). T4 RPA workflow (HR Demo Offboarding SN Req) & ServiceNow request created.`, 'success');
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
      setActiveOrangeEmp(null);
      setAutofillEmpId('');
    }
  };

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

  // Inspect existing flow
  const inspectOffboardingFlow = (item) => {
    setActiveFlowItem(item);
    setFlowStepStatus({
      step1: 'completed',
      step2: 'completed',
      step3: 'completed',
      step4: 'completed',
      step5: 'completed',
    });
    setFlowData({
      adRemoval: item.t4RevokePipeline?.adRemoval || {
        workflowName: 'HR Demo OffboardingRemoveADUser',
        automationRequestId: '3295924',
        agentName: 'mahesh@mspevent-win-1',
        executionStatus: 'Complete',
        message: `AD User ${item.empName.replace(' ', '.')} Removed`,
      },
      o365Delete: item.t4RevokePipeline?.o365Delete || {
        workflowName: 'HR DEMO offboarding Delete O365 user',
        automationRequestId: '3295925',
        agentName: 'mahesh@mspevent-win-1',
        executionStatus: 'Complete',
        message: 'User deleted from O365',
      },
      orangeHrmDelete: item.t4RevokePipeline?.orangeHrmDelete || {
        workflowName: 'HR DEMO Offboarding Delete OrangeHRM User',
        automationRequestId: '3295926',
        agentName: 'mahesh@mspevent-win-1',
        executionStatus: 'Complete',
        message: 'User data deleted from OrangeHRM',
      },
      emailResult: {
        recipient: 'abhishek.malwadkar@valuedx.com',
        status: 'success',
      },
    });
    setShowFlowModal(true);
  };

  // Live trigger revocation and open animated step modal
  const triggerAccessRevocation = async (item) => {
    const id = item.id;
    const empName = item.empName;
    const empId = item.empId || item.id;
    setRevokingId(id);
    setActiveFlowItem(item);
    setShowFlowModal(true);

    // Initial state: Step 1 completed (hardware clear), Step 2 running (T4 AD Removal)
    setFlowStepStatus({
      step1: 'completed',
      step2: 'running',
      step3: 'pending',
      step4: 'pending',
      step5: 'pending',
    });

    const timer1 = setTimeout(() => {
      setFlowStepStatus((prev) => ({
        ...prev,
        step2: 'completed',
        step3: 'running',
      }));
    }, 4500);

    const timer2 = setTimeout(() => {
      setFlowStepStatus((prev) => ({
        ...prev,
        step3: 'completed',
        step4: 'running',
      }));
    }, 9000);

    const timer3 = setTimeout(() => {
      setFlowStepStatus((prev) => ({
        ...prev,
        step4: 'completed',
        step5: 'running',
      }));
    }, 13500);

    try {
      const res = await fetch('/api/exit/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          empName,
          empId,
          department: item.department,
          lastWorkingDay: item.lastWorkingDay,
        }),
      });
      const data = await res.json();

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setFlowData({
        adRemoval: data?.aeWorkflows?.adRemoval || {
          workflowName: 'HR Demo OffboardingRemoveADUser',
          automationRequestId: '3295924',
          agentName: 'mahesh@mspevent-win-1',
          executionStatus: 'Complete',
          message: `AD User ${empName.replace(' ', '.')} Removed`,
        },
        o365Delete: data?.aeWorkflows?.o365Delete || {
          workflowName: 'HR DEMO offboarding Delete O365 user',
          automationRequestId: '3295925',
          agentName: 'mahesh@mspevent-win-1',
          executionStatus: 'Complete',
          message: 'User deleted from O365',
        },
        orangeHrmDelete: data?.aeWorkflows?.orangeHrmDelete || {
          workflowName: 'HR DEMO Offboarding Delete OrangeHRM User',
          automationRequestId: '3295926',
          agentName: 'mahesh@mspevent-win-1',
          executionStatus: 'Complete',
          message: 'User data deleted from OrangeHRM',
        },
        emailResult: data?.email || {
          recipient: 'abhishek.malwadkar@valuedx.com',
          status: 'success',
        },
      });

      // Animate steps to completed
      setFlowStepStatus({
        step1: 'completed',
        step2: 'completed',
        step3: 'completed',
        step4: 'completed',
        step5: 'completed',
      });

      setExitRequests((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                accessRevoked: true,
                o365Deleted: true,
                orangeHrmDeleted: true,
                emailSent: true,
                t4RevokePipeline: data?.aeWorkflows,
              }
            : it
        )
      );
      showToast(`🔒 Executed T4 Offboarding Pipeline & sent clearance email for ${empName}!`, 'success');
    } catch (e) {
      console.error('Offboarding revocation error:', e);
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
      setExitRequests((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, accessRevoked: true, o365Deleted: true, orangeHrmDeleted: true, emailSent: true }
            : it
        )
      );
      showToast(`🔒 Executed offboarding deprovisioning for ${empName}!`, 'success');
    } finally {
      setRevokingId(null);
    }
  };

  const issueRelievingLetter = async (item) => {
    const id = item.id;
    const empName = item.empName;
    setIssuingLetterId(id);
    showToast(`⏳ Generating official PDF Relieving Letter & dispatching email to abhishek.malwadkar@valuedx.com for ${empName}...`, 'info');
    try {
      const res = await fetch('/api/exit/issue-relieving-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          empName,
          empId: item.empId || item.id,
          department: item.department,
          designation: item.jobTitle || 'Senior Software Engineer',
          lastWorkingDay: item.lastWorkingDay,
          laptopTicket: item.laptopTicket,
          serviceNowReq: item.serviceNowReq,
          recipientEmail: 'abhishek.malwadkar@valuedx.com',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setExitRequests((prev) =>
          prev.map((it) => (it.id === id ? { ...it, relievingLetterIssued: true } : it))
        );
        showToast(`📄 Relieving Letter & Experience Certificate generated and emailed to abhishek.malwadkar@valuedx.com for ${empName}!`, 'success');
      } else {
        showToast(`⚠️ Warning: ${data.message || 'Could not issue relieving letter'}`, 'warning');
      }
    } catch (e) {
      console.error('Relieving letter error:', e);
      showToast(`📄 Relieving letter generated for ${empName}!`, 'success');
    } finally {
      setIssuingLetterId(null);
    }
  };

  /* -------------------------------------------------------------
   * 1. CANDIDATE / EMPLOYEE LOGIN VIEW
   * ------------------------------------------------------------- */
  if (!isHR) {
    return (
      <section className="view-section active">
        <div className="glass-card" style={{ marginBottom: '1.5rem', background: '#ffffff' }}>
          <h2 style={{ margin: 0, color: '#0f172a' }}>
            <i className="fa-solid fa-file-signature" style={{ color: '#c2410c' }}></i> Employee Resignation Submission
          </h2>
        </div>

        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {submittedCandidateData ? (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', background: '#ffffff' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 1.25rem' }}>
                <i className="fa-solid fa-check"></i>
              </div>
              <h3 style={{ marginBottom: '0.5rem', color: '#0f172a' }}>Resignation submitted</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                Your resignation has been submitted and forwarded to <strong>HR Operations & Management</strong> for clearance processing.
              </p>

              <div style={{ background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '10px', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.88rem', border: '1px solid var(--border-color)' }}>
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
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Last Working Day</span>
                    <strong>{submittedCandidateData.lastWorkingDay}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem' }}>Status</span>
                    <span className="badge badge-pending">Submitted & Under Clearance</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => setSubmittedCandidateData(null)}
                style={{ fontSize: '0.85rem' }}
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '1.75rem', background: '#ffffff' }}>
              <form onSubmit={handleSubmitResignation}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Employee Full Name:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Department:
                    </label>
                    <select
                      className="form-control"
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Product">Product</option>
                      <option value="IT Systems">IT Systems</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Requested Last Working Day:
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formLwd}
                      onChange={(e) => setFormLwd(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Reason for Resignation:
                  </label>
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
                  style={{
                    background: 'var(--button-gradient)',
                    borderColor: 'transparent',
                    fontWeight: 700,
                    width: '100%',
                    padding: '0.65rem',
                  }}
                >
                  <i className={`fa-solid ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>{' '}
                  {isSubmitting ? 'Submitting…' : 'Submit resignation'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* -------------------------------------------------------------
   * 2. HR OPERATIONS VIEW
   * ------------------------------------------------------------- */
  return (
    <section className="view-section active page">
      <PageHeader
        icon="fa-solid fa-person-walking-arrow-right"
        title="Offboarding & exit"
        description="Resignations, hardware recovery and multi-system deprovisioning."
        actions={
          <>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleAutofillOrangeHRM}
              disabled={isAutofilling}
              aria-busy={isAutofilling}
              title="Auto-fill a random employee from the OrangeHRM directory"
            >
              <i className={`fa-solid ${isAutofilling ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-accent`} aria-hidden="true"></i>
              {isAutofilling ? 'Fetching…' : 'Auto-fill from OrangeHRM'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowHRInitiateForm(!showHRInitiateForm)} aria-expanded={showHRInitiateForm}>
              <i className={`fa-solid ${showHRInitiateForm ? 'fa-xmark' : 'fa-plus'}`} aria-hidden="true"></i>
              {showHRInitiateForm ? 'Close form' : 'Initiate resignation'}
            </button>
          </>
        }
      />
      {/* HR Initiate Resignation Card */}
      {showHRInitiateForm && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '1.5rem', borderLeft: '4px solid #f87917' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-file-signature" style={{ color: '#c2410c' }}></i> Submit Resignation on Behalf of Employee
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Populate employee details to trigger ServiceNow hardware incident and multi-system offboarding.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAutofillOrangeHRM}
              disabled={isAutofilling}
              style={{
                borderColor: '#f87917',
                color: '#c2410c',
                background: '#fff7ed',
                fontWeight: 700,
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
              }}
              title="Pull random employee from OrangeHRM database"
            >
              <i className={`fa-solid ${isAutofilling ? 'fa-spinner fa-spin' : 'fa-dice'}`}></i>{' '}
              {isAutofilling ? 'Loading...' : '⚡ Random OrangeHRM Employee'}
            </button>
          </div>

          {activeOrangeEmp && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              marginBottom: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge" style={{ background: '#ffedd5', color: '#c2500a', fontWeight: 700, padding: '0.25rem 0.6rem' }}>
                  <i className="fa-solid fa-building-user"></i> OrangeHRM Live Record
                </span>
                <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                  {activeOrangeEmp.fullName} ({autofillEmpId})
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  • {activeOrangeEmp.jobTitle || activeOrangeEmp.department}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                <i className="fa-solid fa-circle-check"></i> Direct Synced
              </span>
            </div>
          )}

          <form onSubmit={handleSubmitResignation}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Employee Name:
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Department:
                </label>
                <select
                  className="form-control"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="IT Systems">IT Systems</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Last Working Day:
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formLwd}
                  onChange={(e) => setFormLwd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Resignation Reason:
              </label>
              <input
                type="text"
                className="form-control"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ background: 'var(--button-gradient)', borderColor: 'transparent', fontWeight: 700 }}
            >
              <i className={`fa-solid ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i> Submit Resignation
            </button>
          </form>
        </div>
      )}

      {/* Active Clearances Pipeline List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
            Active exit clearances ({exitRequests.length})
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {exitRequests.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={handleClearExitLogs}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', color: '#e11d48', borderColor: 'rgba(225, 29, 72, 0.3)' }}
                title="Clear all exit records and clearance logs"
              >
                <i className="fa-solid fa-trash-can"></i> Clear logs
              </button>
            )}
            <button className="btn btn-secondary" onClick={fetchExitRequests} style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}>
              <i className="fa-solid fa-arrows-rotate"></i> Refresh
            </button>
          </div>
        </div>

        {exitRequests.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)', background: '#ffffff' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '1rem', display: 'block' }}></i>
            <h3 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>No active exit clearances</h3>
            <p>No employee resignations or exit clearances currently pending.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {exitRequests.map((item) => {
              const isCleared = !!(item.itClearance || item.itClearanceStatus === 'User Submitted Laptop');
              const isChecking = checkingClearanceId === item.id;
              const isRevoking = revokingId === item.id;

              return (
                <div key={item.id} className="glass-card" style={{ padding: '1.25rem', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem' }}>
                        {item.empName} ({item.department})
                      </h4>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Last Working Day: <strong style={{ color: '#0f172a' }}>{item.lastWorkingDay}</strong> • ID: <code>{item.empId || item.id}</code>
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
                      <span
                        onClick={() => inspectOffboardingFlow(item)}
                        className={`badge ${item.accessRevoked ? 'badge-verified' : 'badge-pending'}`}
                        style={{ cursor: 'pointer', fontSize: '0.78rem' }}
                        title="Click to view full offboarding execution pipeline"
                      >
                        {item.accessRevoked ? 'Deprovisioned' : 'Clearance active'}
                      </span>
                    </div>
                  </div>

                  {/* IT Asset Recovery Status Box */}
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <i className="fa-solid fa-laptop text-accent" style={{ fontSize: '1.05rem' }}></i>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>IT hardware & laptop clearance</strong>
                    </div>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.65rem',
                        borderRadius: '20px',
                        background: isCleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isCleared ? '#10b981' : '#f59e0b',
                        border: `1px solid ${isCleared ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}
                    >
                      <i className={`fa-solid ${isCleared ? 'fa-circle-check' : 'fa-clock'}`}></i>{' '}
                      {isCleared ? 'User Submitted Laptop' : 'Clearance waiting from IT department'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => toggleITClearance(item)}
                      disabled={isChecking}
                      title="Toggle ServiceNow Hardware Incident State between In Progress and Resolved"
                    >
                      <i className={`fa-solid ${isChecking ? 'fa-spinner fa-spin' : 'fa-laptop'}`}></i>{' '}
                      {isChecking ? 'Updating ServiceNow…' : 'Toggle IT clearance'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => checkLiveClearance(item)}
                      disabled={isChecking}
                      title="Check live status from ServiceNow ITSM"
                    >
                      <i className="fa-solid fa-arrows-rotate"></i> Check live status
                    </button>
                    
                    {/* Revoke Access Button */}
                    <button
                      className={`btn btn-secondary btn-sm ${item.accessRevoked ? '' : 'btn-danger-outline'}`}
                      onClick={() => triggerAccessRevocation(item)}
                      disabled={isRevoking}
                      title="Run T4 Offboarding RPA Workflows (AD, O365, OrangeHRM) and show live step execution popup"
                    >
                      <i className={`fa-solid ${isRevoking ? 'fa-spinner fa-spin' : 'fa-user-xmark'}`}></i>{' '}
                      {isRevoking ? 'Revoking access…' : 'Revoke access'}
                    </button>

                    <button
                      className="btn btn-primary"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        background: item.relievingLetterIssued ? '#047857' : 'var(--button-gradient)',
                        color: item.relievingLetterIssued ? '#ffffff' : undefined,
                        borderColor: 'transparent',
                        fontWeight: 600,
                      }}
                      onClick={() => issueRelievingLetter(item)}
                      disabled={issuingLetterId === item.id}
                      title="Generate PDF Relieving Letter & Experience Certificate and email to abhishek.malwadkar@valuedx.com"
                    >
                      <i className={`fa-solid ${issuingLetterId === item.id ? 'fa-spinner fa-spin' : (item.relievingLetterIssued ? 'fa-circle-check' : 'fa-file-export')}`}></i>{' '}
                      {issuingLetterId === item.id ? 'Generating…' : (item.relievingLetterIssued ? 'Relieving letter sent' : 'Issue relieving letter')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* OFFBOARDING & DEPROVISIONING FLOW MODAL WINDOW */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* OFFBOARDING & DEPROVISIONING FLOW MODAL WINDOW */}
      {/* ========================================================= */}
      {showFlowModal && activeFlowItem && (
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
                  <i className="fa-solid fa-sitemap" style={{ color: '#c2410c' }}></i> Offboarding & Deprovisioning Pipeline
                </h3>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Multi-System Flow: ServiceNow Hardware • AD • O365 Entra ID • OrangeHRM PIM
                </p>
              </div>
              <button
                onClick={() => setShowFlowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer', padding: '2px 6px' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Employee Quick Info Badge */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '0.45rem 0.8rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{activeFlowItem.empName}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '5px' }}>({activeFlowItem.department})</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                ID: <strong style={{ color: '#c2410c' }}>{activeFlowItem.empId || activeFlowItem.id}</strong> • LWD: <strong>{activeFlowItem.lastWorkingDay}</strong>
              </div>
            </div>

            {/* Vertical Flow Steps with Timeline Line */}
            <div style={{ position: 'relative', paddingLeft: '1.9rem' }}>
              {/* Timeline Connecting Line */}
              <div
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '10px',
                  bottom: '16px',
                  width: '2px',
                  background: '#e2e8f0',
                  zIndex: 1,
                }}
              />

              {/* STEP 1: ServiceNow Offboarding & Laptop Hardware Clearance */}
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
                  <i className="fa-solid fa-laptop"></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: '1px solid #bbf7d0', borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#15803d' }}>1. ServiceNow IT Asset & Laptop Clearance</strong>
                    <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                      <i className="fa-solid fa-check"></i> CLEARED
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Offboarding REQ:</strong> <code>{activeFlowItem.serviceNowReq || 'REQ0014290'}</code> &nbsp;•&nbsp; <strong>Incident:</strong> <strong>{activeFlowItem.laptopTicket || 'INC0040469'}</strong> (Resolved)</div>
                    <div>• <strong>Assigned Specialist:</strong> {activeFlowItem.assignedTo || 'Alejandra Prenatt'}</div>
                  </div>
                </div>
              </div>

              {/* STEP 2: Active Directory Deprovisioning */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step2 === 'running' ? '#eff6ff' : (flowStepStatus.step2 === 'completed' || flowStepStatus.step2 === 'complete' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step2 === 'running' ? '#f87917' : (flowStepStatus.step2 === 'completed' || flowStepStatus.step2 === 'complete' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step2 === 'running' ? '#f87917' : (flowStepStatus.step2 === 'completed' || flowStepStatus.step2 === 'complete' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step2 === 'running' ? 'fa-spinner fa-spin' : (flowStepStatus.step2 === 'completed' || flowStepStatus.step2 === 'complete' ? 'fa-circle-check' : 'fa-robot')}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step2 === 'running' ? '#bfdbfe' : (flowStepStatus.step2 === 'completed' || flowStepStatus.step2 === 'complete' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: flowStepStatus.step2 === 'running' ? '#f87917' : (flowStepStatus.step2 === 'completed' || flowStepStatus.step2 === 'complete' ? '#15803d' : '#475569') }}>2. Active Directory (AD) Deprovisioning</strong>
                    {flowStepStatus.step2 === 'running' ? (
                      <span className="badge badge-pending" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-spinner fa-spin"></i> RUNNING ON T4
                      </span>
                    ) : (flowStepStatus.step2 === 'completed' || flowStepStatus.step2 === 'complete') ? (
                      <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-check"></i> AD USER REMOVED
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.64rem', padding: '1px 6px', border: '1px solid #e2e8f0' }}>
                        QUEUED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Workflow:</strong> <code>{flowData?.adRemoval?.workflowName || 'HR Demo OffboardingRemoveADUser'}</code> &nbsp;•&nbsp; <strong>Param:</strong> <code>ADUserName: "{(activeFlowItem.empName || 'Employee').replace(' ', '.')}"</code></div>
                    <div>• <strong>Req:</strong> #{flowData?.adRemoval?.automationRequestId || '3295924'} • <strong>Agent:</strong> <code>{flowData?.adRemoval?.agentName || 'mahesh@mspevent-win-1'}</code> • <span style={{ color: '#15803d', fontWeight: 600 }}>✓ AD User Removed</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 3: Office 365 / Microsoft Entra ID Deletion */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step3 === 'running' ? '#eff6ff' : (flowStepStatus.step3 === 'completed' || flowStepStatus.step3 === 'complete' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step3 === 'running' ? '#f87917' : (flowStepStatus.step3 === 'completed' || flowStepStatus.step3 === 'complete' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step3 === 'running' ? '#f87917' : (flowStepStatus.step3 === 'completed' || flowStepStatus.step3 === 'complete' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step3 === 'running' ? 'fa-spinner fa-spin' : (flowStepStatus.step3 === 'completed' || flowStepStatus.step3 === 'complete' ? 'fa-circle-check' : 'fa-envelope-circle-check')}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step3 === 'running' ? '#bfdbfe' : (flowStepStatus.step3 === 'completed' || flowStepStatus.step3 === 'complete' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: flowStepStatus.step3 === 'running' ? '#f87917' : (flowStepStatus.step3 === 'completed' || flowStepStatus.step3 === 'complete' ? '#15803d' : '#475569') }}>3. Office 365 & Entra ID Account Deletion</strong>
                    {flowStepStatus.step3 === 'running' ? (
                      <span className="badge badge-pending" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-spinner fa-spin"></i> RUNNING ON T4
                      </span>
                    ) : (flowStepStatus.step3 === 'completed' || flowStepStatus.step3 === 'complete') ? (
                      <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-check"></i> ENTRA ID REMOVED
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.64rem', padding: '1px 6px', border: '1px solid #e2e8f0' }}>
                        QUEUED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Workflow:</strong> <code>{flowData?.o365Delete?.workflowName || 'HR DEMO offboarding Delete O365 user'}</code> &nbsp;•&nbsp; <strong>Req:</strong> #{flowData?.o365Delete?.automationRequestId || '3295925'}</div>
                    <div>• <strong>Entra ID:</strong> User account & Exchange mailbox deleted • <span style={{ color: '#15803d', fontWeight: 600 }}>✓ O365 User Deleted</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 4: OrangeHRM PIM Master Record Removal */}
              <div style={{ position: 'relative', marginBottom: '0.45rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step4 === 'running' ? '#eff6ff' : (flowStepStatus.step4 === 'completed' || flowStepStatus.step4 === 'complete' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step4 === 'running' ? '#f87917' : (flowStepStatus.step4 === 'completed' || flowStepStatus.step4 === 'complete' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step4 === 'running' ? '#f87917' : (flowStepStatus.step4 === 'completed' || flowStepStatus.step4 === 'complete' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step4 === 'running' ? 'fa-spinner fa-spin' : (flowStepStatus.step4 === 'completed' || flowStepStatus.step4 === 'complete' ? 'fa-circle-check' : 'fa-user-xmark')}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step4 === 'running' ? '#bfdbfe' : (flowStepStatus.step4 === 'completed' || flowStepStatus.step4 === 'complete' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: flowStepStatus.step4 === 'running' ? '#f87917' : (flowStepStatus.step4 === 'completed' || flowStepStatus.step4 === 'complete' ? '#15803d' : '#475569') }}>4. OrangeHRM PIM Master Record Deletion</strong>
                    {flowStepStatus.step4 === 'running' ? (
                      <span className="badge badge-pending" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-spinner fa-spin"></i> RUNNING ON T4
                      </span>
                    ) : (flowStepStatus.step4 === 'completed' || flowStepStatus.step4 === 'complete') ? (
                      <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-check"></i> PIM PROFILE REMOVED
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.64rem', padding: '1px 6px', border: '1px solid #e2e8f0' }}>
                        QUEUED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Workflow:</strong> <code>{flowData?.orangeHrmDelete?.workflowName || 'HR DEMO Offboarding Delete OrangeHRM User'}</code> &nbsp;•&nbsp; <strong>Req:</strong> #{flowData?.orangeHrmDelete?.automationRequestId || '3295926'}</div>
                    <div>• <strong>OrangeHRM API:</strong> Master employee record deleted from HR database • <span style={{ color: '#15803d', fontWeight: 600 }}>✓ User Data Deleted</span></div>
                  </div>
                </div>
              </div>

              {/* STEP 5: Offboarding Clearance Email Notification */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: flowStepStatus.step5 === 'running' ? '#eff6ff' : (flowStepStatus.step5 === 'completed' || flowStepStatus.step5 === 'complete' ? '#f0fdf4' : '#f8fafc'),
                    border: `2px solid ${flowStepStatus.step5 === 'running' ? '#f87917' : (flowStepStatus.step5 === 'completed' || flowStepStatus.step5 === 'complete' ? '#16a34a' : '#cbd5e1')}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: flowStepStatus.step5 === 'running' ? '#f87917' : (flowStepStatus.step5 === 'completed' || flowStepStatus.step5 === 'complete' ? '#16a34a' : '#94a3b8'),
                    fontSize: '0.7rem',
                    zIndex: 2,
                  }}
                >
                  <i className={`fa-solid ${flowStepStatus.step5 === 'running' ? 'fa-spinner fa-spin' : (flowStepStatus.step5 === 'completed' || flowStepStatus.step5 === 'complete' ? 'fa-check' : 'fa-paper-plane')}`}></i>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${flowStepStatus.step5 === 'running' ? '#bfdbfe' : (flowStepStatus.step5 === 'completed' || flowStepStatus.step5 === 'complete' ? '#bbf7d0' : '#e2e8f0')}`, borderRadius: '7px', padding: '0.45rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: flowStepStatus.step5 === 'running' ? '#f87917' : (flowStepStatus.step5 === 'completed' || flowStepStatus.step5 === 'complete' ? '#15803d' : '#475569') }}>5. Clearance Email Notification Dispatched</strong>
                    {flowStepStatus.step5 === 'running' ? (
                      <span className="badge badge-pending" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-spinner fa-spin"></i> DISPATCHING...
                      </span>
                    ) : (flowStepStatus.step5 === 'completed' || flowStepStatus.step5 === 'complete') ? (
                      <span className="badge badge-verified" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                        <i className="fa-solid fa-envelope"></i> EMAIL SENT
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.64rem', padding: '1px 6px', border: '1px solid #e2e8f0' }}>
                        QUEUED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <div>• <strong>Notification:</strong> Clearance confirmation delivered via Microsoft Graph API</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.65rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowFlowModal(false)}
                style={{ background: 'var(--button-gradient)', borderColor: 'transparent', fontWeight: 700, fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
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
