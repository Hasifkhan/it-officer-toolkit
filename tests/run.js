/* Run with:  node tests/run.js   (no dependencies). Tests the pure logic only; UI is covered by tests/ui-smoke.js */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const dir = path.join(__dirname, '..', 'assets', 'js');
['storage', 'datatable', 'ip-tools', 'troubleshooting', 'command-library', 'report-generator', 'inventory', 'calculators', 'password']
  .forEach(function (f) { vm.runInThisContext(fs.readFileSync(path.join(dir, f + '.js'), 'utf8'), { filename: f + '.js' }); });
const ITK = globalThis.ITK, ip = ITK.ip, U = ITK.util;
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.log('FAIL: ' + name + '\n   ' + e.message); } }
const eq = assert.strictEqual;

t('valid IPv4', () => { ['0.0.0.0', '255.255.255.255', '192.168.1.1', ' 10.0.0.1 '].forEach(x => assert(ip.parseIPv4(x).ok, x)); });
t('invalid IPv4', () => { ['', '   ', '256.1.1.1', '1.2.3', '1.2.3.4.5', '1.2.3.', '1..3.4', 'a.b.c.d', '01.2.3.4', '1.2.3.4/24', '1.2.3. 4', '::1', '1.2.3.4:80', '-1.2.3.4'].forEach(x => assert(!ip.parseIPv4(x).ok, 'should reject "' + x + '"')); });
t('empty message', () => eq(ip.parseIPv4('').error, 'Enter an IPv4 address.'));
t('toStr/parse roundtrip', () => { ['1.2.3.4', '255.255.255.255', '128.0.0.1'].forEach(x => eq(ip.toStr(ip.parseIPv4(x).value), x)); });

function sn(a, p) { const r = ip.subnet(ip.parseIPv4(a).value, p); return { net: ip.toStr(r.network), mask: ip.toStr(r.mask), wc: ip.toStr(r.wildcard), bc: ip.toStr(r.broadcast), total: r.total, usable: r.usable, first: ip.toStr(r.first), last: ip.toStr(r.last) }; }
t('/8', () => { const r = sn('10.20.30.40', 8); eq(r.net, '10.0.0.0'); eq(r.mask, '255.0.0.0'); eq(r.wc, '0.255.255.255'); eq(r.bc, '10.255.255.255'); eq(r.total, 16777216); eq(r.usable, 16777214); eq(r.first, '10.0.0.1'); eq(r.last, '10.255.255.254'); });
t('/16', () => { const r = sn('172.16.5.9', 16); eq(r.net, '172.16.0.0'); eq(r.bc, '172.16.255.255'); eq(r.usable, 65534); });
t('/24', () => { const r = sn('192.168.1.77', 24); eq(r.net, '192.168.1.0'); eq(r.mask, '255.255.255.0'); eq(r.bc, '192.168.1.255'); eq(r.usable, 254); eq(r.first, '192.168.1.1'); eq(r.last, '192.168.1.254'); });
t('/30', () => { const r = sn('192.168.1.5', 30); eq(r.net, '192.168.1.4'); eq(r.bc, '192.168.1.7'); eq(r.usable, 2); eq(r.first, '192.168.1.5'); eq(r.last, '192.168.1.6'); });
t('/31', () => { const r = sn('192.168.1.5', 31); eq(r.net, '192.168.1.4'); eq(r.total, 2); eq(r.usable, 2); eq(r.first, '192.168.1.4'); eq(r.last, '192.168.1.5'); });
t('/32', () => { const r = sn('192.168.1.5', 32); eq(r.net, '192.168.1.5'); eq(r.mask, '255.255.255.255'); eq(r.total, 1); eq(r.usable, 1); eq(r.first, '192.168.1.5'); eq(r.last, '192.168.1.5'); });
t('/0', () => { const r = sn('8.8.8.8', 0); eq(r.net, '0.0.0.0'); eq(r.mask, '0.0.0.0'); eq(r.bc, '255.255.255.255'); eq(r.total, 4294967296); eq(r.usable, 4294967294); });
t('high-bit addresses stay unsigned', () => { const r = sn('200.100.50.25', 1); eq(r.net, '128.0.0.0'); eq(r.mask, '128.0.0.0'); eq(sn('255.255.255.255', 25).net, '255.255.255.128'); });
t('all prefixes consistent', () => { for (let p = 0; p <= 32; p++) { const r = ip.subnet(ip.parseIPv4('172.31.255.254').value, p); eq(r.network <= r.broadcast, true); eq(r.broadcast - r.network + 1, r.total); eq(((r.mask ^ r.wildcard) >>> 0), 0xFFFFFFFF); } });
t('prefix parsing', () => { eq(ip.parsePrefix('24').prefix, 24); eq(ip.parsePrefix('/24').prefix, 24); eq(ip.parsePrefix('255.255.255.0').prefix, 24); eq(ip.parsePrefix('255.255.255.252').prefix, 30); eq(ip.parsePrefix('0.0.0.0').prefix, 0); eq(ip.parsePrefix('255.255.255.255').prefix, 32); });
t('invalid prefixes', () => { ['', '33', '-1', 'abc', '24.5', '255.0.255.0', '255.255.255.1', '/', '1e1'].forEach(x => assert(!ip.parsePrefix(x).ok, 'should reject "' + x + '"')); });
t('range ok', () => { const r = ip.range('192.168.1.1', '192.168.1.50'); assert(r.ok); eq(r.count, 50); });
t('range single / reversed / invalid / huge', () => { eq(ip.range('1.1.1.1', '1.1.1.1').count, 1); assert(/reversed/.test(ip.range('1.1.1.9', '1.1.1.1').error)); assert(!ip.range('x', '1.1.1.1').ok); assert(!ip.range('1.1.1.1', '').ok); assert(!ip.range('10.0.0.0', '10.1.0.0').ok); eq(ip.range('10.0.0.0', '10.0.255.255').count, 65536); assert(!ip.range('0.0.0.0', '255.255.255.255').ok); });
t('classify', () => { eq(ip.classify(ip.parseIPv4('192.168.1.1').value).kind, 'Private'); eq(ip.classify(ip.parseIPv4('172.16.0.1').value).kind, 'Private'); eq(ip.classify(ip.parseIPv4('172.32.0.1').value).kind, 'Public'); eq(ip.classify(ip.parseIPv4('172.15.255.255').value).kind, 'Public'); eq(ip.classify(ip.parseIPv4('169.254.1.1').value).range, '169.254.0.0/16'); eq(ip.classify(ip.parseIPv4('127.0.0.1').value).label, 'Loopback'); eq(ip.classify(ip.parseIPv4('8.8.8.8').value).kind, 'Public'); eq(ip.classify(ip.parseIPv4('255.255.255.255').value).label, 'Limited broadcast'); eq(ip.classify(ip.parseIPv4('100.64.0.1').value).kind, 'Special'); eq(ip.classify(ip.parseIPv4('224.0.0.5').value).label, 'Multicast'); });
t('MAC formats', () => { ['aa:bb:cc:dd:ee:ff', 'AA-BB-CC-DD-EE-FF', 'aabb.ccdd.eeff', 'AABBCCDDEEFF'].forEach(x => { const m = ip.parseMAC(x); assert(m.ok, x); eq(m.colon, 'AA:BB:CC:DD:EE:FF'); eq(m.hyphen, 'AA-BB-CC-DD-EE-FF'); eq(m.dotted, 'aabb.ccdd.eeff'); }); });
t('MAC invalid', () => { ['', 'GG:BB:CC:DD:EE:FF', 'AA:BB:CC:DD:EE', 'AA:BB-CC:DD:EE:FF', 'AABBCCDDEEF', 'AA:BB:CC:DD:EE:FF:00'].forEach(x => assert(!ip.parseMAC(x).ok, x)); });
t('MAC flags', () => { assert(ip.parseMAC('01:00:5e:00:00:01').multicast); assert(ip.parseMAC('02:00:00:00:00:01').local); assert(ip.parseMAC('FF:FF:FF:FF:FF:FF').broadcast); assert(!ip.parseMAC('00:1A:2B:3C:4D:5E').multicast); });
t('bulk expand', () => { const r = ip.expandBulk('10.0.0.1, 10.0.0.2\n10.0.0.5-10.0.0.7 10.0.0.9'); eq(r.items.join(','), '10.0.0.1,10.0.0.2,10.0.0.5,10.0.0.6,10.0.0.7,10.0.0.9'); eq(r.problems.length, 0); assert(ip.expandBulk('10.0.0.1-10.0.10.1').problems.length === 1); assert(ip.expandBulk('10.0.0.9-10.0.0.1').problems.length === 1); });

/* CSV */
t('CSV roundtrip with quotes, commas, newlines', () => { const rows = [['a,b', 'he said "hi"', 'line1\nline2', '']]; const csv = U.toCSV(['x', 'y', 'z', 'w'], rows); const p = U.parseCSV(csv); eq(p.error, null); eq(p.rows.length, 2); eq(p.rows[1][0], 'a,b'); eq(p.rows[1][1], 'he said "hi"'); eq(p.rows[1][2], 'line1\nline2'); });
t('CSV formula injection neutralised and restored', () => { const csv = U.toCSV(['h'], [['=1+1'], ['@x'], ['-5']]); assert(csv.indexOf("'=1+1") !== -1); const p = U.parseCSV(csv); eq(p.rows[1][0], '=1+1'); eq(p.rows[3][0], '-5'); });
t('CSV malformed', () => { assert(U.parseCSV('a,b\n"unclosed,2\n').error); assert(U.parseCSV('a,b\nab"c,2\n').error); eq(U.parseCSV('').rows.length, 0); eq(U.parseCSV('a,b\r\n1,2\r\n\r\n').rows.length, 2); eq(U.parseCSV('﻿a;b\n1;2').rows[0][1], 'b'); });

/* Data table import with a minimal fake DOM-free path: build the validator through create() is DOM-bound, so test via a stub root */
t('data table import logic (duplicates, invalid rows, malformed)', () => {
  const mk = () => ({ innerHTML: '', addEventListener() {}, contains() { return false; }, querySelector() { return null; } });
  const els = {}; const el = (id) => els[id] || (els[id] = { id, value: '', checked: false, innerHTML: '', textContent: '', hidden: false, style: {}, addEventListener() {}, setAttribute() {}, removeAttribute() {}, reset() {}, focus() {}, scrollIntoView() {} });
  globalThis.document = { getElementById: el, createElement: () => ({}), querySelector: () => null };
  const api = ITK.dataTable.create(mk(), { name: 't', unique: 'ip', fields: [
    { key: 'ip', label: 'IP address', required: true, validate: v => ITK.ip.parseIPv4(v).ok ? null : 'bad ip' },
    { key: 'status', label: 'Status', type: 'select', options: ['Used', 'Free'], default: 'Free', required: true }] });
  let r = api.importCSVText('IP address,Status\n10.0.0.1,used\n10.0.0.1,Used\n10.0.0.300,Used\n10.0.0.2,Bogus\n10.0.0.3,Free\n');
  eq(r.added, 2); eq(r.dupes.length, 1); eq(r.invalid.length, 2);
  assert(api.importCSVText('Name\nx\n').error); assert(api.importCSVText('IP address,Status\n').error); assert(api.importCSVText('IP address\n"oops').error);
  eq(api.all().find(x => x.ip === '10.0.0.1').status, 'Used');
  r = api.addMany([{ ip: '10.0.0.3', status: 'Free' }, { ip: '10.0.0.9', status: 'Free' }]); eq(r.added, 1); eq(r.dupes.length, 1);
  delete globalThis.document;
});

/* Report */
const rp = ITK.report;
t('duration', () => { eq(rp.duration('09:00', '10:30').mins, 90); eq(rp.duration('', '').none, true); assert(rp.duration('09:00', '').error); assert(rp.duration('10:00', '09:00').error); assert(rp.duration('10:00', '10:00').error); assert(rp.duration('25:00', '26:00').error); eq(rp.duration('00:00', '23:59').mins, 1439); });
t('summary totals', () => { const s = rp.summary([{ status: 'Completed', start: '09:00', end: '10:00' }, { status: 'Pending', start: '10:00', end: '10:30' }, { status: 'In Progress' }, { status: 'Escalated', start: '11:00', end: '10:00' }]); eq(s.total, 4); eq(s.completed, 1); eq(s.open, 3); eq(s.minutes, 90); eq(s.timed, 2); });
t('report text does not invent data', () => { const txt = rp.buildText({ date: '2026-10-16', name: '', designation: '', department: '' }, [{ title: 'Fix printer', status: 'Completed', category: '', start: '', end: '', problem: '', action: 'Restarted spooler', resolution: '', pendingWork: '', next: '', remarks: '' }]); assert(!/Name:/.test(txt)); assert(/Recorded work duration: not recorded/.test(txt)); assert(/Action taken: Restarted spooler/.test(txt)); assert(!/Problem:/.test(txt)); });
t('report csv', () => { const c = rp.buildCSV({ date: 'd', name: 'n', designation: '', department: '' }, [{ title: 'a', category: 'Network', status: 'Completed', start: '09:00', end: '09:30', problem: '', action: '', resolution: '', pendingWork: '', next: '', remarks: '' }]); assert(c.indexOf(',30,') !== -1); });

/* Calculators */
const c = ITK.calc;
t('storage convert', () => { const m = Object.fromEntries(c.convert(c.STORAGE, 1, 'GiB')); eq(m.MiB, 1024); eq(m.B, 1073741824); const d = Object.fromEntries(c.convert(c.STORAGE, 500, 'GB')); assert(Math.abs(d.GiB - 465.661) < 0.001); });
t('speed convert', () => { const m = Object.fromEntries(c.convert(c.SPEED, 100, 'Mbps')); eq(m['MB/s'], 12.5); eq(m.Gbps, 0.1); eq(m.bps, 1e8); });
t('download time', () => { eq(c.downloadSeconds(1, 'GB', 8, 'Mbps', 100), 1000); eq(c.downloadSeconds(100, 'MB', 100, 'Mbps', 100), 8); eq(c.downloadSeconds(1, 'GB', 8, 'Mbps', 50), 2000); eq(c.fmtSeconds(3725), '1h 2m 5s'); });
t('uptime', () => { eq(c.uptimePct(1440, 0), 100); eq(c.uptimePct(1440, 144), 90); assert(Math.abs(c.allowedDowntimeMin(99.9, 525600) - 525.6) < 1e-6); assert(Math.abs(c.allowedDowntimeMin(99, 1440) - 14.4) < 1e-9); });
t('UPS runtime', () => { eq(c.upsRuntimeHours({ volts: 12, ah: 100, count: 2, loadW: 300, effPct: 100, usablePct: 100 }), 8); eq(c.upsRuntimeHours({ volts: 12, ah: 100, count: 2, loadW: 300, effPct: 85, usablePct: 50 }), 8 * 0.425); });
t('number validation', () => { ['', 'abc', '-5', '1,2,x', '0'].forEach(x => assert(!c.parsePositive(x).ok, x)); assert(c.parsePositive('0', true).ok); eq(c.parsePositive('1,500.5').value, 1500.5); eq(c.parsePositive(' 2e3 ').value, 2000); });

/* Password */
const pw = ITK.password;
t('password generation respects options', () => {
  for (let i = 0; i < 200; i++) { const r = pw.generate({ length: 12, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: true }); eq(r.password.length, 12); assert(/[a-z]/.test(r.password) && /[A-Z]/.test(r.password) && /\d/.test(r.password) && /[^A-Za-z0-9]/.test(r.password)); assert(!/[Il1O0o|`'"]/.test(r.password), r.password); }
  assert(/^\d{20}$/.test(pw.generate({ length: 20, digits: true }).password));
});
t('password errors', () => { assert.throws(() => pw.generate({ length: 16 })); assert.throws(() => pw.generate({ length: 2, lower: true, upper: true, digits: true })); assert.throws(() => pw.generate({ length: 16, lower: true }, {})); });
t('randInt unbiased range', () => { const seen = new Set(); for (let i = 0; i < 2000; i++) { const x = pw.randInt(7); assert(x >= 0 && x < 7); seen.add(x); } eq(seen.size, 7); });
t('strength assessment', () => { eq(pw.assess('').level, 0); assert(pw.assess('password').level <= 1); assert(pw.assess('123456').level === 1); assert(pw.assess('x7#Qp9!vLm2$Zr8w').level >= 3); assert(pw.assess('aaaaaaaaaaaa').level < pw.assess('abcdefghijkl').level + 1); });
t('password module never touches storage', () => { const src = fs.readFileSync(path.join(dir, 'password.js'), 'utf8'); assert(!/localStorage|sessionStorage|indexedDB|ITK\.storage|document\.cookie/.test(src.replace(/\/\*[\s\S]*?\*\//, '').replace(/\/\/.*$/gm, '').replace(/'[^']*LocalStorage[^']*'/g, ''))); });

/* Content integrity */
t('guides complete', () => { const G = ITK.data.guides; eq(G.filter(x => x.cat === 'network').length, 14); eq(G.filter(x => x.cat === 'hardware').length, 16); assert(G.filter(x => x.cat === 'printer').length >= 9); G.forEach(x => { ['title', 'desc'].forEach(k => assert(x[k], x.id + ' ' + k)); ['symptoms', 'causes', 'steps', 'fixes', 'escalate'].forEach(k => assert(x[k].length > 0, x.id + ' ' + k)); assert(x.bn, x.id + ' bn'); }); eq(new Set(G.map(x => x.id)).size, G.length); });
t('required commands present', () => { const all = ITK.data.commands.map(x => x.cmd).join('\n'); ['ipconfig', 'ipconfig /all', 'ipconfig /flushdns', 'ipconfig /release', 'ipconfig /renew', 'ping ', 'tracert', 'pathping', 'nslookup', 'arp -a', 'route print', 'netstat', 'hostname', 'whoami', 'systeminfo', 'sfc /scannow', 'DISM /Online /Cleanup-Image /RestoreHealth', 'chkdsk', 'powercfg /batteryreport', 'gpupdate /force', 'tasklist', 'Get-NetIPConfiguration', 'Get-ComputerInfo'].forEach(x => assert(all.indexOf(x) !== -1, x)); ITK.data.commands.forEach(x => ['name', 'cmd', 'purpose', 'when', 'priv', 'risk'].forEach(k => assert(x[k], x.name + ' ' + k))); });
t('tools registered with unique ids', () => { const ids = ITK.tools.map(x => x.id); eq(new Set(ids).size, ids.length); ['ipv4-validator', 'subnet-calc', 'range-generator', 'ip-tracker', 'ip-mac-utils', 'net-guides', 'commands', 'daily-report', 'hw-guides', 'printer-guides', 'inventory', 'storage-converter', 'speed-converter', 'download-time', 'uptime-calc', 'ups-runtime', 'ports', 'dns-records', 'http-codes', 'windows-errors', 'checklists', 'password-tools'].forEach(i => assert(ids.indexOf(i) !== -1, i)); });
t('storage wrapper without localStorage falls back to memory', () => { eq(ITK.storage.available(), false); ITK.storage.set('k', { a: 1 }); eq(ITK.storage.get('k').a, 1); eq(ITK.storage.set('z', 1), false); ITK.storage.clearAll(); eq(ITK.storage.get('k', 'd'), 'd'); });
t('esc', () => eq(U.esc('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;'));

/* Usage stats (cookie) */
t('usage stats persist in a cookie, counts only, can be disabled/reset', () => {
  const jar = {}; globalThis.document = { get cookie() { return Object.keys(jar).map(k => k + '=' + jar[k]).join('; '); }, set cookie(v) { const [kv, ...attrs] = v.split('; '); const i = kv.indexOf('='); const k = kv.slice(0, i), val = kv.slice(i + 1); if (attrs.some(a => a === 'max-age=0')) delete jar[k]; else jar[k] = val; } };
  const st = ITK.stats; st.reset();
  st.inc('inv', 2); st.inc('pw', 3); st.inc('inv'); st.tool('subnet-calc'); st.tool('subnet-calc'); st.inc('bogus', 5); st.inc('t', 5); st.inc('pw', -4); st.inc('pw', 0);
  assert(jar.itk_usage, 'cookie written'); const raw = decodeURIComponent(jar.itk_usage), o = JSON.parse(raw);
  eq(o.inv, 3); eq(o.pw, 3); eq(o.t['subnet-calc'], 2); assert(!('bogus' in o)); eq(st.via(), 'cookie');
  st.inc('pw', 'x'); eq(JSON.parse(decodeURIComponent(jar.itk_usage)).pw, 3);
  st.setEnabled(false); assert(!jar.itk_usage); eq(jar.itk_stats_off, '1'); st.inc('inv', 5); assert(!jar.itk_usage); eq(st.get().inv, 0);
  st.setEnabled(true); st.inc('pw', 1); eq(JSON.parse(decodeURIComponent(jar.itk_usage)).pw, 1);
  for (let i = 0; i < 60; i++) st.tool('tool-number-' + i + '-xxxxxxxxxxxxxxxxxxxx'); assert(decodeURIComponent(jar.itk_usage).length < 3200, 'cookie stays small');
  st.reset(); assert(!jar.itk_usage); eq(st.get().pw, 0);
  delete globalThis.document;
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
