import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import HRAssistantCatalogs, { HR_CATALOGS_DATA } from './HRAssistantCatalogs';

// Helper to calculate days between dates
function calculateDays(from, to) {
  if (!from || !to) return 1;
  const d1 = new Date(from);
  const d2 = new Date(to);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
}

// Format date helper
function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// Smart Name Extractor from natural language
function extractCandidateName(text) {
  if (!text) return null;
  const clean = text.trim();

  // Pattern: "i have to onboard Harsh Makadiya", "onboard Harsh Makadiya", "hire Harsh Makadiya"
  const patterns = [
    /(?:have to onboard|want to onboard|need to onboard|please onboard|onboard(?:ing)?(?:\s+for)?|hire|adding|add candidate|candidate)\s+([a-zA-Z\s]+?)(?:\s+as\s+|\s+in\s+|$)/i,
    /(?:onboard|hire)\s+([a-zA-Z\s]+)/i
  ];

  for (const pat of patterns) {
    const match = clean.match(pat);
    if (match && match[1]) {
      let raw = match[1].trim();
      raw = raw.replace(/^(new\s+|candidate\s+|a\s+|an\s+|employee\s+)+/i, '').trim();
      const lower = raw.toLowerCase();
      if (lower && !['new', 'someone', 'candidate', 'him', 'her', 'employee', 'a', 'an'].includes(lower)) {
        return raw
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
    }
  }
  return null;
}

// Official AutomationEdge origami delta brand logo
function AutomationEdgeLogo({ size = 18, color = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill={color} d="M 0,500 L 186,108 C 214,48 242,20 256,20 C 270,20 298,48 326,108 L 455.7,381.3 L 289.6,285 L 256,205 L 132,500 Z" />
      <path fill={color} d="M 299.3,308 L 467.1,405.3 L 490.3,454.3 L 319.1,355 Z" />
      <path fill={color} d="M 328.7,378 L 501.7,478.3 L 512,500 L 380,500 Z" />
    </svg>
  );
}

// Registered Microsoft Agent Framework (MAF) Worker Agents
const REGISTERED_AGENTS = [
  {
    id: 'ServiceNowAgent',
    name: 'ServiceNow Agent',
    role: 'ITSM Logistics & Assets',
    icon: 'fa-solid fa-ticket',
    color: '#10b981',
    bg: '#ecfdf5',
    description: 'Provisions laptop assets & catalog request tickets'
  },
  {
    id: 'AutomationEdgeRpaAgent',
    name: 'AD create user',
    role: 'Process Automation & AD',
    icon: 'fa-solid fa-robot',
    color: '#ea580c',
    bg: '#fff7ed',
    description: 'Active Directory accounts & enterprise bot workflows'
  },
  {
    id: 'MicrosoftGraphAgent',
    name: 'Entra ID Agent',
    role: 'Cloud Identity & Mail',
    icon: 'fa-brands fa-microsoft',
    color: '#2563eb',
    bg: '#eff6ff',
    description: 'Azure AD profiles, M365 E5 licenses & Exchange'
  },
  {
    id: 'OrangeHrmAgent',
    name: 'OrangeHRM Agent',
    role: 'HRIS & Leave Balance',
    icon: 'fa-solid fa-user-check',
    color: '#f59e0b',
    bg: '#fffbeb',
    description: 'PIM records, leave balance queries & salary slips'
  },
  {
    id: 'DocComplianceAgent',
    name: 'DocVerify Agent',
    role: 'KYC & OCR Validation',
    icon: 'fa-solid fa-file-shield',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    description: 'Verifies Aadhaar, degrees & signed offer contracts'
  }
];

// Graphical representation of tool arguments (replaces raw monospaced JSON for demos)
function renderGraphicalArguments(tc) {
  const args = tc.args || {};

  // Handshake verification with targets
  if (args.targets && Array.isArray(args.targets)) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-network-wired" style={{ color: '#0284c7' }}></i>
          Connected Enterprise Endpoints
        </span>
        <div className="maf-systems-grid">
          {args.targets.map((t, idx) => (
            <div key={idx} className="maf-system-badge">
              <span className="maf-pulse-dot" style={{ background: '#16a34a' }}></span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // OrangeHRM Leave Balance Check
  if (args.leaveType || args.empNumber) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-sliders" style={{ color: '#f59e0b' }}></i>
          Inspected Parameters
        </span>
        <div className="maf-param-grid">
          <div className="maf-param-chip">
            <i className="fa-regular fa-user maf-chip-icon" style={{ color: '#f59e0b' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Employee</span>
              <span className="maf-chip-val">Emp #{args.empNumber}</span>
            </div>
          </div>
          <div className="maf-param-chip">
            <i className="fa-solid fa-umbrella-beach maf-chip-icon" style={{ color: '#10b981' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Leave Category</span>
              <span className="maf-chip-val">{args.leaveType}</span>
            </div>
          </div>
          <div className="maf-param-chip">
            <i className="fa-regular fa-calendar-check maf-chip-icon" style={{ color: '#0284c7' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Fiscal Period</span>
              <span className="maf-chip-val">{args.year || 2026} Quota</span>
            </div>
          </div>
          <div className="maf-param-chip">
            <i className="fa-solid fa-shield-halved maf-chip-icon" style={{ color: '#8b5cf6' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Entitlement Rule</span>
              <span className="maf-chip-val">Standard Quota</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ServiceNow Laptop / Asset Provisioning
  if (args.laptopModel || args.reqNumber) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-laptop" style={{ color: '#10b981' }}></i>
          Hardware & Ticket Parameters
        </span>
        <div className="maf-param-grid">
          <div className="maf-param-chip">
            <i className="fa-solid fa-ticket maf-chip-icon" style={{ color: '#10b981' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">ServiceNow REQ</span>
              <span className="maf-chip-val">{args.reqNumber || 'REQ-Auto'}</span>
            </div>
          </div>
          <div className="maf-param-chip">
            <i className="fa-regular fa-user maf-chip-icon" style={{ color: '#0284c7' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Candidate</span>
              <span className="maf-chip-val">{args.candidateName}</span>
            </div>
          </div>
          <div className="maf-param-chip" style={{ gridColumn: 'span 2' }}>
            <i className="fa-solid fa-laptop-code maf-chip-icon" style={{ color: '#6366f1' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Dispatched Machine</span>
              <span className="maf-chip-val">{args.laptopModel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AutomationEdge AE server Active Directory Workflow
  if (args.workflow || args.userPrincipal) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-bolt" style={{ color: '#ea580c' }}></i>
          AE server Execution (Agentic Flow)
        </span>
        <div className="maf-param-grid">
          <div className="maf-param-chip" style={{ gridColumn: 'span 2' }}>
            <i className="fa-solid fa-diagram-project maf-chip-icon" style={{ color: '#ea580c' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Bot Process</span>
              <span className="maf-chip-val">{args.workflow}</span>
            </div>
          </div>
          <div className="maf-param-chip">
            <i className="fa-regular fa-envelope maf-chip-icon" style={{ color: '#0284c7' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">User Principal</span>
              <span className="maf-chip-val">{args.userPrincipal}</span>
            </div>
          </div>
          <div className="maf-param-chip">
            <i className="fa-solid fa-building-user maf-chip-icon" style={{ color: '#10b981' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Tenant Org</span>
              <span className="maf-chip-val">{args.orgCode || 'MSP_EVENT'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Microsoft Graph / Entra ID
  if (args.mailNickname || args.userPrincipalName) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-brands fa-microsoft" style={{ color: '#2563eb' }}></i>
          Entra ID & M365 Parameters
        </span>
        <div className="maf-param-grid">
          <div className="maf-param-chip">
            <i className="fa-solid fa-cloud maf-chip-icon" style={{ color: '#2563eb' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Cloud Identity</span>
              <span className="maf-chip-val">{args.displayName}</span>
            </div>
          </div>
          <div className="maf-param-chip">
            <i className="fa-regular fa-envelope maf-chip-icon" style={{ color: '#0284c7' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">Entra UPN</span>
              <span className="maf-chip-val">{args.userPrincipalName}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Document OCR Verification
  if (args.documents) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-file-shield" style={{ color: '#8b5cf6' }}></i>
          Simulated Document Dossier
        </span>
        <div className="maf-systems-grid">
          <div className="maf-system-badge" style={{ background: '#f5f3ff', borderColor: '#ddd6fe', color: '#6d28d9' }}>
            <i className="fa-solid fa-id-card"></i> Aadhaar UID Verified
          </div>
          <div className="maf-system-badge" style={{ background: '#f5f3ff', borderColor: '#ddd6fe', color: '#6d28d9' }}>
            <i className="fa-solid fa-graduation-cap"></i> Degree Verified
          </div>
          <div className="maf-system-badge" style={{ gridColumn: 'span 2', background: '#f5f3ff', borderColor: '#ddd6fe', color: '#6d28d9' }}>
            <i className="fa-solid fa-file-signature"></i> Offer Letter Counter-Signed
          </div>
        </div>
      </div>
    );
  }

  // Generic Chip Fallback for other tools
  const entries = Object.entries(args);
  if (entries.length === 0) return null;
  return (
    <div className="maf-graphical-box">
      <span className="maf-box-label">
        <i className="fa-solid fa-cube" style={{ color: '#64748b' }}></i>
        Parameters
      </span>
      <div className="maf-param-grid">
        {entries.map(([k, v]) => (
          <div key={k} className="maf-param-chip">
            <i className="fa-solid fa-tag maf-chip-icon" style={{ color: '#64748b' }}></i>
            <div className="maf-chip-content">
              <span className="maf-chip-label">{k}</span>
              <span className="maf-chip-val">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Graphical representation of tool output (replaces raw monospaced JSON for demos)
function renderGraphicalOutput(tc) {
  const out = tc.output || {};

  // Connectivity check
  if (out.serviceNow || out.automationEdge) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i>
          Handshake Output
        </span>
        <div className="maf-output-grid">
          {out.serviceNow && <span className="maf-output-pill"><i className="fa-solid fa-check"></i> ServiceNow: {out.serviceNow}</span>}
          {out.automationEdge && <span className="maf-output-pill"><i className="fa-solid fa-check"></i> AE server: {out.automationEdge}</span>}
          {out.office365 && <span className="maf-output-pill"><i className="fa-solid fa-check"></i> M365: {out.office365}</span>}
          {out.orangeHrm && <span className="maf-output-pill"><i className="fa-solid fa-check"></i> OrangeHRM: {out.orangeHrm}</span>}
        </div>
      </div>
    );
  }

  // Leave Balance Output
  if (out.availableDays !== undefined) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i>
          Validation Outcome
        </span>
        <div className="maf-output-grid">
          <span className="maf-output-pill" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }}>
            <i className="fa-solid fa-check"></i> Balance: {out.availableDays} Days Available
          </span>
          <span className="maf-output-pill" style={{ background: '#f0f9ff', borderColor: '#bae6fd', color: '#0284c7' }}>
            <i className="fa-solid fa-calendar-days"></i> Annual Quota: {out.entitlementTotal} Days
          </span>
          <span className="maf-output-pill" style={{ background: '#fef3c7', borderColor: '#fde68a', color: '#b45309' }}>
            <i className="fa-solid fa-shield-check"></i> Policy Compliant
          </span>
        </div>
      </div>
    );
  }

  // ServiceNow Laptop Output
  if (out.laptopIncident || out.sc_request) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i>
          Provisioning Result
        </span>
        <div className="maf-output-grid">
          <span className="maf-output-pill"><i className="fa-solid fa-check"></i> Status: Approved</span>
          {out.laptopIncident && <span className="maf-output-pill"><i className="fa-solid fa-box-archive"></i> Incident: {out.laptopIncident}</span>}
          {out.sc_request && <span className="maf-output-pill"><i className="fa-solid fa-ticket"></i> {out.sc_request}</span>}
        </div>
      </div>
    );
  }

  // RPA Output
  if (out.t4RequestId) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i>
          Automation Result
        </span>
        <div className="maf-output-grid">
          <span className="maf-output-pill"><i className="fa-solid fa-check"></i> Status: {out.status || 'Completed'}</span>
          <span className="maf-output-pill"><i className="fa-solid fa-bolt"></i> AE server Request #{out.t4RequestId}</span>
          {out.adRoleAssigned && <span className="maf-output-pill"><i className="fa-solid fa-user-shield"></i> Role: {out.adRoleAssigned}</span>}
        </div>
      </div>
    );
  }

  // Entra ID Output
  if (out.userId || out.accountEnabled) {
    return (
      <div className="maf-graphical-box">
        <span className="maf-box-label">
          <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i>
          Cloud Identity Result
        </span>
        <div className="maf-output-grid">
          <span className="maf-output-pill"><i className="fa-solid fa-check"></i> Account Enabled</span>
          <span className="maf-output-pill"><i className="fa-brands fa-microsoft"></i> {out.assignedLicenses?.[0] || 'M365 E5'}</span>
          {out.userId && <span className="maf-output-pill"><i className="fa-solid fa-fingerprint"></i> {out.userId}</span>}
        </div>
      </div>
    );
  }

  // Generic Output Fallback
  const entries = Object.entries(out);
  if (entries.length === 0) return null;
  return (
    <div className="maf-graphical-box">
      <span className="maf-box-label">
        <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i>
        Outputs
      </span>
      <div className="maf-output-grid">
        {entries.map(([k, v]) => (
          <span key={k} className="maf-output-pill">
            <i className="fa-solid fa-check"></i> {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        ))}
      </div>
    </div>
  );
}

// Dynamic welcome message generator for selected catalog
function getCatalogWelcomeMessage(catalogId, userName) {
  if (catalogId === 'onboarding') {
    return {
      id: `msg-welcome-onboarding-${Date.now()}`,
      sender: 'bot',
      steps: [
        {
          id: 's-act-ob',
          iconType: 'user',
          text: 'Activating Employee Onboarding Agentic Flow (Microsoft Agent Framework)',
          completed: true
        },
        {
          id: 's-con-ob',
          iconType: 'check',
          text: 'Connected to ServiceNow ITSM, Active Directory (AutomationEdge AE server), Microsoft 365 & OrangeHRM PIM',
          completed: true
        }
      ],
      text: `Hello ${userName}! Welcome to the **Employee Onboarding** catalog powered by **Autonomous Agentic Flow (Microsoft Agent Framework)**.

Every onboarding task is orchestrated across specialized autonomous agents in our **Agentic Flow**:
• 📄 **Document Verification** (\`ocr_compliance.extract_and_verify\`): Simulated Aadhaar & Degree inspection
• 💻 **ServiceNow Hardware Dispatch** (\`servicenow_table_api.prepare_sc_request\`): Laptop & catalog item staging
• 🏢 **Active Directory Domain User** (\`ae_server.execute_ad_workflow\`): Account provisioning with role via AE server
• ☁️ **Microsoft 365 Cloud Identity** (\`microsoft_graph.create_entra_id_user\`): Corporate mailbox & Entra ID sync
• 👤 **OrangeHRM Employee Profile** (\`orangehrm_pim.create_employee_profile\`): Synchronize HR directory profile

To begin, type a candidate name like **"Onboard"** to start the Agentic Flow, or select an option below:`,
      pills: [
        '🚀 Onboard',
        '⚡ AD create user',
        '📄 Verify Candidate Documents',
        '🔍 Track Onboarding Status'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  if (catalogId === 'leave') {
    return {
      id: `msg-welcome-leave-${Date.now()}`,
      sender: 'bot',
      steps: [
        {
          id: 's-act-lv',
          iconType: 'user',
          text: 'Activating Leave & Attendance Assistant',
          completed: true
        },
        {
          id: 's-con-lv',
          iconType: 'check',
          text: 'Synchronized with OrangeHRM PIM Leave Balance Engine',
          completed: true
        }
      ],
      text: `Hello ${userName}! Welcome to the **Leave & Attendance** catalog powered by **Autonomous Agentic Flow (Microsoft Agent Framework)**.

You can inspect real-time leave quotas and apply for leaves with autonomous policy checks:
• 🌴 **Leave Applications** (\`orangehrm_pim.apply_leave\`)
• 🔍 **Leave Quota Checks** (\`orangehrm_pim.get_leave_balance\`)
• ⚡ **AE server Approval Routing** (\`ae_server.trigger_apply_leave\`)

What would you like to request today?`,
      pills: [
        '🌴 Apply for 2 Days Leave',
        '🔍 Check Leave Balance',
        '🤒 Apply Sick Leave'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  if (catalogId === 'services') {
    return {
      id: `msg-welcome-services-${Date.now()}`,
      sender: 'bot',
      steps: [
        {
          id: 's-act-sv',
          iconType: 'user',
          text: 'Activating Enterprise HR & IT Services Desk',
          completed: true
        },
        {
          id: 's-con-sv',
          iconType: 'check',
          text: 'Connected to ServiceNow Service Catalog & Automated Payroll Engine',
          completed: true
        }
      ],
      text: `Hello ${userName}! Welcome to the **HR & IT Services** catalog powered by **Microsoft Agent Framework (MAF)**.

Self-service catalog for enterprise requests:
• 📄 **Payslip Generation** (\`payroll.generate_payslip\`): Instant salary slip download
• 💻 **Hardware Replacement Ticket** (\`servicenow.create_incident\`)
• 🔑 **Software Access Request** (\`servicenow.sc_request\`)

How can I assist your request?`,
      pills: [
        '📄 Download Latest Payslip',
        '💻 Hardware Replacement',
        '🔍 Track Open Tickets'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // Offboarding
  return {
    id: `msg-welcome-offboarding-${Date.now()}`,
    sender: 'bot',
    steps: [
      {
        id: 's-act-of',
        iconType: 'user',
        text: 'Activating Employee Offboarding Engine',
        completed: true
      },
      {
        id: 's-con-of',
        iconType: 'check',
        text: 'Connected to ServiceNow IT Asset Recovery & OrangeHRM Exit Workflow',
        completed: true
      }
    ],
    text: `Hello ${userName}! Welcome to the **Employee Offboarding** catalog powered by **Autonomous Agentic Flow (Microsoft Agent Framework)**.

Guided exit clearance and deprovisioning orchestration in our Agentic Flow:
• 📝 **Employee Resignation** (\`servicenow.create_offboarding_incident\`)
• 📦 **IT Asset Recovery** (\`servicenow.laptop_recovery\`)
• 🔄 **Deprovisioning Staging** (\`ae_server.trigger_offboarding\`)

Please select an action to proceed:`,
    pills: [
      '📝 Submit Resignation',
      '📦 Track Clearance Status',
      '📜 Relieving Letter Preview'
    ],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

export default function LeenaAIView({ onNavigate, currentSubtab }) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [expandedJson, setExpandedJson] = useState({});

  const toggleJson = (id) => {
    setExpandedJson((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const chatBottomRef = useRef(null);
  const toolStreamBottomRef = useRef(null);

  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [attachedDoc, setAttachedDoc] = useState(null);
  const [isMafPanelOpen, setIsMafPanelOpen] = useState(true);

  // Active Catalog State (Onboarding, Leave, Services, Offboarding)
  const [selectedCatalog, setSelectedCatalog] = useState(() => {
    if (currentSubtab && ['onboarding', 'leave', 'services', 'offboarding'].includes(currentSubtab)) {
      return currentSubtab;
    }
    return null;
  });

  // Microsoft Agent Framework (MAF) Agentic State
  const [mafSession, setMafSession] = useState({
    sessionId: 'MAF-SESSION-8924',
    framework: 'Microsoft Agent Framework (MAF)',
    orchestrator: 'HROrchestratorAgent',
    activeAgent: 'Idle / Ready',
    model: 'gpt-5.4-mini (Azure AI Foundry)'
  });

  const [agentThought, setAgentThought] = useState(
    'MAF Agentic Flow initialized. Multi-agent tool execution graph ready across ServiceNow, AutomationEdge AE server, Microsoft Entra ID & OrangeHRM.'
  );

  // Initial demonstration tool call records
  const [mafToolCalls, setMafToolCalls] = useState([
    {
      id: 'tc-init-1',
      agent: 'SystemHealthAgent',
      toolName: 'integrations_health.verify_connectivity',
      iconClass: 'servicenow',
      durationMs: 42,
      status: 'success',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      description: 'Handshake verification with multi-system backend endpoints',
      args: {
        targets: ['ServiceNow Table API', 'AutomationEdge AE server', 'Microsoft Graph', 'OrangeHRM PIM']
      },
      output: {
        status: '200 OK',
        serviceNow: 'Connected',
        automationEdge: 'Session Active',
        office365: 'Token Acquired',
        orangeHrm: 'PIM Reachable'
      }
    }
  ]);

  // Multi-turn conversational session context
  const [dialogueState, setDialogueState] = useState({
    activeIntent: null,
    step: 'idle',
    data: {}
  });

  // Active employees list
  const [activeEmployees, setActiveEmployees] = useState([
    { name: 'Soham Menon', id: 'EMP-1030', role: 'Staff AI Systems Engineer', dept: 'Engineering' },
    { name: 'Tushar Bansal', id: 'EMP-9773', role: 'Software Engineer', dept: 'Engineering' },
    { name: 'Kavita Gupta', id: 'EMP-5642', role: 'Full Stack Engineer', dept: 'Engineering' },
    { name: 'Aarav Sharma', id: 'EMP-4021', role: 'Lead DevOps Engineer', dept: 'Engineering' }
  ]);

  const userName = currentUser?.name?.split(' ')[0] || 'there';

  // Initial welcome message
  const [messages, setMessages] = useState(() => [
    getCatalogWelcomeMessage(selectedCatalog || 'onboarding', userName)
  ]);

  // Synchronize catalog with currentSubtab prop
  useEffect(() => {
    if (currentSubtab && ['onboarding', 'leave', 'services', 'offboarding'].includes(currentSubtab)) {
      setSelectedCatalog(currentSubtab);
      setMessages([getCatalogWelcomeMessage(currentSubtab, userName)]);
    } else if (!currentSubtab || currentSubtab === 'catalogs') {
      setSelectedCatalog(null);
    }
  }, [currentSubtab, userName]);

  const handleSelectCatalog = (catalogId, optionalPrompt = null) => {
    setSelectedCatalog(catalogId);
    setMessages([getCatalogWelcomeMessage(catalogId, userName)]);
    if (onNavigate) {
      onNavigate('ai-assistant', catalogId);
    }
    if (optionalPrompt) {
      setTimeout(() => {
        handleSend(optionalPrompt);
      }, 180);
    }
  };

  const handleBackToCatalogs = () => {
    setSelectedCatalog(null);
    if (onNavigate) {
      onNavigate('ai-assistant', null);
    }
  };

  const handleRunLiveT4 = async (adData) => {
    showToast('Executing workflow on live AutomationEdge AE server...', 'info');
    try {
      const r = await fetch('/api/rpa/create-ad-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: adData.candidateName,
          userPrincipal: adData.userPrincipal,
          executeLiveT4: true
        })
      });
      const d = r.ok ? await r.json() : {};
      showToast(`Workflow executed on AE server! Request #${d?.t4Result?.automationRequestId || 'Complete'}`, 'success');
    } catch {
      showToast('AE server trigger failed', 'error');
    }
  };

  // Load live employees from backend
  useEffect(() => {
    fetch('/api/employees')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((e) => ({
            name: e.fullName || e.name || 'Employee',
            id: e.id || e.empId || 'EMP-001',
            role: e.jobTitle || 'Engineer',
            dept: e.department || 'Engineering'
          }));
          setActiveEmployees(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-scroll chat feed to latest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Auto-scroll MAF tool stream to latest tool call
  useEffect(() => {
    toolStreamBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mafToolCalls]);

  // Helper to add a tool call in the MAF inspector
  const logMafToolCall = (toolCallObj) => {
    const id = `tc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTool = {
      id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      durationMs: toolCallObj.durationMs || Math.floor(60 + Math.random() * 120),
      status: toolCallObj.status || 'success',
      ...toolCallObj
    };
    setMafToolCalls((prev) => [...prev, newTool]);
    return id;
  };

  // Voice recognition support
  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showToast('Speech recognition not supported in this browser. Please type your message.', 'warning');
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (!isVoiceListening) {
      setIsVoiceListening(true);
      showToast('🎙️ Listening... Speak your HR query now', 'info');
      recognition.start();

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputVal(transcript);
        setIsVoiceListening(false);
        showToast(`Heard: "${transcript}"`, 'success');
      };

      recognition.onerror = () => setIsVoiceListening(false);
      recognition.onend = () => setIsVoiceListening(false);
    } else {
      setIsVoiceListening(false);
    }
  };

  // Helper to add user message
  const addUserMessage = (text) => {
    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    return userMsg;
  };

  // Helper to add bot message
  const addBotMessage = (msgObj) => {
    const botMsg = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...msgObj
    };
    setMessages((prev) => [...prev, botMsg]);
    return botMsg;
  };

  // Handle simulated document attachment
  const handleAttachClick = () => {
    const sampleDocs = [
      { name: 'Government_Aadhaar_ID_Verified.pdf', type: 'id' },
      { name: 'Degree_Certificate_Verified.pdf', type: 'education' },
      { name: 'Signed_Offer_Letter.pdf', type: 'offer' }
    ];
    const picked = sampleDocs[Math.floor(Math.random() * sampleDocs.length)];
    setAttachedDoc(picked);
    showToast(`📎 Document attached: ${picked.name}`, 'info');
  };

  // Main natural language query processor
  const handleSend = async (customQuery = null) => {
    const query = (customQuery !== null ? customQuery : inputVal).trim();
    if (!query && !attachedDoc) return;

    setInputVal('');
    const fullQuery = attachedDoc ? `${query} [Attached: ${attachedDoc.name}]`.trim() : query;
    addUserMessage(fullQuery);
    setAttachedDoc(null);
    setIsProcessing(true);

    const lower = query.toLowerCase();

    // Check if user is uploading / verifying documents for pending onboarding
    if (
      dialogueState.step === 'awaiting_documents' &&
      (lower.includes('upload') || lower.includes('verify') || lower.includes('document') || lower.includes('proceed') || lower.includes('yes') || lower.includes('here') || lower.includes('done'))
    ) {
      handleDocumentsUploaded(dialogueState.data);
      return;
    }

    // Check if user is confirming a pending action
    if (
      dialogueState.step === 'awaiting_confirmation' &&
      (lower.includes('yes') || lower.includes('proceed') || lower.includes('confirm') || lower.includes('go ahead') || lower.includes('sure') || lower.includes('ok'))
    ) {
      await executeConfirmedWorkflow(dialogueState.activeIntent, dialogueState.data);
      setIsProcessing(false);
      return;
    }

    // Cancel pending action
    if (
      (dialogueState.step === 'awaiting_confirmation' || dialogueState.step === 'awaiting_documents') &&
      (lower.includes('no') || lower.includes('cancel') || lower.includes('abort') || lower.includes('stop'))
    ) {
      setDialogueState({ activeIntent: null, step: 'idle', data: {} });
      setAgentThought('User aborted active workflow. Returning agent state to idle.');
      setTimeout(() => {
        addBotMessage({
          text: 'No problem! The action has been cancelled. What else would you like help with?',
          pills: ['🌴 Apply for Leave', '🚀 Onboard', '📝 Submit Resignation', '📄 Download Payslip']
        });
        setIsProcessing(false);
      }, 450);
      return;
    }

    // 1. LEAVE MANAGEMENT FLOW
    if (lower.includes('leave') || lower.includes('vacation') || lower.includes('time off') || lower.includes('holiday') || lower.includes('sick') || lower.includes('casual')) {
      handleLeaveDialogue(lower, query);
      return;
    }

    // 2. ONBOARDING FLOW (Extracts name dynamically & asks for simulated documents)
    if (lower.includes('onboard') || lower.includes('hire') || lower.includes('new joiner') || lower.includes('new employee') || lower.includes('candidate')) {
      handleOnboardingDialogue(lower, query);
      return;
    }

    // 2.5 ACTIVE DIRECTORY USER CREATION (Direct AE server Flow)
    if (
      lower.includes('ad user') ||
      lower.includes('active directory') ||
      lower.includes('ad account') ||
      lower.includes('create ad') ||
      (lower.includes('create') && lower.includes('ad'))
    ) {
      handleCreateAdUserDialogue(lower, query);
      return;
    }

    // 3. OFFBOARDING / RESIGNATION FLOW (Submitting resignation part)
    if (lower.includes('resign') || lower.includes('resignation') || lower.includes('offboard') || lower.includes('quit') || lower.includes('leaving company') || lower.includes('exit')) {
      handleResignationDialogue(lower, query);
      return;
    }

    // 4. PAYSLIP FLOW
    if (lower.includes('payslip') || lower.includes('salary slip') || lower.includes('pay slip') || lower.includes('salary')) {
      handlePayslipDialogue();
      return;
    }

    // 5. STATUS / CHECK FLOW
    if (lower.includes('status') || lower.includes('track') || lower.includes('check')) {
      handleStatusDialogue();
      return;
    }

    // FALLBACK
    setAgentThought(`Query received: "${query}". No direct intent classified. Routing to GeneralHRAssistant.`);
    setTimeout(() => {
      addBotMessage({
        text: `I can help you with HR operations! Here are key workflows you can trigger naturally:
• **"Onboard"** (or type any candidate name)
• **"Apply for casual leave for 2 days from tomorrow"**
• **"Submit my resignation with 30 days notice"**
• **"Download my latest salary slip"**

Please pick one or type your request:`,
        pills: ['🌴 Apply for Leave', '🚀 Onboard', '📝 Submit Resignation', '📄 Download Payslip']
      });
      setIsProcessing(false);
    }, 500);
  };

  // --- LEAVE DIALOGUE ENGINE ---
  const handleLeaveDialogue = (lower, originalText) => {
    let leaveType = 'Casual Leave';
    if (lower.includes('sick')) leaveType = 'Sick Leave';
    if (lower.includes('privilege') || lower.includes('earned') || lower.includes('annual')) leaveType = 'Privilege Leave';

    let fromDate = getFutureDate(1);
    let toDate = getFutureDate(2);
    let days = 2;

    if (lower.includes('tomorrow')) {
      fromDate = getFutureDate(1);
      toDate = getFutureDate(1);
      days = 1;
    } else if (lower.includes('next week') || lower.includes('monday')) {
      fromDate = getFutureDate(7);
      toDate = getFutureDate(8);
      days = 2;
    } else if (lower.includes('3 days')) {
      fromDate = getFutureDate(1);
      toDate = getFutureDate(3);
      days = 3;
    } else if (lower.includes('1 day') || lower.includes('one day')) {
      fromDate = getFutureDate(1);
      toDate = getFutureDate(1);
      days = 1;
    }

    const dateMatches = originalText.match(/\d{4}-\d{2}-\d{2}/g);
    if (dateMatches && dateMatches.length >= 1) {
      fromDate = dateMatches[0];
      toDate = dateMatches[1] || dateMatches[0];
      days = calculateDays(fromDate, toDate);
    }

    let reason = 'Personal family commitments and travel';
    if (lower.includes('fever') || lower.includes('doctor') || lower.includes('sick') || lower.includes('medical')) {
      reason = 'Medical consultation and recovery';
      leaveType = 'Sick Leave';
    } else if (lower.includes('wedding') || lower.includes('marriage')) {
      reason = 'Family wedding ceremony';
    }

    const leaveData = {
      employeeName: currentUser?.name?.split(' (')[0] || 'Soham Menon',
      empNumber: 67,
      type: leaveType,
      from: fromDate,
      to: toDate,
      days: days,
      reason: reason
    };

    setDialogueState({
      activeIntent: 'leave',
      step: 'awaiting_confirmation',
      data: leaveData
    });

    // MAF Tool Logging: OrangeHRM Balance Verification
    setMafSession((prev) => ({ ...prev, activeAgent: 'OrangeHrmAgent' }));
    setAgentThought(`Thought: Parsed leave intent for '${leaveData.employeeName}' (${leaveType}, ${days} days). Calling 'orangehrm_pim.check_leave_balance' to inspect entitlement quota.`);

    logMafToolCall({
      agent: 'OrangeHrmAgent',
      toolName: 'orangehrm_pim.check_leave_balance',
      iconClass: 'orangehrm',
      durationMs: 78,
      status: 'success',
      description: `Querying OrangeHRM PIM leave entitlements for Emp #${leaveData.empNumber}`,
      args: {
        empNumber: leaveData.empNumber,
        leaveType: leaveType,
        year: 2026
      },
      output: {
        availableDays: 12,
        entitlementTotal: 15,
        leaveType: leaveType,
        policyCompliant: true
      }
    });

    setTimeout(() => {
      addBotMessage({
        steps: [
          {
            id: 'l1',
            iconType: 'user',
            text: 'Activating Universal HR Leave Assistant',
            completed: true
          },
          {
            id: 'l2',
            iconType: 'heart',
            text: `Calling OrangeHRM PIM to check ${leaveType} balance & entitlements (12 days quota available)`,
            completed: true
          }
        ],
        text: `Got it. I'll submit your **${leaveType}** application for **${days} day(s)** from **${fromDate}** to **${toDate}** for *"${reason}"*. 

Your request will be submitted for supervisor approval and synced with **OrangeHRM**. Confirm to proceed?`,
        actionCard: {
          type: 'leave_confirm',
          data: leaveData
        },
        pills: ['Yes, go ahead.', 'Change Dates', 'Cancel'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setIsProcessing(false);
    }, 600);
  };

  // --- ONBOARDING DIALOGUE ENGINE: STEP 1 (EXTRACTS NAME & PROMPTS DOCUMENT UPLOAD) ---
  const handleOnboardingDialogue = (lower, originalText) => {
    const extracted = extractCandidateName(originalText);
    const candidateName = extracted || 'Harsh Makadiya';
    const cleanEmailName = candidateName.toLowerCase().replace(/[^a-z0-9]/g, '.');

    const candidateData = {
      fullName: candidateName,
      email: `${cleanEmailName}@example.com`,
      phone: '+91 98230 45671',
      department: 'Engineering',
      jobTitle: 'Staff AI Systems Engineer',
      manager: 'Amit Deshmukh (VP of Engineering)',
      salary: '₹34,50,000 INR / annum (₹34.5 LPA)',
      startDate: getFutureDate(14),
      hardware: 'Apple MacBook Pro M3 Max',
      id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceNowReq: `REQ001${Math.floor(1000 + Math.random() * 9000)}`,
      serviceNowRitm: `RITM001${Math.floor(1000 + Math.random() * 9000)}`
    };

    setDialogueState({
      activeIntent: 'onboarding',
      step: 'awaiting_documents',
      data: candidateData
    });

    // MAF Tool Logging: Agent Planning
    setMafSession((prev) => ({ ...prev, activeAgent: 'HROrchestratorAgent' }));
    setAgentThought(`Thought: Parsed candidate onboarding request for '${candidateName}'. Initiating MAF compliance verification. Next tool required: 'ocr_compliance.request_verification_documents'.`);

    logMafToolCall({
      agent: 'HROrchestratorAgent',
      toolName: 'ocr_compliance.request_verification_documents',
      iconClass: 'ocr',
      durationMs: 52,
      status: 'success',
      description: `Generating document upload manifest for candidate ${candidateName}`,
      args: {
        candidateName: candidateName,
        requiredDocs: ['Government Photo ID / Aadhaar', 'Degree Certificate', 'Signed Offer Letter']
      },
      output: {
        manifestStatus: 'Pending Candidate Upload',
        aadhaarExpected: true,
        panVerificationRequired: true
      }
    });

    setTimeout(() => {
      addBotMessage({
        steps: [
          {
            id: 'ob-doc-1',
            iconType: 'user',
            text: 'Activating 4-Engine Sequential Provisioning Orchestrator',
            completed: true
          },
          {
            id: 'ob-doc-2',
            iconType: 'heart',
            text: `Initiating onboarding compliance pipeline for ${candidateName}`,
            completed: true
          }
        ],
        text: `Got it! Let's initiate onboarding for **${candidateName}**.

To verify compliance and generate the automated 4-engine provisioning requests (across **ServiceNow**, **Active Directory (AE server)**, **Microsoft 365**, and **OrangeHRM**) in our **Agentic Flow**, please upload or confirm the candidate's verification documents:
1. **Government Photo ID / Aadhaar Card**
2. **Degree Certificate / Education Proof**
3. **Signed Offer Letter**

*(Click the button below to simulate document upload & verification)*`,
        actionCard: {
          type: 'document_upload',
          data: candidateData
        },
        pills: [
          `📁 Upload Documents for ${candidateName}`,
          'Cancel'
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setIsProcessing(false);
    }, 600);
  };

  // --- ONBOARDING DIALOGUE ENGINE: STEP 2 (DOCUMENTS UPLOADED -> CONFIRMATION DOSSIER) ---
  const handleDocumentsUploaded = (candData) => {
    setIsProcessing(true);

    const updatedData = {
      ...candData,
      idDocumentName: `Aadhaar_Card_${candData.fullName.replace(/\s+/g, '_')}_Verified.pdf`,
      educationDocName: `Degree_Certificate_${candData.fullName.replace(/\s+/g, '_')}_Verified.pdf`,
      offerDocumentName: `Signed_Offer_Letter_${candData.fullName.replace(/\s+/g, '_')}.pdf`
    };

    setDialogueState({
      activeIntent: 'onboarding',
      step: 'awaiting_confirmation',
      data: updatedData
    });

    // MAF Tool Logging: OCR Verification & ServiceNow Payload Preparation
    setMafSession((prev) => ({ ...prev, activeAgent: 'OcrComplianceAgent' }));
    setAgentThought(`Thought: Received verification documents for '${candData.fullName}'. Executing OCR extraction and cross-referencing with ServiceNow catalog item specifications.`);

    logMafToolCall({
      agent: 'OcrComplianceAgent',
      toolName: 'ocr_compliance.extract_and_verify',
      iconClass: 'ocr',
      durationMs: 142,
      status: 'success',
      description: `OCR extraction on Aadhaar & Degree Certificate for ${candData.fullName}`,
      args: {
        candidateName: candData.fullName,
        documents: [updatedData.idDocumentName, updatedData.educationDocName, updatedData.offerDocumentName]
      },
      output: {
        ocrConfidence: 0.994,
        aadhaarChecksum: 'Valid (UIDAI format)',
        degreeVerified: 'B.Tech Computer Science (First Class Distinction)',
        complianceStatus: '100% Passed'
      }
    });

    logMafToolCall({
      agent: 'ServiceNowAgent',
      toolName: 'servicenow_table_api.prepare_sc_request',
      iconClass: 'servicenow',
      durationMs: 88,
      status: 'success',
      description: `Pre-staging ServiceNow Service Catalog Request & Hardware Incident`,
      args: {
        catalogItemSysId: 'sc_req_onboarding_enterprise',
        candidateName: candData.fullName,
        hardwareModel: candData.hardware,
        priority: '2 - High'
      },
      output: {
        preStagedReq: candData.serviceNowReq,
        preStagedRitm: candData.serviceNowRitm,
        stage: 'Awaiting HR Final Execution'
      }
    });

    setTimeout(() => {
      addBotMessage({
        steps: [
          {
            id: 'ob-doc-done',
            iconType: 'check',
            text: `Running OCR & document extraction from Aadhaar_Card_${candData.fullName.replace(/\s+/g, '_')}_Verified.pdf`,
            completed: true
          },
          {
            id: 'ob-pan-done',
            iconType: 'check',
            text: `Aadhaar & PAN compliance 100% verified for ${candData.fullName}`,
            completed: true
          },
          {
            id: 'ob-sn-prep',
            iconType: 'heart',
            text: `Calling ServiceNow ITSM to prepare Service Catalog Request & Laptop Incident (${candData.hardware})`,
            completed: true
          }
        ],
        text: `All verification documents for **${candData.fullName}** have been verified and validated!

I'll register **${candData.fullName}** as **${candData.jobTitle}** in **${candData.department}** (Annual CTC: ${candData.salary}).

This will trigger the 4-engine sequential workflow:
1. **ServiceNow ITSM**: Approve Service Catalog Request & dispatch **${candData.hardware}**
2. **Active Directory**: Execute AutomationEdge AE server workflow to create AD user (Agentic Flow)
3. **Microsoft 365 / Entra ID**: Create corporate account \`${candData.fullName.toLowerCase().replace(/\s+/g, '.')}@automationedge.ai\`
4. **OrangeHRM PIM**: Create employee profile synced with corporate mail & generate Offer Letter PDF.

Confirm to proceed?`,
        actionCard: {
          type: 'onboarding_confirm',
          data: updatedData
        },
        pills: ['Yes, go ahead.', 'Cancel'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setIsProcessing(false);
    }, 700);
  };

  // --- OFFBOARDING / RESIGNATION DIALOGUE ENGINE ---
  const handleResignationDialogue = (lower, originalText) => {
    let selectedEmp = activeEmployees[0] || { name: 'Soham Menon', id: 'EMP-1030', role: 'Staff AI Systems Engineer', dept: 'Engineering' };
    activeEmployees.forEach((emp) => {
      if (lower.includes(emp.name.toLowerCase().split(' ')[0])) {
        selectedEmp = emp;
      }
    });

    const extracted = extractCandidateName(originalText);
    if (extracted) {
      selectedEmp = {
        name: extracted,
        id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        role: 'Staff AI Systems Engineer',
        dept: 'Engineering'
      };
    }

    const resignationDate = new Date().toISOString().split('T')[0];
    const lwd = getFutureDate(30);

    let reason = 'Pursuing higher career opportunity and professional growth';
    if (lower.includes('relocation') || lower.includes('city') || lower.includes('move')) {
      reason = 'Relocating to another city with family';
    } else if (lower.includes('education') || lower.includes('study') || lower.includes('masters')) {
      reason = 'Pursuing higher full-time university education';
    } else if (lower.includes('personal') || lower.includes('health')) {
      reason = 'Personal and family commitments';
    }

    const resignationData = {
      empName: selectedEmp.name,
      empId: selectedEmp.id,
      department: selectedEmp.dept,
      jobTitle: selectedEmp.role,
      resignationDate: resignationDate,
      lastWorkingDay: lwd,
      noticePeriodDays: 30,
      reason: reason,
      feedback: 'Handover documentation prepared and assigned to technical leads.'
    };

    setDialogueState({
      activeIntent: 'resignation',
      step: 'awaiting_confirmation',
      data: resignationData
    });

    // MAF Tool Logging: Contractual Notice Period Calculator
    setMafSession((prev) => ({ ...prev, activeAgent: 'OffboardingAgent' }));
    setAgentThought(`Thought: Parsed resignation for '${selectedEmp.name}'. Invoking 'policy_rules.calculate_notice_period' to determine clearance checklist and asset return tickets.`);

    logMafToolCall({
      agent: 'OffboardingAgent',
      toolName: 'policy_rules.calculate_notice_period',
      iconClass: 'servicenow',
      durationMs: 44,
      status: 'success',
      description: `Calculating contractual exit terms for ${selectedEmp.name}`,
      args: {
        empId: selectedEmp.id,
        employmentType: 'Full-Time Permanent',
        contractNoticePeriodDays: 30
      },
      output: {
        statutoryNoticeDays: 30,
        proposedLwd: lwd,
        clearanceRequirements: ['Laptop Hardware Return', 'AD Access De-provisioning', 'M365 License Revocation']
      }
    });

    setTimeout(() => {
      addBotMessage({
        steps: [
          {
            id: 'r1',
            iconType: 'user',
            text: 'Activating HR Offboarding & Exit Engine',
            completed: true
          },
          {
            id: 'r2',
            iconType: 'heart',
            text: `Calculating contractual notice period (30 days) & asset clearance requirements for ${selectedEmp.name}`,
            completed: true
          }
        ],
        text: `Got it. I'll submit the formal resignation for **${selectedEmp.name}** (${selectedEmp.role}, ${selectedEmp.dept}) with Last Working Day (LWD) on **${lwd}** (30 days notice).

Reason: *"${reason}"*.

This will:
1. Trigger **AutomationEdge AE server** Workflow: \`HR Demo Offboarding SN Req\` (Agentic Flow)
2. Create **ServiceNow** Offboarding Request & IT Laptop Recovery Incident
3. Log resignation status in **OrangeHRM PIM** & generate Official Resignation Acknowledgement.

Confirm to proceed?`,
        actionCard: {
          type: 'resignation_confirm',
          data: resignationData
        },
        pills: ['Yes, go ahead.', 'Change Last Working Day', 'Cancel'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setIsProcessing(false);
    }, 600);
  };

  // --- PAYSLIP DIALOGUE ENGINE ---
  const handlePayslipDialogue = () => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
    const empName = currentUser?.name?.split(' (')[0] || 'Soham Menon';

    setMafSession((prev) => ({ ...prev, activeAgent: 'PayrollAgent' }));
    setAgentThought(`Thought: Retrieving monthly disbursement register for '${empName}'. Calling 'payroll_engine.query_salary_breakdown'.`);

    logMafToolCall({
      agent: 'PayrollAgent',
      toolName: 'payroll_engine.query_salary_breakdown',
      iconClass: 'pdf',
      durationMs: 65,
      status: 'success',
      description: `Disbursement query for ${empName} (${currentMonth} ${currentYear})`,
      args: {
        employee: empName,
        month: currentMonth,
        year: currentYear
      },
      output: {
        grossSalary: '₹2,87,500 INR',
        deductionsPfTax: '₹41,700 INR',
        netPayable: '₹2,45,800 INR',
        disbursementStatus: 'Credited (HDFC Bank)'
      }
    });

    setTimeout(() => {
      addBotMessage({
        steps: [
          {
            id: 'p1',
            iconType: 'user',
            text: 'Activating Payroll & Benefits Engine',
            completed: true
          },
          {
            id: 'p2',
            iconType: 'check',
            text: `Pulling salary disbursement and tax deduction records for ${empName} (${currentMonth} ${currentYear})`,
            completed: true
          }
        ],
        text: `Here is your official **Salary Payslip** for **${currentMonth} ${currentYear}**. You can download the signed PDF receipt directly below:`,
        actionCard: {
          type: 'payslip_card',
          data: {
            employeeName: empName,
            month: currentMonth,
            year: currentYear,
            netPay: '₹2,45,800 INR',
            downloadUrl: `/api/exit/payslip?empName=${encodeURIComponent(empName)}&month=${encodeURIComponent(currentMonth)}&year=${currentYear}`
          }
        },
        pills: ['Download Payslip PDF', '🌴 Apply for Leave', '🚀 Onboard'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setIsProcessing(false);
    }, 500);
  };

  // --- STATUS DIALOGUE ENGINE ---
  const handleStatusDialogue = async () => {
    try {
      const res = await fetch('/api/employees');
      const employees = res.ok ? await res.json() : [];
      const pending = employees.filter((e) => e.status === 'Pending Review' || e.status === 'Pending');
      const approved = employees.filter((e) => e.status === 'Approved');

      setMafSession((prev) => ({ ...prev, activeAgent: 'TelemetryAgent' }));
      logMafToolCall({
        agent: 'TelemetryAgent',
        toolName: 'hrms_telemetry.query_pipeline_metrics',
        iconClass: 'servicenow',
        durationMs: 38,
        status: 'success',
        description: 'Aggregating live queue metrics across all 4 provisioning engines',
        args: { scope: 'all_tenants' },
        output: {
          pendingApprovals: pending.length,
          provisionedUsers: approved.length,
          t4WorkflowHealth: '100% Operational',
          activeSessionCount: 1
        }
      });

      setTimeout(() => {
        addBotMessage({
          steps: [
            {
              id: 'st1',
              iconType: 'check',
              text: `Queried real-time HR database: ${pending.length} pending candidate(s), ${approved.length} provisioned`,
              completed: true
            }
          ],
          text: `📊 **Live HRMS Onboarding Status:**
• **Pending Candidates**: ${pending.length} candidate(s) awaiting approval
• **Fully Provisioned**: ${approved.length} candidate(s) live across ServiceNow, AD, M365 & OrangeHRM
• **System Health**: All 4 integration engines reporting operational.

Would you like to initiate onboarding for a candidate or check approvals?`,
          pills: ['🚀 Onboard', '🌴 Apply for Leave', '📝 Submit Resignation']
        });
        setIsProcessing(false);
      }, 450);
    } catch {
      setIsProcessing(false);
    }
  };

  // --- DIRECT ACTIVE DIRECTORY RPA DIALOGUE ENGINE ---
  const handleCreateAdUserDialogue = async (lower, originalText) => {
    setIsProcessing(true);
    let candidateName = extractCandidateName(originalText);
    if (!candidateName) {
      const match = originalText.match(/(?:create\s+ad\s+user|ad\s+create\s+user|create\s+user|create\s+ad\s+account)(?:\s+for)?\s+([a-zA-Z\s]+)/i);
      if (match && match[1]) {
        const raw = match[1].trim();
        if (raw && !['ad', 'user', 'account'].includes(raw.toLowerCase())) {
          candidateName = raw
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        }
      }
    }
    if (!candidateName) candidateName = 'Harsh Makadiya';
    const emailPrefix = candidateName.toLowerCase().replace(/\s+/g, '.');
    const userPrincipal = `${emailPrefix}@automationedge.ai`;

    setMafSession((prev) => ({ ...prev, activeAgent: 'AutomationEdgeRpaAgent' }));
    setAgentThought(`Thought: Active Directory user creation requested for '${candidateName}'. Activating AutomationEdgeRpaAgent to invoke workflow 'AD-Create User and Assin Role' on AE server (Agentic Flow).`);

    try {
      // Call backend AD user creation endpoint
      const res = await fetch('/api/rpa/create-ad-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: candidateName,
          userPrincipal
        })
      });
      const data = res.ok ? await res.json() : {};
      const t4ReqId = data?.t4Result?.automationRequestId || Math.floor(100000 + Math.random() * 900000);

      // Log MAF tool call for right-side telemetry panel
      logMafToolCall({
        agent: 'AutomationEdgeRpaAgent',
        toolName: 'automationedge_t4.execute_ad_workflow',
        iconClass: 'ae_rpa',
        durationMs: 182,
        status: 'success',
        description: `Triggering AutomationEdge AE server workflow 'AD-Create User and Assin Role' for ${candidateName}`,
        args: {
          workflow: 'AD-Create User and Assin Role',
          candidateName,
          orgCode: 'MSP_EVENT',
          userPrincipal
        },
        output: {
          t4RequestId: t4ReqId,
          adRoleAssigned: 'Engineering-Standard',
          status: 'Completed',
          accountActive: true
        }
      });

      setTimeout(() => {
        addBotMessage({
          steps: [
            {
              id: 'ad-s1',
              iconType: 'purple',
              text: 'Prepared task for AD create user (AutomationEdge AE server)',
              completed: true
            },
            {
              id: 'ad-s2',
              iconType: 'user',
              text: `Workflow 'AD-Create User and Assin Role' staged for principal '${userPrincipal}'`,
              completed: true
            },
            {
              id: 'ad-s3',
              iconType: 'check',
              text: `Active Directory account staged (Req #${t4ReqId}) — Ready for manual execution on AE server`,
              completed: true
            }
          ],
          text: `⚡ **Active Directory User Staged via AutomationEdge AE server (Agentic Flow)!**
• **Candidate / User**: **${candidateName}**
• **User Principal Name (UPN)**: \`${userPrincipal}\`
• **Workflow**: \`AD-Create User and Assin Role\`
• **Staged Request ID**: \`#${t4ReqId}\`
• **Assigned Security Group**: \`CN=Engineering-Dept,DC=ae,DC=internal\`
• **Status**: **Staged on AE server (Live run held as requested)**.

You can trigger this workflow directly on AE server using the manual run button below:`,
          actionCard: {
            type: 'ad_trigger_manual',
            data: { candidateName, userPrincipal, t4ReqId }
          },
          pills: ['🚀 Onboard', '🌴 Apply for Leave', '📄 Download Payslip', '📝 Submit Resignation'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        showToast(`⚡ Active Directory account staged for ${candidateName}!`, 'success');
        setIsProcessing(false);
        setMafSession((prev) => ({ ...prev, activeAgent: 'Idle / Ready' }));
        setAgentThought(`Thought: Active Directory user staged successfully for '${candidateName}'. Live run held for manual execution.`);
      }, 600);
    } catch (err) {
      setIsProcessing(false);
      setMafSession((prev) => ({ ...prev, activeAgent: 'Idle / Ready' }));
      showToast('Error creating Active Directory account', 'error');
    }
  };

  // --- EXECUTE CONFIRMED WORKFLOW ---
  const executeConfirmedWorkflow = async (intent, data) => {
    // 1. LEAVE EXECUTION
    if (intent === 'leave') {
      try {
        const payload = {
          id: `LR-${Math.floor(400 + Math.random() * 599)}`,
          employeeName: data.employeeName,
          empNumber: data.empNumber || 67,
          type: data.type,
          from: data.from,
          to: data.to,
          days: data.days,
          reason: data.reason
        };

        setMafSession((prev) => ({ ...prev, activeAgent: 'AutomationEdgeRpaAgent' }));
        setAgentThought(`Thought: Executing tool calls for leave request #${payload.id}. Delegating to 'orangehrm_pim.submit_leave_request' and 'automationedge_t4.trigger_apply_leave'.`);

        logMafToolCall({
          agent: 'OrangeHrmAgent',
          toolName: 'orangehrm_pim.submit_leave_request',
          iconClass: 'orangehrm',
          durationMs: 112,
          status: 'success',
          description: `Posting ${payload.type} request to OrangeHRM PIM`,
          args: payload,
          output: {
            leaveRequestId: payload.id,
            status: 'Pending HR Approval',
            persistedInDatabase: true
          }
        });

        logMafToolCall({
          agent: 'AutomationEdgeRpaAgent',
          toolName: 'automationedge_t4.trigger_apply_leave',
          iconClass: 'ae_rpa',
          durationMs: 168,
          status: 'success',
          description: `Triggering AutomationEdge AE server workflow 'HR Demo Apply Leave'`,
          args: {
            workflowName: 'HR Demo Apply Leave',
            empNumber: payload.empNumber
          },
          output: {
            t4RequestId: Math.floor(100000 + Math.random() * 900000),
            executionState: 'Running in Background',
            orgCode: 'MSP_EVENT'
          }
        });

        await fetch('/api/leave/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        addBotMessage({
          steps: [
            {
              id: 'l-s1',
              iconType: 'heart',
              text: `Calling OrangeHRM PIM to register ${data.type} request #${payload.id}`,
              completed: true
            },
            {
              id: 'l-s2',
              iconType: 'purple',
              text: `Triggering AutomationEdge AE server Workflow 'HR Demo Apply Leave' for Emp #${payload.empNumber}`,
              completed: true
            },
            {
              id: 'l-s3',
              iconType: 'check',
              text: `Supervisor notified via automated email & request status set to 'Pending HR Approval'`,
              completed: true
            }
          ],
          text: `🎉 **Leave request submitted successfully!**
• **Request ID**: \`${payload.id}\`
• **Type**: ${data.type} (${data.days} days)
• **Dates**: ${data.from} to ${data.to}
• **Status**: Active in OrangeHRM & AE server workflow initiated (Agentic Flow).`,
          pills: ['🌴 Apply for Another Leave', '📄 Download Payslip', '🚀 Onboard']
        });
        showToast(`✅ Leave request ${payload.id} submitted!`, 'success');
      } catch (err) {
        showToast('Error submitting leave request', 'error');
      } finally {
        setIsProcessing(false);
        setMafSession((prev) => ({ ...prev, activeAgent: 'Idle / Ready' }));
        setDialogueState({ activeIntent: null, step: 'idle', data: {} });
      }
      return;
    }

    // 2. ONBOARDING EXECUTION (4-Engine Sequential Provisioning Tool Calls)
    if (intent === 'onboarding') {
      try {
        setIsProcessing(true);

        // Tool 1: ServiceNow Agent (Hardware & Ticket)
        setMafSession((prev) => ({ ...prev, activeAgent: 'ServiceNowAgent' }));
        setAgentThought(`Thought: Initiating 4-engine onboarding for '${data.fullName}'. Step 1: Delegating to ServiceNowAgent for laptop catalog request & hardware incident.`);

        logMafToolCall({
          agent: 'ServiceNowAgent',
          toolName: 'servicenow_table_api.approve_and_provision_laptop',
          iconClass: 'servicenow',
          durationMs: 145,
          status: 'success',
          description: `Approving Catalog Request & dispatching ${data.hardware}`,
          args: {
            reqNumber: data.serviceNowReq,
            candidateName: data.fullName,
            laptopModel: data.hardware
          },
          output: {
            sc_request: data.serviceNowReq,
            ritm: data.serviceNowRitm,
            laptopIncident: `INC001${Math.floor(1000 + Math.random() * 9000)}`,
            approvalStatus: 'Approved'
          }
        });

        // Tool 2: AutomationEdge AE server (Active Directory User Creation)
        setMafSession((prev) => ({ ...prev, activeAgent: 'AutomationEdgeRpaAgent' }));
        setAgentThought(`Thought: Step 2: Triggering AutomationEdge AE server Active Directory workflow 'AD-Create User and Assin Role' for '${data.fullName}' (Agentic Flow).`);

        logMafToolCall({
          agent: 'AutomationEdgeRpaAgent',
          toolName: 'automationedge_t4.execute_ad_workflow',
          iconClass: 'ae_rpa',
          durationMs: 182,
          status: 'success',
          description: `Executing workflow 'AD-Create User and Assin Role' on AE server to create Active Directory domain user`,
          args: {
            workflow: 'AD-Create User and Assin Role',
            candidateName: data.fullName,
            orgCode: 'MSP_EVENT',
            userPrincipal: `${data.fullName.toLowerCase().replace(/\s+/g, '.')}@automationedge.ai`
          },
          output: {
            t4RequestId: Math.floor(100000 + Math.random() * 900000),
            adRoleAssigned: 'Engineering-Standard',
            status: 'Completed',
            accountActive: true
          }
        });

        // Tool 3: Microsoft Graph API (Entra ID Cloud Account)
        setMafSession((prev) => ({ ...prev, activeAgent: 'MicrosoftGraphAgent' }));
        setAgentThought(`Thought: Step 3: Triggering Microsoft Graph API for Entra ID cloud user & M365 license.`);

        logMafToolCall({
          agent: 'MicrosoftGraphAgent',
          toolName: 'microsoft_graph.create_entra_id_user',
          iconClass: 'm365',
          durationMs: 128,
          status: 'success',
          description: `Provisioning cloud mailbox & Azure Active Directory account`,
          args: {
            displayName: data.fullName,
            userPrincipalName: `${data.fullName.toLowerCase().replace(/\s+/g, '.')}@automationedge.ai`,
            mailNickname: data.fullName.toLowerCase().replace(/\s+/g, '.')
          },
          output: {
            userId: `azure-ad-usr-${Math.floor(10000 + Math.random() * 90000)}`,
            accountEnabled: true,
            assignedLicenses: ['Microsoft 365 E5 Enterprise']
          }
        });

        // Tool 4: OrangeHRM PIM (Employee Profile)
        setMafSession((prev) => ({ ...prev, activeAgent: 'OrangeHrmAgent' }));
        setAgentThought(`Thought: Step 4: Synchronizing employee profile with OrangeHRM PIM.`);

        logMafToolCall({
          agent: 'OrangeHrmAgent',
          toolName: 'orangehrm_pim.create_employee_profile',
          iconClass: 'orangehrm',
          durationMs: 104,
          status: 'success',
          description: `Creating employee profile synced with Microsoft 365 corporate mail`,
          args: {
            fullName: data.fullName,
            department: data.department,
            jobTitle: data.jobTitle,
            workEmail: `${data.fullName.toLowerCase().replace(/\s+/g, '.')}@automationedge.ai`
          },
          output: {
            empNumber: '#20',
            profileCreated: true,
            status: 'Synced with Office 365 Mail'
          }
        });

        // Step A: Save employee in DB
        await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            idDocumentName: `Aadhaar_Card_${data.fullName.replace(/\s+/g, '_')}_Verified.pdf`,
            educationDocName: `Degree_Certificate_${data.fullName.replace(/\s+/g, '_')}_Verified.pdf`,
            offerDocumentName: `Signed_Offer_Letter_${data.fullName.replace(/\s+/g, '_')}.pdf`
          })
        });

        // Step B: Trigger 4-engine approval
        const approveRes = await fetch('/api/servicenow/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            reqNumber: data.serviceNowReq,
            ritmNumber: data.serviceNowRitm
          })
        });

        const approveData = approveRes.ok ? await approveRes.json() : {};
        const laptopTicket = approveData?.laptopProvisioning?.ticketNumber || `INC001${Math.floor(1000 + Math.random() * 9000)}`;
        const o365Email = approveData?.office365?.userPrincipalName || `${data.fullName.toLowerCase().replace(/\s+/g, '.')}@automationedge.ai`;
        const orangeHrmNum = approveData?.orangeHrmEmpNumber || '#20';

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        addBotMessage({
          steps: [
            {
              id: 'ob-s1',
              iconType: 'heart',
              text: `Calling ServiceNow ITSM — Approved Request ${data.serviceNowReq} & created Laptop Incident ${laptopTicket}`,
              completed: true
            },
            {
              id: 'ob-s2',
              iconType: 'purple',
              text: `Calling Active Directory (AutomationEdge AE server) — Workflow executed & domain user '${o365Email.split('@')[0]}' provisioned`,
              completed: true
            },
            {
              id: 'ob-s3',
              iconType: 'blue',
              text: `Calling Microsoft 365 / Entra ID — Created corporate cloud account '${o365Email}'`,
              completed: true
            },
            {
              id: 'ob-s4',
              iconType: 'check',
              text: `Calling OrangeHRM PIM — Employee profile ${orangeHrmNum} created and synced with corporate mail`,
              completed: true
            }
          ],
          text: `🚀 **4-Engine Agentic Flow Provisioning Complete for ${data.fullName}!**
• **ServiceNow ITSM**: Approved \`${data.serviceNowReq}\` | Laptop Ticket \`${laptopTicket}\`
• **Active Directory**: AutomationEdge AE server execution successful
• **Microsoft 365**: \`${o365Email}\` active
• **OrangeHRM**: Employee ${orangeHrmNum} linked.
• **Offer Letter**: Formally generated & dispatched.`,
          actionCard: {
            type: 'onboarding_success',
            data: {
              ...data,
              laptopTicket,
              o365Email,
              orangeHrmNum,
              offerDownloadUrl: `/generated_offers/Offer_Letter_${data.fullName.replace(/\s+/g, '_')}.pdf`
            }
          },
          pills: ['🚀 Onboard Another Candidate', '🌴 Apply for Leave', '📝 Submit Resignation'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        showToast(`🎉 4-Engine Provisioning completed for ${data.fullName}!`, 'success');
        setAgentThought(`Thought: 4-Engine sequential provisioning completed successfully for '${data.fullName}'. All systems synchronized.`);
      } catch (err) {
        showToast('Error during onboarding execution', 'error');
      } finally {
        setIsProcessing(false);
        setMafSession((prev) => ({ ...prev, activeAgent: 'Idle / Ready' }));
        setDialogueState({ activeIntent: null, step: 'idle', data: {} });
      }
      return;
    }

    // 3. OFFBOARDING / RESIGNATION EXECUTION
    if (intent === 'resignation') {
      try {
        setMafSession((prev) => ({ ...prev, activeAgent: 'OffboardingAgent' }));
        setAgentThought(`Thought: Executing resignation agentic flow for '${data.empName}'. Triggering AE server offboarding workflow & ServiceNow clearance requests.`);

        logMafToolCall({
          agent: 'AutomationEdgeRpaAgent',
          toolName: 'automationedge_t4.trigger_offboarding_sn_req',
          iconClass: 'ae_rpa',
          durationMs: 154,
          status: 'success',
          description: `Executing AE server workflow 'HR Demo Offboarding SN Req' for emp_id: ${data.empId}`,
          args: {
            empId: data.empId,
            workflow: 'HR Demo Offboarding SN Req'
          },
          output: {
            t4ExecutionId: Math.floor(100000 + Math.random() * 900000),
            status: 'Triggered'
          }
        });

        logMafToolCall({
          agent: 'ServiceNowAgent',
          toolName: 'servicenow_table_api.create_offboarding_incident',
          iconClass: 'servicenow',
          durationMs: 136,
          status: 'success',
          description: `Creating asset recovery ticket and exit sc_request in ServiceNow`,
          args: {
            employee: data.empName,
            lastWorkingDay: data.lastWorkingDay,
            reason: data.reason
          },
          output: {
            exitReq: `REQ001${Math.floor(2000 + Math.random() * 8000)}`,
            laptopRecoveryTicket: `INC002${Math.floor(2000 + Math.random() * 8000)}`,
            assignedGroup: 'IT Hardware Asset Clearance'
          }
        });

        const exitRes = await fetch('/api/exit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const exitResult = exitRes.ok ? await exitRes.json() : {};
        const snReq = exitResult?.serviceNow?.serviceNowReq || `REQ001${Math.floor(2000 + Math.random() * 8000)}`;
        const laptopTicket = exitResult?.serviceNow?.laptopTicket || `INC002${Math.floor(2000 + Math.random() * 8000)}`;

        addBotMessage({
          steps: [
            {
              id: 'res-s1',
              iconType: 'purple',
              text: `Calling AutomationEdge AE server — Triggered Workflow 'HR Demo Offboarding SN Req' for ${data.empId}`,
              completed: true
            },
            {
              id: 'res-s2',
              iconType: 'heart',
              text: `Calling ServiceNow ITSM — Created Offboarding Request ${snReq} & Laptop Recovery Incident ${laptopTicket}`,
              completed: true
            },
            {
              id: 'res-s3',
              iconType: 'check',
              text: `Calling OrangeHRM PIM — Employee status updated to 'Resigned / Pending HR Offboarding'`,
              completed: true
            }
          ],
          text: `✅ **Resignation successfully submitted & processed!**
• **Employee**: ${data.empName} (${data.empId})
• **Last Working Day**: **${data.lastWorkingDay}**
• **ServiceNow Clearance Request**: \`${snReq}\`
• **IT Asset Recovery Incident**: \`${laptopTicket}\`
• **Exit Status**: Recorded in OrangeHRM. Clearance tickets dispatched to IT & Finance.`,
          actionCard: {
            type: 'resignation_success',
            data: {
              ...data,
              snReq,
              laptopTicket,
              relievingDownloadUrl: `/api/exit/resignation-letter?empName=${encodeURIComponent(data.empName)}`
            }
          },
          pills: ['📝 Submit Another Resignation', '🌴 Apply for Leave', '📄 Download Payslip'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        showToast(`✅ Resignation submitted for ${data.empName}!`, 'success');
      } catch (err) {
        showToast('Error processing resignation', 'error');
      } finally {
        setIsProcessing(false);
        setMafSession((prev) => ({ ...prev, activeAgent: 'Idle / Ready' }));
        setDialogueState({ activeIntent: null, step: 'idle', data: {} });
      }
    }
  };

  if (!selectedCatalog) {
    return <HRAssistantCatalogs onSelectCatalog={handleSelectCatalog} />;
  }

  const activeCatalogObj = HR_CATALOGS_DATA.find((c) => c.id === selectedCatalog) || HR_CATALOGS_DATA[0];

  return (
    <div className="leena-workspace-wrapper">
      {/* Top Banner when in specific catalog */}
      <div className="hr-chat-catalog-banner">
        <div className="hr-banner-left">
          <button
            className="hr-back-catalogs-btn"
            onClick={handleBackToCatalogs}
            title="Return to HR AI Assistant Catalogs Hub"
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>All Catalogs</span>
          </button>
          <div
            className="hr-catalog-active-pill"
            style={{
              background: activeCatalogObj.tagBg,
              color: activeCatalogObj.tagColor,
              border: `1px solid ${activeCatalogObj.tagColor}33`
            }}
          >
            <i className={activeCatalogObj.icon}></i>
            <span>Agentic Flow: {activeCatalogObj.title}</span>
          </div>
        </div>
        <div className="hr-banner-tabs">
          {HR_CATALOGS_DATA.map((cat) => (
            <button
              key={cat.id}
              className={`hr-tab-switch-btn ${selectedCatalog === cat.id ? 'active' : ''}`}
              onClick={() => handleSelectCatalog(cat.id)}
            >
              <i className={cat.icon}></i>
              <span>{cat.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Container: Full Width Split between Chat Stream & Right MAF Tool Inspector */}
      <div className="leena-app-body">
        {/* Left: Conversational Stream */}
        <section className="leena-chat-stream-container">
          <div className="leena-chat-feed">
            {messages.map((msg) => (
              <div key={msg.id} className={`leena-message-group ${msg.sender}`}>
                {/* 1. Stepped Action Nodes */}
                {msg.steps && msg.steps.length > 0 && (
                  <div className="leena-steps-timeline">
                    {msg.steps.map((st, sIdx) => {
                      const isLast = sIdx === msg.steps.length - 1;
                      return (
                        <div key={st.id || sIdx} className="leena-step-node-item">
                          <div className="leena-step-indicator-col">
                            <div className={`leena-step-icon-circle ${st.iconType || 'user'}`}>
                              {st.iconType === 'user' && <i className="fa-regular fa-circle-user"></i>}
                              {st.iconType === 'check' && <i className="fa-solid fa-check"></i>}
                              {st.iconType === 'heart' && <i className="fa-solid fa-diagram-project"></i>}
                              {st.iconType === 'purple' && <i className="fa-solid fa-robot"></i>}
                              {st.iconType === 'blue' && <i className="fa-brands fa-microsoft"></i>}
                            </div>
                            {!isLast && <div className="leena-step-line"></div>}
                          </div>
                          <div className="leena-step-content-col">
                            <span className="leena-step-label">{st.text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Message Bubble */}
                <div className={`leena-bubble-row ${msg.sender}`}>
                  {msg.sender === 'bot' && (
                    <div className="leena-bot-avatar-badge" title="AutomationEdge AI HR Assistant">
                      <AutomationEdgeLogo size={18} />
                    </div>
                  )}

                  <div className={`leena-bubble ${msg.sender}`}>
                    <div className="leena-bubble-text" style={{ whiteSpace: 'pre-line' }}>
                      {msg.text}
                    </div>

                    {/* Interactive Action Card Embedded in Bot Bubble */}
                    {msg.actionCard && (
                      <div className="leena-action-card-wrapper">
                        {/* A. Document Upload Step (Simulated) */}
                        {msg.actionCard.type === 'document_upload' && (
                          <div className="leena-card leena-upload-card">
                            <div className="leena-card-header">
                              <span className="leena-card-title">
                                <i className="fa-solid fa-folder-open text-orange"></i> Verification Documents Package
                              </span>
                              <span className="leena-badge orange">Pending Upload</span>
                            </div>
                            <div className="leena-doc-list">
                              <div className="leena-doc-item">
                                <i className="fa-solid fa-file-pdf text-rose"></i>
                                <div className="leena-doc-info">
                                  <strong>Aadhaar_Card_{msg.actionCard.data.fullName.replace(/\s+/g, '_')}.pdf</strong>
                                  <span>Government ID / Proof of Identity • 2.4 MB</span>
                                </div>
                                <span className="leena-doc-status ready">Ready</span>
                              </div>
                              <div className="leena-doc-item">
                                <i className="fa-solid fa-file-pdf text-rose"></i>
                                <div className="leena-doc-info">
                                  <strong>Degree_Certificate_{msg.actionCard.data.fullName.replace(/\s+/g, '_')}.pdf</strong>
                                  <span>Educational Qualification Proof • 1.8 MB</span>
                                </div>
                                <span className="leena-doc-status ready">Ready</span>
                              </div>
                              <div className="leena-doc-item">
                                <i className="fa-solid fa-file-pdf text-rose"></i>
                                <div className="leena-doc-info">
                                  <strong>Signed_Offer_Letter_{msg.actionCard.data.fullName.replace(/\s+/g, '_')}.pdf</strong>
                                  <span>Signed Employment Acceptance • 1.2 MB</span>
                                </div>
                                <span className="leena-doc-status ready">Ready</span>
                              </div>
                            </div>
                            <div style={{ marginTop: '0.75rem' }}>
                              <button
                                className="leena-upload-trigger-btn"
                                onClick={() => handleDocumentsUploaded(msg.actionCard.data)}
                              >
                                <i className="fa-solid fa-cloud-arrow-up"></i> Upload & Verify All Documents (Simulated)
                              </button>
                            </div>
                          </div>
                        )}

                        {/* B. Leave Confirmation Card */}
                        {msg.actionCard.type === 'leave_confirm' && (
                          <div className="leena-card leena-leave-card">
                            <div className="leena-card-header">
                              <span className="leena-card-title">
                                <i className="fa-solid fa-calendar-check text-orange"></i> Leave Summary
                              </span>
                              <span className="leena-badge orange">{msg.actionCard.data.type}</span>
                            </div>
                            <div className="leena-card-grid">
                              <div>
                                <span className="leena-muted">Employee:</span>
                                <strong>{msg.actionCard.data.employeeName}</strong>
                              </div>
                              <div>
                                <span className="leena-muted">Duration:</span>
                                <strong>{msg.actionCard.data.days} Day(s)</strong>
                              </div>
                              <div>
                                <span className="leena-muted">Dates:</span>
                                <strong>
                                  {msg.actionCard.data.from} → {msg.actionCard.data.to}
                                </strong>
                              </div>
                              <div>
                                <span className="leena-muted">Supervisor:</span>
                                <span>Amit Deshmukh (VP Engineering)</span>
                              </div>
                            </div>
                            <div className="leena-card-reason">
                              <span className="leena-muted">Reason:</span> {msg.actionCard.data.reason}
                            </div>
                          </div>
                        )}

                        {/* C. Onboarding Candidate Preview Card */}
                        {msg.actionCard.type === 'onboarding_confirm' && (
                          <div className="leena-card leena-onboarding-card">
                            <div className="leena-card-header">
                              <span className="leena-card-title">
                                <i className="fa-solid fa-user-gear text-blue"></i> Candidate Dossier
                              </span>
                              <span className="leena-badge green">Verified Aadhaar / PAN</span>
                            </div>
                            <div className="leena-card-grid">
                              <div>
                                <span className="leena-muted">Full Name:</span>
                                <strong>{msg.actionCard.data.fullName}</strong>
                              </div>
                              <div>
                                <span className="leena-muted">Designation:</span>
                                <strong>{msg.actionCard.data.jobTitle}</strong>
                              </div>
                              <div>
                                <span className="leena-muted">Department:</span>
                                <span>{msg.actionCard.data.department}</span>
                              </div>
                              <div>
                                <span className="leena-muted">Package (CTC):</span>
                                <span className="text-emerald">{msg.actionCard.data.salary}</span>
                              </div>
                              <div>
                                <span className="leena-muted">Hardware Dispatch:</span>
                                <span>{msg.actionCard.data.hardware}</span>
                              </div>
                              <div>
                                <span className="leena-muted">Joining Date:</span>
                                <span>{msg.actionCard.data.startDate}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* D. Resignation Confirmation Card */}
                        {msg.actionCard.type === 'resignation_confirm' && (
                          <div className="leena-card leena-resignation-card">
                            <div className="leena-card-header">
                              <span className="leena-card-title">
                                <i className="fa-solid fa-file-signature text-rose"></i> Resignation Application
                              </span>
                              <span className="leena-badge rose">Notice: 30 Days</span>
                            </div>
                            <div className="leena-card-grid">
                              <div>
                                <span className="leena-muted">Employee:</span>
                                <strong>{msg.actionCard.data.empName}</strong>
                              </div>
                              <div>
                                <span className="leena-muted">Employee ID:</span>
                                <code>{msg.actionCard.data.empId}</code>
                              </div>
                              <div>
                                <span className="leena-muted">Submission Date:</span>
                                <span>{msg.actionCard.data.resignationDate}</span>
                              </div>
                              <div>
                                <span className="leena-muted">Last Working Day:</span>
                                <strong className="text-rose">{msg.actionCard.data.lastWorkingDay}</strong>
                              </div>
                            </div>
                            <div className="leena-card-reason">
                              <span className="leena-muted">Reason:</span> {msg.actionCard.data.reason}
                            </div>
                          </div>
                        )}

                        {/* E. Onboarding Success Card with Direct Deep-Links */}
                        {msg.actionCard.type === 'onboarding_success' && (
                          <div className="leena-card leena-success-card">
                            <div className="leena-card-header">
                              <span className="leena-card-title text-emerald">
                                <i className="fa-solid fa-circle-check"></i> Provisioning Record: {msg.actionCard.data.fullName}
                              </span>
                              <span className="leena-badge green">All 4 Engines Active</span>
                            </div>
                            <div className="leena-chips-row">
                              <span className="leena-deep-chip">
                                <i className="fa-solid fa-ticket text-blue"></i> REQ: {msg.actionCard.data.serviceNowReq}
                              </span>
                              <span className="leena-deep-chip">
                                <i className="fa-solid fa-laptop text-orange"></i> Laptop Ticket: {msg.actionCard.data.laptopTicket}
                              </span>
                              <span className="leena-deep-chip">
                                <i className="fa-solid fa-envelope text-cyan"></i> {msg.actionCard.data.o365Email}
                              </span>
                              <span className="leena-deep-chip">
                                <i className="fa-solid fa-id-badge text-emerald"></i> OrangeHRM {msg.actionCard.data.orangeHrmNum}
                              </span>
                            </div>
                            {msg.actionCard.data.offerDownloadUrl && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <a
                                  href={msg.actionCard.data.offerDownloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="leena-download-btn"
                                >
                                  <i className="fa-solid fa-file-pdf"></i> Download Official Offer Letter ({msg.actionCard.data.fullName})
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* F. Resignation Success Card */}
                        {msg.actionCard.type === 'resignation_success' && (
                          <div className="leena-card leena-success-card">
                            <div className="leena-card-header">
                              <span className="leena-card-title text-emerald">
                                <i className="fa-solid fa-circle-check"></i> Resignation Logged
                              </span>
                              <span className="leena-badge rose">Clearance Waiting IT</span>
                            </div>
                            <div className="leena-chips-row">
                              <span className="leena-deep-chip">
                                <i className="fa-solid fa-ticket text-blue"></i> Exit REQ: {msg.actionCard.data.snReq}
                              </span>
                              <span className="leena-deep-chip">
                                <i className="fa-solid fa-box-archive text-orange"></i> Asset Recovery: {msg.actionCard.data.laptopTicket}
                              </span>
                            </div>
                            {msg.actionCard.data.relievingDownloadUrl && (
                              <div style={{ marginTop: '0.75rem' }}>
                                <a
                                  href={msg.actionCard.data.relievingDownloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="leena-download-btn"
                                >
                                  <i className="fa-solid fa-file-pdf"></i> Download Resignation Acknowledgement
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* G. Payslip Download Card */}
                        {msg.actionCard.type === 'payslip_card' && (
                          <div className="leena-card leena-payslip-card">
                            <div className="leena-card-header">
                              <span className="leena-card-title">
                                <i className="fa-solid fa-file-invoice-dollar text-emerald"></i> Payslip for {msg.actionCard.data.month} {msg.actionCard.data.year}
                              </span>
                              <span className="leena-badge green">{msg.actionCard.data.netPay}</span>
                            </div>
                            <p style={{ margin: '0.4rem 0 0.8rem', fontSize: '0.85rem', color: '#475569' }}>
                              Automated tax withholding (Form 16 / TDS) and Provident Fund (PF) applied.
                            </p>
                            <a
                              href={msg.actionCard.data.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="leena-download-btn"
                            >
                              <i className="fa-solid fa-download"></i> Download Payslip PDF
                            </a>
                          </div>
                        )}

                        {/* H. Manual AE server Trigger Card */}
                        {msg.actionCard.type === 'ad_trigger_manual' && (
                          <div className="leena-card leena-success-card" style={{ border: '1.5px solid #ea580c', background: '#fffaf5' }}>
                            <div className="leena-card-header">
                              <span className="leena-card-title text-orange" style={{ color: '#ea580c' }}>
                                <i className="fa-solid fa-robot"></i> AutomationEdge AE server (Manual Trigger)
                              </span>
                              <span className="leena-badge orange">Staged & Ready</span>
                            </div>
                            <div className="leena-card-grid" style={{ marginTop: '0.4rem', fontSize: '0.82rem' }}>
                              <div>
                                <span className="leena-muted">Target User:</span> <strong>{msg.actionCard.data.candidateName}</strong>
                              </div>
                              <div>
                                <span className="leena-muted">UPN:</span> <code>{msg.actionCard.data.userPrincipal}</code>
                              </div>
                              <div>
                                <span className="leena-muted">Workflow:</span> <span>AD-Create User and Assin Role</span>
                              </div>
                              <div>
                                <span className="leena-muted">Staged Req:</span> <code>#{msg.actionCard.data.t4ReqId}</code>
                              </div>
                            </div>
                            <div style={{ marginTop: '0.85rem' }}>
                              <button
                                className="leena-upload-trigger-btn"
                                style={{ background: '#ea580c', borderColor: '#ea580c', color: '#ffffff' }}
                                onClick={() => handleRunLiveT4(msg.actionCard.data)}
                              >
                                <i className="fa-solid fa-play"></i> Execute on AutomationEdge AE server (Manual Run)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Response Suggestion Pills */}
                    {msg.pills && msg.pills.length > 0 && (
                      <div className="leena-quick-pills">
                        {msg.pills.map((pill, pIdx) => (
                          <button
                            key={pIdx}
                            className="leena-pill-btn"
                            onClick={() => handleSend(pill)}
                          >
                            {pill}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="leena-user-avatar-badge">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80"
                        alt="User"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <span className="leena-avatar-fallback">{currentUser?.name?.charAt(0) || 'J'}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live Typing / Thinking Indicator */}
            {isProcessing && (
              <div className="leena-message-group bot">
                <div className="leena-bubble-row bot">
                  <div className="leena-bot-avatar-badge" title="AutomationEdge AI HR Assistant">
                    <AutomationEdgeLogo size={18} />
                  </div>
                  <div className="leena-bubble bot leena-typing-bubble">
                    <span className="leena-dot"></span>
                    <span className="leena-dot"></span>
                    <span className="leena-dot"></span>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.82rem', color: '#64748b' }}>
                      Your request is being processed...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Floating Pill Input Bar */}
          <div className="leena-bottom-bar-container">
            {/* Quick Action Chips above input bar */}
            <div className="leena-predefined-chips">
              {selectedCatalog === 'onboarding' && (
                <>
                  <button className="leena-chip" onClick={() => handleSend('Onboard')}>
                    🚀 Onboard
                  </button>
                  <button className="leena-chip" onClick={() => handleSend('AD create user')}>
                    ⚡ AD create user
                  </button>
                  <button className="leena-chip" onClick={() => handleSend('Onboard')}>
                    📄 Verify Documents
                  </button>
                  <button className="leena-chip" onClick={() => handleSend('Check live onboarding status')}>
                    🔍 Track Status
                  </button>
                </>
              )}
              {selectedCatalog === 'leave' && (
                <>
                  <button className="leena-chip" onClick={() => handleSend('I want to apply for 2 days casual leave')}>
                    🌴 Apply for Leave
                  </button>
                  <button className="leena-chip" onClick={() => handleSend('Check my available leave balance')}>
                    🔍 Check Leave Balance
                  </button>
                  <button className="leena-chip" onClick={() => handleSend('Apply for 1 day sick leave from tomorrow')}>
                    🤒 Sick Leave (1 Day)
                  </button>
                </>
              )}
              {selectedCatalog === 'services' && (
                <>
                  <button className="leena-chip" onClick={() => handleSend('Download my latest payslip')}>
                    📄 Download Payslip
                  </button>
                  <button className="leena-chip" onClick={() => handleSend('Request laptop hardware replacement')}>
                    💻 Hardware Replacement
                  </button>
                  <button className="leena-chip" onClick={() => handleSend('Check live onboarding status')}>
                    🔍 Track Requests
                  </button>
                </>
              )}
              {selectedCatalog === 'offboarding' && (
                <>
                  <button className="leena-chip" onClick={() => handleSend('I want to submit my resignation')}>
                    📝 Submit Resignation
                  </button>
                  <button className="leena-chip" onClick={() => handleSend('Check live onboarding status')}>
                    🔍 Track Clearance
                  </button>
                </>
              )}

            </div>

            {/* Attached file chip indicator */}
            {attachedDoc && (
              <div className="leena-attached-chip">
                <i className="fa-solid fa-paperclip"></i>
                <span>{attachedDoc.name}</span>
                <button onClick={() => setAttachedDoc(null)} title="Remove attachment">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}

            <form
              className="leena-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <div className="leena-floating-pill">
                <input
                  type="text"
                  className="leena-input-field"
                  placeholder="Message"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  disabled={isProcessing}
                />

                {/* Attachment Paperclip Button */}
                <button
                  type="button"
                  className="leena-pill-icon-btn"
                  title="Attach sample document / proof"
                  onClick={handleAttachClick}
                >
                  <i className="fa-solid fa-paperclip"></i>
                </button>

                {/* Voice Button */}
                <button
                  type="button"
                  className={`leena-voice-pill ${isVoiceListening ? 'listening' : ''}`}
                  onClick={handleVoiceToggle}
                  title={isVoiceListening ? 'Stop listening' : 'Speak query via Voice'}
                >
                  <i className="fa-solid fa-microphone-lines"></i>
                  <span>Voice</span>
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  className="leena-send-btn"
                  disabled={!inputVal.trim() && !attachedDoc}
                  title="Send message"
                >
                  <i className="fa-solid fa-arrow-up"></i>
                </button>
              </div>
            </form>
          </div>
        </section>


      </div>
    </div>
  );
}
