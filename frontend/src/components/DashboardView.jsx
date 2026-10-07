import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, animate, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Card, EmptyState, Avatar, Skeleton, statusBadgeClass, staggerContainer, staggerItem, trackSpotlight, EASE_OUT } from './ui';

const isApproved = (e) => e.status === 'Approved' || e.status === 'Completed' || e.status === 'Verified';
const isPending = (e) => e.status === 'Pending Review' || e.status === 'Pending' || e.status === 'Pending ServiceNow Review';

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
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('wizard')}>
              <i className="fa-solid fa-user-plus" aria-hidden="true"></i> New onboarding
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
          <p>
            {isLoading
              ? 'Loading today’s onboarding activity…'
              : stats.pending.length
                ? `${stats.pending.length} candidate${stats.pending.length > 1 ? 's are' : ' is'} waiting for your review, and ${stats.fullyPct}% of approved hires are fully provisioned.`
                : `No candidates are waiting. ${stats.fullyPct}% of approved hires are fully provisioned.`}
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
                <tbody>
                  {stats.recent.map((e) => (
                    <tr key={e.id}>
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
                    </tr>
                  ))}
                </tbody>
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
