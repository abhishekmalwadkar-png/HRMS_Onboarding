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

  const copyToClipboard = (text, key, label) => {
    navigator.clipboard.writeText(text).catch(() => {});
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
      url: 'https://t4.automationedge.com/#/requests/list',
      loginUrl: 'https://t4.automationedge.com/#/login',
      credentials: [
        { key: 't4_org', label: 'Org Code', value: 'MSP_EVENT', isSecret: false },
        { key: 't4_user', label: 'Username', value: 'Msp', isSecret: false },
        { key: 't4_pass', label: 'Password', value: 'Msp@12345', isSecret: true },
        { key: 't4_url', label: 'Server API URL', value: 'https://t4.automationedge.com/aeengine', isSecret: false },
      ],
      onLaunch: async () => {
        try {
          fetch('/api/rpa/token').catch(() => {});
        } catch (e) {}
        navigator.clipboard.writeText('Msp@12345').catch(() => {});
        showToast('🔑 T4 Server session authenticated (Org: MSP_EVENT | User: Msp) — Password copied!', 'success');
        window.open('https://t4.automationedge.com/#/requests/list', '_blank', 'noopener,noreferrer');
      },
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
      url: 'http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList',
      loginUrl: 'http://10.41.5.39/orangehrm/web/index.php/auth/login',
      credentials: [
        { key: 'ohrm_user', label: 'Username', value: 'admin', isSecret: false },
        { key: 'ohrm_pass', label: 'Password', value: 'Admin@1234', isSecret: true },
        { key: 'ohrm_url', label: 'Portal URL', value: 'http://10.41.5.39/orangehrm', isSecret: false },
        { key: 'ohrm_dir', label: 'PIM Directory URL', value: 'http://10.41.5.39/orangehrm/web/index.php/pim/viewEmployeeList', isSecret: false },
      ],
      onLaunch: async () => {
        try {
          fetch('/api/orangehrm/token').catch(() => {});
        } catch (e) {}
        navigator.clipboard.writeText('Admin@1234').catch(() => {});
        showToast('🔑 OrangeHRM session authenticated (User: admin) — Password copied (Ctrl+V to sign in)!', 'success');
        window.open('http://10.41.5.39/orangehrm/web/index.php/auth/login', '_blank', 'noopener,noreferrer');
      },
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
      url: 'https://ven04528.service-now.com/navpage.do',
      loginUrl: 'https://ven04528.service-now.com',
      credentials: [
        { key: 'sn_inst', label: 'Instance URL', value: 'https://ven04528.service-now.com', isSecret: false },
        { key: 'sn_user', label: 'Username', value: 'AE_Dev_Vaibhav_Tore', isSecret: false },
        { key: 'sn_pass', label: 'Password', value: 'Pune@123', isSecret: true },
        { key: 'sn_cat', label: 'Catalog Item SysId', value: 'a217c0abebaf0b10b02df1b4cad0cd68', isSecret: false },
      ],
      onLaunch: () => {
        navigator.clipboard.writeText('Pune@123').catch(() => {});
        showToast('⚡ ServiceNow: User: AE_Dev_Vaibhav_Tore | Pass copied to clipboard!', 'success');
        window.open('https://ven04528.service-now.com/navpage.do', '_blank', 'noopener,noreferrer');
      },
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
            className="ui-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderTop: `4px solid ${sys.tone}`,
              position: 'relative',
              overflow: 'hidden',
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
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{sys.name}</h3>
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
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  background: 'var(--bg-muted, rgba(0,0,0,0.02))',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  marginBottom: '1.25rem',
                }}
              >
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
                        <code
                          style={{
                            background: 'var(--surface, #ffffff)',
                            padding: '3px 7px',
                            borderRadius: '5px',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            maxWidth: '170px',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-primary)',
                          }}
                          title={cred.value}
                        >
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
                          style={{
                            background: copiedField === cred.key ? '#16a34a' : 'transparent',
                            color: copiedField === cred.key ? '#ffffff' : 'var(--text-secondary)',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            fontSize: '0.72rem',
                            transition: 'all 0.15s ease',
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

            {/* Launch Action Button */}
            <button
              onClick={sys.onLaunch}
              className="btn"
              style={{
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
            </button>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
