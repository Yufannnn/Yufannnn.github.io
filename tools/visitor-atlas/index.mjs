/* Store country/day page-view totals only. No cookies or visitor identifiers. */
const PAGES = new Set(['/', '/index.html', '/resume.html']);
const BOTS = /bot|crawler|spider|preview|prerender|headless|slack|discord|telegram|lighthouse|python|curl\/|wget/i;
function json(data, status = 200, origin = '*') {
  return new Response(data === null ? null : JSON.stringify(data), {status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
  }});
}
async function page(request) {
  const reader = request.body?.getReader();
  if (!reader) throw Error('No body');
  let length = 0, text = '';
  const decoder = new TextDecoder();
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 512) { await reader.cancel(); throw Error('Body too large'); }
    text += decoder.decode(value, {stream: true});
  }
  text += decoder.decode();
  const path = JSON.parse(text)?.path;
  if (!PAGES.has(path)) throw Error('Unknown page');
  return path === '/index.html' ? '/' : path;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || 'https://yufannnn.github.io';
    if (request.method === 'OPTIONS') return json(null, request.headers.get('Origin') === origin ? 204 : 403, origin);
    if (url.pathname === '/health' && request.method === 'GET') return json({ok: true, service: 'yufan-portfolio-visitors'});
    if (!env.DB) return json({error: 'Analytics unavailable'}, 503);
    try {
      if (url.pathname === '/visit' && request.method === 'POST') {
        if (request.headers.get('Origin') !== origin) return json({error: 'Origin not permitted'}, 403, origin);
        if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1' || BOTS.test(request.headers.get('User-Agent') || '')) return json({counted: false}, 200, origin);
        let path;
        try { path = await page(request); } catch { return json({error: 'Invalid page or body'}, 400, origin); }
        const country = /^[A-Z]{2}$/.test(request.cf?.country || '') ? request.cf.country : 'ZZ';
        const day = new Date().toISOString().slice(0, 10);
        await env.DB.prepare(`INSERT INTO daily_page_views (day, path, country, views) VALUES (?, ?, ?, 1)
          ON CONFLICT(day, path, country) DO UPDATE SET views = views + 1`).bind(day, path, country).run();
        return json({counted: true}, 201, origin);
      }
      if (url.pathname === '/stats' && request.method === 'GET') {
        const {results = []} = await env.DB.prepare('SELECT country, SUM(views) AS views FROM daily_page_views GROUP BY country').all();
        const countries = results.filter(row => /^[A-Z]{2}$/.test(row.country) && !['ZZ', 'XX'].includes(row.country));
        return json({status: 'ok', generatedAt: new Date().toISOString(), collectedSince: env.COLLECTED_SINCE,
          pageViews: results.reduce((sum, row) => sum + Number(row.views), 0), countries: countries.length,
          countryVisits: countries.map(row => ({code: row.country, name: row.country, visits: Number(row.views)})).sort((a, b) => b.visits - a.visits)});
      }
      return json({error: 'Not found'}, 404);
    } catch { return json({error: 'Analytics temporarily unavailable'}, 503); }
  }
};
