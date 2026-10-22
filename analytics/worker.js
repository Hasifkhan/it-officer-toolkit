/* IT Officer Toolkit — visitor analytics API for Cloudflare Workers + D1.
   Public endpoints : POST /api/collect, GET /api/announcement
   Admin endpoints  : /api/admin/*  (Authorization: Bearer <ADMIN_TOKEN>)
   Respects Do-Not-Track / Global Privacy Control. Country and IP come from Cloudflare (no third-party lookup). */

const DAY = 86400000;
const KINDS = ['visit', 'tool'];

/* ---------------- helpers (exported for tests) ---------------- */
export function parseUA(ua) {
  ua = String(ua || '');
  const browser = /Edg(e|A|iOS)?\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const device = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? 'Tablet' : /Mobi|iPhone|Android/.test(ua) ? 'Mobile' : 'Desktop';
  return { browser, os, device };
}
export function maskIP(ip) {
  if (!ip) return '';
  if (ip.indexOf(':') !== -1) { const p = ip.split(':'); return p.slice(0, 3).join(':') + '::'; }
  const p = ip.split('.'); return p.length === 4 ? p[0] + '.' + p[1] + '.' + p[2] + '.0' : ip;
}
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function storedIP(ip, env) {
  const mode = String(env.IP_MODE || 'full').toLowerCase();
  if (!ip || mode === 'none') return null;
  if (mode === 'masked') return maskIP(ip);
  if (mode === 'hash') return (await sha256Hex((env.IP_SALT || '') + '|' + ip)).slice(0, 16);
  return ip;
}
async function safeEqual(a, b) {   // compare digests so the length of the secret is not leaked
  const [x, y] = await Promise.all([sha256Hex(String(a)), sha256Hex(String(b))]);
  let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}
function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return origin || '*';
  return list.indexOf(origin) !== -1 ? origin : null;
}
function cors(request, env, extra) {
  const o = allowedOrigin(request, env);
  const h = Object.assign({ 'Vary': 'Origin', 'Cache-Control': 'no-store' }, extra || {});
  if (o) { h['Access-Control-Allow-Origin'] = o; h['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'; h['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'; h['Access-Control-Max-Age'] = '86400'; }
  return h;
}
function json(request, env, data, status) { return new Response(JSON.stringify(data), { status: status || 200, headers: cors(request, env, { 'Content-Type': 'application/json' }) }); }
const clientIP = request => request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
const clip = (s, n) => (s == null ? null : String(s).slice(0, n));
const intParam = (v, def, min, max) => { const n = parseInt(v, 10); return isNaN(n) ? def : Math.max(min, Math.min(max, n)); };
const num = (v, def) => { const n = Number(v); return isFinite(n) ? n : def; };

async function q(env, sql, ...binds) { return (await env.DB.prepare(sql).bind(...binds).all()).results || []; }
async function run(env, sql, ...binds) { return env.DB.prepare(sql).bind(...binds).run(); }
async function first(env, sql, ...binds) { return env.DB.prepare(sql).bind(...binds).first(); }

async function cleanupIfDue(env, now) {
  const days = intParam(env.RETENTION_DAYS, 90, 1, 3650);
  const last = await first(env, "SELECT v FROM settings WHERE k = 'last_cleanup'");
  if (last && now - Number(last.v) < DAY) return;
  await run(env, 'DELETE FROM events WHERE ts < ?', now - days * DAY);
  await run(env, 'DELETE FROM auth_fail WHERE ts < ?', now - DAY);
  await run(env, "INSERT INTO settings (k, v) VALUES ('last_cleanup', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", String(now));
}

/* ---------------- public: collect ---------------- */
async function collect(request, env, ctx) {
  const now = Date.now();
  if (allowedOrigin(request, env) === null) return new Response(null, { status: 403, headers: cors(request, env) });
  if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1') return new Response(null, { status: 204, headers: cors(request, env) });
  let body; try { body = JSON.parse(await request.text()); } catch (e) { return json(request, env, { error: 'bad json' }, 400); }
  if (!body || typeof body !== 'object') return json(request, env, { error: 'bad body' }, 400);
  const vid = String(body.vid || ''), kind = String(body.kind || ''), tool = body.tool == null ? null : String(body.tool);
  if (!/^[a-z0-9]{8,40}$/i.test(vid) || KINDS.indexOf(kind) === -1) return json(request, env, { error: 'invalid event' }, 400);
  if (kind === 'tool' && !(tool && /^[a-z0-9-]{1,40}$/i.test(tool))) return json(request, env, { error: 'invalid tool' }, 400);
  const rawIP = clientIP(request);
  if (rawIP && await first(env, 'SELECT 1 AS x FROM blocked WHERE ip = ?', rawIP)) return new Response(null, { status: 204, headers: cors(request, env) });  // blocked: silently ignore
  if (rawIP) {
    const c = await first(env, 'SELECT COUNT(*) AS n FROM events WHERE ts > ? AND ip = ?', now - 3600000, await storedIP(rawIP, env));
    if (c && c.n >= 300) return json(request, env, { error: 'rate limited' }, 429);
  }
  const cf = request.cf || {}, ua = parseUA(request.headers.get('User-Agent'));
  await run(env, 'INSERT INTO events (ts, vid, kind, tool, is_returning, ip, country, region, city, browser, os, device, lang) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    now, vid.toLowerCase(), kind, kind === 'tool' ? tool.toLowerCase() : null, body.returning ? 1 : 0, await storedIP(rawIP, env),
    clip(cf.country, 2), clip(cf.region, 60), clip(cf.city, 60), ua.browser, ua.os, ua.device, clip(body.lang, 12));
  const job = cleanupIfDue(env, now).catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
  return new Response(null, { status: 204, headers: cors(request, env) });
}

/* ---------------- admin ---------------- */
async function authorize(request, env) {
  const ip = clientIP(request) || 'unknown', now = Date.now();
  const f = await first(env, 'SELECT COUNT(*) AS n FROM auth_fail WHERE ip = ? AND ts > ?', ip, now - 15 * 60000);
  if (f && f.n >= 10) return { status: 429, error: 'Too many failed sign-in attempts. Try again in 15 minutes.' };
  const token = String(env.ADMIN_TOKEN || ''), got = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token || token.length < 12) return { status: 503, error: 'ADMIN_TOKEN is not configured (min 12 characters).' };
  if (!got || !(await safeEqual(got, token))) { await run(env, 'INSERT INTO auth_fail (ip, ts) VALUES (?, ?)', ip, now); return { status: 401, error: 'Wrong admin token.' }; }
  return null;
}
function filters(url, tz) {
  const w = [], b = [];
  const country = (url.searchParams.get('country') || '').toUpperCase(), text = (url.searchParams.get('q') || '').trim(), from = url.searchParams.get('from'), to = url.searchParams.get('to');
  if (/^[A-Z]{2}$/.test(country)) { w.push('country = ?'); b.push(country); }
  if (text) { w.push('(ip LIKE ? OR city LIKE ? OR tool LIKE ? OR browser LIKE ? OR os LIKE ?)'); const t = '%' + text.replace(/[%_]/g, '') + '%'; b.push(t, t, t, t, t); }
  const day = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? Date.parse(s + 'T00:00:00Z') - tz * 60000 : null;   // local midnight -> UTC ms
  const f = day(from), t2 = day(to);
  if (f !== null) { w.push('ts >= ?'); b.push(f); }
  if (t2 !== null) { w.push('ts < ?'); b.push(t2 + DAY); }
  return { where: w.length ? ' WHERE ' + w.join(' AND ') : '', binds: b };
}
const csvCell = v => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

async function admin(request, env, url, path) {
  const denied = await authorize(request, env);
  if (denied) return json(request, env, { error: denied.error }, denied.status);
  const now = Date.now(), m = request.method;
  const tz = Math.max(-840, Math.min(840, Math.round(num(url.searchParams.get('tz'), 0))));   // minutes east of UTC
  const dayExpr = "strftime('%Y-%m-%d', (ts / 1000) + " + (tz * 60) + ", 'unixepoch')";   // tz is a clamped integer
  const config = { ipMode: String(env.IP_MODE || 'full').toLowerCase(), retentionDays: intParam(env.RETENTION_DAYS, 90, 1, 3650), allowedOrigins: String(env.ALLOWED_ORIGINS || '') };

  if (path === '/ping' && m === 'GET') return json(request, env, { ok: true, config });

  if (path === '/summary' && m === 'GET') {
    const days = intParam(url.searchParams.get('days'), 30, 1, 180), since = now - days * DAY;
    const today = new Date(now + tz * 60000).toISOString().slice(0, 10);
    const daily = await q(env, "SELECT " + dayExpr + " AS day, COUNT(DISTINCT vid) AS visitors, SUM(kind = 'visit') AS visits, SUM(kind = 'tool') AS tools, COUNT(DISTINCT CASE WHEN is_returning = 0 THEN vid END) AS newVisitors FROM events WHERE ts >= ? GROUP BY day ORDER BY day", since);
    const range = async d => (await first(env, 'SELECT COUNT(DISTINCT vid) AS visitors, COUNT(DISTINCT ip) AS ips FROM events WHERE ts >= ?', now - d * DAY)) || { visitors: 0, ips: 0 };
    const todayRow = daily.find(r => r.day === today) || { visitors: 0, visits: 0, tools: 0, newVisitors: 0 };
    const countries = await q(env, "SELECT country, COUNT(DISTINCT vid) AS visitors, SUM(kind = 'visit') AS visits FROM events WHERE ts >= ? AND country IS NOT NULL GROUP BY country ORDER BY visitors DESC, visits DESC LIMIT 60", since);
    const tools = await q(env, "SELECT tool, COUNT(*) AS opens, COUNT(DISTINCT vid) AS users FROM events WHERE ts >= ? AND kind = 'tool' GROUP BY tool ORDER BY opens DESC LIMIT 40", since);
    const browsers = await q(env, 'SELECT browser AS name, COUNT(DISTINCT vid) AS visitors FROM events WHERE ts >= ? GROUP BY browser ORDER BY visitors DESC, name', since);
    const devices = await q(env, 'SELECT device AS name, COUNT(DISTINCT vid) AS visitors FROM events WHERE ts >= ? GROUP BY device ORDER BY visitors DESC, name', since);
    const oss = await q(env, 'SELECT os AS name, COUNT(DISTINCT vid) AS visitors FROM events WHERE ts >= ? GROUP BY os ORDER BY visitors DESC', since);
    const nr = await first(env, "SELECT COUNT(DISTINCT CASE WHEN is_returning = 0 THEN vid END) AS newV, COUNT(DISTINCT CASE WHEN is_returning = 1 THEN vid END) AS retV FROM events WHERE ts >= ?", since);
    const total = await first(env, 'SELECT COUNT(*) AS events, MIN(ts) AS firstTs, COUNT(DISTINCT vid) AS visitors FROM events');
    const online = await first(env, 'SELECT COUNT(DISTINCT vid) AS n FROM events WHERE ts >= ?', now - 5 * 60000);
    return json(request, env, { generatedAt: now, days, today, todayStats: todayRow, last7: await range(7), last30: await range(30), activeNow: online ? online.n : 0, newReturning: nr, daily, countries, tools, browsers, devices, os: oss, total, config });
  }

  if ((path === '/log' || path === '/export.csv') && m === 'GET') {
    const f = filters(url, tz), limit = path === '/export.csv' ? 50000 : intParam(url.searchParams.get('limit'), 50, 1, 200), offset = intParam(url.searchParams.get('offset'), 0, 0, 1e7);
    const rows = await q(env, 'SELECT id, ts, vid, kind, tool, is_returning, ip, country, region, city, browser, os, device, lang FROM events' + f.where + ' ORDER BY ts DESC LIMIT ? OFFSET ?', ...f.binds, limit, offset);
    if (path === '/export.csv') {
      const head = ['Time (UTC)', 'Visitor ID', 'Event', 'Tool', 'Returning', 'IP', 'Country', 'Region', 'City', 'Browser', 'OS', 'Device', 'Language'];
      const body = rows.map(r => [new Date(r.ts).toISOString(), r.vid, r.kind, r.tool, r.is_returning ? 'yes' : 'no', r.ip, r.country, r.region, r.city, r.browser, r.os, r.device, r.lang].map(csvCell).join(','));
      return new Response('﻿' + [head.map(csvCell).join(',')].concat(body).join('\r\n') + '\r\n', { headers: cors(request, env, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="itk-visitors.csv"' }) });
    }
    const total = await first(env, 'SELECT COUNT(*) AS n FROM events' + f.where, ...f.binds);
    return json(request, env, { rows, total: total ? total.n : 0, limit, offset });
  }

  if (path === '/blocked') {
    if (m === 'GET') return json(request, env, { rows: await q(env, 'SELECT ip, note, ts FROM blocked ORDER BY ts DESC LIMIT 500') });
    let body = {}; try { body = JSON.parse(await request.text() || '{}'); } catch (e) { return json(request, env, { error: 'bad json' }, 400); }
    const ip = String(body.ip || '').trim();
    if (!/^[0-9a-fA-F:.]{3,45}$/.test(ip)) return json(request, env, { error: 'Enter a valid IP address.' }, 400);
    if (m === 'POST') { await run(env, 'INSERT INTO blocked (ip, note, ts) VALUES (?,?,?) ON CONFLICT(ip) DO UPDATE SET note = excluded.note', ip, clip(body.note, 120) || '', now); return json(request, env, { ok: true }); }
    if (m === 'DELETE') { await run(env, 'DELETE FROM blocked WHERE ip = ?', ip); return json(request, env, { ok: true }); }
  }

  if (path === '/announcement' && m === 'POST') {
    let body = {}; try { body = JSON.parse(await request.text() || '{}'); } catch (e) { return json(request, env, { error: 'bad json' }, 400); }
    const text = String(body.text || '').trim().slice(0, 300);
    if (text) await run(env, "INSERT INTO settings (k, v) VALUES ('announcement', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", text); else await run(env, "DELETE FROM settings WHERE k = 'announcement'");
    return json(request, env, { ok: true, text });
  }

  if (path === '/purge' && m === 'POST') {
    let body = {}; try { body = JSON.parse(await request.text() || '{}'); } catch (e) { return json(request, env, { error: 'bad json' }, 400); }
    let r;
    if (body.all === true) r = await run(env, 'DELETE FROM events');
    else if (body.ip) r = await run(env, 'DELETE FROM events WHERE ip = ?', String(body.ip));
    else if (body.olderThanDays !== undefined) { const d = intParam(body.olderThanDays, -1, 0, 3650); if (d < 0) return json(request, env, { error: 'olderThanDays must be 0–3650.' }, 400); r = await run(env, 'DELETE FROM events WHERE ts < ?', now - d * DAY); }
    else return json(request, env, { error: 'Specify all, ip or olderThanDays.' }, 400);
    return json(request, env, { ok: true, deleted: (r.meta && r.meta.changes) || 0 });
  }
  return json(request, env, { error: 'Not found' }, 404);
}

/* ---------------- router ---------------- */
export async function handle(request, env, ctx) {
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method === 'OPTIONS') return new Response(null, { status: allowedOrigin(request, env) === null ? 403 : 204, headers: cors(request, env) });
  try {
    if (path === '/api/collect' && request.method === 'POST') return await collect(request, env, ctx);
    if (path === '/api/announcement' && request.method === 'GET') {
      if (allowedOrigin(request, env) === null) return new Response(null, { status: 403 });
      const r = await first(env, "SELECT v FROM settings WHERE k = 'announcement'");
      return json(request, env, { text: r ? r.v : '' });
    }
    if (path.indexOf('/api/admin') === 0) {
      if (allowedOrigin(request, env) === null) return new Response(null, { status: 403 });
      return await admin(request, env, url, path.slice('/api/admin'.length) || '/');
    }
    if (path === '/' || path === '/api') return new Response('IT Officer Toolkit analytics API', { headers: { 'Content-Type': 'text/plain' } });
    return new Response('Not found', { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: cors(request, env, { 'Content-Type': 'application/json' }) });
  }
}
export default { fetch: handle };
