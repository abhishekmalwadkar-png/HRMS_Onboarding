import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';

export default function RecruitmentView() {
  const { showToast } = useToast();

  const [jobPostings] = useState([
    { id: 'JOB-201', title: 'Senior AI Engineer', dept: 'Engineering', applicants: 24, status: 'Active' },
    { id: 'JOB-202', title: 'Lead Product Manager', dept: 'Product', applicants: 18, status: 'Active' },
    { id: 'JOB-203', title: 'Enterprise ServiceNow Architect', dept: 'IT Systems', applicants: 9, status: 'Active' },
  ]);

  const [candidates, setCandidates] = useState([
    { id: 'CAND-901', name: 'Aarav Sharma', role: 'Senior AI Engineer', score: '94%', stage: 'Offer Accepted' },
    { id: 'CAND-902', name: 'Priya Iyer', role: 'Lead Product Manager', score: '89%', stage: 'Technical Interview' },
    { id: 'CAND-903', name: 'Rohan Mehta', role: 'Enterprise ServiceNow Architect', score: '91%', stage: 'HR Screening' },
  ]);

  const triggerAIScreening = () => {
    showToast('🤖 AutomationEdge AI: Screening 51 uploaded resumes against job descriptions...', 'info');
    setTimeout(() => {
      showToast('✓ AI Screening complete! Top 3 candidates shortlisted with >85% match.', 'success');
    }, 1500);
  };

  const scheduleInterview = (name) => {
    showToast(`📅 Calendar invitation & interview link dispatched to ${name}!`, 'success');
  };

  return (
    <section className="view-section active">
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2><i className="fa-solid fa-user-plus text-accent"></i> Candidate Recruitment Pipeline</h2>
            <p style={{ color: 'var(--text-muted)' }}>Job requisitions, AI resume screening, interview scheduling, and offer letters.</p>
          </div>
          <button className="btn btn-primary" onClick={triggerAIScreening} style={{ background: 'var(--accent-gradient)', borderColor: 'transparent', fontWeight: 800 }}>
            <i className="fa-solid fa-robot"></i> Run AI Resume Screening
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Active Job Requisitions */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-briefcase text-accent"></i> Open Job Requisitions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {jobPostings.map((job) => (
              <div key={job.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{job.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{job.dept} • {job.applicants} Applicants</div>
                </div>
                <span className="badge badge-verified">{job.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shortlisted Candidates */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-users text-accent"></i> Candidate Evaluation & Stages</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {candidates.map((cand) => (
              <div key={cand.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{cand.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cand.role} • Match: <strong style={{ color: '#10b981' }}>{cand.score}</strong></div>
                  <span className="badge badge-pending" style={{ fontSize: '0.68rem', marginTop: '4px' }}>{cand.stage}</span>
                </div>
                <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => scheduleInterview(cand.name)}>
                  <i className="fa-solid fa-calendar-check"></i> Interview
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
