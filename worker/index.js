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

// The major link-preview crawlers, matched by user agent. These are the only
// requests that get the extra API round trip; everyone else gets the plain
// SPA shell with no added latency.
const CRAWLER_UA = /facebookexternalhit|facebookcataloguetraffic|twitterbot|slackbot|linkedinbot|discordbot|whatsapp|telegrambot|pinterest|quorabot|quoralinkpreview|embedly|showybot|vkshare|odnoklassniki/i;

const CRAWLER_FETCH_TIMEOUT_MS = 5000;

function shouldProxy(pathname) {
  return PROXY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (shouldProxy(url.pathname)) {
      return proxyToBackend(request, url, env);
    }

    // Preview crawlers read raw HTML and never run JavaScript, so /ask/{slug}
    // must ship its Open Graph tags server-side. Real visitors keep the plain
    // shell — no extra round trip for them.
    if (request.method === 'GET' && CRAWLER_UA.test(request.headers.get('user-agent') || '')) {
      const match = url.pathname.match(/^\/ask\/([^/]+)\/?$/);

      if (match) {
        const shell = await env.ASSETS.fetch(request);
        const injected = await injectCampaignOgTags(shell, decodeURIComponent(match[1]), url, env);

        return injected ?? shell;
      }

      if (url.pathname === '/support' || url.pathname === '/support/') {
        const shell = await env.ASSETS.fetch(request);
        const injected = await injectSupportOgTags(shell, url);

        return injected ?? shell;
      }
    }

    return env.ASSETS.fetch(request);
  },
};

async function injectSupportOgTags(shell, url) {
  if (shell.status !== 200) return null;

  let html;
  try {
    html = await shell.text();
  } catch {
    return null;
  }

  if (!html.includes('</head>')) return null;

  html = html.replace(/<meta\b[^>]*(?:property="og:|name="twitter:)[^>]*>/gi, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>Support this work \u2014 Field Notes</title>');

  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Field Notes" />`,
    `<meta property="og:title" content="Support this work" />`,
    `<meta property="og:description" content="If this space has brought you peace or inspiration, here are ways to support it." />`,
    `<meta property="og:url" content="${escapeHtml(url.href)}" />`,
    `<meta property="og:image" content="${escapeHtml(`${url.origin}/api/support/og-image.png`)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');

  html = html.replace('</head>', `    ${tags}\n  </head>`);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Take the plain SPA shell a crawler fetched for /ask/{slug} and splice real
 * og:/twitter: tags (plus the campaign title) into its <head>. Returns null
 * when nothing could be injected — the shell then goes out unchanged.
 */
async function injectCampaignOgTags(shell, slug, url, env) {
  if (shell.status !== 200) return null;

  let campaign;
  try {
    campaign = await withTimeout(fetchCampaignFromApi(env, slug), CRAWLER_FETCH_TIMEOUT_MS);
  } catch {
    return null;
  }

  if (!campaign || typeof campaign.slug !== 'string' || typeof campaign.title !== 'string') return null;

  let html;
  try {
    html = await shell.text();
  } catch {
    return null;
  }

  if (!html.includes('</head>')) return null;

  // Replace, never duplicate: drop the site-level tags from index.html first.
  html = html.replace(/<meta\b[^>]*(?:property="og:|name="twitter:)[^>]*>/gi, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(campaign.title)} — Field Notes</title>`);

  const description = campaign.prompt
    ? campaign.prompt
    : `A ${campaign.type === 'poll' ? 'quick vote' : campaign.type === 'question' ? 'question' : 'photo request'} shared on Field Notes.`;

  const tags = [
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="Field Notes" />`,
    `<meta property="og:title" content="${escapeHtml(campaign.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url.href)}" />`,
    `<meta property="og:image" content="${escapeHtml(`${url.origin}/api/campaigns/${encodeURIComponent(campaign.slug)}/og-image.png`)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');

  html = html.replace('</head>', `    ${tags}\n  </head>`);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Tags are re-fetched per request; don't let a cached copy outlive the
      // campaign's own copy.
      'Cache-Control': 'no-cache',
    },
  });
}

/** The same public endpoint the SPA uses, hit server-to-server. */
async function fetchCampaignFromApi(env, slug) {
  const target = (env.API_PROXY_TARGET || 'http://pisethsereymakara.duckdns.org:8080').replace(/\/$/, '');

  const response = await fetch(`${target}/api/campaigns/${encodeURIComponent(slug)}`, {
    method: 'GET',
    headers: { Accept: 'application/json', 'User-Agent': 'fieldnotes-og/1.0' },
  });

  if (!response.ok) return null;

  return response.json().catch(() => null);
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('og fetch timed out')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function proxyToBackend(request, url, env) {
  const backendTarget = env.API_PROXY_TARGET || 'http://pisethsereymakara.duckdns.org:8080';
  const backendUrl = new URL(url.pathname + url.search, backendTarget);

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set('Host', backendUrl.host);
  forwardHeaders.set('X-Forwarded-Host', url.host);
  forwardHeaders.set('X-Forwarded-Proto', 'https');
  // Laravel keys its rate limiters on the visitor's address. Without this the
  // backend only ever sees the Worker's egress IP and every visitor shares a
  // single bucket. `request.cf` is set by Cloudflare and cannot be spoofed by
  // the client; the backend only trusts it from a configured TRUSTED_PROXIES.
  const clientIp = request.headers.get('CF-Connecting-IP');
  if (clientIp) {
    forwardHeaders.set('CF-Connecting-IP', clientIp);
    forwardHeaders.set('X-Forwarded-For', clientIp);
  }

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
}