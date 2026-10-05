import React from 'react';

export default function AnalyticsView({ employees }) {
  const totalEmployees = employees.length;
  const approvedCount = employees.filter((e) => e.status === 'Approved' || e.status === 'Completed').length;
  const pendingCount = employees.filter((e) => e.status === 'Pending Review' || e.status === 'Pending').length;

  return (
    <section className="view-section active">
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h2><i className="fa-solid fa-chart-pie text-accent"></i> Executive HR Analytics & Compliance</h2>
        <p style={{ color: 'var(--text-muted)' }}>Real-time metrics on talent onboarding, ServiceNow SLA delivery, and enterprise system synchronization.</p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Headcount</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '4px' }}>{totalEmployees}</div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>+12% this quarter</span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Approved & Active</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>{approvedCount}</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Multi-Engine Provisioned</span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Verification</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--brand-orange)', marginTop: '4px' }}>{pendingCount}</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--brand-orange)' }}>Requires HR Sign-off</span>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ServiceNow ITSM SLA</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>99.4%</div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Within 24hr Target</span>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-sitemap text-accent"></i> Departmental Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Engineering & AI Systems</span>
                <strong>48%</strong>
              </div>
              <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '48%', height: '100%', background: 'var(--accent-gradient)' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Product & Design</span>
                <strong>24%</strong>
              </div>
              <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '24%', height: '100%', background: '#0284c7' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Operations & Finance</span>
                <strong>18%</strong>
              </div>
              <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '18%', height: '100%', background: '#10b981' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>People & Culture</span>
                <strong>10%</strong>
              </div>
              <div style={{ height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '10%', height: '100%', background: '#7c3aed' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-shield-halved text-accent"></i> System Integration Health</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <span><i className="fa-solid fa-server text-accent"></i> ServiceNow PDI (ven04528)</span>
              <span className="badge badge-verified"><i className="fa-solid fa-check"></i> Connected</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <span><i className="fa-solid fa-robot" style={{ color: '#0284c7' }}></i> AutomationEdge T4 RPA Engine</span>
              <span className="badge badge-verified"><i className="fa-solid fa-check"></i> Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <span><i className="fa-brands fa-microsoft" style={{ color: '#1d4ed8' }}></i> Microsoft Entra ID (Office 365)</span>
              <span className="badge badge-verified"><i className="fa-solid fa-check"></i> Synced</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <span><i className="fa-solid fa-user-check" style={{ color: '#0284c7' }}></i> OrangeHRM Enterprise PIM</span>
              <span className="badge badge-verified"><i className="fa-solid fa-check"></i> Connected</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
