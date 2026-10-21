import React, { useState } from 'react';

export const HR_CATALOGS_DATA = [
  {
    id: 'onboarding',
    title: 'Employee Onboarding',
    tag: 'Agentic Flow • Primary',
    tagColor: '#2563eb',
    tagBg: '#eff6ff',
    icon: 'fa-solid fa-id-card',
    iconGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    tagline: 'Candidate OCR Verification & 4-Engine Multi-System Provisioning',
    description:
      'Autonomous conversational onboarding agentic flow orchestrating candidate identity validation, ServiceNow IT hardware catalog requests, Active Directory domain provisioning (AutomationEdge AE server), Microsoft Entra ID cloud identity, and OrangeHRM profile creation.',
    agents: [
      { name: 'DocVerify Agent', icon: 'fa-solid fa-file-shield', color: '#8b5cf6' },
      { name: 'ServiceNow Agent', icon: 'fa-solid fa-ticket', color: '#10b981' },
      { name: 'AD create user', icon: 'fa-solid fa-robot', color: '#ea580c' },
      { name: 'Entra ID Agent', icon: 'fa-brands fa-microsoft', color: '#2563eb' },
      { name: 'OrangeHRM Agent', icon: 'fa-solid fa-user-check', color: '#f59e0b' }
    ],
    highlights: [
      'Candidate document upload & simulated OCR inspection (Aadhaar & Degree)',
      'ServiceNow Service Catalog request & laptop hardware incident staging',
      'Active Directory domain user provisioning with role assignment (AE server)',
      'Microsoft 365 cloud mailbox creation & Entra ID synchronization',
      'OrangeHRM employee PIM directory profile creation'
    ],
    primaryActionLabel: 'Try Demo'
  },
  {
    id: 'leave',
    title: 'Leave & Attendance',
    tag: 'Agentic Flow • HRIS',
    tagColor: '#10b981',
    tagBg: '#ecfdf5',
    icon: 'fa-solid fa-umbrella-beach',
    iconGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    tagline: 'Real-Time Quota Inspection & Policy Compliance Routing',
    description:
      'Conversational leave management agentic flow providing real-time leave balance checks against OrangeHRM PIM records, autonomous compliance verification, multi-day absence routing, and manager notifications.',
    agents: [
      { name: 'OrangeHRM Agent', icon: 'fa-solid fa-user-check', color: '#f59e0b' },
      { name: 'AD create user', icon: 'fa-solid fa-robot', color: '#ea580c' }
    ],
    highlights: [
      'Instant query of remaining casual, sick, and privilege leave quotas',
      'Autonomous policy compliance check prior to leave submission',
      'Automated OrangeHRM PIM leave request creation',
      'Multi-day date range validation & calendar sync'
    ],
    primaryActionLabel: 'Try Demo'
  },
  {
    id: 'services',
    title: 'HR & IT Services',
    tag: 'Agentic Flow • ITSM',
    tagColor: '#0284c7',
    tagBg: '#f0f9ff',
    icon: 'fa-solid fa-headset',
    iconGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    tagline: 'Self-Service Catalog, Payslip Downloads & IT Helpdesk',
    description:
      'Enterprise employee services portal powered by agentic flow for generating monthly salary payslips, submitting ServiceNow IT hardware replacement tickets, requesting software access credentials, and tracking request fulfillment.',
    agents: [
      { name: 'ServiceNow Agent', icon: 'fa-solid fa-ticket', color: '#10b981' },
      { name: 'DocVerify Agent', icon: 'fa-solid fa-file-shield', color: '#8b5cf6' }
    ],
    highlights: [
      'Instant generation and PDF download of official salary payslips',
      'ServiceNow hardware incident & laptop upgrade requests',
      'Software credential pool access & cloud licensing requests',
      'Automated status tracking and ticket resolution updates'
    ],
    primaryActionLabel: 'Try Demo'
  },
  {
    id: 'offboarding',
    title: 'Employee Offboarding',
    tag: 'Agentic Flow • Clearances',
    tagColor: '#f43f5e',
    tagBg: '#fff1f2',
    icon: 'fa-solid fa-person-walking-arrow-right',
    iconGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    tagline: 'Resignation Submission, IT Asset Handover & Deprovisioning',
    description:
      'Guided employee exit agentic flow handling formal resignation submission, notice period and last working day calculation, ServiceNow IT asset recovery incident creation, and staged account deprovisioning.',
    agents: [
      { name: 'ServiceNow Agent', icon: 'fa-solid fa-ticket', color: '#10b981' },
      { name: 'AD create user', icon: 'fa-solid fa-robot', color: '#ea580c' },
      { name: 'OrangeHRM Agent', icon: 'fa-solid fa-user-check', color: '#f59e0b' }
    ],
    highlights: [
      'Formal resignation submission with notice period calculation',
      'ServiceNow IT asset recovery & laptop return ticket dispatch',
      'AutomationEdge AE server staged offboarding workflow coordination',
      'OrangeHRM employee exit status transition & clearance tracking'
    ],
    primaryActionLabel: 'Try Demo'
  }
];

export default function HRAssistantCatalogs({ onSelectCatalog }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredCatalogs = HR_CATALOGS_DATA.filter((cat) => {
    const matchesFilter = selectedFilter === 'all' || cat.id === selectedFilter;
    const matchesSearch =
      searchTerm.trim() === '' ||
      cat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.highlights.some((h) => h.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="hr-catalogs-wrapper">
      {/* Top Hero / Header */}
      <div className="hr-catalogs-hero">
        <div className="hr-catalogs-hero-badge">
          <span className="pulse-dot-green"></span>
          <span>Microsoft Agent Framework (MAF) • Autonomous Agentic Flow Architecture</span>
        </div>
        <h1 className="hr-catalogs-title">HR AI Assistant Agentic Catalogs</h1>
        <p className="hr-catalogs-subtitle">
          Select an enterprise operational catalog to experience our autonomous <strong>Agentic Flow</strong>.
          Specialized agents collaborate dynamically across ServiceNow ITSM, Active Directory (AutomationEdge AE server), Microsoft 365, and OrangeHRM.
        </p>

        {/* Search & Filter Bar */}
        <div className="hr-catalogs-controls">
          <div className="hr-catalogs-search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search agentic flows, catalogs, or connected endpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="hr-catalogs-clear-btn"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <div className="hr-catalogs-filters">
            <button
              className={`hr-filter-pill ${selectedFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('all')}
            >
              All Agentic Catalogs (4)
            </button>
            <button
              className={`hr-filter-pill ${selectedFilter === 'onboarding' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('onboarding')}
            >
              <i className="fa-solid fa-id-card"></i> Onboarding Flow
            </button>
            <button
              className={`hr-filter-pill ${selectedFilter === 'leave' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('leave')}
            >
              <i className="fa-solid fa-umbrella-beach"></i> Leave Flow
            </button>
            <button
              className={`hr-filter-pill ${selectedFilter === 'services' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('services')}
            >
              <i className="fa-solid fa-headset"></i> Services Flow
            </button>
            <button
              className={`hr-filter-pill ${selectedFilter === 'offboarding' ? 'active' : ''}`}
              onClick={() => setSelectedFilter('offboarding')}
            >
              <i className="fa-solid fa-person-walking-arrow-right"></i> Offboarding Flow
            </button>
          </div>
        </div>
      </div>

      {/* 4-Card Catalogs Grid */}
      <div className="hr-catalogs-grid">
        {filteredCatalogs.map((catalog) => {
          const isOnboarding = catalog.id === 'onboarding';
          return (
            <div
              key={catalog.id}
              className={`hr-catalog-card ${isOnboarding ? 'is-featured' : ''}`}
            >
              {/* Card Header */}
              <div className="hr-catalog-card-header">
                <div
                  className="hr-catalog-icon-wrapper"
                  style={{ background: catalog.iconGradient }}
                >
                  <i className={catalog.icon}></i>
                </div>
                <div className="hr-catalog-header-text">
                  <div className="hr-catalog-tag-row">
                    <span
                      className="hr-catalog-tag"
                      style={{ color: catalog.tagColor, background: catalog.tagBg }}
                    >
                      {catalog.tag}
                    </span>
                    {isOnboarding && (
                      <span className="hr-catalog-live-badge">
                        <i className="fa-solid fa-circle-dot"></i> Live Agentic Flow
                      </span>
                    )}
                  </div>
                  <h3 className="hr-catalog-card-title">{catalog.title}</h3>
                </div>
              </div>

              {/* Tagline & Description */}
              <p className="hr-catalog-tagline">{catalog.tagline}</p>
              <p className="hr-catalog-desc">{catalog.description}</p>


              {/* Highlights List */}
              <div className="hr-catalog-highlights">
                <span className="hr-catalog-section-label">Agentic Capabilities:</span>
                <ul>
                  {catalog.highlights.map((h, idx) => (
                    <li key={idx}>
                      <i className="fa-solid fa-check"></i>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Primary Launch Action Button (Quick Launch Prompts completely removed as requested) */}
              <div className="hr-catalog-card-actions">
                <button
                  className={`hr-catalog-launch-btn ${isOnboarding ? 'btn-primary-glow' : ''}`}
                  onClick={() => onSelectCatalog(catalog.id)}
                >
                  <span>{catalog.primaryActionLabel}</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="hr-catalogs-telemetry-strip">
        <div className="hr-telemetry-item">
          <i className="fa-solid fa-brain" style={{ color: '#0284c7' }}></i>
          <span><strong>MAF Reasoner</strong>: Autonomous Agentic Flow (gpt-5.4-mini)</span>
        </div>
        <div className="hr-telemetry-divider"></div>
        <div className="hr-telemetry-item">
          <i className="fa-solid fa-network-wired" style={{ color: '#10b981' }}></i>
          <span><strong>Connected Endpoints</strong>: ServiceNow ITSM • AutomationEdge AE server • M365 • OrangeHRM</span>
        </div>
        <div className="hr-telemetry-divider"></div>
        <div className="hr-telemetry-item">
          <i className="fa-solid fa-shield-halved" style={{ color: '#8b5cf6' }}></i>
          <span><strong>Policy Guardrails</strong>: Active</span>
        </div>
      </div>
    </div>
  );
}
