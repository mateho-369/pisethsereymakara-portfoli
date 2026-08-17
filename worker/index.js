// Worker នេះបម្រើ SPA static files ដូចធម្មតា ប៉ុន្តែសម្រាប់ path /api, /sanctum, /up
// វា proxy ទៅ Laravel backend ដោយផ្ទាល់ពី Worker ខ្លួនឯង (server-to-server, មិនមែន browser ហៅ backend ដោយផ្ទាល់ទេ)។
//
// ហេតុអ្វី: មុននេះ browser ហៅ backend cross-origin (pisethsereymakara-api.matehopage.workers.dev)
// ពី frontend origin ខុសគ្នា (pisethsereymakara-portfoli.matehopage.workers.dev) — Laravel Sanctum
// SPA-cookie CSRF protection តម្រូវឱ្យ frontend JS អាន cookie XSRF-TOKEN តាម document.cookie,
// ប៉ុន្តែ cookie ដែល backend set នៅលើ host មួយ មិនអាចអានបានពី page ដែល load ពី host ដទៃទេ
// (ទោះបីជា cookie នោះត្រូវបានផ្ញើត្រឡប់ត្រឹមត្រូវជាមួយ request ក៏ដោយ) — នេះជាមូលហេតុពិតនៃ
// "419 CSRF token mismatch": header X-XSRF-TOKEN មិនដែលមាន value ដើម្បីភ្ជាប់ទាល់តែសោះ។
//
// ការ proxy តាម Worker ធ្វើឱ្យ browser ឃើញតែ origin តែមួយ (pisethsereymakara-portfoli...) —
// cookie ក្លាយជា host-only លើ origin នោះផ្ទាល់ ដូច្នេះ document.cookie អានឃើញធម្មតា គ្មាន
// SameSite=None ចាំបាច់ គ្មាន CORS ចាំបាច់ទៀត។

const PROXY_PREFIXES = ['/api', '/sanctum', '/up'];

function shouldProxy(pathname) {
  return PROXY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!shouldProxy(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const backendTarget = env.API_PROXY_TARGET || 'http://pisethsereymakara.duckdns.org:8080';
    const backendUrl = new URL(url.pathname + url.search, backendTarget);

    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set('Host', backendUrl.host);
    forwardHeaders.set('X-Forwarded-Host', url.host);
    forwardHeaders.set('X-Forwarded-Proto', 'https');

    let backendResponse;
    try {
      backendResponse = await fetch(backendUrl.toString(), {
        method: request.method,
        headers: forwardHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual', // ទុកឱ្យ browser ខ្លួនឯង follow redirect (សំខាន់សម្រាប់ Google OAuth flow)
      });
    } catch {
      return new Response(JSON.stringify({ error: 'The API server is unreachable right now.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers = new Headers();
    for (const [key, value] of backendResponse.headers) {
      if (key.toLowerCase() !== 'set-cookie') headers.append(key, value);
    }
    // ដកចោល Domain attribute ណាមួយពី Laravel (SESSION_DOMAIN) — បើ Domain មិនត្រូវនឹង
    // host នេះខ្លួនឯង browser នឹងបោះបង់ cookie ដោយស្ងាត់ស្ងៀម។ ការដកចោលធានាថា cookie
    // ក្លាយជា host-only លើ origin ដែល browser កំពុងមើលឃើញ (frontend origin ខ្លួនឯង)។
    for (let cookie of backendResponse.headers.getAll('set-cookie')) {
      cookie = cookie.replace(/;\s*domain=[^;]+/i, '');
      headers.append('Set-Cookie', cookie);
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers,
    });
  },
};