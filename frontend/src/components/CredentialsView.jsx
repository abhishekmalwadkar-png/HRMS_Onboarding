import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, staggerContainer, staggerItem } from './ui';
import { openT4Direct } from '../utils/t4Auth';

export default function CredentialsView() {
  const { showToast } = useToast();
  const [snConfig, setSnConfig] = useState(null);
  const [t4Config, setT4Config] = useState(null);

  const fetchConfig = () => {
    fetch('/api/servicenow/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.username) {
          setSnConfig(data);
        }
      })
      .catch(() => {});

    fetch('/api/rpa/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.username) {
          setT4Config(data);
        }
      })
      .catch(() => {});
  };

  React.useEffect(() => {
    fetchConfig();
  }, []);

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

  const handleLaunch = (sys, e) => {
    if (sys.id === 'servicenow') {
      e.preventDefault();
      const instanceUrl = (snConfig?.instanceUrl || sys.credentials.find((c) => c.key === 'sn_inst')?.value || 'https://ven04528.service-now.com').replace(/\/$/, '');
      const username = snConfig?.username || sys.credentials.find((c) => c.key === 'sn_user')?.value || 'AE_Dev_Vaibhav_Tore';
      const password = snConfig?.password || sys.passToCopy;
      const sysAction = snConfig?.sysAction || 'sysverb_login';
      const loginUrl = snConfig?.loginUrl || '/nav_to.do?uri=sc_request_list.do';

      // Direct silent form POST to ServiceNow /login.do dynamically using .env configuration
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${instanceUrl}/login.do`;
      form.target = '_blank';
      form.style.display = 'none';

      const fields = {
        user_name: username,
        user_password: password,
        sys_action: sysAction,
        sysparm_login_url: loginUrl,
      };

      Object.entries(fields).forEach(([key, val]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = val;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      showToast(`⚡ Logging directly into ServiceNow Requests tab...`, 'success');
      return;
    }

    if (sys.id === 't4') {
      e.preventDefault();
      openT4Direct(sys.targetUrl, showToast);
      return;
    }

    safeCopyText(sys.passToCopy);
    showToast(sys.toastMsg, 'success');
  };

  const systems = [
    {
      id: 't4',
      name: 'AutomationEdge AE server',
      icon: 'fa-solid fa-robot',
      badge: 'RPA Engine',
      tone: '#ea580c',
      bgLight: 'rgba(234, 88, 12, 0.08)',
      borderColor: 'rgba(234, 88, 12, 0.25)',
      description: 'Cloud automation server for Active Directory user provisioning & email notifications.',
      targetUrl: t4Config?.targetUrl || 'https://t4.automationedge.com/#/requests/list',
      passToCopy: t4Config?.password || 'Msp@12345',
      launchLabel: 'Launch & Login to AE server',
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
      targetUrl: snConfig?.instanceUrl ? `${snConfig.instanceUrl}${snConfig.loginUrl || '/nav_to.do?uri=sc_request_list.do'}` : 'https://ven04528.service-now.com/nav_to.do?uri=sc_request_list.do',
      credentials: [
        { key: 'sn_inst', label: 'Instance URL', value: snConfig?.instanceUrl || 'https://ven04528.service-now.com', isSecret: false },
        { key: 'sn_user', label: 'Username', value: snConfig?.username || 'AE_Dev_Vaibhav_Tore', isSecret: false },
        { key: 'sn_pass', label: 'Password', value: snConfig?.password || 'Pune@123', isSecret: true },
        { key: 'sn_action', label: 'sys_action', value: snConfig?.sysAction || 'sysverb_login', isSecret: false },
        { key: 'sn_login_url', label: 'sysparm_login_url', value: snConfig?.loginUrl || '/nav_to.do?uri=sc_request_list.do', isSecret: false },
      ],
      passToCopy: snConfig?.password || 'Pune@123',
      toastMsg: `⚡ Logging directly into ServiceNow Requests as ${snConfig?.username || 'AE_Dev_Vaibhav_Tore'}...`,
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
              fetchConfig();
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

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                {sys.description}
              </p>
            </div>

            {/* Launch Action Button (Native <a> tag to guarantee opening without browser popup blocker) */}
            <a
              href={sys.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleLaunch(sys, e)}
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
