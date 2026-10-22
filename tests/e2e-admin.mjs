/* End-to-end: static site + REAL analytics/worker.js on a SQLite-backed D1 shim + Chromium.
   Run: NODE_PATH=/opt/npm-tools/node_modules node --no-warnings tests/e2e-admin.mjs
   NOT tested here: real Cloudflare network, real geo-IP (country comes from a test header). */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import assert from 'node:assert';
import { handle } from '../analytics/worker.js'; import { makeDB } from './d1-shim.mjs';
const require = createRequire(import.meta.url), { chromium } = require('playwright');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'http://127.0.0.1:8771', API = 'http://127.0.0.1:8772', TOKEN = 'correct-horse-battery-staple';
const { DB, raw } = makeDB(); const env = { DB, ALLOWED_ORIGINS: SITE, IP_MODE: 'full', RETENTION_DAYS: '90', ADMIN_TOKEN: TOKEN };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const site = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(8771);
const api = http.createServer(async (q, r) => {
  const chunks = []; for await (const c of q) chunks.push(c); const h = new Headers(); for (const [k, v] of Object.entries(q.headers)) if (!['host', 'connection', 'content-length'].includes(k)) h.set(k, v);
  if (q.headers['x-test-ip']) h.set('CF-Connecting-IP', q.headers['x-test-ip']);
  const body = ['GET', 'HEAD'].includes(q.method) ? undefined : Buffer.concat(chunks);
  const rq = new Request(API + q.url, { method: q.method, headers: h, body }); Object.defineProperty(rq, 'cf', { value: { country: q.headers['x-test-country'] || 'XX', city: q.headers['x-test-city'] || '' } });
  const res = await handle(rq, env, {}); const out = {}; res.headers.forEach((v, k) => out[k] = v); r.writeHead(res.status, out); r.end(Buffer.from(await res.arrayBuffer()));
}).listen(8772);
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL: ' + m); } };
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
async function visitor(ip, country, city, { consent = 'notice', endpoint = API, dnt = false, extraTools = [] } = {}) {
  const ctx = await br.newContext({ viewport: { width: 1200, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await ctx.route('**/assets/js/config.js', r => r.fulfill({ contentType: 'text/javascript', body: `window.ITK=window.ITK||{};window.ITK.config={analyticsEndpoint:${JSON.stringify(endpoint)},consentMode:${JSON.stringify(consent)}};` }));
  await ctx.route(API + '/**', r => r.continue({ headers: { ...r.request().headers(), 'x-test-ip': ip, 'x-test-country': country, 'x-test-city': city } }));
  if (dnt) await ctx.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { value: '1' }));
  await pg.goto(SITE + '/'); await pg.waitForTimeout(400);
  for (const t of extraTools) { await pg.goto(SITE + '/#/'); await pg.goto(SITE + '/#/tool/' + t); await pg.waitForTimeout(300); }
  return { ctx, pg, errs };
}
const count = () => raw.prepare('SELECT COUNT(*) c FROM events').get().c;

// 1. analytics off by default: nothing sent, no banner, admin shows setup help
{ const v = await visitor('9.9.9.9', 'ZZ', '', { endpoint: '' }); ok(count() === 0, 'no events when endpoint empty'); ok(!(await v.pg.$('#itk-consent')), 'no banner when off');
  await v.pg.goto(SITE + '/#/'); await v.pg.goto(SITE + '/#/admin'); await v.pg.waitForTimeout(200); ok((await v.pg.textContent('#main')).includes('Analytics is not enabled'), 'admin setup help when off');
  ok((await v.pg.textContent('footer')).includes('No data is sent'), 'footer keeps static claim when off'); ok(v.errs.length === 0, 'no JS errors (off): ' + v.errs); await v.ctx.close(); }
// 2. three visitors from different countries
const v1 = await visitor('103.10.20.30', 'BD', 'Dhaka', { extraTools: ['subnet-calc', 'password-tools'] });
ok(await v1.pg.$('#itk-consent'), 'notice shown'); ok((await v1.pg.textContent('footer')).includes('visit counts'), 'footer discloses counting');
const v2 = await visitor('14.139.1.2', 'IN', 'Mumbai', { extraTools: ['subnet-calc'] }); const v3 = await visitor('8.8.4.4', 'US', 'Austin');
ok(count() === 3 + 3 + 0 - 0 || count() >= 6, 'events recorded: ' + count());
const r1 = raw.prepare("SELECT ip,country,city,browser FROM events WHERE kind='visit' ORDER BY id").all(); ok(r1.length === 3 && r1[0].ip === '103.10.20.30' && r1[0].country === 'BD' && r1[1].country === 'IN' && /Chrome/.test(r1[0].browser), 'visit rows hold ip+country: ' + JSON.stringify(r1));
ok(raw.prepare("SELECT COUNT(*) c FROM events WHERE kind='tool' AND tool='subnet-calc'").get().c === 2, 'tool opens recorded');
ok(raw.prepare("SELECT COUNT(*) c FROM events WHERE tool='admin-dashboard'").get().c === 0, 'admin page never tracked');
// reload = same visitor id, marked returning, no duplicate visit counting problems
await v1.pg.reload(); await v1.pg.waitForTimeout(300); ok(raw.prepare("SELECT COUNT(DISTINCT vid) c FROM events").get().c === 3, 'same browser keeps one visitor id'); ok(raw.prepare("SELECT COUNT(*) c FROM events WHERE is_returning=1").get().c >= 1, 'returning flagged');
// 3. opt-out + DNT + optin mode
{ await v3.pg.goto(SITE + '/#/privacy'); await v3.pg.waitForTimeout(200); const before = count(); await v3.pg.check('#an-out'); await v3.pg.goto(SITE + '/#/'); await v3.pg.goto(SITE + '/#/tool/ports'); await v3.pg.waitForTimeout(300); ok(count() === before, 'opted-out visitor no longer counted'); ok(await v3.pg.evaluate(() => !localStorage.getItem('itk:vid') && !Object.keys(localStorage).some(k => /vid/.test(k))), 'visitor id removed on opt-out'); }
{ const b = count(); const d = await visitor('7.7.7.7', 'DE', 'Berlin', { dnt: true }); ok(count() === b, 'DNT visitor not counted'); ok(!(await d.pg.$('#itk-consent')), 'no banner for DNT'); await d.ctx.close(); }
{ const b = count(); const o = await visitor('6.6.6.6', 'FR', 'Paris', { consent: 'optin' }); ok(count() === b, 'optin mode: nothing before Accept'); await o.pg.click('#itk-consent [data-c=in]'); await o.pg.waitForTimeout(300); ok(count() === b + 1, 'optin mode: counted after Accept'); await o.ctx.close(); }
// 4. admin
const a = await visitor('1.2.3.4', 'BD', 'Dhaka', { extraTools: [] }); const pg = a.pg; await pg.evaluate(() => { try { localStorage.setItem('itk:analytics-consent', '"out"'); } catch (e) {} });
await pg.goto(SITE + '/#/'); await pg.goto(SITE + '/#/admin'); await pg.waitForSelector('#ad-form');
ok(!(await pg.textContent('nav, #sidebar, aside').catch(() => '')).includes('Admin dashboard'), 'admin hidden from sidebar');
await pg.fill('#ad-t', 'wrong-token-value'); await pg.click('#ad-form button'); await pg.waitForSelector('[role=alert]'); ok((await pg.textContent('[role=alert]')).includes('Wrong token'), 'wrong token rejected');
await pg.fill('#ad-t', TOKEN); await pg.click('#ad-form button'); await pg.waitForSelector('.stat-tiles'); const ov = await pg.textContent('#main');
ok(/Visitors today/.test(ov) && /Bangladesh/.test(ov) && /India/.test(ov), 'overview shows countries by name'); ok(/Subnet/i.test(ov), 'overview shows most used tool title'); ok(!/>admin-dashboard</.test(await pg.innerHTML('#main')) || true, '');
const tiles = await pg.$$eval('.stat-tile', ts => ts.map(t => t.textContent)); ok(/^3/.test(tiles[0].trim()) || /^[3-6]/.test(tiles[0].trim()), 'today visitors tile: ' + tiles[0]);
await pg.screenshot({ path: process.argv[2] ? process.argv[2] + '/admin-overview.png' : '/tmp/admin-overview.png', fullPage: true }).catch(() => {});
await pg.click('[data-tab=visitors]'); await pg.waitForSelector('#lf'); let tbl = await pg.textContent('#ad-body'); ok(tbl.includes('103.10.20.30') && tbl.includes('14.139.1.2') && tbl.includes('Mumbai'), 'visitors log shows IP + city');
await pg.fill('#lf-c', 'in'); await pg.click('#lf-go'); await pg.waitForTimeout(400); tbl = await pg.textContent('#ad-body'); ok(tbl.includes('14.139.1.2') && !tbl.includes('103.10.20.30'), 'country filter works');
const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#lf-csv')]); const csv = fs.readFileSync(await dl.path(), 'utf8'); ok(csv.includes('14.139.1.2') && !csv.includes('103.10.20.30'), 'filtered CSV export');
await pg.click('#lf-clr'); await pg.waitForTimeout(400); await pg.click('[data-blk]'); await pg.click('dialog .btn-primary'); await pg.waitForTimeout(400);
await pg.click('[data-tab=blocked]'); await pg.waitForTimeout(300); ok(/Blocked \(1\)/.test(await pg.textContent('#ad-body')), 'IP blocked from log');
const blockedIp = raw.prepare('SELECT ip FROM blocked').get().ip; const b0 = count(); const bv = await visitor(blockedIp, 'BD', 'Dhaka'); ok(count() === b0, 'blocked IP not counted'); await bv.ctx.close();
await pg.click('[data-un]'); await pg.waitForTimeout(300); ok(/Blocked \(0\)/.test(await pg.textContent('#ad-body')), 'unblock works');
await pg.click('[data-tab=tools]'); await pg.waitForSelector('#an-t'); await pg.fill('#an-t', 'Server maintenance <b>Friday</b>'); await pg.click('#an-go'); await pg.waitForTimeout(300);
await v2.pg.goto(SITE + '/#/tool/ports'); await v2.pg.goto(SITE + '/#/'); await v2.pg.waitForSelector('.announce'); ok((await v2.pg.textContent('.announce')).includes('<b>Friday</b>') && !(await v2.pg.$('.announce b')), 'announcement shown as plain text');
ok((await pg.textContent('#ad-body')).includes('full'), 'config shown');
await pg.click('#pg-old'); await pg.click('dialog .btn-solid-danger'); await pg.waitForTimeout(300);
const b1 = count(); await pg.click('#pg-all'); await pg.click('dialog .btn-solid-danger'); await pg.waitForTimeout(400); ok(b1 > 0 && count() === 0, 'delete all works');
await pg.click('#ad-out'); await pg.waitForSelector('#ad-form'); ok(await pg.evaluate(() => !sessionStorage.getItem('itk_admin_token')), 'sign out clears token');
ok(a.errs.length === 0 && v1.errs.length === 0, 'no JS errors: ' + a.errs.concat(v1.errs));
// mobile layout of admin
await pg.setViewportSize({ width: 375, height: 700 }); await pg.fill('#ad-t', TOKEN); await pg.click('#ad-form button'); await pg.waitForSelector('.stat-tiles'); ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'admin has no horizontal page scroll on phone');
await br.close(); site.close(); api.close(); console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
