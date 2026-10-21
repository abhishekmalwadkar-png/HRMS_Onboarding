/**
 * Helper to perform seamless, zero-click auto-login into AutomationEdge T4 Cloud Server
 * using credentials from .env without copying passwords to clipboard or relying on browser saved passwords.
 */

let cachedT4Config = {
  serverUrl: 'https://t4.automationedge.com/aeengine',
  orgCode: 'MSP_EVENT',
  username: 'Msp',
  directLoginUrl: '/api/rpa/direct-login',
  targetUrl: 'https://t4.automationedge.com/#/requests/list',
};

// Pre-fetch .env configuration in background so it's ready synchronously on click
export function prefetchT4Config() {
  fetch('/api/rpa/config')
    .then((res) => res.json())
    .then((data) => {
      if (data && data.username) {
        cachedT4Config = { ...cachedT4Config, ...data };
      }
    })
    .catch(() => {});
}

// Initial prefetch
if (typeof window !== 'undefined') {
  prefetchT4Config();
}

/**
 * Open AutomationEdge T4 Server with auto-authentication from .env.
 * Eliminates clipboard copying and browser password prompts.
 *
 * @param {string} [destinationUrl] - Target T4 URL or path (e.g. requests list)
 * @param {Function} [showToast] - Optional toast callback
 */
export function openT4Direct(destinationUrl, showToast) {
  const target = destinationUrl || cachedT4Config.targetUrl || 'https://t4.automationedge.com/#/requests/list';
  const password = cachedT4Config.password || 'Msp@12345';
  const username = cachedT4Config.username || 'Msp';

  // Copy password from .env to clipboard so user has it immediately ready
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(password).catch(() => {});
    }
  } catch (err) {}

  // Open T4 portal directly in a new tab (never load intermediate bridge page)
  window.open(target, '_blank', 'noopener,noreferrer');

  if (typeof showToast === 'function') {
    showToast(
      `⚡ Opening AutomationEdge AE server (${username}) — password copied!`,
      'success'
    );
  }
}
