import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

export default function DirectoryView({ employees }) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, deptFilter, statusFilter]);

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === 'All' || e.department === deptFilter;
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

  const getStatusBadgeClass = (status) => {
    if (status === 'Approved' || status === 'Completed' || status === 'Verified') return 'badge-approved';
    if (status === 'Pending Review' || status === 'Pending') return 'badge-pending';
    return 'badge-draft';
  };

  return (
    <section className="view-section active">
      {/* Top Controls Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2><i className="fa-solid fa-users-gear text-accent"></i> Employee Directory & Master Records</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Search, filter, and inspect detailed onboarding records and multi-engine provisioning status.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={exportCSV}>
              <i className="fa-solid fa-file-csv"></i> Export CSV
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Search Directory</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search name, ID, role, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Department</label>
            <select className="form-control" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Finance">Finance</option>
              <option value="People & Culture">People & Culture</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</label>
            <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Approved">Approved / Active</option>
              <option value="Pending Review">Pending Verification</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role & Department</th>
                <th>Status</th>
                <th>Workstation</th>
                <th>ServiceNow</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No matching records found.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          className="avatar"
                          style={{
                            width: '36px',
                            height: '36px',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            background: 'var(--accent-gradient)',
                            color: '#fff',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {c.fullName ? c.fullName.charAt(0).toUpperCase() : 'E'}
                        </div>
                        <div>
                          <strong>{c.fullName}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{c.jobTitle}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.department}</span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(c.status)}`} style={{ fontSize: '0.75rem' }}>
                        {c.status || 'Pending Review'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{c.hardware || 'MacBook Pro M3'}</div>
                      <span style={{ fontSize: '0.72rem', color: c.hardwareDispatched ? '#059669' : '#f59e0b', fontWeight: 600 }}>
                        {c.hardwareDispatched ? 'Dispatched' : 'Provisioning'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-verified" style={{ fontSize: '0.75rem' }}>
                        <i className="fa-solid fa-ticket"></i> Verified
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedCandidate(c)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        title="View Complete Profile Details"
                      >
                        <i className="fa-solid fa-id-card"></i> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar - 10 Employees Per Page */}
        {filteredEmployees.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
            }}
          >
            <div>
              Showing <strong style={{ color: 'var(--text-main)' }}>{filteredEmployees.length === 0 ? 0 : startIndex + 1}</strong> to{' '}
              <strong style={{ color: 'var(--text-main)' }}>{Math.min(startIndex + ITEMS_PER_PAGE, filteredEmployees.length)}</strong> of{' '}
              <strong style={{ color: 'var(--text-main)' }}>{filteredEmployees.length}</strong> employees (10 per page)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                className="btn btn-secondary"
                disabled={validCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  opacity: validCurrentPage === 1 ? 0.5 : 1,
                  cursor: validCurrentPage === 1 ? 'not-allowed' : 'pointer',
                }}
                title="Previous Page"
              >
                <i className="fa-solid fa-chevron-left"></i> Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-xs)',
                    border: pageNum === validCurrentPage ? '1px solid transparent' : '1px solid var(--border-color)',
                    background: pageNum === validCurrentPage ? 'var(--accent-gradient)' : 'var(--bg-card)',
                    color: pageNum === validCurrentPage ? '#fff' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition-fast)',
                    boxShadow: pageNum === validCurrentPage ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className="btn btn-secondary"
                disabled={validCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  opacity: validCurrentPage === totalPages ? 0.5 : 1,
                  cursor: validCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
                title="Next Page"
              >
                Next <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Dossier Modal (4-Engine System Status Grid) */}
      {selectedCandidate && (
        <div className="modal active">
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  className="avatar"
                  style={{
                    width: '44px',
                    height: '44px',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedCandidate.fullName ? selectedCandidate.fullName.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedCandidate.fullName}</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {selectedCandidate.jobTitle} • {selectedCandidate.department} • <code>{selectedCandidate.id}</code>
                  </span>
                </div>
              </div>

              <button className="modal-close" onClick={() => setSelectedCandidate(null)}>
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ marginTop: '1.25rem' }}>
              {/* 4-Engine System Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* 1. ServiceNow Service Catalog Card */}
                <div style={{ background: 'var(--bg-card)', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ color: '#0284c7', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fa-solid fa-server"></i> 1. ServiceNow ITSM
                      </strong>
                      <span className={`badge ${getStatusBadgeClass(selectedCandidate.status)}`} style={{ fontSize: '0.7rem' }}>
                        {selectedCandidate.status || 'Pending Approval'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <div>Request: <strong>{selectedCandidate.serviceNowReq || 'REQ0010042'}</strong></div>
                      {selectedCandidate.laptopTicket && (
                        <div>Hardware Incident: <strong style={{ color: '#059669' }}>{selectedCandidate.laptopTicket}</strong></div>
                      )}
                      <div>Hardware: <span>{selectedCandidate.hardware || 'Apple MacBook Pro M3 Max'}</span></div>
                    </div>
                  </div>
                  <a
                    href={selectedCandidate.reqUrl || `https://ven04528.service-now.com/nav_to.do?uri=sc_request_list.do?sysparm_query=number=${selectedCandidate.serviceNowReq || 'REQ0010042'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', borderColor: 'var(--border-orange)', color: 'var(--brand-orange)', background: '#ffffff', fontWeight: 700, textDecoration: 'none', width: 'fit-content' }}
                  >
                    <i className="fa-solid fa-ticket"></i> Open ServiceNow REQ
                  </a>
                </div>

                {/* 2. AutomationEdge T4 Active Directory Card */}
                <div style={{ background: '#f0f9ff', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ color: '#c2410c', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fa-solid fa-robot"></i> 2. T4 Active Directory
                      </strong>
                      <span className="badge" style={{ background: '#e0f2fe', color: '#c2410c', fontSize: '0.7rem', border: '1px solid #bae6fd' }}>
                        {selectedCandidate.aeT4Status || (selectedCandidate.aeT4RequestId ? 'Complete' : 'Triggered on Approval')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <div>Workflow: <code>{selectedCandidate.aeT4Workflow || 'AD-Create User and Assin Role'}</code></div>
                      {selectedCandidate.aeT4RequestId && <div>Automation Req: <strong>#{selectedCandidate.aeT4RequestId}</strong></div>}
                      {selectedCandidate.aeT4Agent && <div>Agent: <code>{selectedCandidate.aeT4Agent}</code></div>}
                    </div>
                  </div>
                  <a
                    href={selectedCandidate.aeT4Url || (selectedCandidate.aeT4RequestId ? `https://t4.automationedge.com/#/workflowinstances/${selectedCandidate.aeT4RequestId}` : 'https://t4.automationedge.com/#/taskhistory')}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: '#bae6fd', color: '#c2410c', background: '#ffffff', fontWeight: 700, textDecoration: 'none', width: 'fit-content' }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i> Open T4 Workflow ({selectedCandidate.aeT4RequestId ? '#' + selectedCandidate.aeT4RequestId : 'Portal'})
                  </a>
                </div>

                {/* 3. Microsoft Office 365 Account Card */}
                <div style={{ background: '#eff6ff', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ color: '#1d4ed8', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fa-brands fa-microsoft"></i> 3. Office 365 Account
                      </strong>
                      <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.7rem', border: '1px solid #93c5fd' }}>
                        {selectedCandidate.o365Status || (selectedCandidate.o365UserId ? 'Active (Entra ID)' : 'Provisioned on Approval')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <div>Work Email: <strong>{selectedCandidate.o365Email || selectedCandidate.email}</strong></div>
                    </div>
                  </div>
                  <a
                    href={selectedCandidate.o365AdminUrl || 'https://admin.microsoft.com/#/users'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: '#bfdbfe', color: '#1d4ed8', background: '#ffffff', fontWeight: 700, textDecoration: 'none', width: 'fit-content' }}
                  >
                    <i className="fa-brands fa-microsoft"></i> Open M365 Admin Center
                  </a>
                </div>

                {/* 4. OrangeHRM Enterprise Profile Card */}
                <div style={{ background: '#f0f9ff', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid #93c5fd', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ color: '#0284c7', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fa-solid fa-user-check"></i> 4. OrangeHRM Profile
                      </strong>
                      <span className="badge" style={{ background: '#e0f2fe', color: '#c2410c', fontSize: '0.7rem', border: '1px solid #93c5fd' }}>
                        {selectedCandidate.orangeHrmStatus || (selectedCandidate.orangeHrmEmpNumber ? 'Profile Active' : 'Created on Approval')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <div>Instance: <code>10.41.5.39/orangehrm</code></div>
                      {selectedCandidate.orangeHrmEmpNumber && <div>PIM Emp Number: <strong>#{selectedCandidate.orangeHrmEmpNumber}</strong></div>}
                      <div>Sync: <span>Uses generated Office 365 workEmail</span></div>
                    </div>
                  </div>
                  <a
                    href={selectedCandidate.orangeHrmProfileUrl || 'http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: '#93c5fd', color: '#0284c7', background: '#ffffff', fontWeight: 700, textDecoration: 'none', width: 'fit-content' }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i> Open OrangeHRM Profile
                  </a>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedCandidate(null)}>
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
