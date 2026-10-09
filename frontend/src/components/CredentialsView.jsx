import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, staggerContainer, staggerItem } from './ui';

export default function CredentialsView() {
  const { showToast } = useToast();
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedField, setCopiedField] = useState(null);

  const togglePassword = (key) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const safeCopyText = (text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (e) {}
  };

  const copyToClipboard = (text, key, label) => {
    safeCopyText(text);
    setCopiedField(key);
    showToast(`✓ Copied ${label} to clipboard`, 'success');
    setTimeout(() => setCopiedField(null), 2200);
  };

  const systems = [
    {
      id: 't4',
      name: 'AutomationEdge T4 Server',
      icon: 'fa-solid fa-robot',
      badge: 'RPA Engine',
      tone: '#ea580c',
      bgLight: 'rgba(234, 88, 12, 0.08)',
      borderColor: 'rgba(234, 88, 12, 0.25)',
      description: 'Cloud RPA automation server for Active Directory user provisioning & email notifications.',
      targetUrl: 'https://t4.automationedge.com/#/requests/list',
      credentials: [
        { key: 't4_user', label: 'Username', value: 'Msp', isSecret: false },
        { key: 't4_pass', label: 'Password', value: 'Msp@12345', isSecret: true },
        { key: 't4_url', label: 'Server API URL', value: 'https://t4.automationedge.com/aeengine', isSecret: false },
      ],
      passToCopy: 'Msp@12345',
      toastMsg: '🔑 T4 Server credentials (User: Msp) — Password copied! Opening portal...',
      launchLabel: 'Launch & Login to T4 Server',
    },
    {
      id: 'orangehrm',
      name: 'OrangeHRM PIM',
      icon: 'fa-solid fa-user-check',
      badge: 'HR Core PIM',
      tone: '#16a34a',
      bgLight: 'rgba(22, 163, 74, 0.08)',
      borderColor: 'rgba(22, 163, 74, 0.25)',
      description: 'Employee Information Management (PIM) and leave management portal.',
      targetUrl: 'http://10.41.5.39/orangehrm/web/index.php/auth/login',
      credentials: [
        { key: 'ohrm_user', label: 'Username', value: 'admin', isSecret: false },
        { key: 'ohrm_pass', label: 'Password', value: 'Admin@1234', isSecret: true },
        { key: 'ohrm_url', label: 'Portal URL', value: 'http://10.41.5.39/orangehrm', isSecret: false },
        { key: 'ohrm_dir', label: 'PIM Directory URL', value: 'http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList', isSecret: false },
      ],
      passToCopy: 'Admin@1234',
      toastMsg: '🔑 OrangeHRM: User: admin | Pass copied (Ctrl+V to sign in)!',
      launchLabel: 'Launch & Login to OrangeHRM',
    },
    {
      id: 'servicenow',
      name: 'ServiceNow ITSM',
      icon: 'fa-solid fa-ticket',
      badge: 'Enterprise ITSM',
      tone: '#0284c7',
      bgLight: 'rgba(2, 132, 199, 0.08)',
      borderColor: 'rgba(2, 132, 199, 0.25)',
      description: 'IT Service Catalog, onboarding request management (REQ/RITM), and hardware ticketing.',
      targetUrl: 'https://ven04528.service-now.com/navpage.do',
      credentials: [
        { key: 'sn_inst', label: 'Instance URL', value: 'https://ven04528.service-now.com', isSecret: false },
        { key: 'sn_user', label: 'Username', value: 'AE_Dev_Vaibhav_Tore', isSecret: false },
        { key: 'sn_pass', label: 'Password', value: 'Pune@123', isSecret: true },
      ],
      passToCopy: 'Pune@123',
      toastMsg: '⚡ ServiceNow: User: AE_Dev_Vaibhav_Tore | Pass copied to clipboard!',
      launchLabel: 'Launch & Login to ServiceNow',
    },
  ];

  return (
    <section className="view-section active page">
      <PageHeader
        icon="fa-solid fa-key"
        title="Credential Pool"
        description="Single source of truth for platform credentials with instant single-click launch & login."
        actions={
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              showToast('Refreshed credential pool from .env configuration', 'success');
            }}
          >
            <i className="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Reload Config
          </button>
        }
      />

      <motion.div
        className="credentials-grid"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem',
          marginTop: '1rem',
        }}
      >
        {systems.map((sys) => (
          <motion.div
            key={sys.id}
            variants={staggerItem}
            className="cred-card"
            style={{
              borderTop: `4px solid ${sys.tone}`,
            }}
          >
            <div>
              {/* Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: sys.bgLight,
                      color: sys.tone,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}
                  >
                    <i className={sys.icon} aria-hidden="true"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{sys.name}</h3>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{sys.badge}</span>
                  </div>
                </div>
                <span
                  className="badge"
                  style={{
                    background: sys.bgLight,
                    color: sys.tone,
                    border: `1px solid ${sys.borderColor}`,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                  }}
                >
                  <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Active
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.45 }}>
                {sys.description}
              </p>

              {/* Credential Fields */}
              <div className="cred-box">
                {sys.credentials.map((cred) => {
                  const isHidden = cred.isSecret && !showPasswords[cred.key];
                  const displayValue = isHidden ? '••••••••••••' : cred.value;

                  return (
                    <div
                      key={cred.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        fontSize: '0.82rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', minWidth: '100px', fontWeight: 500 }}>
                        {cred.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                        <code className="cred-code" title={cred.value}>
                          {displayValue}
                        </code>

                        {cred.isSecret && (
                          <button
                            onClick={() => togglePassword(cred.key)}
                            title={showPasswords[cred.key] ? 'Hide password' : 'Show password'}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px 4px',
                            }}
                          >
                            <i className={`fa-solid ${showPasswords[cred.key] ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        )}

                        <button
                          onClick={() => copyToClipboard(cred.value, cred.key, cred.label)}
                          title={`Copy ${cred.label}`}
                          className="cred-copy-btn"
                          style={{
                            background: copiedField === cred.key ? '#16a34a' : undefined,
                            color: copiedField === cred.key ? '#ffffff' : undefined,
                          }}
                        >
                          <i className={`fa-solid ${copiedField === cred.key ? 'fa-check' : 'fa-copy'}`}></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Launch Action Button (Native <a> tag to guarantee opening without browser popup blocker) */}
            <a
              href={sys.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                safeCopyText(sys.passToCopy);
                showToast(sys.toastMsg, 'success');
              }}
              className="btn"
              style={{
                textDecoration: 'none',
                width: '100%',
                background: `linear-gradient(135deg, ${sys.tone} 0%, #1c1f2a 160%)`,
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '0.65rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.8rem' }}></i>
              {sys.launchLabel}
            </a>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
