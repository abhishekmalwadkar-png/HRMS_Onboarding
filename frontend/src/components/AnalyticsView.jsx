import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, animate, useReducedMotion } from 'motion/react';

// Stagger reveal for grids of cards (design system: 300-450ms, ~60ms stagger, no overshoot on data UI)
const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const tileVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// Counts a number up from 0 when it first appears or changes
function CountUp({ value, suffix = '' }) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduceMotion) {
      node.textContent = `${value}${suffix}`;
      return;
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { node.textContent = `${Math.round(v)}${suffix}`; },
    });
    return () => controls.stop();
  }, [value, suffix, reduceMotion]);
  return <span ref={ref}>{`${value}${suffix}`}</span>;
}

const BAR_COLORS = ['var(--accent-primary)', 'var(--accent-emerald)', 'var(--accent-purple)', 'var(--accent-amber)', 'var(--accent-rose)'];
const MAX_DEPARTMENTS = 5;

const INTEGRATIONS = [
  { key: 'servicenow', icon: 'fa-solid fa-server', label: 'ServiceNow ITSM' },
  { key: 'automationedge', icon: 'fa-solid fa-robot', label: 'AutomationEdge T4 RPA Engine' },
  { key: 'office365', icon: 'fa-brands fa-microsoft', label: 'Microsoft Entra ID (Office 365)' },
  { key: 'orangehrm', icon: 'fa-solid fa-user-check', label: 'OrangeHRM PIM' },
];

const isApproved = (e) => e.status === 'Approved' || e.status === 'Completed';
const isPending = (e) => e.status === 'Pending Review' || e.status === 'Pending';
const isFullyProvisioned = (e) => Boolean(e.o365Email && e.orangeHrmEmpNumber && e.laptopTicket);

function HealthBadge({ result }) {
  if (!result) {
    return <span className="badge flow-badge-idle"><i className="fa-solid fa-spinner fa-spin"></i> Checking</span>;
  }
  if (result.ok) {
    return <span className="badge badge-approved"><i className="fa-solid fa-check"></i> {result.message}</span>;
  }
  return (
    <span className="badge badge-error" title={result.message}>
      <i className="fa-solid fa-xmark"></i> Unavailable
    </span>
  );
}

export default function AnalyticsView({ employees, isLoading }) {
  const [health, setHealth] = useState({});
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    setHealth({});
    try {
      const res = await fetch('/api/integrations/health');
      setHealth(res.ok ? await res.json() : {});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn('Integration health check failed:', err);
      setHealth(Object.fromEntries(INTEGRATIONS.map((i) => [i.key, { ok: false, message: 'HRMS server unreachable' }])));
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const stats = useMemo(() => {
    const approved = employees.filter(isApproved);
    const provisioned = approved.filter(isFullyProvisioned).length;

    const byDept = {};
    employees.forEach((e) => {
      const dept = e.department || 'Unassigned';
      byDept[dept] = (byDept[dept] || 0) + 1;
    });
    const departments = Object.entries(byDept)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_DEPARTMENTS)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / employees.length) * 100) }));

    return {
      total: employees.length,
      approved: approved.length,
      pending: employees.filter(isPending).length,
      provisioned,
      provisionedPct: approved.length ? Math.round((provisioned / approved.length) * 100) : 0,
      departments,
    };
  }, [employees]);

  const show = (value) => (isLoading ? '–' : value);
  const count = (value, suffix) => (isLoading ? '–' : <CountUp value={value} suffix={suffix} />);

  return (
    <section className="view-section active">
      <motion.div className="kpi-grid" variants={gridVariants} initial="hidden" animate="show">
        <motion.div variants={tileVariants} className="glass-card kpi-tile">
          <span className="kpi-label">Total Records</span>
          <div className="kpi-value">{count(stats.total)}</div>
          <span className="kpi-note">Candidates & employees in the portal</span>
        </motion.div>

        <motion.div variants={tileVariants} className="glass-card kpi-tile">
          <span className="kpi-label">Approved & Active</span>
          <div className="kpi-value tone-success">{count(stats.approved)}</div>
          <span className="kpi-note">HR approval completed</span>
        </motion.div>

        <motion.div variants={tileVariants} className="glass-card kpi-tile">
          <span className="kpi-label">Pending Verification</span>
          <div className="kpi-value tone-warning">{count(stats.pending)}</div>
          <span className="kpi-note">Requires HR sign-off</span>
        </motion.div>

        <motion.div variants={tileVariants} className="glass-card kpi-tile">
          <span className="kpi-label">Fully Provisioned</span>
          <div className="kpi-value tone-accent">{count(stats.provisionedPct, '%')}</div>
          <span className="kpi-note">{show(`${stats.provisioned} of ${stats.approved}`)} approved have O365, OrangeHRM & laptop ticket</span>
        </motion.div>
      </motion.div>

      <motion.div className="panel-grid" variants={gridVariants} initial="hidden" animate="show">
        <motion.div variants={tileVariants} className="glass-card">
          <h3 className="panel-title"><i className="fa-solid fa-sitemap text-accent"></i> Departmental Distribution</h3>
          {stats.departments.length === 0 ? (
            <div className="empty-state">{isLoading ? 'Loading records…' : 'No employee records yet.'}</div>
          ) : (
            <div className="bar-list">
              {stats.departments.map((d, i) => (
                <div key={d.name}>
                  <div className="bar-row-head">
                    <span>{d.name}</span>
                    <strong>{d.pct}% <span className="kpi-note">({d.count})</span></strong>
                  </div>
                  <div className="bar-track">
                    {/* scaleX (not width) so the grow animation stays on the compositor */}
                    <motion.div
                      className="bar-fill"
                      style={{ width: `${d.pct}%`, background: BAR_COLORS[i % BAR_COLORS.length], originX: 0 }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.7, delay: 0.2 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={tileVariants} className="glass-card">
          <div className="panel-title" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-shield-halved text-accent"></i> System Integration Health
            </h3>
            <button className="btn btn-secondary" onClick={checkHealth} disabled={isCheckingHealth} style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}>
              <i className={`fa-solid fa-rotate ${isCheckingHealth ? 'fa-spin' : ''}`}></i> Recheck
            </button>
          </div>
          <div className="status-list">
            {INTEGRATIONS.map((item) => (
              <div className="status-row" key={item.key}>
                <span><i className={item.icon}></i> {item.label}</span>
                <HealthBadge result={health[item.key]} />
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
