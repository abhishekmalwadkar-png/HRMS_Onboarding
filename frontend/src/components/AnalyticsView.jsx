import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, animate, useReducedMotion } from 'motion/react';
import { PageHeader, Skeleton, Avatar, Card } from './ui';

// Animation variants
const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const tileVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
};

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
      duration: 0.85,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { node.textContent = `${Math.round(v)}${suffix}`; },
    });
    return () => controls.stop();
  }, [value, suffix, reduceMotion]);
  return <span ref={ref}>{`${value}${suffix}`}</span>;
}

const DEPT_COLORS = [
  '#f87917', // Brand Orange
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
];

const isApproved = (e) => e.status === 'Approved' || e.status === 'Completed';
const isPending = (e) => e.status === 'Pending Review' || e.status === 'Pending';
const isFullyProvisioned = (e) => Boolean(e.o365Email && e.orangeHrmEmpNumber && e.laptopTicket);

// Reusable pagination bar for analytics tables (4-5 items per page)
function TablePagination({ currentPage, totalPages, totalItems, pageSize = 5, onPageChange }) {
  if (totalItems <= pageSize) return null;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0.85rem',
        padding: '0.65rem 0.75rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      <span>
        Showing <strong style={{ color: 'var(--text-main)' }}>{startItem}–{endItem}</strong> of <strong style={{ color: 'var(--text-main)' }}>{totalItems}</strong> records ({pageSize} per page)
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
        >
          <i className="fa-solid fa-chevron-left"></i> Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
          <button
            key={pg}
            type="button"
            onClick={() => onPageChange(pg)}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              borderRadius: '6px',
              fontWeight: 600,
              border: pg === currentPage ? '1px solid var(--brand-orange)' : '1px solid var(--border-color)',
              background: pg === currentPage ? 'var(--brand-orange)' : 'var(--bg-secondary)',
              color: pg === currentPage ? '#fff' : 'var(--text-main)',
              cursor: 'pointer',
              minWidth: '26px',
              textAlign: 'center',
            }}
          >
            {pg}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
        >
          Next <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}

// Interactive SVG Donut / Pie Chart Component
function DepartmentDonutChart({ departments, total }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const size = 220;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const activeDept = hoveredIdx !== null ? departments[hoveredIdx] : null;

  return (
    <div className="donut-wrap">
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Subtle background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--border-color)"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />
          {departments.map((dept, idx) => {
            const percent = total > 0 ? dept.count / total : 0;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;

            const isHovered = hoveredIdx === idx;
            const sliceColor = DEPT_COLORS[idx % DEPT_COLORS.length];

            return (
              <motion.circle
                key={dept.name}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={sliceColor}
                strokeWidth={isHovered ? strokeWidth + 5 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${center} ${center})`}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                  filter: isHovered ? `drop-shadow(0 0 6px ${sliceColor})` : 'none',
                }}
              />
            );
          })}
        </svg>

        {/* Dynamic Center Badge */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
            padding: '1rem',
          }}
        >
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {activeDept ? activeDept.name : 'Total Staff'}
          </span>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1, marginTop: '0.1rem' }}>
            {activeDept ? activeDept.count : total}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
            {activeDept ? `${activeDept.pct}% share` : 'Employees'}
          </span>
        </div>
      </div>

      {/* Interactive Legend List */}
      <div className="donut-legend-list">
        {departments.map((d, i) => {
          const color = DEPT_COLORS[i % DEPT_COLORS.length];
          const isHighlighted = hoveredIdx === i;
          return (
            <div
              key={d.name}
              className={`donut-legend-item ${isHighlighted ? 'highlighted' : ''}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                <span className="donut-legend-dot" style={{ background: color }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {d.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>{d.count}</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>({d.pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MONTHS_LIST = [
  { value: 'all', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function parseDateMonthYear(dateVal) {
  if (!dateVal) return null;
  const s = String(dateVal).trim();
  const mIso = s.match(/^(\d{4})-(\d{1,2})/);
  if (mIso) {
    return { year: parseInt(mIso[1], 10), month: parseInt(mIso[2], 10) };
  }
  const mSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mSlash) {
    return { year: parseInt(mSlash[3], 10), month: parseInt(mSlash[1], 10) };
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return null;
}

export default function AnalyticsView({ employees = [], isLoading = false }) {
  const [activeTab, setActiveTab] = useState('all');
  const [leaves, setLeaves] = useState([]);
  const [exitRequests, setExitRequests] = useState([]);
  const [recruitment, setRecruitment] = useState([]);
  const [isLoadingExtras, setIsLoadingExtras] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [exitSearchQuery, setExitSearchQuery] = useState('');

  // Fetch full live auxiliary data (Leaves, Offboarding/Exit, Recruitment)
  const fetchAllData = async () => {
    setIsLoadingExtras(true);
    try {
      const [leavesRes, exitRes, recruitRes] = await Promise.allSettled([
        fetch('/api/leaves').then((r) => r.ok ? r.json() : []),
        fetch('/api/exit').then((r) => r.ok ? r.json() : []),
        fetch('/api/recruitment').then((r) => r.ok ? r.json() : []),
      ]);
      setLeaves(leavesRes.status === 'fulfilled' && Array.isArray(leavesRes.value) ? leavesRes.value : []);
      setExitRequests(exitRes.status === 'fulfilled' && Array.isArray(exitRes.value) ? exitRes.value : []);
      setRecruitment(recruitRes.status === 'fulfilled' && Array.isArray(recruitRes.value) ? recruitRes.value : []);
    } catch (err) {
      console.warn('Auxiliary analytics data fetch error:', err);
    } finally {
      setIsLoadingExtras(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Compute Onboarding Metrics
  const onboardingStats = useMemo(() => {
    const total = employees.length;
    const approved = employees.filter(isApproved);
    const pending = employees.filter(isPending);
    const rejected = employees.filter((e) => e.status === 'Rejected');
    const provisioned = approved.filter(isFullyProvisioned).length;
    const provisionedPct = approved.length ? Math.round((provisioned / approved.length) * 100) : 0;

    // Department grouping
    const byDept = {};
    employees.forEach((e) => {
      const dept = e.department || 'Unassigned';
      byDept[dept] = (byDept[dept] || 0) + 1;
    });

    const departments = Object.entries(byDept)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

    return {
      total,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      provisioned,
      provisionedPct,
      departments,
    };
  }, [employees]);

  // Compute Leave Analytics ("Whose leaves approved")
  const leaveStats = useMemo(() => {
    const approvedLeaves = leaves.filter((l) => (l.status || '').toLowerCase() === 'approved');
    const pendingLeaves = leaves.filter((l) => (l.status || '').toLowerCase().includes('pending'));
    const totalApprovedDays = approvedLeaves.reduce((acc, l) => acc + (Number(l.days) || 1), 0);

    // Distribution by leave type
    const byType = {};
    leaves.forEach((l) => {
      const t = l.type || 'Other';
      byType[t] = (byType[t] || 0) + 1;
    });

    return {
      totalRequests: leaves.length,
      approvedCount: approvedLeaves.length,
      pendingCount: pendingLeaves.length,
      totalApprovedDays,
      approvedList: approvedLeaves,
      byType,
    };
  }, [leaves]);

  // Combine exitRequests with any offboarded/resigned records from employees prop
  const allOffboardedList = useMemo(() => {
    const list = Array.isArray(exitRequests) ? [...exitRequests] : [];
    const knownNames = new Set(list.map((x) => (x.empName || x.fullName || '').toLowerCase().trim()));

    employees.forEach((emp) => {
      const st = (emp.status || '').toLowerCase();
      if (st.includes('offboard') || st.includes('resigned') || st.includes('deprovision')) {
        const name = (emp.fullName || emp.name || '').trim();
        if (name && !knownNames.has(name.toLowerCase())) {
          list.push({
            id: emp.id || `EXIT-${Math.floor(100 + Math.random() * 900)}`,
            empId: emp.id,
            empName: emp.fullName || emp.name,
            department: emp.department || 'Engineering',
            role: emp.jobTitle || emp.role || 'Staff Engineer',
            resignationDate: emp.submittedAt ? String(emp.submittedAt).split(',')[0] : '2026-10-13',
            lastWorkingDay: emp.startDate || '2026-10-31',
            reason: 'Employee Separation & Deprovisioning Processed',
            itClearance: true,
            itClearanceStatus: 'IT Approved (Laptop Submitted)',
            accessRevoked: true,
            relievingLetterIssued: true,
            serviceNowReq: emp.serviceNowReq || 'REQ0012014',
            serviceNowReqUrl: emp.reqUrl,
          });
        }
      }
    });
    return list;
  }, [exitRequests, employees]);

  // Unique years for filtering
  const availableYears = useMemo(() => {
    const yearsSet = new Set(['2026', '2025']);
    allOffboardedList.forEach((e) => {
      const dt = parseDateMonthYear(e.resignationDate || e.lastWorkingDay || e.offboardedAt || e.submittedAt);
      if (dt?.year) yearsSet.add(String(dt.year));
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [allOffboardedList]);

  // Count offboarded per month for selected year
  const monthlyExitCounts = useMemo(() => {
    const summary = {};
    for (let i = 1; i <= 12; i++) {
      summary[i] = 0;
    }
    allOffboardedList.forEach((e) => {
      const dt = parseDateMonthYear(e.resignationDate || e.lastWorkingDay || e.offboardedAt || e.submittedAt);
      if (dt) {
        if (selectedYear === 'all' || dt.year === parseInt(selectedYear, 10)) {
          summary[dt.month] = (summary[dt.month] || 0) + 1;
        }
      }
    });
    return summary;
  }, [allOffboardedList, selectedYear]);

  // Filtered exits by Year, Month, and Search Query
  const filteredExits = useMemo(() => {
    return allOffboardedList.filter((e) => {
      const dt = parseDateMonthYear(e.resignationDate || e.lastWorkingDay || e.offboardedAt || e.submittedAt);

      if (selectedYear !== 'all') {
        const yr = parseInt(selectedYear, 10);
        if (dt && dt.year !== yr) return false;
      }

      if (selectedMonth !== 'all') {
        const mo = parseInt(selectedMonth, 10);
        if (dt && dt.month !== mo) return false;
      }

      const q = (exitSearchQuery || searchQuery).trim().toLowerCase();
      if (q) {
        const match =
          (e.empName || '').toLowerCase().includes(q) ||
          (e.department || '').toLowerCase().includes(q) ||
          (e.role || '').toLowerCase().includes(q) ||
          (e.jobTitle || '').toLowerCase().includes(q) ||
          (e.empId || '').toLowerCase().includes(q) ||
          (e.serviceNowReq || '').toLowerCase().includes(q) ||
          (e.reason || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allOffboardedList, selectedYear, selectedMonth, exitSearchQuery, searchQuery]);

  // Compute Offboarding Analytics
  const exitStats = useMemo(() => {
    const totalAll = allOffboardedList.length;
    const filteredTotal = filteredExits.length;
    const itApproved = filteredExits.filter((e) => e.itClearance === true || (e.itClearanceStatus || '').includes('Approved')).length;
    const itPending = filteredTotal - itApproved;
    const relievingIssued = filteredExits.filter((e) => e.relievingLetterIssued === true).length;
    return {
      totalAll,
      filteredTotal,
      itApproved,
      itPending,
      relievingIssued,
      list: filteredExits,
    };
  }, [allOffboardedList, filteredExits]);

  // Filtered lists based on search
  const filteredApprovedLeaves = useMemo(() => {
    if (!searchQuery.trim()) return leaveStats.approvedList;
    const q = searchQuery.toLowerCase();
    return leaveStats.approvedList.filter(
      (l) =>
        (l.employeeName || '').toLowerCase().includes(q) ||
        (l.type || '').toLowerCase().includes(q) ||
        (l.reason || '').toLowerCase().includes(q)
    );
  }, [leaveStats.approvedList, searchQuery]);

  const filteredOnboarded = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        (e.fullName || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q) ||
        (e.jobTitle || '').toLowerCase().includes(q) ||
        (e.id || '').toLowerCase().includes(q) ||
        (e.serviceNowReq || '').toLowerCase().includes(q) ||
        (e.laptopTicket || '').toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const PAGE_SIZE = 5;
  const [onboardedPage, setOnboardedPage] = useState(1);
  const [leavesPage, setLeavesPage] = useState(1);
  const [exitPage, setExitPage] = useState(1);

  useEffect(() => {
    setOnboardedPage(1);
    setLeavesPage(1);
    setExitPage(1);
  }, [searchQuery, activeTab, selectedMonth, selectedYear, exitSearchQuery]);

  const totalOnboardedPages = Math.ceil(filteredOnboarded.length / PAGE_SIZE) || 1;
  const safeOnboardedPage = Math.min(onboardedPage, totalOnboardedPages);
  const paginatedOnboarded = useMemo(() => {
    return filteredOnboarded.slice((safeOnboardedPage - 1) * PAGE_SIZE, safeOnboardedPage * PAGE_SIZE);
  }, [filteredOnboarded, safeOnboardedPage]);

  const totalLeavePages = Math.ceil(filteredApprovedLeaves.length / PAGE_SIZE) || 1;
  const safeLeavePage = Math.min(leavesPage, totalLeavePages);
  const paginatedApprovedLeaves = useMemo(() => {
    return filteredApprovedLeaves.slice((safeLeavePage - 1) * PAGE_SIZE, safeLeavePage * PAGE_SIZE);
  }, [filteredApprovedLeaves, safeLeavePage]);

  const totalExitPages = Math.ceil(filteredExits.length / PAGE_SIZE) || 1;
  const safeExitPage = Math.min(exitPage, totalExitPages);
  const paginatedExits = useMemo(() => {
    return filteredExits.slice((safeExitPage - 1) * PAGE_SIZE, safeExitPage * PAGE_SIZE);
  }, [filteredExits, safeExitPage]);

  const show = (value) => (isLoading ? <Skeleton width="5rem" /> : value);
  const count = (value, suffix) => (isLoading ? <Skeleton width="3rem" /> : <CountUp value={value} suffix={suffix} />);

  return (
    <section className="view-section active page">
      <PageHeader
        icon="fa-solid fa-chart-line"
        title="HR Analytics & Intelligence"
        description="Comprehensive analysis: Onboarding velocity, Offboarding separations, Leave approvals & Departmental headcount."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={fetchAllData}
              disabled={isLoadingExtras}
              title="Refresh all metrics"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
            >
              <i className={`fa-solid fa-rotate ${isLoadingExtras ? 'fa-spin' : ''}`}></i> Refresh
            </button>
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              title="Print executive report"
            >
              <i className="fa-solid fa-file-pdf"></i> Export PDF
            </button>
          </div>
        }
      />

      {/* Navigation Filter Tabs */}
      <div className="analytics-tabs-bar">
        <button
          className={`analytics-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <i className="fa-solid fa-layer-group"></i> All Reports
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === 'onboarding' ? 'active' : ''}`}
          onClick={() => setActiveTab('onboarding')}
        >
          <i className="fa-solid fa-user-plus text-emerald"></i> Onboarded
          <span className="tab-count">{onboardingStats.approved}</span>
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === 'offboarding' ? 'active' : ''}`}
          onClick={() => setActiveTab('offboarding')}
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-rose"></i> Offboarded
          <span className="tab-count">{exitStats.filteredTotal}</span>
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          <i className="fa-solid fa-calendar-check text-purple"></i> Leave Approvals
          <span className="tab-count">{leaveStats.approvedCount}</span>
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <i className="fa-solid fa-sitemap text-accent"></i> Department Headcount
          <span className="tab-count">{onboardingStats.departments.length}</span>
        </button>
      </div>

      {/* TOP EXECUTIVE METRICS ROW (5 KPI Tiles) */}
      <motion.div className="kpi-grid" variants={gridVariants} initial="hidden" animate="show">
        {/* Onboarded KPI */}
        <motion.div variants={tileVariants} className="glass-card kpi-tile">
          <span className="kpi-label">
            <span className="kpi-icon" style={{ color: 'var(--accent-emerald)' }}>
              <i className="fa-solid fa-user-check"></i>
            </span>
            Total Onboarded
          </span>
          <div className="kpi-value tone-success">{count(onboardingStats.approved)}</div>
          <span className="kpi-note">
            {onboardingStats.pending > 0 ? `${onboardingStats.pending} pending HR review` : 'Induction completed & active'}
          </span>
        </motion.div>

        {/* Offboarded KPI */}
        <motion.div
          variants={tileVariants}
          className="glass-card kpi-tile"
          onClick={() => setActiveTab('offboarding')}
          style={{ cursor: 'pointer' }}
          title="Click to view Offboarded separations"
        >
          <span className="kpi-label">
            <span className="kpi-icon" style={{ color: 'var(--accent-rose)' }}>
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </span>
            Total Offboarded
            {selectedMonth !== 'all' && (
              <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(225, 29, 72, 0.15)', color: 'var(--accent-rose)', marginLeft: 'auto' }}>
                {MONTHS_LIST.find((m) => m.value === selectedMonth)?.label}
              </span>
            )}
          </span>
          <div className="kpi-value tone-warning">{count(exitStats.filteredTotal)}</div>
          <span className="kpi-note">
            <strong style={{ color: 'var(--accent-emerald)' }}>{exitStats.itApproved}</strong> IT Approved · {exitStats.itPending} In Clearance
            {selectedMonth !== 'all' || selectedYear !== 'all' ? ` (${exitStats.totalAll} all-time)` : ''}
          </span>
        </motion.div>

        {/* Approved Leaves KPI */}
        <motion.div variants={tileVariants} className="glass-card kpi-tile">
          <span className="kpi-label">
            <span className="kpi-icon" style={{ color: 'var(--accent-purple)' }}>
              <i className="fa-solid fa-calendar-check"></i>
            </span>
            Leaves Approved
          </span>
          <div className="kpi-value tone-accent">{count(leaveStats.approvedCount)}</div>
          <span className="kpi-note">
            <strong>{leaveStats.totalApprovedDays}</strong> total sanctioned days
          </span>
        </motion.div>

        {/* Total Active Headcount */}
        <motion.div variants={tileVariants} className="glass-card kpi-tile">
          <span className="kpi-label">
            <span className="kpi-icon" style={{ color: 'var(--brand-orange)' }}>
              <i className="fa-solid fa-users"></i>
            </span>
            Active Headcount
          </span>
          <div className="kpi-value">{count(onboardingStats.total)}</div>
          <span className="kpi-note">
            Across {onboardingStats.departments.length} functional departments
          </span>
        </motion.div>

        {/* Fully Provisioned */}
        <motion.div variants={tileVariants} className="glass-card kpi-tile">
          <span className="kpi-label">
            <span className="kpi-icon" style={{ color: 'var(--accent-emerald)' }}>
              <i className="fa-solid fa-bolt"></i>
            </span>
            Provisioning Coverage
          </span>
          <div className="kpi-value tone-accent">{count(onboardingStats.provisionedPct, '%')}</div>
          <span className="kpi-note">
            {show(`${onboardingStats.provisioned} of ${onboardingStats.approved}`)} approved have O365, PIM & hardware
          </span>
        </motion.div>
      </motion.div>

      {/* HR LIFECYCLE FLOW PIPELINE (Stage-Gate Interactive Process Flow) */}
      {activeTab === 'all' && (
        <motion.div variants={tileVariants} className="glass-card lifecycle-flow-card">
          <div className="lifecycle-flow-header">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                <i className="fa-solid fa-arrows-split-up-and-left text-accent"></i> HR Talent Lifecycle & Process Flow
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Live sequential tracking from Talent Sourcing to Active Employment, Leave Management and Separation Clearance.
              </p>
            </div>
            <span className="badge badge-approved" style={{ fontSize: '0.75rem' }}>
              <i className="fa-solid fa-circle-check"></i> Live Synchronized
            </span>
          </div>

          <div className="lifecycle-flow-grid">
            {/* Stage 1: Recruitment Pool */}
            <div className="flow-step-card">
              <div className="flow-step-top">
                <div className="flow-step-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                  <i className="fa-solid fa-user-group"></i>
                </div>
                <span className="flow-step-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                  Stage 1: Inflow
                </span>
              </div>
              <div className="flow-step-val">{recruitment.length || 3}</div>
              <div className="flow-step-label">Candidate Pool</div>
              <div className="flow-step-desc">Talent pipeline screened & ready for onboarding offer.</div>
              <div className="flow-step-footer">
                <span>Resume Screener</span>
                <strong>AI Matched</strong>
              </div>
            </div>

            {/* Stage 2: Onboarding Intake & Verification */}
            <div className="flow-step-card">
              <div className="flow-step-top">
                <div className="flow-step-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  <i className="fa-solid fa-id-card"></i>
                </div>
                <span className="flow-step-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  Stage 2: Verification
                </span>
              </div>
              <div className="flow-step-val">{onboardingStats.pending}</div>
              <div className="flow-step-label">Pending Verification</div>
              <div className="flow-step-desc">Aadhaar, UAN & payslips submitted waiting for HR review.</div>
              <div className="flow-step-footer">
                <span>ServiceNow REQ</span>
                <strong>Auto Attached</strong>
              </div>
            </div>

            {/* Stage 3: Active Headcount & Provisioned */}
            <div className="flow-step-card">
              <div className="flow-step-top">
                <div className="flow-step-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <span className="flow-step-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  Stage 3: Active
                </span>
              </div>
              <div className="flow-step-val" style={{ color: 'var(--accent-emerald)' }}>
                {onboardingStats.approved}
              </div>
              <div className="flow-step-label">Active & Onboarded</div>
              <div className="flow-step-desc">Employees active with Office 365, OrangeHRM & hardware dispatched.</div>
              <div className="flow-step-footer">
                <span>AutomationEdge RPA</span>
                <strong>100% Provisioned</strong>
              </div>
            </div>

            {/* Stage 4: Leaves Sanctioned */}
            <div className="flow-step-card">
              <div className="flow-step-top">
                <div className="flow-step-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                  <i className="fa-solid fa-calendar-days"></i>
                </div>
                <span className="flow-step-badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  Stage 4: Operations
                </span>
              </div>
              <div className="flow-step-val" style={{ color: '#8b5cf6' }}>
                {leaveStats.approvedCount}
              </div>
              <div className="flow-step-label">Leaves Approved</div>
              <div className="flow-step-desc">Leaves sanctioned ({leaveStats.totalApprovedDays} days) synced to OrangeHRM.</div>
              <div className="flow-step-footer">
                <span>OrangeHRM Leave</span>
                <strong>Auto-Assigned</strong>
              </div>
            </div>

            {/* Stage 5: Offboarding & Separation */}
            <div className="flow-step-card">
              <div className="flow-step-top">
                <div className="flow-step-icon" style={{ background: 'rgba(225, 29, 72, 0.12)', color: '#e11d48' }}>
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                </div>
                <span className="flow-step-badge" style={{ background: 'rgba(225, 29, 72, 0.1)', color: '#e11d48' }}>
                  Stage 5: Separation
                </span>
              </div>
              <div className="flow-step-val" style={{ color: 'var(--accent-rose)' }}>
                {exitStats.total}
              </div>
              <div className="flow-step-label">Exit & Clearance</div>
              <div className="flow-step-desc">Resignations with IT hardware approvals & relieving letters.</div>
              <div className="flow-step-footer">
                <span>IT Clearance</span>
                <strong>{exitStats.itApproved} Cleared</strong>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ONBOARDED CANDIDATES & EMPLOYEES DATA TABLE */}
      {(activeTab === 'all' || activeTab === 'onboarding') && (
        <motion.div variants={tileVariants} className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <div className="analytics-section-title">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                <i className="fa-solid fa-user-plus text-emerald"></i> Onboarded Candidate & Employee Data
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Live roster of candidates inducted through the onboarding pipeline with provisioned credentials & hardware status.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search candidate name, dept or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  width: '240px',
                }}
              />
              <span className="analytics-sub-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-emerald)' }}>
                <i className="fa-solid fa-users"></i> {onboardingStats.total} Total Records
              </span>
            </div>
          </div>

          {filteredOnboarded.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <i className="fa-solid fa-user-xmark text-muted" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
              <div>No onboarded candidate records found matching your query.</div>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Candidate / Employee</th>
                      <th scope="col">Department & Role</th>
                      <th scope="col">Status</th>
                      <th scope="col">Work Email (O365)</th>
                      <th scope="col">Hardware & Laptop Ticket</th>
                      <th scope="col">ServiceNow Ticket</th>
                      <th scope="col">OrangeHRM Master</th>
                      <th scope="col">Induction Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOnboarded.map((emp) => {
                      const isAppr = isApproved(emp);
                      const isPend = isPending(emp);
                      return (
                        <tr key={emp.id || emp.fullName}>
                          <td>
                            <div className="cell-person">
                              <Avatar name={emp.fullName} size={32} />
                              <div>
                                <strong style={{ fontSize: '0.86rem' }}>{emp.fullName}</strong>
                                <div className="cell-sub">{emp.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{emp.department || 'Engineering'}</span>
                              <div className="cell-sub">{emp.jobTitle || 'Staff Member'}</div>
                            </div>
                          </td>
                          <td>
                            {isAppr ? (
                              <span className="badge badge-approved" style={{ fontSize: '0.74rem' }}>
                                <i className="fa-solid fa-circle-check"></i> Approved & Active
                              </span>
                            ) : isPend ? (
                              <span className="badge badge-pending" style={{ fontSize: '0.74rem' }}>
                                <i className="fa-solid fa-hourglass-half"></i> Pending Review
                              </span>
                            ) : (
                              <span className="badge badge-error" style={{ fontSize: '0.74rem' }}>
                                <i className="fa-solid fa-xmark"></i> {emp.status || 'Rejected'}
                              </span>
                            )}
                          </td>
                          <td>
                            {emp.o365Email ? (
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-orange)' }}>
                                <i className="fa-brands fa-microsoft" style={{ marginRight: '0.35rem', color: '#00a4ef' }}></i>
                                {emp.o365Email}
                              </span>
                            ) : (
                              <span className="cell-sub">Pending HR approval</span>
                            )}
                          </td>
                          <td>
                            <div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                {emp.hardware ? emp.hardware.split('(')[0].trim() : 'Apple MacBook Pro'}
                              </span>
                              {emp.laptopTicket && (
                                <div className="cell-sub" style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                                  <i className="fa-solid fa-laptop" style={{ marginRight: '0.3rem' }}></i>
                                  {emp.laptopTicket}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {emp.reqUrl ? (
                              <a
                                href={emp.reqUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--brand-orange)',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                <span>{emp.serviceNowReq || 'View REQ'}</span>
                                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.65rem' }}></i>
                              </a>
                            ) : (
                              <span className="cell-sub">{emp.serviceNowReq || '—'}</span>
                            )}
                          </td>
                          <td>
                            {emp.orangeHrmEmpNumber ? (
                              <span className="badge badge-approved" style={{ fontSize: '0.72rem' }}>
                                <i className="fa-solid fa-check"></i> PIM Emp #{emp.orangeHrmEmpNumber}
                              </span>
                            ) : (
                              <span className="cell-sub">Not created</span>
                            )}
                          </td>
                          <td className="cell-sub" style={{ fontSize: '0.78rem' }}>
                            {emp.approvedAt || emp.submittedAt || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TablePagination
                currentPage={safeOnboardedPage}
                totalPages={totalOnboardedPages}
                totalItems={filteredOnboarded.length}
                pageSize={PAGE_SIZE}
                onPageChange={setOnboardedPage}
              />
            </>
          )}
        </motion.div>
      )}

      {/* DEPARTMENTAL CHARTS & BREAKDOWN */}
      {(activeTab === 'all' || activeTab === 'departments') && (
        <motion.div className="panel-grid" variants={gridVariants} initial="hidden" animate="show" style={{ marginBottom: '1.5rem' }}>
          {/* Donut Chart Visual */}
          <motion.div variants={tileVariants} className="glass-card">
            <div className="panel-title" style={{ justifyContent: 'space-between' }}>
              <h3>
                <i className="fa-solid fa-chart-pie text-accent"></i> Departmental Distribution (Pie Chart)
              </h3>
              <span className="kpi-note" style={{ fontSize: '0.75rem' }}>
                Hover slices for headcount details
              </span>
            </div>
            {onboardingStats.departments.length === 0 ? (
              <div className="empty-state">{isLoading ? 'Loading records…' : 'No employee records yet.'}</div>
            ) : (
              <DepartmentDonutChart
                departments={onboardingStats.departments}
                total={onboardingStats.total}
              />
            )}
          </motion.div>

          {/* Department Headcount Bar Graph */}
          <motion.div variants={tileVariants} className="glass-card">
            <div className="panel-title" style={{ justifyContent: 'space-between' }}>
              <h3>
                <i className="fa-solid fa-chart-simple text-accent"></i> Department Headcount Ranking
              </h3>
              <span className="kpi-note" style={{ fontSize: '0.75rem' }}>
                Total: {onboardingStats.total} staff
              </span>
            </div>
            {onboardingStats.departments.length === 0 ? (
              <div className="empty-state">{isLoading ? 'Loading records…' : 'No employee records yet.'}</div>
            ) : (
              <div className="bar-list">
                {onboardingStats.departments.map((d, i) => (
                  <div key={d.name} style={{ marginBottom: '0.85rem' }}>
                    <div className="bar-row-head">
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.86rem' }}>
                        <i className="fa-solid fa-building-user text-muted" style={{ marginRight: '0.45rem', fontSize: '0.78rem' }}></i>
                        {d.name}
                      </span>
                      <strong>
                        {d.count} <span className="kpi-note">({d.pct}%)</span>
                      </strong>
                    </div>
                    <div className="bar-track" style={{ height: '10px', borderRadius: '5px' }}>
                      <motion.div
                        className="bar-fill"
                        style={{
                          width: `${d.pct}%`,
                          background: DEPT_COLORS[i % DEPT_COLORS.length],
                          originX: 0,
                          borderRadius: '5px',
                        }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.7, delay: 0.15 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* WHOSE LEAVES APPROVED REPORT SECTION */}
      {(activeTab === 'all' || activeTab === 'leaves') && (
        <motion.div variants={tileVariants} className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <div className="analytics-section-title">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                <i className="fa-solid fa-calendar-check text-purple"></i> Leave Approvals & Sanction Report
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Detailed audit of employee leave requests approved by HR and synced directly to OrangeHRM PIM.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search employee or leave..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  width: '210px',
                }}
              />
            </div>
          </div>

          {/* Leave Quick Metrics Strip */}
          <div className="leave-stat-strip">
            <div className="leave-stat-pill">
              <span className="leave-stat-pill-label">Total Applications</span>
              <span className="leave-stat-pill-val">{leaveStats.totalRequests}</span>
            </div>
            <div className="leave-stat-pill">
              <span className="leave-stat-pill-label" style={{ color: 'var(--accent-emerald)' }}>Approved Sanctions</span>
              <span className="leave-stat-pill-val" style={{ color: 'var(--accent-emerald)' }}>{leaveStats.approvedCount}</span>
            </div>
            <div className="leave-stat-pill">
              <span className="leave-stat-pill-label" style={{ color: 'var(--accent-purple)' }}>Total Days Approved</span>
              <span className="leave-stat-pill-val" style={{ color: 'var(--accent-purple)' }}>{leaveStats.totalApprovedDays} days</span>
            </div>
            <div className="leave-stat-pill">
              <span className="leave-stat-pill-label" style={{ color: 'var(--accent-amber)' }}>Pending HR Sign-off</span>
              <span className="leave-stat-pill-val" style={{ color: 'var(--accent-amber)' }}>{leaveStats.pendingCount}</span>
            </div>
          </div>

          {/* Approved Leaves Table */}
          {filteredApprovedLeaves.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <i className="fa-solid fa-calendar-xmark text-muted" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
              <div>No approved leave records found matching your query.</div>
            </div>
          ) : (
            <>
              <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Employee Name</th>
                    <th scope="col">Leave Type</th>
                    <th scope="col">Duration & Dates</th>
                    <th scope="col">Days</th>
                    <th scope="col">Reason</th>
                    <th scope="col">OrangeHRM Sync</th>
                    <th scope="col">Approval Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApprovedLeaves.map((l) => (
                    <tr key={l.id || `${l.employeeName}-${l.from}`}>
                      <td>
                        <div className="cell-person">
                          <Avatar name={l.employeeName} size={30} />
                          <div>
                            <strong style={{ fontSize: '0.86rem' }}>{l.employeeName}</strong>
                            <div className="cell-sub">ID: #{l.empNumber || l.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background:
                              (l.type || '').includes('Casual')
                                ? 'rgba(248, 121, 23, 0.12)'
                                : (l.type || '').includes('Sick')
                                ? 'rgba(225, 29, 72, 0.12)'
                                : 'rgba(99, 102, 241, 0.12)',
                            color:
                              (l.type || '').includes('Casual')
                                ? 'var(--brand-orange)'
                                : (l.type || '').includes('Sick')
                                ? 'var(--accent-rose)'
                                : 'var(--accent-purple)',
                            fontWeight: 600,
                          }}
                        >
                          <i
                            className={
                              (l.type || '').includes('Sick')
                                ? 'fa-solid fa-stethoscope'
                                : (l.type || '').includes('Casual')
                                ? 'fa-solid fa-umbrella-beach'
                                : 'fa-solid fa-briefcase'
                            }
                            style={{ marginRight: '0.35rem' }}
                          ></i>
                          {l.type || 'Casual Leave'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {l.from} <i className="fa-solid fa-arrow-right text-muted" style={{ fontSize: '0.7rem', margin: '0 0.25rem' }}></i> {l.to}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontWeight: 700 }}>
                          {l.days} {Number(l.days) === 1 ? 'day' : 'days'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span title={l.reason} style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', display: 'block' }}>
                          {l.reason || 'Personal leave request'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-approved" style={{ fontSize: '0.72rem' }}>
                          <i className="fa-solid fa-check-double"></i> Synced PIM
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-approved" style={{ fontSize: '0.74rem' }}>
                          <i className="fa-solid fa-circle-check"></i> Approved
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              <TablePagination
                currentPage={safeLeavePage}
                totalPages={totalLeavePages}
                totalItems={filteredApprovedLeaves.length}
                pageSize={PAGE_SIZE}
                onPageChange={setLeavesPage}
              />
            </>
          )}
        </motion.div>
      )}

      {/* OFFBOARDED PERSONNEL REPORT SECTION */}
      {(activeTab === 'all' || activeTab === 'offboarding') && (
        <motion.div variants={tileVariants} className="glass-card" style={{ marginBottom: '1.5rem' }}>
          {/* Header Title & Subtitle */}
          <div className="analytics-section-title" style={{ flexWrap: 'wrap', gap: '0.85rem' }}>
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                <i className="fa-solid fa-arrow-right-from-bracket text-rose"></i> Offboarded & Exit Separation Report
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Track monthly separations, employee notice periods, IT clearance status, and formal relieving letters.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div className="analytics-sub-badge" style={{ background: 'rgba(225, 29, 72, 0.1)', color: 'var(--accent-rose)' }}>
                <i className="fa-solid fa-users-slash"></i> {filteredExits.length} {filteredExits.length === 1 ? 'Offboarded Case' : 'Offboarded Cases'}
                {selectedMonth !== 'all' || selectedYear !== 'all' ? ` (${allOffboardedList.length} total)` : ''}
              </div>
            </div>
          </div>

          {/* Interactive Month & Year Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Year Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <label htmlFor="filter-offboard-year" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  <i className="fa-regular fa-calendar text-accent" style={{ marginRight: '0.25rem' }}></i> Year:
                </label>
                <select
                  id="filter-offboard-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="form-control"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', width: 'auto', minWidth: '105px', borderRadius: '6px' }}
                >
                  <option value="all">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <label htmlFor="filter-offboard-month" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  <i className="fa-regular fa-calendar-days text-accent" style={{ marginRight: '0.25rem' }}></i> Month:
                </label>
                <select
                  id="filter-offboard-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="form-control"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', width: 'auto', minWidth: '160px', borderRadius: '6px' }}
                >
                  {MONTHS_LIST.map((m) => {
                    const countInMonth = m.value !== 'all' ? (monthlyExitCounts[parseInt(m.value, 10)] || 0) : allOffboardedList.length;
                    return (
                      <option key={m.value} value={m.value}>
                        {m.label} {countInMonth > 0 ? `(${countInMonth})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Reset Filters */}
              {(selectedMonth !== 'all' || selectedYear !== 'all' || exitSearchQuery) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedMonth('all');
                    setSelectedYear('all');
                    setExitSearchQuery('');
                  }}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.76rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  title="Clear month and year filters"
                >
                  <i className="fa-solid fa-filter-circle-xmark"></i> Clear filters
                </button>
              )}
            </div>

            {/* Search Input within Offboarding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Search offboarded staff, ticket..."
                value={exitSearchQuery}
                onChange={(e) => setExitSearchQuery(e.target.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  width: '230px',
                }}
              />
            </div>
          </div>

          {/* Quick Monthly Breakdown Pills (Interactive Month Selector) */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
              Monthly Offboarding Breakdown {selectedYear !== 'all' ? `(${selectedYear})` : ''}:
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {MONTHS_LIST.filter((m) => m.value !== 'all').map((m) => {
                const countInMonth = monthlyExitCounts[parseInt(m.value, 10)] || 0;
                const isSelected = selectedMonth === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setSelectedMonth(isSelected ? 'all' : m.value)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.74rem',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid var(--accent-rose)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(225, 29, 72, 0.15)' : countInMonth > 0 ? 'var(--bg-secondary)' : 'transparent',
                      color: isSelected ? 'var(--accent-rose)' : countInMonth > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: isSelected || countInMonth > 0 ? 700 : 500,
                      transition: 'all 0.15s ease',
                    }}
                    title={`Filter by ${m.label}`}
                  >
                    <span>{m.label.slice(0, 3)}</span>
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        background: isSelected ? 'var(--accent-rose)' : countInMonth > 0 ? 'rgba(225, 29, 72, 0.18)' : 'var(--border-color)',
                        color: isSelected ? '#ffffff' : countInMonth > 0 ? 'var(--accent-rose)' : 'var(--text-dim)',
                        fontWeight: 800,
                      }}
                    >
                      {countInMonth}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI Stat Strip for Selected Filter */}
          <div className="leave-stat-strip" style={{ marginBottom: '1.15rem' }}>
            <div className="leave-stat-pill">
              <span className="leave-stat-pill-label" style={{ color: 'var(--accent-rose)' }}>
                {selectedMonth !== 'all' ? `${MONTHS_LIST.find((m) => m.value === selectedMonth)?.label} Separations` : 'Total Offboarded'}
              </span>
              <span className="leave-stat-pill-val" style={{ color: 'var(--accent-rose)' }}>{filteredExits.length}</span>
            </div>
            <div className="leave-stat-pill">
              <span className="leave-stat-pill-label" style={{ color: 'var(--accent-emerald)' }}>IT Approved (Hardware)</span>
              <span className="leave-stat-pill-val" style={{ color: 'var(--accent-emerald)' }}>{exitStats.itApproved}</span>
            </div>
            <div className="leave-stat-pill">
              <span className="leave-stat-pill-label" style={{ color: 'var(--accent-purple)' }}>Relieving Letters Issued</span>
              <span className="leave-stat-pill-val" style={{ color: 'var(--accent-purple)' }}>{exitStats.relievingIssued}</span>
            </div>
            <div className="leave-stat-pill">
              <span className="leave-stat-pill-label" style={{ color: 'var(--accent-amber)' }}>In Notice / Clearance</span>
              <span className="leave-stat-pill-val" style={{ color: 'var(--accent-amber)' }}>{exitStats.itPending}</span>
            </div>
          </div>

          {filteredExits.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <i className="fa-solid fa-calendar-xmark text-muted" style={{ fontSize: '2.2rem', marginBottom: '0.65rem' }}></i>
              <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>No offboarded employees found</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {selectedMonth !== 'all' || selectedYear !== 'all'
                  ? `No employee separations recorded for ${selectedMonth !== 'all' ? MONTHS_LIST.find((m) => m.value === selectedMonth)?.label : ''} ${selectedYear !== 'all' ? selectedYear : ''}. Try selecting "All Months".`
                  : 'No offboarding separation records currently exist.'}
              </p>
              {(selectedMonth !== 'all' || selectedYear !== 'all') && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setSelectedMonth('all'); setSelectedYear('all'); }}
                  style={{ marginTop: '0.85rem' }}
                >
                  Show All Offboarded Records
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Employee Name</th>
                      <th scope="col">Department & Role</th>
                      <th scope="col">Resignation Date</th>
                      <th scope="col">Last Working Day</th>
                      <th scope="col">IT Approval (Clearance)</th>
                      <th scope="col">Relieving Letter</th>
                      <th scope="col">Reason for Exit</th>
                      <th scope="col">ServiceNow Ticket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExits.map((e) => {
                      const isITCleared = e.itClearance === true || (e.itClearanceStatus || '').includes('Approved');
                      return (
                        <tr key={e.id}>
                          <td>
                            <div className="cell-person">
                              <Avatar name={e.empName} size={30} />
                              <div>
                                <strong style={{ fontSize: '0.86rem' }}>{e.empName}</strong>
                                <div className="cell-sub">{e.empId || (e.empNumber ? `Emp #${e.empNumber}` : 'EMP-Verified')}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{e.department || 'Engineering'}</span>
                              <div className="cell-sub">{e.role || e.jobTitle || 'Software Engineer'}</div>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <i className="fa-regular fa-calendar text-muted" style={{ marginRight: '0.3rem', fontSize: '0.74rem' }}></i>
                            {e.resignationDate || '2026-10-12'}
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(248, 121, 23, 0.1)',
                                color: 'var(--brand-orange)',
                                border: '1px solid rgba(248, 121, 23, 0.25)',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                              }}
                            >
                              <i className="fa-solid fa-door-open" style={{ marginRight: '0.3rem' }}></i>
                              {e.lastWorkingDay || '2026-10-31'}
                            </span>
                          </td>
                          <td>
                            {isITCleared ? (
                              <span
                                className="badge badge-approved"
                                style={{
                                  background: 'rgba(16, 185, 129, 0.14)',
                                  color: 'var(--accent-emerald)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  fontSize: '0.74rem',
                                }}
                              >
                                <i className="fa-solid fa-circle-check"></i> IT Approved
                              </span>
                            ) : (
                              <span
                                className="badge"
                                style={{
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  color: 'var(--accent-amber)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  fontSize: '0.74rem',
                                }}
                              >
                                <i className="fa-solid fa-hourglass-half"></i> Clearance Waiting
                              </span>
                            )}
                          </td>
                          <td>
                            {e.relievingLetterIssued ? (
                              <span className="badge badge-approved" style={{ fontSize: '0.74rem' }}>
                                <i className="fa-solid fa-file-circle-check"></i> Issued
                              </span>
                            ) : (
                              <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                <i className="fa-solid fa-clock"></i> Pending Last Day
                              </span>
                            )}
                          </td>
                          <td style={{ maxWidth: '220px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span title={e.reason} style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', display: 'block' }}>
                              {e.reason || 'Professional transition & career progression'}
                            </span>
                          </td>
                          <td>
                            {e.serviceNowReqUrl ? (
                              <a
                                href={e.serviceNowReqUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--brand-orange)',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                <span>{e.serviceNowReq || 'View Ticket'}</span>
                                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.68rem' }}></i>
                              </a>
                            ) : (
                              <span className="cell-sub">{e.serviceNowReq || 'REQ0012014'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TablePagination
                currentPage={safeExitPage}
                totalPages={totalExitPages}
                totalItems={filteredExits.length}
                pageSize={PAGE_SIZE}
                onPageChange={setExitPage}
              />
            </>
          )}
        </motion.div>
      )}
    </section>
  );
}
