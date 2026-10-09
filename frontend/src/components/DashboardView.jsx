import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, animate, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, EmptyState, Avatar, Skeleton, statusBadgeClass, staggerContainer, staggerItem, staggerTableRow, trackSpotlight, EASE_OUT } from './ui';

const isApproved = (e) => e.status === 'Approved' || e.status === 'Completed' || e.status === 'Verified';
const isPending = (e) => e.status === 'Pending Review' || e.status === 'Pending' || e.status === 'Pending ServiceNow Review';

const MOTIVATIONAL_QUOTES = [
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Excellence is not an act, but a habit.", author: "Aristotle" },
  { quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { quote: "Efficiency is doing things right; effectiveness is doing the right things.", author: "Peter Drucker" },
  { quote: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
  { quote: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { quote: "Great things in business are never done by one person. They're done by a team.", author: "Steve Jobs" },
  { quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { quote: "Opportunities don't happen, you create them.", author: "Chris Grosser" },
  { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { quote: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar" },
  { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { quote: "Continuous improvement is better than delayed perfection.", author: "Mark Twain" }
];

const EMBER_PARTICLES = [
  { id: 1, left: '8%', bottom: '15%', size: 4, delay: 0, duration: 7, drift: 35 },
  { id: 2, left: '22%', bottom: '25%', size: 3, delay: 1.5, duration: 8.5, drift: -24 },
  { id: 3, left: '38%', bottom: '12%', size: 5, delay: 0.8, duration: 6.8, drift: 40 },
  { id: 4, left: '52%', bottom: '30%', size: 3.5, delay: 2.2, duration: 9, drift: -20 },
  { id: 5, left: '65%', bottom: '18%', size: 4.5, delay: 3, duration: 7.8, drift: 36 },
  { id: 6, left: '76%', bottom: '32%', size: 3.5, delay: 1.1, duration: 8.2, drift: -28 },
  { id: 7, left: '86%', bottom: '20%', size: 4, delay: 2.7, duration: 6.5, drift: 30 },
  { id: 8, left: '93%', bottom: '40%', size: 2.5, delay: 0.4, duration: 7.2, drift: -16 },
  { id: 9, left: '18%', bottom: '45%', size: 3, delay: 3.8, duration: 8.4, drift: 25 },
  { id: 10, left: '58%', bottom: '50%', size: 3.8, delay: 4.2, duration: 9.5, drift: -32 },
  { id: 11, left: '32%', bottom: '60%', size: 2.5, delay: 2.8, duration: 7.5, drift: 22 },
  { id: 12, left: '82%', bottom: '55%', size: 4.2, delay: 1.8, duration: 8.8, drift: 26 },
  { id: 13, left: '46%', bottom: '22%', size: 3.2, delay: 3.4, duration: 7.6, drift: -18 },
  { id: 14, left: '70%', bottom: '48%', size: 4, delay: 0.6, duration: 8.6, drift: 32 },
];

// Counts a number up from 0 (skipped when the OS asks for reduced motion)
function CountUp({ value, suffix = '' }) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (reduceMotion) {
      node.textContent = `${value}${suffix}`;
      return undefined;
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: EASE_OUT,
      onUpdate: (v) => { node.textContent = `${Math.round(v)}${suffix}`; },
    });
    return () => controls.stop();
  }, [value, suffix, reduceMotion]);
  return <span ref={ref}>{`${value}${suffix}`}</span>;
}

// Onboarding funnel: one series, one hue, every stage named and valued in text; hover/focus shows detail
function ProvisioningFunnel({ stages }) {
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(1, stages[0]?.value || 0);

  return (
    <>
      <div className="chart-toolbar">
        <span className="kpi-note">Candidates reaching each provisioning stage</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
          <i className={`fa-solid ${showTable ? 'fa-chart-bar' : 'fa-table'}`} aria-hidden="true"></i>
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {showTable ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th scope="col">Stage</th><th scope="col">Candidates</th><th scope="col">Of submitted</th></tr>
            </thead>
            <tbody>
              {stages.map((s) => (
                <tr key={s.label}>
                  <td>{s.label}</td>
                  <td>{s.value}</td>
                  <td>{stages[0].value ? Math.round((s.value / stages[0].value) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className="funnel" aria-label="Onboarding provisioning funnel">
          {stages.map((s, i) => {
            const pct = stages[0].value ? Math.round((s.value / stages[0].value) * 100) : 0;
            const prev = i > 0 ? stages[i - 1].value : null;
            const drop = prev !== null ? prev - s.value : 0;
            return (
              <li
                key={s.label}
                className={`funnel-row ${active === i ? 'is-active' : ''}`}
                tabIndex={0}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${s.label}: ${s.value} candidates, ${pct}% of submitted`}
              >
                <span className="funnel-label"><i className={`fa-solid ${s.icon}`} aria-hidden="true"></i> {s.label}</span>
                <span className="funnel-track">
                  <motion.span
                    className="funnel-bar"
                    style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, originX: 0 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: EASE_OUT }}
                  />
                </span>
                <span className="funnel-value">{s.value}<small>{pct}%</small></span>
                {active === i && (
                  <span className="chart-tooltip" role="tooltip">
                    <strong>{s.label}</strong>
                    <span>{s.value} candidates · {pct}% of submitted</span>
                    {i > 0 && <span>{drop > 0 ? `${drop} not yet through this stage` : 'No drop-off from previous stage'}</span>}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

export default function DashboardView({ employees, isLoading, onNavigate }) {
  const { currentUser } = useAuth();
  const firstName = currentUser?.name?.split(' ')[0] || 'there';

  const stats = useMemo(() => {
    const approved = employees.filter(isApproved);
    const pending = employees.filter(isPending);
    const fully = approved.filter((e) => e.o365Email && e.orangeHrmEmpNumber && e.laptopTicket).length;
    const stages = [
      { label: 'Submitted', icon: 'fa-file-import', value: employees.length },
      { label: 'HR approved', icon: 'fa-clipboard-check', value: approved.length },
      { label: 'Active Directory', icon: 'fa-robot', value: employees.filter((e) => e.aeT4RequestId).length },
      { label: 'Microsoft 365', icon: 'fa-envelope', value: employees.filter((e) => e.o365Email).length },
      { label: 'OrangeHRM', icon: 'fa-user-check', value: employees.filter((e) => e.orangeHrmEmpNumber).length },
      { label: 'Laptop ticket', icon: 'fa-laptop', value: employees.filter((e) => e.laptopTicket).length },
    ];
    const recent = [...employees]
      .sort((a, b) => new Date(b.approvedAt || b.submittedAt || 0) - new Date(a.approvedAt || a.submittedAt || 0))
      .slice(0, 6);
    return {
      total: employees.length,
      pending,
      approved: approved.length,
      fullyPct: approved.length ? Math.round((fully / approved.length) * 100) : 0,
      fully,
      stages,
      recent,
    };
  }, [employees]);

  const show = (node, width = '3rem') => (isLoading ? <Skeleton width={width} /> : node);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dailyQuote = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  }, []);

  return (
    <section className="view-section active page">
      <PageHeader
        icon="fa-solid fa-gauge-high"
        title="Dashboard"
        description="Onboarding, approvals and provisioning at a glance."
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('whatsapp')}>
              <i className="fa-brands fa-whatsapp text-accent" aria-hidden="true"></i> WhatsApp flows
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('wizard')}>
              <i className="fa-solid fa-user-plus text-accent" aria-hidden="true"></i> New onboarding
            </button>
          </>
        }
      />

      {/* Hero banner */}
      <motion.div
        className="dash-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
      >
        <div className="dash-hero-text">
          <span className="dash-hero-date">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h2>{greeting}, {firstName}</h2>
          <p className="dash-hero-quote" style={{ margin: '0.35rem 0', color: '#f1f5f9', fontSize: '0.95rem', lineHeight: '1.45', maxWidth: '65ch' }}>
            {dailyQuote.quote}
          </p>
          <div className="dash-hero-actions">
            <button className="btn dash-hero-btn" onClick={() => onNavigate('approvals')}>
              <i className="fa-solid fa-clipboard-check" aria-hidden="true"></i> Review approvals
              {stats.pending.length > 0 && <span className="dash-hero-count">{stats.pending.length}</span>}
            </button>
            <button className="btn dash-hero-btn-ghost" onClick={() => onNavigate('analytics')}>
              View analytics <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        {/* Floating Luminous Ember Particles */}
        <div className="dash-hero-particles" aria-hidden="true">
          {EMBER_PARTICLES.map((p) => (
            <span
              key={p.id}
              className="dash-hero-ember"
              style={{
                left: p.left,
                bottom: p.bottom,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                '--drift-x': `${p.drift}px`,
              }}
            />
          ))}
        </div>

        <ul className="dash-hero-systems" aria-label="Connected systems">
          {[
            { icon: 'fa-solid fa-ticket', label: 'ServiceNow' },
            { icon: 'fa-solid fa-sitemap', label: 'Active Directory' },
            { icon: 'fa-solid fa-robot', label: 'AutomationEdge T4' },
            { icon: 'fa-brands fa-microsoft', label: 'Microsoft 365' },
            { icon: 'fa-solid fa-user-check', label: 'OrangeHRM' },
          ].map((s, i) => (
            <motion.li
              key={s.label}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.07, ease: EASE_OUT }}
            >
              <i className={s.icon} aria-hidden="true"></i> {s.label}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* KPI row */}
      <motion.div className="kpi-grid" variants={staggerContainer} initial="hidden" animate="show">
        <motion.button type="button" className="ui-card kpi-tile kpi-link kpi-c1 spotlight" variants={staggerItem} onPointerMove={trackSpotlight} onClick={() => onNavigate('dashboard')}>
          <span className="kpi-label"><span className="kpi-icon" aria-hidden="true"><i className="fa-solid fa-users"></i></span> Total records</span>
          <div className="kpi-value">{show(<CountUp value={stats.total} />, '2.5rem')}</div>
          <span className="kpi-note">Open directory <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </motion.button>
        <motion.button type="button" className="ui-card kpi-tile kpi-link kpi-c2 spotlight" variants={staggerItem} onPointerMove={trackSpotlight} onClick={() => onNavigate('approvals')}>
          <span className="kpi-label"><span className="kpi-icon" aria-hidden="true"><i className="fa-solid fa-hourglass-half"></i></span> Pending review{stats.pending.length > 0 && <span className="live-dot" aria-label="Candidates waiting"></span>}</span>
          <div className="kpi-value tone-warning">{show(<CountUp value={stats.pending.length} />)}</div>
          <span className="kpi-note">Review approvals <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </motion.button>
        <motion.div className="ui-card kpi-tile kpi-c3 spotlight" variants={staggerItem} onPointerMove={trackSpotlight}>
          <span className="kpi-label"><span className="kpi-icon" aria-hidden="true"><i className="fa-solid fa-circle-check"></i></span> Approved</span>
          <div className="kpi-value tone-success">{show(<CountUp value={stats.approved} />)}</div>
          <span className="kpi-note">HR sign-off completed</span>
        </motion.div>
        <motion.button type="button" className="ui-card kpi-tile kpi-link kpi-c4 spotlight" variants={staggerItem} onPointerMove={trackSpotlight} onClick={() => onNavigate('analytics')}>
          <span className="kpi-label"><span className="kpi-icon" aria-hidden="true"><i className="fa-solid fa-diagram-project"></i></span> Fully provisioned</span>
          <div className="kpi-value tone-accent">{show(<CountUp value={stats.fullyPct} suffix="%" />, '4rem')}</div>
          <span className="kpi-note">{show(`${stats.fully} of ${stats.approved} approved`)} · analytics <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
        </motion.button>
      </motion.div>

      <motion.div className="dash-grid" variants={staggerContainer} initial="hidden" animate="show">
        {/* Funnel */}
        <Card title="Provisioning funnel" icon="fa-solid fa-filter" className="dash-span-2">
          {stats.total === 0 && !isLoading ? (
            <EmptyState icon="fa-solid fa-filter" title="No candidates yet" action={<button className="btn btn-primary" onClick={() => onNavigate('wizard')}>Start onboarding</button>}>
              The funnel fills in as candidates are submitted and approved.
            </EmptyState>
          ) : (
            <ProvisioningFunnel stages={stats.stages} />
          )}
        </Card>

        {/* Pending queue */}
        <Card
          title="Waiting for you"
          icon="fa-solid fa-inbox"
          actions={stats.pending.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('approvals')}>View all</button>
          )}
        >
          {stats.pending.length === 0 ? (
            <EmptyState icon="fa-solid fa-circle-check" title="All caught up">No candidates are waiting for review.</EmptyState>
          ) : (
            <ul className="mini-list">
              {stats.pending.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <Avatar name={e.fullName} size={34} />
                  <div className="mini-list-text">
                    <strong>{e.fullName}</strong>
                    <span>{e.jobTitle || '—'} · {e.department || '—'}</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('approvals')}>
                    Review<span className="sr-only"> {e.fullName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent activity */}
        <Card title="Recent activity" icon="fa-solid fa-clock-rotate-left" className="dash-span-2">
          {stats.recent.length === 0 ? (
            <EmptyState icon="fa-solid fa-clock" title="No activity yet">Submissions and approvals will appear here.</EmptyState>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Status</th>
                    <th scope="col">Work email</th>
                    <th scope="col">Laptop</th>
                    <th scope="col">Updated</th>
                  </tr>
                </thead>
                <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
                  {stats.recent.map((e) => (
                    <motion.tr key={e.id} variants={staggerTableRow}>
                      <td>
                        <div className="cell-person">
                          <Avatar name={e.fullName} size={32} />
                          <div>
                            <strong>{e.fullName}</strong>
                            <div className="cell-sub">{e.jobTitle || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${statusBadgeClass(e.status)}`}>{e.status || 'Pending Review'}</span></td>
                      <td>{e.o365Email || <span className="cell-sub">Not created</span>}</td>
                      <td>{e.laptopTicket ? <span className="cell-mono">{e.laptopTicket}</span> : <span className="cell-sub">—</span>}</td>
                      <td className="cell-sub">{e.approvedAt || e.submittedAt || '—'}</td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <Card title="Quick actions" icon="fa-solid fa-bolt">
          <div className="quick-actions">
            {[
              { view: 'wizard', icon: 'fa-user-plus', label: 'Onboard a candidate', note: 'Register & upload documents' },
              { view: 'recruitment', icon: 'fa-file-arrow-up', label: 'Screen a resume', note: 'AI match against open roles' },
              { view: 'exit', icon: 'fa-person-walking-arrow-right', label: 'Start offboarding', note: 'Resignation & deprovisioning' },
              { view: 'whatsapp', icon: 'fa-comments', brand: 'fa-brands fa-whatsapp', label: 'WhatsApp discovery', note: 'See employee chat flows' },
            ].map((a) => (
              <motion.button
                key={a.view}
                type="button"
                className="quick-action spotlight"
                onClick={() => onNavigate(a.view)}
                onPointerMove={trackSpotlight}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
              >
                <span className="quick-action-icon" aria-hidden="true"><i className={a.brand || `fa-solid ${a.icon}`}></i></span>
                <span className="quick-action-text">
                  <strong>{a.label}</strong>
                  <span>{a.note}</span>
                </span>
                <i className="fa-solid fa-chevron-right quick-action-arrow" aria-hidden="true"></i>
              </motion.button>
            ))}
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
