/**
 * Helper to perform seamless, zero-click auto-login into ServiceNow
 * and deep-link directly to any REQ, RITM, or ServiceNow page within
 * ServiceNow Next Experience (Polaris) unified navigation.
 */

let cachedConfig = {
  instanceUrl: 'https://ven04528.service-now.com',
  username: 'AE_Dev_Vaibhav_Tore',
  password: 'Pune@123',
  sysAction: 'sysverb_login',
  loginUrl: '/now/nav/ui/classic/params/target/sc_request_list.do',
};

// Pre-fetch .env configuration in background so it's ready synchronously on click
export function prefetchServiceNowConfig() {
  fetch('/api/servicenow/config')
    .then((res) => res.json())
    .then((data) => {
      if (data && data.username) {
        cachedConfig = data;
      }
    })
    .catch(() => {});
}

// Initial prefetch
if (typeof window !== 'undefined') {
  prefetchServiceNowConfig();
}

/**
 * Converts any legacy ServiceNow URL (e.g. /nav_to.do?uri=..., navpage.do, or table.do)
 * into the Next Experience (Polaris) unified URL format:
 *   /now/nav/ui/classic/params/target/<encoded_target>
 *
 * This ensures that even after a logout or in a fresh session,
 * ServiceNow Next Experience routes directly to the requested record/tab
 * instead of falling back to the default dashboard ($pa_dashboard.do).
 */
export function formatNextExperienceUrl(url) {
  if (!url) return '/now/nav/ui/classic/params/target/sc_request_list.do';

  let clean = url;
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const u = new URL(clean);
      clean = u.pathname + u.search + u.hash;
    } catch (e) {}
  }

  // If already in Next Experience classic params format, ensure leading slash
  if (clean.includes('/now/nav/ui/classic/params/target/')) {
    return clean.startsWith('/') ? clean : '/' + clean;
  }

  // Extract from legacy nav_to.do?uri=
  let target = clean;
  if (target.includes('uri=')) {
    const parts = target.split('uri=');
    target = decodeURIComponent(parts[1] || '');
  }

  target = target.replace(/^\//, '');

  if (!target || target === 'navpage.do' || target.includes('$pa_dashboard.do')) {
    target = 'sc_request_list.do';
  }

  // Encode query parameters so Next Experience router interprets them properly
  const qIndex = target.indexOf('?');
  let finalEncodedTarget = target;
  if (qIndex !== -1) {
    const page = target.slice(0, qIndex);
    const queryString = target.slice(qIndex + 1);
    finalEncodedTarget = `${page}%3F${encodeURIComponent(queryString)}`;
  }

  return `/now/nav/ui/classic/params/target/${finalEncodedTarget}`;
}

/**
 * Open a specific ServiceNow URL directly with automatic authentication.
 * Never prompts for credentials and avoids popup blockers by submitting synchronously.
 *
 * @param {string} destinationUrl - Target REQ URL or path
 * @param {Function} [showToast] - Optional toast callback
 */
export function openServiceNowDirect(destinationUrl, showToast) {
  const instanceUrl = (cachedConfig.instanceUrl || 'https://ven04528.service-now.com').replace(/\/$/, '');

  // Format into Next Experience deep-link target
  const relativeTarget = formatNextExperienceUrl(destinationUrl || cachedConfig.loginUrl);

  // Create and submit hidden form to ServiceNow login.do targeting a new tab
  const form = document.createElement('form');
  form.method = 'POST';
  // Include sysparm_goto_url in the action URL as well to ensure post-login routing honors the target
  form.action = `${instanceUrl}/login.do?sysparm_goto_url=${encodeURIComponent(relativeTarget)}`;
  form.target = '_blank';
  form.style.display = 'none';

  const fields = {
    user_name: cachedConfig.username || 'AE_Dev_Vaibhav_Tore',
    user_password: cachedConfig.password || 'Pune@123',
    sys_action: cachedConfig.sysAction || 'sysverb_login',
    sysparm_goto_url: relativeTarget,
    sysparm_login_url: relativeTarget,
    sysparm_target: relativeTarget,
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

  if (typeof showToast === 'function') {
    showToast('⚡ Logging in and opening ServiceNow request...', 'success');
  }
}
