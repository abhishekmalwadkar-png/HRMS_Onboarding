import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, EmptyState, Modal, Avatar, Pagination, statusBadgeClass, staggerContainer, staggerItem } from './ui';

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: 'All', label: 'All statuses' },
  { value: 'Approved', label: 'Approved / active' },
  { value: 'Pending Review', label: 'Pending review' },
];

// One system card in the employee dossier
function SystemCard({ tone, icon, title, status, children, href, linkLabel }) {
  return (
    <motion.div className={`system-card system-card-${tone}`} variants={staggerItem}>
      <div className="system-card-head">
        <strong><i className={icon} aria-hidden="true"></i> {title}</strong>
        <span className="badge system-card-status">{status}</span>
      </div>
      <div className="system-card-body">{children}</div>
      <a href={href} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
        <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> {linkLabel}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </motion.div>
  );
}

export default function DirectoryView({ employees }) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Departments come from the data, so a new department is never missing from the filter
  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    [employees]
  );

  // Filter changes reset to page 1 (done in the handler rather than an effect)
  const updateFilter = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      !q ||
      e.fullName?.toLowerCase().includes(q) ||
      e.id?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.jobTitle?.toLowerCase().includes(q);
    const matchesDept = deptFilter === 'All' || e.department === deptFilter;
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const hasFilters = Boolean(q) || deptFilter !== 'All' || statusFilter !== 'All';

  const clearFilters = () => {
    setSearchQuery('');
    setDeptFilter('All');
    setStatusFilter('All');
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Full Name', 'Email', 'Department', 'Job Title', 'Status', 'ServiceNow REQ', 'Laptop Ticket'];
    const rows = filteredEmployees.map((e) => [
      e.id,
      `"${e.fullName || ''}"`,
      e.email || '',
      e.department || '',
      `"${e.jobTitle || ''}"`,
      e.status || '',
      e.serviceNowReq || '',
      e.laptopTicket || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `employees_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported employee directory to CSV!', 'success');
  };

  const sel = selectedCandidate;

  return (
    <section className="view-section active page">
      <PageHeader
        icon="fa-solid fa-users-gear"
        title="Employee directory"
        description="Search every record and check its provisioning status in each system."
        actions={
          <button className="btn btn-secondary" onClick={exportCSV} disabled={filteredEmployees.length === 0}>
            <i className="fa-solid fa-file-csv text-accent" aria-hidden="true"></i> Export CSV
            {hasFilters && <span className="count-pill">{filteredEmployees.length}</span>}
          </button>
        }
      />

      {/* Filters */}
      <Card animated={false} className="filter-card">
        <div className="filter-bar" role="search">
          <div className="field filter-search">
            <label htmlFor="dir-search" className="field-label">Search</label>
            <div className="input-icon">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              <input
                id="dir-search"
                type="search"
                className="form-control"
                placeholder="Name, ID, role or email"
                value={searchQuery}
                onChange={updateFilter(setSearchQuery)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="dir-dept" className="field-label">Department</label>
            <select id="dir-dept" className="form-control" value={deptFilter} onChange={updateFilter(setDeptFilter)}>
              <option value="All">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="dir-status" className="field-label">Status</label>
            <select id="dir-status" className="form-control" value={statusFilter} onChange={updateFilter(setStatusFilter)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button className="btn btn-ghost filter-clear" onClick={clearFilters}>
              <i className="fa-solid fa-xmark" aria-hidden="true"></i> Clear filters
            </button>
          )}
        </div>
        <p className="filter-result" aria-live="polite">
          {filteredEmployees.length} of {employees.length} records
        </p>
      </Card>

      {/* Employees Table */}
      <Card animated={false}>
        {filteredEmployees.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-user-slash"
            title={employees.length === 0 ? 'No employees yet' : 'No matching records'}
            action={hasFilters && <button className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>}
          >
            {employees.length === 0
              ? 'Records appear here once candidates are submitted from Onboarding.'
              : 'Try a different search term or remove a filter.'}
          </EmptyState>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Role & department</th>
                    <th scope="col">Status</th>
                    <th scope="col">Workstation</th>
                    <th scope="col">ServiceNow</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="cell-person">
                          <Avatar name={c.fullName} size={36} />
                          <div>
                            <strong>{c.fullName}</strong>
                            <div className="cell-sub">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.jobTitle || '—'}
                        <div className="cell-sub">{c.department || '—'}</div>
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass(c.status)}`}>{c.status || 'Pending Review'}</span>
                      </td>
                      <td>
                        {c.hardware || '—'}
                        <div className={`cell-sub ${c.hardwareDispatched ? 'tone-success' : ''}`}>
                          {c.hardwareDispatched ? 'Dispatched' : 'Awaiting approval'}
                        </div>
                      </td>
                      <td>
                        {c.serviceNowReq ? (
                          <>
                            <span className="cell-mono">{c.serviceNowReq}</span>
                            <div className="cell-sub">{c.serviceNowStatus || c.status || '—'}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="cell-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCandidate(c)}>
                          <i className="fa-solid fa-id-card text-accent" aria-hidden="true"></i> View
                          <span className="sr-only"> profile of {c.fullName}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={validCurrentPage}
              totalPages={totalPages}
              total={filteredEmployees.length}
              pageSize={ITEMS_PER_PAGE}
              onChange={setCurrentPage}
              label="Directory pages"
            />
          </>
        )}
      </Card>

      {/* Employee dossier: status in each provisioned system */}
      <Modal
        open={Boolean(sel)}
        onClose={() => setSelectedCandidate(null)}
        size="lg"
        icon={sel && <Avatar name={sel.fullName} size={44} />}
        title={sel?.fullName}
        subtitle={sel && `${sel.jobTitle || '—'} · ${sel.department || '—'} · ${sel.id}`}
        footer={<button className="btn btn-secondary" onClick={() => setSelectedCandidate(null)}>Close</button>}
      >
        {sel && (
          <motion.div className="system-grid" variants={staggerContainer} initial="hidden" animate="show">
            <SystemCard
              tone="brand"
              icon="fa-solid fa-server"
              title="ServiceNow ITSM"
              status={sel.serviceNowStatus || sel.status || 'Pending approval'}
              href={sel.reqUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_request_list.do?sysparm_query=number=${sel.serviceNowReq || ''}`}
              linkLabel="Open request"
            >
              <div>Request: <strong>{sel.serviceNowReq || '—'}</strong></div>
              <div>Laptop incident: <strong>{sel.laptopTicket || 'Not created yet'}</strong></div>
              <div>Hardware: {sel.hardware || '—'}</div>
            </SystemCard>

            <SystemCard
              tone="brand"
              icon="fa-solid fa-robot"
              title="Active Directory (T4)"
              status={sel.aeT4Status || (sel.aeT4RequestId ? 'Complete' : 'Runs on approval')}
              href={sel.aeT4Url || (sel.aeT4RequestId ? `https://t4.automationedge.com/#/workflowinstances/${sel.aeT4RequestId}` : 'https://t4.automationedge.com/#/taskhistory')}
              linkLabel={sel.aeT4RequestId ? `Open T4 request #${sel.aeT4RequestId}` : 'Open T4 portal'}
            >
              <div>Workflow: <code>{sel.aeT4Workflow || 'AD-Create User and Assin Role'}</code></div>
              {sel.aeT4RequestId && <div>Automation request: <strong>#{sel.aeT4RequestId}</strong></div>}
              {sel.aeT4Agent && <div>Agent: <code>{sel.aeT4Agent}</code></div>}
            </SystemCard>

            <SystemCard
              tone="ms"
              icon="fa-brands fa-microsoft"
              title="Microsoft 365"
              status={sel.o365Status || (sel.o365UserId ? 'Active (Entra ID)' : 'Created on approval')}
              href={sel.o365AdminUrl || 'https://admin.microsoft.com/#/users'}
              linkLabel="Open M365 admin center"
            >
              <div>Work email: <strong>{sel.o365Email || 'Not created yet'}</strong></div>
              <div>Personal email: {sel.email || '—'}</div>
            </SystemCard>

            <SystemCard
              tone="success"
              icon="fa-solid fa-user-check"
              title="OrangeHRM PIM"
              status={sel.orangeHrmStatus || (sel.orangeHrmEmpNumber ? 'Profile active' : 'Created on approval')}
              href={sel.orangeHrmProfileUrl || 'http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList'}
              linkLabel="Open OrangeHRM profile"
            >
              <div>Employee number: <strong>{sel.orangeHrmEmpNumber ? `#${sel.orangeHrmEmpNumber}` : 'Not created yet'}</strong></div>
              <div>Uses the Microsoft 365 work email</div>
            </SystemCard>
          </motion.div>
        )}
      </Modal>
    </section>
  );
}
