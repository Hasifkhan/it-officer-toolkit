/* node --no-warnings tests/worker.test.mjs */
import assert from 'node:assert';
import { handle, parseUA, maskIP, storedIP } from '../analytics/worker.js';
import { makeDB, req } from './d1-shim.mjs';
let pass = 0, fail = 0;
async function t(name, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('FAIL: ' + name + '\n   ' + e.message); } }
const eq = assert.strictEqual, B = 'https://api.test';
const env0 = () => ({ ...makeDB(), ALLOWED_ORIGINS: 'https://me.github.io', IP_MODE: 'full', RETENTION_DAYS: '90', ADMIN_TOKEN: 'correct-horse-battery-staple' });
const E = e => ({ DB: e.DB, ALLOWED_ORIGINS: e.ALLOWED_ORIGINS, IP_MODE: e.IP_MODE, RETENTION_DAYS: e.RETENTION_DAYS, ADMIN_TOKEN: e.ADMIN_TOKEN, IP_SALT: e.IP_SALT });
const post = (e, ev, o) => handle(req(B + '/api/collect', { method: 'POST', body: ev, ...o }), E(e), {});
const adm = (e, path, o = {}) => handle(req(B + '/api/admin' + path, { ...o, headers: { Authorization: 'Bearer ' + (o.token || e.ADMIN_TOKEN), ...(o.headers || {}) } }), E(e), {});
const j = async r => r.json();
const V = 'abcdef1234567890';
const rows = e => e.raw.prepare('SELECT * FROM events').all();

await t('UA parsing', () => {
  eq(parseUA('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537').browser, 'Chrome');
  eq(parseUA('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537 Edg/120').browser, 'Edge');
  eq(parseUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17 Mobile Safari/604').device, 'Mobile');
  eq(parseUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17 Mobile Safari/604').os, 'iOS');
  eq(parseUA('Mozilla/5.0 (Linux; Android 13; SM-T500) Chrome/120 Safari/537').device, 'Tablet');
  eq(parseUA('Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120 Mobile Safari/537').device, 'Mobile');
  eq(parseUA('Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0').browser, 'Firefox');
  eq(parseUA('').browser, 'Other');
});
await t('IP masking / modes', async () => {
  eq(maskIP('203.0.113.77'), '203.0.113.0'); eq(maskIP('2001:db8:abcd:12::1'), '2001:db8:abcd::');
  eq(await storedIP('1.2.3.4', {}), '1.2.3.4'); eq(await storedIP('1.2.3.4', { IP_MODE: 'masked' }), '1.2.3.0'); eq(await storedIP('1.2.3.4', { IP_MODE: 'none' }), null);
  const h1 = await storedIP('1.2.3.4', { IP_MODE: 'hash', IP_SALT: 'a' }), h2 = await storedIP('1.2.3.4', { IP_MODE: 'hash', IP_SALT: 'b' });
  assert(/^[0-9a-f]{16}$/.test(h1) && h1 !== h2 && h1 !== '1.2.3.4');
});
await t('collect stores visit with ip, country, city, ua', async () => {
  const e = env0(); const r = await post(e, { vid: V, kind: 'visit', returning: false, lang: 'en-US' }); eq(r.status, 204);
  const row = rows(e)[0]; eq(row.ip, '203.0.113.7'); eq(row.country, 'BD'); eq(row.city, 'Dhaka'); eq(row.browser, 'Chrome'); eq(row.os, 'Windows'); eq(row.device, 'Desktop'); eq(row.kind, 'visit'); eq(row.is_returning, 0); eq(row.vid, V);
  eq(r.headers.get('Access-Control-Allow-Origin'), 'https://me.github.io');
});
await t('collect tool event + validation', async () => {
  const e = env0();
  eq((await post(e, { vid: V, kind: 'tool', tool: 'subnet-calc', returning: true })).status, 204); eq(rows(e)[0].tool, 'subnet-calc'); eq(rows(e)[0].is_returning, 1);
  eq((await post(e, { vid: V, kind: 'tool' })).status, 400); eq((await post(e, { vid: V, kind: 'tool', tool: '<script>' })).status, 400);
  eq((await post(e, { vid: 'x', kind: 'visit' })).status, 400); eq((await post(e, { vid: V, kind: 'hack' })).status, 400);
  eq((await handle(req(B + '/api/collect', { method: 'POST', body: 'not json' }), E(e), {})).status, 400); eq(rows(e).length, 1);
});
await t('wrong origin rejected; preflight', async () => {
  const e = env0(); eq((await post(e, { vid: V, kind: 'visit' }, { origin: 'https://evil.example' })).status, 403); eq(rows(e).length, 0);
  const p = await handle(req(B + '/api/collect', { method: 'OPTIONS' }), E(e), {}); eq(p.status, 204); eq(p.headers.get('Access-Control-Allow-Origin'), 'https://me.github.io');
  eq((await handle(req(B + '/api/collect', { method: 'OPTIONS', origin: 'https://evil.example' }), E(e), {})).status, 403);
});
await t('Do-Not-Track and Global Privacy Control are honoured', async () => {
  const e = env0(); await post(e, { vid: V, kind: 'visit' }, { headers: { DNT: '1' } }); await post(e, { vid: V, kind: 'visit' }, { headers: { 'Sec-GPC': '1' } }); eq(rows(e).length, 0);
});
await t('blocked IPs are ignored; rate limit', async () => {
  const e = env0(); e.raw.exec("INSERT INTO blocked VALUES ('198.51.100.9','x',1)");
  eq((await post(e, { vid: V, kind: 'visit' }, { ip: '198.51.100.9' })).status, 204); eq(rows(e).length, 0);
  for (let i = 0; i < 300; i++) e.raw.prepare("INSERT INTO events (ts,vid,kind,ip) VALUES (?,?,?,?)").run(Date.now(), V, 'visit', '203.0.113.7');
  eq((await post(e, { vid: V, kind: 'visit' })).status, 429);
});
await t('IP modes applied on collect', async () => {
  const e = env0(); e.IP_MODE = 'masked'; await post(e, { vid: V, kind: 'visit' }); eq(rows(e)[0].ip, '203.0.113.0');
  const e2 = env0(); e2.IP_MODE = 'none'; await post(e2, { vid: V, kind: 'visit' }); eq(rows(e2)[0].ip, null);
});
await t('admin auth: missing / wrong / throttle / correct / unconfigured', async () => {
  const e = env0();
  eq((await handle(req(B + '/api/admin/ping'), E(e), {})).status, 401);
  eq((await adm(e, '/ping', { token: 'nope' })).status, 401);
  for (let i = 0; i < 9; i++) await adm(e, '/ping', { token: 'nope' });
  eq((await adm(e, '/ping', { token: 'nope' })).status, 429); eq((await adm(e, '/ping')).status, 429, 'even the right token is blocked while throttled');
  const e2 = env0(); const r = await adm(e2, '/ping'); eq(r.status, 200); eq((await j(r)).ok, true);
  const e3 = { ...E(env0()), ADMIN_TOKEN: '' }; eq((await handle(req(B + '/api/admin/ping', { headers: { Authorization: 'Bearer ' } }), e3, {})).status, 503);
  eq((await handle(req(B + '/api/admin/ping', { origin: 'https://evil.example', headers: { Authorization: 'Bearer ' + e2.ADMIN_TOKEN } }), E(e2), {})).status, 403);
});
const day = ms => new Date(ms).toISOString().slice(0, 10);
function seed(e) {
  const now = Date.now(), ins = e.raw.prepare('INSERT INTO events (ts,vid,kind,tool,is_returning,ip,country,city,browser,os,device) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  ins.run(now - 1000, 'aaaaaaaa1', 'visit', null, 0, '1.1.1.1', 'BD', 'Dhaka', 'Chrome', 'Windows', 'Desktop');
  ins.run(now - 900, 'aaaaaaaa1', 'tool', 'subnet-calc', 0, '1.1.1.1', 'BD', 'Dhaka', 'Chrome', 'Windows', 'Desktop');
  ins.run(now - 800, 'aaaaaaaa1', 'tool', 'ports', 0, '1.1.1.1', 'BD', 'Dhaka', 'Chrome', 'Windows', 'Desktop');
  ins.run(now - 700, 'bbbbbbbb2', 'visit', null, 1, '2.2.2.2', 'IN', 'Mumbai', 'Firefox', 'Linux', 'Desktop');
  ins.run(now - 2 * 86400000, 'cccccccc3', 'visit', null, 0, '3.3.3.3', 'US', 'Austin', 'Safari', 'iOS', 'Mobile');
  ins.run(now - 2 * 86400000, 'aaaaaaaa1', 'visit', null, 1, '1.1.1.1', 'BD', 'Dhaka', 'Chrome', 'Windows', 'Desktop');
  ins.run(now - 40 * 86400000, 'dddddddd4', 'visit', null, 0, '4.4.4.4', 'GB', 'London', 'Edge', 'Windows', 'Desktop');
  return now;
}
await t('summary: unique visitors per day, countries, tools, new/returning, windows', async () => {
  const e = env0(); const now = seed(e);
  const s = await j(await adm(e, '/summary?tz=0&days=30'));
  eq(s.today, day(now)); eq(s.todayStats.visitors, 2); eq(s.todayStats.visits, 2); eq(s.todayStats.tools, 2);
  const d2 = s.daily.find(r => r.day === day(now - 2 * 86400000)); eq(d2.visitors, 2);
  eq(s.daily.length, 2 + (day(now) === day(now - 2 * 86400000) ? -1 : 0) + 0 === 2 ? 2 : s.daily.length);
  assert(!s.daily.some(r => r.day === day(now - 40 * 86400000)), '40-day-old row excluded from a 30-day window');
  eq(s.last7.visitors, 3); eq(s.last30.visitors, 3); eq(s.last30.ips, 3); eq(s.total.visitors, 4);
  eq(s.countries[0].country, 'BD'); eq(s.countries[0].visitors, 1); eq(s.countries.map(c => c.country).sort().join(), 'BD,IN,US');
  eq(s.tools[0].opens, 1); eq(s.tools.length, 2); eq(s.activeNow, 2);
  eq(s.newReturning.newV, 2); eq(s.newReturning.retV, 2);
  eq(s.browsers[0].name, 'Chrome'); assert(s.devices.some(d => d.name === 'Mobile'));
  const wide = await j(await adm(e, '/summary?days=60')); eq(wide.last30.visitors, 3); assert(wide.daily.some(r => r.day === day(now - 40 * 86400000)));
});
await t('summary: timezone shifts the day boundary', async () => {
  const e = env0(); e.raw.prepare('INSERT INTO events (ts,vid,kind,country) VALUES (?,?,?,?)').run((Math.floor(Date.now()/864e5)-3)*864e5+20*36e5, 'tzvisitor1', 'visit', 'BD');
  const utc = await j(await adm(e, '/summary?tz=0&days=180')), dhaka = await j(await adm(e, '/summary?tz=360&days=180'));
  const d0=new Date((Math.floor(Date.now()/864e5)-3)*864e5).toISOString().slice(0,10), d1=new Date((Math.floor(Date.now()/864e5)-2)*864e5).toISOString().slice(0,10); eq(utc.daily[0].day, d0); eq(dhaka.daily[0].day, d1);
  eq((await adm(e, '/summary?tz=0);DROP TABLE events;--')).status, 200); eq((await j(await adm(e, '/summary?tz=999999999'))).daily.length >= 0, true); assert(e.raw.prepare('SELECT COUNT(*) c FROM events').get().c >= 1);
});
await t('log: paging, country/text/date filters, csv export + formula guard', async () => {
  const e = env0(); const now = seed(e);
  let l = await j(await adm(e, '/log?limit=2&offset=0')); eq(l.total, 7); eq(l.rows.length, 2); assert(l.rows[0].ts >= l.rows[1].ts);
  l = await j(await adm(e, '/log?country=in')); eq(l.total, 1); eq(l.rows[0].city, 'Mumbai');
  l = await j(await adm(e, '/log?q=1.1.1.1')); eq(l.total, 4);
  l = await j(await adm(e, '/log?q=subnet')); eq(l.total, 1);
  l = await j(await adm(e, '/log?q=%25')); eq(l.total, 7, 'wildcard characters are stripped');
  l = await j(await adm(e, '/log?from=' + day(now - 3 * 86400000) + '&to=' + day(now - 2 * 86400000))); eq(l.total, 2);
  e.raw.prepare('INSERT INTO events (ts,vid,kind,city) VALUES (?,?,?,?)').run(now, 'zzzzzzzz9', 'visit', '=HYPERLINK("x")');
  const c = await adm(e, '/export.csv'); eq(c.status, 200); assert(/text\/csv/.test(c.headers.get('Content-Type'))); const txt = await c.text();
  assert(txt.split('\r\n')[0].includes('Country')); assert(txt.includes("'=HYPERLINK"), 'formula neutralised'); assert(txt.includes('Mumbai'));
});
await t('blocklist add/list/remove/validate', async () => {
  const e = env0();
  eq((await adm(e, '/blocked', { method: 'POST', body: { ip: 'not an ip!' } })).status, 400);
  eq((await adm(e, '/blocked', { method: 'POST', body: { ip: '9.9.9.9', note: 'spam' } })).status, 200);
  let b = await j(await adm(e, '/blocked')); eq(b.rows.length, 1); eq(b.rows[0].note, 'spam');
  await post(e, { vid: V, kind: 'visit' }, { ip: '9.9.9.9' }); eq(rows(e).length, 0);
  eq((await adm(e, '/blocked', { method: 'DELETE', body: { ip: '9.9.9.9' } })).status, 200); b = await j(await adm(e, '/blocked')); eq(b.rows.length, 0);
});
await t('announcement set / public read / clear', async () => {
  const e = env0();
  eq((await j(await handle(req(B + '/api/announcement'), E(e), {}))).text, '');
  await adm(e, '/announcement', { method: 'POST', body: { text: '  Maintenance on Friday  ' } });
  eq((await j(await handle(req(B + '/api/announcement'), E(e), {}))).text, 'Maintenance on Friday');
  await adm(e, '/announcement', { method: 'POST', body: { text: '' } }); eq((await j(await handle(req(B + '/api/announcement'), E(e), {}))).text, '');
  eq((await handle(req(B + '/api/announcement', { origin: 'https://evil.example' }), E(e), {})).status, 403);
});
await t('purge: by age, by ip, all, validation; announcements need auth', async () => {
  const e = env0(); seed(e);
  eq((await adm(e, '/purge', { method: 'POST', body: {} })).status, 400); eq((await adm(e, '/purge', { method: 'POST', body: { olderThanDays: 'abc' } })).status, 400);
  let r = await j(await adm(e, '/purge', { method: 'POST', body: { olderThanDays: 30 } })); eq(r.deleted, 1);
  r = await j(await adm(e, '/purge', { method: 'POST', body: { ip: '1.1.1.1' } })); eq(r.deleted, 4); eq(rows(e).length, 2);
  r = await j(await adm(e, '/purge', { method: 'POST', body: { all: true } })); eq(r.deleted, 2); eq(rows(e).length, 0);
  eq((await handle(req(B + '/api/admin/purge', { method: 'POST', body: { all: true } }), E(e), {})).status, 401);
});
await t('automatic retention cleanup runs once a day', async () => {
  const e = env0(); e.RETENTION_DAYS = '30'; e.raw.prepare('INSERT INTO events (ts,vid,kind) VALUES (?,?,?)').run(Date.now() - 60 * 86400000, 'oldvisitor1', 'visit');
  await post(e, { vid: V, kind: 'visit' }); eq(rows(e).length, 1, 'old row removed, new row kept');
  e.raw.prepare('INSERT INTO events (ts,vid,kind) VALUES (?,?,?)').run(Date.now() - 60 * 86400000, 'oldvisitor2', 'visit'); await post(e, { vid: V, kind: 'visit' }); eq(rows(e).length, 3, 'not re-run within 24h');
});
await t('unknown routes', async () => { const e = env0(); eq((await handle(req(B + '/nope'), E(e), {})).status, 404); eq((await adm(e, '/nope')).status, 404); eq((await handle(req(B + '/api/collect'), E(e), {})).status, 404); });

console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
