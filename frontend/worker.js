export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API and dynamic document endpoints to the Python backend
    if (
      url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/generated_offers/') ||
      url.pathname.startsWith('/generated_payslips/') ||
      url.pathname.startsWith('/generated_resignation_letters/') ||
      url.pathname.startsWith('/generated_relieving_letters/')
    ) {
      const backendOrigin = env.BACKEND_URL || 'https://flood-greene-alone-offered.trycloudflare.com';
      const targetUrl = new URL(url.pathname + url.search, backendOrigin);

      // Preflight CORS handler
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          },
        });
      }

      const proxyReq = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      try {
        const res = await fetch(proxyReq);
        const headers = new Headers(res.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: headers,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: 'Backend unreachable',
            details: err.message,
            hint: 'Ensure Python server.py and Cloudflare Tunnel are running.',
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: serve frontend SPA static assets (index.html, JS, CSS, fonts)
    return env.ASSETS.fetch(request);
  },
};
