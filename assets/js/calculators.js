/* calculators.js — Module H: calculators, quick reference tables and checklists */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc;
  const calc = {};
  ITK.calc = calc;

  /* ---------- pure logic ---------- */
  calc.STORAGE = [['B', 1], ['KB', 1e3], ['MB', 1e6], ['GB', 1e9], ['TB', 1e12], ['PB', 1e15], ['KiB', 1024], ['MiB', Math.pow(1024, 2)], ['GiB', Math.pow(1024, 3)], ['TiB', Math.pow(1024, 4)], ['PiB', Math.pow(1024, 5)]];
  calc.SPEED = [['bps', 1], ['Kbps', 1e3], ['Mbps', 1e6], ['Gbps', 1e9], ['Tbps', 1e12], ['B/s', 8], ['KB/s', 8e3], ['MB/s', 8e6], ['GB/s', 8e9], ['KiB/s', 8 * 1024], ['MiB/s', 8 * Math.pow(1024, 2)]];
  function factor(table, unit) { const r = table.find(function (x) { return x[0] === unit; }); return r ? r[1] : NaN; }
  calc.parsePositive = function (s, allowZero) {
    const t = String(s == null ? '' : s).trim().replace(/,/g, '');
    if (t === '') return { ok: false, error: 'Enter a number.' };
    if (!/^[+]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return { ok: false, error: '“' + t + '” is not a valid number.' };
    const n = Number(t);
    if (!isFinite(n)) return { ok: false, error: 'Number is too large.' };
    if (n === 0 && !allowZero) return { ok: false, error: 'Value must be greater than 0.' };
    return { ok: true, value: n };
  };
  calc.convert = function (table, value, unit) { const base = value * factor(table, unit); return table.map(function (r) { return [r[0], base / r[1]]; }); };
  calc.downloadSeconds = function (sizeValue, sizeUnit, speedValue, speedUnit, efficiencyPct) {
    const bits = sizeValue * factor(calc.STORAGE, sizeUnit) * 8;
    const bps = speedValue * factor(calc.SPEED, speedUnit) * (efficiencyPct / 100);
    return bits / bps;
  };
  calc.fmtSeconds = function (sec) {
    if (!isFinite(sec)) return '—';
    if (sec < 1) return '< 1 second';
    sec = Math.round(sec);
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60, p = [];
    if (d) p.push(d + 'd'); if (h) p.push(h + 'h'); if (m) p.push(m + 'm'); if (s && !d) p.push(s + 's');
    return p.join(' ');
  };
  calc.uptimePct = function (totalMinutes, downMinutes) { return (1 - downMinutes / totalMinutes) * 100; };
  calc.allowedDowntimeMin = function (pct, periodMinutes) { return periodMinutes * (1 - pct / 100); };
  calc.upsRuntimeHours = function (o) {
    // o: {volts, ah, count, loadW, effPct, usablePct}
    const wh = o.volts * o.ah * o.count;
    return wh * (o.usablePct / 100) * (o.effPct / 100) / o.loadW;
  };

  /* ---------- UI helpers ---------- */
  function numField(id, label, val, help, extra) {
    return U.field(id, label, '<input class="input" id="' + id + '" inputmode="decimal" autocomplete="off" value="' + esc(val == null ? '' : val) + '" ' + (extra || '') + ' aria-describedby="' + id + '-err' + (help ? ' ' + id + '-help' : '') + '">', help);
  }
  function unitSel(id, label, table, def) {
    return U.field(id, label, '<select class="select" id="' + id + '">' + table.map(function (r) { return '<option' + (r[0] === def ? ' selected' : '') + '>' + r[0] + '</option>'; }).join('') + '</select>');
  }
  function readNum(root, id, opts) {
    opts = opts || {};
    const r = calc.parsePositive(U.$('#' + id, root).value, opts.zero), er = U.$('#' + id + '-err', root);
    if (!r.ok) { er.textContent = r.error; return null; }
    if (opts.min !== undefined && r.value < opts.min) { er.textContent = 'Must be at least ' + opts.min + '.'; return null; }
    if (opts.max !== undefined && r.value > opts.max) { er.textContent = 'Must be at most ' + opts.max + '.'; return null; }
    er.textContent = ''; return r.value;
  }
  function simpleCalc(def) {
    ITK.register({
      id: def.id, cat: 'calc', icon: def.icon || 'calculator', title: def.title, desc: def.desc, keywords: def.keywords,
      render: function (root) {
        root.innerHTML = '<section class="card"><form id="cf" novalidate>' + def.form + '<div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" type="submit">Calculate</button></div></form></section><div id="cout" aria-live="polite"></div>' +
          '<section class="card"><h2>Assumptions & limitations</h2><ul>' + def.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></section>';
        U.$('#cf', root).addEventListener('submit', function (e) { e.preventDefault(); def.run(root, U.$('#cout', root)); });
        if (def.live) { U.$$('input,select', root).forEach(function (el) { el.addEventListener('input', function () { def.run(root, U.$('#cout', root)); }); }); def.run(root, U.$('#cout', root)); }
      }
    });
  }
  function resultTable(rows) {
    return '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Unit</th><th>Value</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="mono">' + esc(U.fmtNum(r[1])) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  }

  /* ---------- H1: storage ---------- */
  simpleCalc({
    id: 'storage-converter', title: 'Storage Unit Converter', icon: 'box', desc: 'Convert bytes, KB/MB/GB/TB (decimal) and KiB/MiB/GiB/TiB (binary).', keywords: 'storage convert bytes kb mb gb tb gib mib size capacity',
    form: '<div class="form-grid">' + numField('c-v', 'Value', '256') + unitSel('c-u', 'Unit', calc.STORAGE, 'GB') + '</div>', live: true,
    notes: ['KB/MB/GB/TB use 1,000 (how disk makers label drives). KiB/MiB/GiB/TiB use 1,024.', 'Windows shows binary sizes but labels them GB/TB, which is why a “500 GB” drive appears as about 465 GB.', 'Very large values lose precision beyond about 15 significant digits.'],
    run: function (root, out) { const v = readNum(root, 'c-v', { zero: true }); if (v === null) { out.innerHTML = ''; return; } out.innerHTML = resultTable(calc.convert(calc.STORAGE, v, U.$('#c-u', root).value)); }
  });
  /* ---------- H2: speed ---------- */
  simpleCalc({
    id: 'speed-converter', title: 'Network Speed Converter', icon: 'wifi', desc: 'Convert between bits per second (Mbps) and bytes per second (MB/s).', keywords: 'speed mbps gbps bandwidth bits bytes convert megabit megabyte',
    form: '<div class="form-grid">' + numField('c-v', 'Value', '100') + unitSel('c-u', 'Unit', calc.SPEED, 'Mbps') + '</div>', live: true,
    notes: ['1 byte = 8 bits, so 100 Mbps is at most 12.5 MB/s (decimal) before overhead.', 'Network units (Kbps, Mbps, Gbps) are decimal (1,000). MiB/s and KiB/s are binary (1,024).', 'Real transfer speed is lower than line rate because of protocol overhead, Wi-Fi conditions and server limits.'],
    run: function (root, out) { const v = readNum(root, 'c-v', { zero: true }); if (v === null) { out.innerHTML = ''; return; } out.innerHTML = resultTable(calc.convert(calc.SPEED, v, U.$('#c-u', root).value)); }
  });
  /* ---------- H3: download time ---------- */
  simpleCalc({
    id: 'download-time', title: 'Download Time Estimator', icon: 'download', desc: 'Estimate how long a file takes to transfer at a given speed.', keywords: 'download time estimate transfer file size speed backup copy',
    form: '<div class="form-grid">' + numField('d-s', 'File size', '4.7') + unitSel('d-su', 'Size unit', calc.STORAGE, 'GB') + numField('d-v', 'Connection speed', '50') + unitSel('d-vu', 'Speed unit', calc.SPEED, 'Mbps') + numField('d-e', 'Effective throughput (%)', '85', 'Share of the line speed you actually get. Typical: 80–95% wired, 40–70% Wi-Fi.') + '</div>',
    notes: ['Time = file size in bits ÷ (speed × efficiency). The efficiency value is an assumption you can change.', 'Assumes a constant speed, one transfer and no throttling, retries or server limits.', 'Real times vary with congestion, Wi-Fi quality, disk speed and protocol overhead.'],
    run: function (root, out) {
      const s = readNum(root, 'd-s'), v = readNum(root, 'd-v'), e = readNum(root, 'd-e', { min: 1, max: 100 });
      if (s === null || v === null || e === null) { out.innerHTML = ''; return; }
      const sec = calc.downloadSeconds(s, U.$('#d-su', root).value, v, U.$('#d-vu', root).value, e);
      out.innerHTML = '<section class="card"><div class="tiles"><div class="tile"><b>' + esc(calc.fmtSeconds(sec)) + '</b><span>Estimated time</span></div><div class="tile"><b>' + esc(U.fmtNum(sec)) + '</b><span>Seconds</span></div></div></section>';
    }
  });
  /* ---------- H4: uptime ---------- */
  const PERIODS = [['Day (24 h)', 1440], ['Week (7 days)', 10080], ['Month (30 days)', 43200], ['Year (365 days)', 525600]];
  simpleCalc({
    id: 'uptime-calc', title: 'Uptime & Downtime Calculator', icon: 'clock', desc: 'Work out uptime % from downtime, or allowed downtime for an uptime target (SLA).', keywords: 'uptime downtime sla availability nines 99.9 percentage',
    form: '<h3>A. Uptime % from downtime</h3><div class="form-grid">' + U.field('u-p', 'Period', '<select class="select" id="u-p">' + PERIODS.map(function (p) { return '<option value="' + p[1] + '">' + p[0] + '</option>'; }).join('') + '</select>') + numField('u-d', 'Total downtime (minutes)', '45') + '</div>' +
      '<h3 style="margin-top:16px">B. Allowed downtime for a target</h3><div class="form-grid">' + numField('u-t', 'Uptime target (%)', '99.9', 'Examples: 99, 99.9, 99.99, 99.999') + '</div>',
    notes: ['Uptime % = (period − downtime) ÷ period × 100. Months use 30 days and years 365 days.', 'Downtime must be measured the same way as the SLA (e.g. excluding planned maintenance if the SLA does).', 'Results are arithmetic only; they do not monitor anything.'],
    run: function (root, out) {
      const total = Number(U.$('#u-p', root).value), d = readNum(root, 'u-d', { zero: true }), t = readNum(root, 'u-t', { min: 0, max: 100, zero: true });
      let html = '';
      if (d !== null) {
        if (d > total) U.$('#u-d-err', root).textContent = 'Downtime cannot be longer than the period (' + total + ' min).';
        else html += '<section class="card"><h2>Uptime</h2><div class="tiles"><div class="tile"><b>' + calc.uptimePct(total, d).toFixed(4) + '%</b><span>Uptime over the period</span></div><div class="tile"><b>' + esc(U.fmtDuration(d)) + '</b><span>Downtime</span></div></div></section>';
      }
      if (t !== null) {
        html += '<section class="card"><h2>Allowed downtime at ' + esc(String(t)) + '%</h2><div class="table-wrap"><table class="table"><thead><tr><th>Per</th><th>Allowed downtime</th></tr></thead><tbody>' +
          PERIODS.map(function (p) { const m = calc.allowedDowntimeMin(t, p[1]); return '<tr><td>' + p[0] + '</td><td>' + esc(m >= 1 ? U.fmtDuration(m) + (m < 120 ? ' (' + (m * 60).toFixed(0) + ' s)' : '') : (m * 60).toFixed(1) + ' seconds') + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
      }
      out.innerHTML = html;
    }
  });
  /* ---------- H5: UPS ---------- */
  simpleCalc({
    id: 'ups-runtime', title: 'UPS / Battery Runtime Estimator', icon: 'clock', desc: 'Rough backup time from battery capacity, load and efficiency.', keywords: 'ups ips battery runtime backup time watt load inverter ah volt',
    form: '<div class="form-grid">' + numField('p-l', 'Total load (W)', '300', 'Sum of connected devices’ real power in watts. If you only know VA, multiply by the power factor (often 0.6–0.9).') + numField('p-v', 'Battery voltage (V)', '12') + numField('p-a', 'Battery capacity (Ah each)', '100') + numField('p-n', 'Number of batteries', '2') + numField('p-e', 'Inverter efficiency (%)', '85') + numField('p-u', 'Usable battery capacity (%)', '50', 'Lead-acid batteries last longer if only ~50% is used; lithium may allow 80–90%.') + '</div>',
    notes: ['Runtime (h) = V × Ah × batteries × usable% × efficiency% ÷ load (W). Battery bank energy is the same whether wired in series or parallel.', 'Assumes new, fully charged batteries, constant load and room temperature.', 'Real runtime is usually lower: batteries age, and high loads drain lead-acid batteries faster than the Ah rating suggests (Peukert effect).', 'Inverter standby consumption and UPS self-test are ignored. Treat the result as a planning estimate and test the real system.'],
    run: function (root, out) {
      const l = readNum(root, 'p-l', { max: 100000 }), v = readNum(root, 'p-v', { max: 400 }), a = readNum(root, 'p-a', { max: 10000 }), n = readNum(root, 'p-n', { max: 100 }), e = readNum(root, 'p-e', { min: 50, max: 100 }), u = readNum(root, 'p-u', { min: 10, max: 100 });
      if ([l, v, a, n, e, u].some(function (x) { return x === null; })) { out.innerHTML = ''; return; }
      const h = calc.upsRuntimeHours({ volts: v, ah: a, count: n, loadW: l, effPct: e, usablePct: u });
      out.innerHTML = '<section class="card"><div class="tiles"><div class="tile"><b>' + esc(U.fmtDuration(h * 60)) + '</b><span>Estimated runtime</span></div><div class="tile"><b>' + esc(U.fmtNum(v * a * n)) + ' Wh</b><span>Total battery energy</span></div><div class="tile"><b>' + esc(U.fmtNum(v * a * n * u / 100 * e / 100)) + ' Wh</b><span>Usable energy delivered</span></div></div></section>';
    }
  });

  /* ---------- reference tables ---------- */
  function port(p, pr, s, d, n) { return { port: p, proto: pr, service: s, desc: d, note: n || '' }; }
  const PORTS = [
    port('20-21', 'TCP', 'FTP', 'File Transfer Protocol (20 data, 21 control)', 'Unencrypted — prefer SFTP/FTPS'), port('22', 'TCP', 'SSH / SFTP', 'Secure shell and secure file transfer', ''), port('23', 'TCP', 'Telnet', 'Remote terminal', 'Unencrypted — avoid'),
    port('25', 'TCP', 'SMTP', 'Mail transfer between servers', ''), port('53', 'TCP/UDP', 'DNS', 'Name resolution', ''), port('67-68', 'UDP', 'DHCP', 'Server 67, client 68', ''), port('69', 'UDP', 'TFTP', 'Trivial file transfer (device configs)', 'No authentication'),
    port('80', 'TCP', 'HTTP', 'Web', ''), port('88', 'TCP/UDP', 'Kerberos', 'Active Directory authentication', ''), port('110', 'TCP', 'POP3', 'Mail retrieval', 'Unencrypted'), port('123', 'UDP', 'NTP', 'Time synchronisation', ''),
    port('135', 'TCP', 'MS RPC', 'Windows RPC endpoint mapper', 'Do not expose to the internet'), port('137-139', 'TCP/UDP', 'NetBIOS', 'Legacy name/session services (137/138 UDP, 139 TCP)', 'Legacy'), port('143', 'TCP', 'IMAP', 'Mail access', 'Unencrypted'),
    port('161-162', 'UDP', 'SNMP', 'Network device monitoring (162 = traps)', 'Use SNMPv3'), port('389', 'TCP/UDP', 'LDAP', 'Directory services', ''), port('443', 'TCP', 'HTTPS', 'Secure web', ''), port('445', 'TCP', 'SMB', 'Windows file and printer sharing', 'Never expose to the internet'),
    port('464', 'TCP/UDP', 'Kerberos password change', 'AD password changes', ''), port('465', 'TCP', 'SMTPS', 'Implicit-TLS mail submission', ''), port('500', 'UDP', 'IKE (IPsec)', 'VPN key exchange', ''), port('514', 'UDP', 'Syslog', 'Log forwarding', ''),
    port('515', 'TCP', 'LPD', 'Line printer daemon', ''), port('554', 'TCP/UDP', 'RTSP', 'Streaming; used by IP cameras', ''), port('587', 'TCP', 'SMTP submission', 'Mail client to server (STARTTLS)', ''), port('631', 'TCP', 'IPP', 'Internet Printing Protocol', ''),
    port('636', 'TCP', 'LDAPS', 'LDAP over TLS', ''), port('853', 'TCP', 'DNS over TLS', 'Encrypted DNS', ''), port('993', 'TCP', 'IMAPS', 'Secure IMAP', ''), port('995', 'TCP', 'POP3S', 'Secure POP3', ''),
    port('1433', 'TCP', 'MS SQL Server', 'Database', 'Do not expose'), port('1521', 'TCP', 'Oracle DB', 'Database listener', 'Do not expose'), port('1701', 'UDP', 'L2TP', 'VPN tunnelling', ''), port('1723', 'TCP', 'PPTP', 'Legacy VPN', 'Insecure — avoid'),
    port('1812-1813', 'UDP', 'RADIUS', 'Authentication / accounting', ''), port('2049', 'TCP/UDP', 'NFS', 'Unix network file system', ''), port('3268-3269', 'TCP', 'AD Global Catalog', '3269 is LDAPS', ''), port('3306', 'TCP', 'MySQL / MariaDB', 'Database', 'Do not expose'),
    port('3389', 'TCP/UDP', 'RDP', 'Windows Remote Desktop', 'Do not expose directly to the internet'), port('4500', 'UDP', 'IPsec NAT-T', 'VPN through NAT', ''), port('5060-5061', 'TCP/UDP', 'SIP', 'VoIP signalling (5061 = TLS)', ''), port('5432', 'TCP', 'PostgreSQL', 'Database', 'Do not expose'),
    port('5900', 'TCP', 'VNC', 'Remote desktop', 'Weak by default — tunnel it'), port('5985-5986', 'TCP', 'WinRM', 'PowerShell remoting (5986 = HTTPS)', ''), port('6379', 'TCP', 'Redis', 'In-memory database', 'Do not expose'), port('8080', 'TCP', 'HTTP alternate', 'Proxies and admin pages', ''),
    port('8443', 'TCP', 'HTTPS alternate', 'Admin consoles', ''), port('9100', 'TCP', 'RAW / JetDirect', 'Direct network printing', ''), port('27017', 'TCP', 'MongoDB', 'Database', 'Do not expose'), port('37777', 'TCP', 'Dahua DVR/NVR', 'Vendor service port (default)', 'Vendor-specific')
  ];
  const DNS = [
    ['A', 'Maps a name to an IPv4 address', 'example.com. A 93.184.216.34', 'nslookup -type=A example.com'], ['AAAA', 'Maps a name to an IPv6 address', 'example.com. AAAA 2606:2800:220:1::1', 'nslookup -type=AAAA example.com'],
    ['CNAME', 'Alias pointing to another name', 'www.example.com. CNAME example.com.', 'nslookup -type=CNAME www.example.com'], ['MX', 'Mail servers for the domain (lower priority number = preferred)', 'example.com. MX 10 mail.example.com.', 'nslookup -type=MX example.com'],
    ['NS', 'Authoritative name servers for the zone', 'example.com. NS ns1.example.net.', 'nslookup -type=NS example.com'], ['TXT', 'Free text; used for SPF, DKIM, DMARC and domain verification', 'example.com. TXT "v=spf1 include:_spf.example.com ~all"', 'nslookup -type=TXT example.com'],
    ['PTR', 'Reverse lookup: IP to name', '34.216.184.93.in-addr.arpa. PTR example.com.', 'nslookup 93.184.216.34'], ['SOA', 'Start of authority: primary server, serial and timers for a zone', 'example.com. SOA ns1.example.net. admin.example.com. 2024010101 7200 3600 1209600 3600', 'nslookup -type=SOA example.com'],
    ['SRV', 'Locates a service by host and port (used by AD, SIP)', '_ldap._tcp.example.com. SRV 0 100 389 dc1.example.com.', 'nslookup -type=SRV _ldap._tcp.example.com'], ['CAA', 'Which certificate authorities may issue certificates', 'example.com. CAA 0 issue "letsencrypt.org"', 'nslookup -type=CAA example.com'],
    ['SPF (TXT)', 'Which servers may send mail for the domain', 'v=spf1 ip4:203.0.113.10 include:_spf.example.com -all', 'nslookup -type=TXT example.com'], ['DMARC (TXT)', 'Policy for mail failing SPF/DKIM, at _dmarc.<domain>', '_dmarc.example.com. TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"', 'nslookup -type=TXT _dmarc.example.com']
  ].map(function (r) { return { type: r[0], desc: r[1], example: r[2], cmd: r[3] }; });
  const HTTP = [
    [100, 'Continue', 'Server received the request headers; client may continue.'], [101, 'Switching Protocols', 'Protocol upgrade (e.g. WebSocket).'], [200, 'OK', 'Request succeeded.'], [201, 'Created', 'A new resource was created.'], [202, 'Accepted', 'Accepted for processing, not finished.'], [204, 'No Content', 'Success with no body.'], [206, 'Partial Content', 'Range request fulfilled (resumed downloads).'],
    [301, 'Moved Permanently', 'Resource has a new permanent URL.'], [302, 'Found', 'Temporary redirect.'], [304, 'Not Modified', 'Cached copy is still valid.'], [307, 'Temporary Redirect', 'Temporary redirect keeping the HTTP method.'], [308, 'Permanent Redirect', 'Permanent redirect keeping the HTTP method.'],
    [400, 'Bad Request', 'Malformed request. Check the URL, headers and body.'], [401, 'Unauthorized', 'Authentication required or failed. Check credentials/token.'], [403, 'Forbidden', 'Authenticated but not allowed (permissions, firewall, IP restriction).'], [404, 'Not Found', 'URL does not exist. Check path, DNS and web-server config.'],
    [405, 'Method Not Allowed', 'HTTP method not supported on this URL.'], [407, 'Proxy Authentication Required', 'Proxy needs credentials.'], [408, 'Request Timeout', 'Server timed out waiting for the request.'], [409, 'Conflict', 'Request conflicts with current resource state.'], [410, 'Gone', 'Permanently removed.'],
    [413, 'Payload Too Large', 'Upload exceeds a server limit.'], [414, 'URI Too Long', 'URL is too long.'], [415, 'Unsupported Media Type', 'Wrong Content-Type.'], [429, 'Too Many Requests', 'Rate limited. Slow down and retry later.'],
    [500, 'Internal Server Error', 'Server-side fault. Check application and server logs.'], [501, 'Not Implemented', 'Server does not support the requested feature.'], [502, 'Bad Gateway', 'Proxy/gateway got an invalid response from the upstream server.'], [503, 'Service Unavailable', 'Server overloaded or down for maintenance.'],
    [504, 'Gateway Timeout', 'Proxy/gateway timed out waiting for the upstream server.'], [505, 'HTTP Version Not Supported', 'Unsupported HTTP version.']
  ].map(function (r) { return { code: r[0], name: r[1], desc: r[2] }; });
  const WINERR = [
    ['0x80070005', 'Access is denied', 'Permission problem. Run as administrator or fix file/registry/share permissions.'], ['0x80070002', 'File not found', 'Missing file or path; common in Windows Update (corrupt update cache).'], ['0x80070003', 'Path not found', 'The folder path does not exist.'],
    ['0x80070057', 'The parameter is incorrect', 'Invalid setting/argument; seen with disk, backup and update tools.'], ['0x80004005', 'Unspecified error', 'Generic failure — check Event Viewer and the operation’s logs.'], ['0x8007000E', 'Not enough memory', 'Out of memory; close apps or add RAM.'],
    ['0x80070020', 'Sharing violation', 'File is in use by another process.'], ['0x80070035', 'The network path was not found', 'Host offline, name not resolving, or SMB blocked. See “Cannot Access Shared Folder”.'], ['0x800704CF', 'The network location cannot be reached', 'Network path/SMB/name resolution failure.'],
    ['0x80070422', 'Service cannot be started (disabled)', 'Windows Update or another service is disabled. Set it to Manual/Automatic in services.msc.'], ['0x80070643', 'Fatal error during installation', 'MSI/update install failed; repair the installer or .NET, check Windows Installer service.'], ['0x80070570', 'The file or directory is corrupted and unreadable', 'Disk or file corruption; run chkdsk and sfc.'],
    ['0x8007045D', 'The request could not be performed because of an I/O device error', 'Failing disk/USB/cable; test hardware and back up.'], ['0x80070BC2', 'Restart required', 'A pending restart is blocking the update; reboot.'], ['0x80073712', 'A file needed by Windows Update is missing or damaged', 'Run DISM /RestoreHealth then sfc /scannow.'],
    ['0x800F081F', 'The source files could not be found', 'DISM/feature install cannot find source; use a repair source or Windows Update.'], ['0x800F0922', 'Windows Update / feature installation failed', 'Often low System Reserved partition space or network/VPN; free space, retry without VPN.'], ['0x80072EE7', 'The server name or address could not be resolved', 'DNS failure for the update/online server.'],
    ['0x80072EFD', 'A connection with the server could not be established', 'Proxy/firewall/network blocking the connection.'], ['0x8024402C', 'Windows Update could not connect to the update server', 'Proxy or DNS configuration problem.'], ['0x80244022', 'Windows Update server returned HTTP 503', 'Server busy or unavailable; retry later.'],
    ['0x0000011B', 'Operation failed (printer connection)', 'Seen when connecting to shared printers after certain Windows security updates; needs senior engineer review of the print server/client settings.'], ['0x00000709', 'Operation could not be completed (printer default / connect)', 'Printer connection or default-printer policy problem.'], ['0x00000BCB', 'Cannot connect to printer (driver)', 'Printer driver issue on connect; check driver and Point-and-Print policy.'],
    ['System error 5', 'Access is denied', 'Insufficient rights for net/sc commands; run elevated or check permissions.'], ['System error 53', 'The network path was not found', 'Host name not resolved or SMB blocked.'], ['System error 67', 'The network name cannot be found', 'Share name wrong or not published.'], ['System error 1219', 'Multiple connections to a server by the same user are not allowed', 'Disconnect existing connections (net use * /delete) and reconnect with one account.'], ['Error 1068', 'The dependency service or group failed to start', 'A required service is stopped; start dependencies in services.msc.'],
    ['CRITICAL_PROCESS_DIED (0xEF)', 'BSOD: a critical system process ended', 'Driver or system file corruption; run sfc/DISM, check recent updates and drivers.'], ['INACCESSIBLE_BOOT_DEVICE (0x7B)', 'BSOD: Windows cannot access the boot volume', 'Storage controller/driver or disk problem; check BIOS SATA/AHCI mode and disk.'], ['IRQL_NOT_LESS_OR_EQUAL (0xA)', 'BSOD: driver accessed invalid memory', 'Faulty driver or RAM; update/rollback drivers, test memory.'],
    ['PAGE_FAULT_IN_NONPAGED_AREA (0x50)', 'BSOD: invalid memory reference', 'Bad RAM, driver or disk corruption.'], ['MEMORY_MANAGEMENT (0x1A)', 'BSOD: severe memory-management error', 'Test RAM, remove overclocks.'], ['KERNEL_SECURITY_CHECK_FAILURE (0x139)', 'BSOD: kernel integrity check failed', 'Driver or memory corruption; update drivers, sfc/DISM.'], ['UNMOUNTABLE_BOOT_VOLUME (0xED)', 'BSOD: boot volume cannot be mounted', 'File-system corruption; chkdsk from recovery, check disk health.'],
    ['DPC_WATCHDOG_VIOLATION (0x133)', 'BSOD: driver took too long', 'Often storage/firmware drivers; update SSD firmware and chipset/storage drivers.'], ['WHEA_UNCORRECTABLE_ERROR (0x124)', 'BSOD: hardware error reported', 'CPU/RAM/board hardware or overheating; check temperatures and hardware.']
  ].map(function (r) { return { code: r[0], name: r[1], desc: r[2] }; });
  ITK.data.ports = PORTS; ITK.data.dns = DNS; ITK.data.http = HTTP; ITK.data.winerr = WINERR;

  function refTool(def) {
    ITK.register({
      id: def.id, cat: 'reference', icon: 'book', title: def.title, desc: def.desc, keywords: def.keywords,
      render: function (root, params) {
        root.innerHTML = (def.intro || '') + '<section class="card"><div class="field"><label for="rq">Search</label><input class="input" id="rq" type="search" autocomplete="off" placeholder="' + esc(def.placeholder) + '" value="' + esc(params.q || '') + '"></div><p class="muted" id="rc" style="margin:8px 0 0" aria-live="polite"></p></section>' +
          '<div class="table-wrap"><table class="table"><thead><tr>' + def.cols.map(function (c) { return '<th scope="col">' + esc(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody id="rb"></tbody></table></div>';
        const q = U.$('#rq', root), body = U.$('#rb', root);
        function draw() {
          const toks = q.value.toLowerCase().split(/\s+/).filter(Boolean);
          const rows = def.rows.filter(function (r) { const h = def.cols.map(function (c) { return String(r[c[1]]); }).join(' ').toLowerCase(); return toks.every(function (t) { return h.indexOf(t) !== -1; }); });
          U.$('#rc', root).textContent = rows.length + ' of ' + def.rows.length + ' entries';
          body.innerHTML = rows.length ? rows.map(function (r) { return '<tr>' + def.cols.map(function (c) { const v = c[2] ? c[2](r) : esc(r[c[1]]); return '<td>' + v + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + def.cols.length + '" class="empty">No entries match “' + esc(q.value) + '”.</td></tr>';
        }
        q.addEventListener('input', U.debounce(draw, 120)); draw();
      }
    });
  }
  refTool({ id: 'ports', title: 'TCP/UDP Port Reference', desc: PORTS.length + ' common ports with protocol, service and security notes.', keywords: 'port tcp udp 80 443 445 3389 22 53 service number', placeholder: 'e.g. 3389, rdp, dns, printer', rows: PORTS,
    cols: [['Port', 'port', function (r) { return '<span class="mono">' + esc(r.port) + '</span>'; }], ['Protocol', 'proto'], ['Service', 'service'], ['Description', 'desc'], ['Note', 'note']] });
  refTool({ id: 'dns-records', title: 'DNS Record Reference', desc: 'What A, AAAA, CNAME, MX, TXT, NS, PTR, SOA, SRV, CAA records do, with nslookup examples.', keywords: 'dns record a aaaa cname mx txt ns ptr soa srv caa spf dmarc nslookup', placeholder: 'e.g. mx, spf, reverse', rows: DNS,
    cols: [['Type', 'type'], ['Purpose', 'desc'], ['Example', 'example', function (r) { return '<code>' + esc(r.example) + '</code>'; }], ['Check with', 'cmd', function (r) { return U.codebox(r.cmd); }]] });
  refTool({ id: 'http-codes', title: 'HTTP Status Code Reference', desc: 'Meaning and first checks for common HTTP status codes (200–504).', keywords: 'http status code 404 500 502 503 403 401 error web', placeholder: 'e.g. 502, forbidden, redirect', rows: HTTP,
    cols: [['Code', 'code', function (r) { return '<strong>' + r.code + '</strong>'; }], ['Name', 'name'], ['Meaning / what to check', 'desc']] });
  refTool({ id: 'windows-errors', title: 'Common Windows Error Reference', desc: 'Frequent Windows, update, network, printer and BSOD error codes with first checks.', keywords: 'windows error code 0x8007 bsod stop printer update network access denied', placeholder: 'e.g. 0x80070005, 1219, printer, IRQL', rows: WINERR,
    intro: U.alert('info', 'These are common meanings, not a guarantee. Always check Event Viewer and the exact message. Fixes shown are first checks only.'),
    cols: [['Code', 'code', function (r) { return '<span class="mono">' + esc(r.code) + '</span>'; }], ['Message', 'name'], ['Common cause / first checks', 'desc']] });

  /* ---------- checklists ---------- */
  const LISTS = {
    'IT maintenance checklist': ['Windows and application updates installed', 'Antivirus/EDR running with current definitions', 'Disk free space above 15% on system drives', 'Backups ran successfully and logs reviewed', 'UPS self-test done and batteries checked', 'Network switches/routers: no error alarms, firmware reviewed', 'Wi-Fi coverage and AP status checked', 'Printers: toner/paper, spooler healthy, firmware reviewed', 'CCTV/NVR: cameras online, recording verified, disk health checked', 'Server room: temperature, cleanliness, cabling tidy', 'User accounts reviewed (leavers disabled, admin list checked)', 'Asset and IP inventory updated'],
    'Asset handover checklist': ['Device name, model and serial number recorded', 'Asset tag attached and logged in inventory', 'Assigned user, department and location recorded', 'OS installed and fully updated; computer name set per policy', 'User account created with temporary password (never written in the inventory)', 'Antivirus, backup agent and required software installed', 'Peripherals and accessories handed over (charger, mouse, bag…)', 'Network settings checked (DHCP/static IP recorded)', 'User signed the acceptance/handover form', 'For returns: data backed up, disk wiped per policy, accounts removed, device status updated'],
    'Backup verification checklist': ['Backup job completed with no errors/warnings', 'Backup size and duration look normal', 'Latest backup date/time is within the expected window', 'A test restore of at least one file/VM was done recently', 'Restored data opens correctly', 'Offsite/offline copy exists and is current', 'Backup media or cloud storage has enough free space', 'Backups are encrypted and access is restricted', 'Retention policy followed; old copies pruned', 'Failures were reported and re-run'],
    'Basic security incident checklist': ['Record the time, who reported it and what was observed', 'Do not turn off the device unless instructed; disconnect it from the network (unplug cable / disable Wi-Fi)', 'Notify your senior engineer/security contact immediately', 'Preserve evidence: do not delete files or logs; take screenshots', 'Identify affected accounts/systems; change passwords from a clean device', 'Check antivirus alerts and recent logins', 'Isolate affected shared folders/servers if directed', 'Restore from a known-good backup only after clearance', 'Document actions taken and timeline', 'Review and close with lessons learned']
  };
  ITK.data.checklists = LISTS;
  ITK.register({
    id: 'checklists', cat: 'reference', icon: 'check', title: 'IT Checklists', desc: 'Maintenance, asset handover, backup verification and basic security incident checklists.', keywords: 'checklist maintenance handover asset backup verification security incident response',
    render: function (root, params) {
      const names = Object.keys(LISTS);
      const state = ITK.mem.checklists || (ITK.mem.checklists = {});
      root.innerHTML = '<section class="card no-print"><div class="field"><label for="cl-s">Checklist</label><select class="select" id="cl-s">' + names.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select></div></section><section class="card"><div class="card-head"><h2 id="cl-t"></h2><div class="btn-row no-print"><button class="btn btn-sm" id="cl-copy" type="button">' + U.icon('copy', 14) + ' Copy</button><button class="btn btn-sm" id="cl-print" type="button">' + U.icon('printer', 14) + ' Print</button><button class="btn btn-sm" id="cl-reset" type="button">Reset ticks</button></div></div><p class="muted" id="cl-p" aria-live="polite"></p><ul class="checklist" id="cl-l"></ul></section>' +
        '<p class="help no-print">Ticks are kept only while this tab is open. This is a general starting point; adapt it to your organisation’s policies.</p>';
      const sel = U.$('#cl-s', root);
      if (params.q) { const m = names.find(function (n) { return n.toLowerCase().indexOf(String(params.q).toLowerCase()) !== -1; }); if (m) sel.value = m; }
      function draw() {
        const name = sel.value, items = LISTS[name], st = state[name] || (state[name] = []);
        U.$('#cl-t', root).textContent = name;
        U.$('#cl-l', root).innerHTML = items.map(function (it, i) { return '<li><label class="check" style="font-weight:500"><input type="checkbox" data-i="' + i + '"' + (st[i] ? ' checked' : '') + '><span>' + esc(it) + '</span></label></li>'; }).join('');
        prog();
      }
      function prog() { const st = state[sel.value] || [], n = LISTS[sel.value].length, d = st.filter(Boolean).length; U.$('#cl-p', root).textContent = d + ' of ' + n + ' done'; }
      sel.addEventListener('change', draw);
      U.$('#cl-l', root).addEventListener('change', function (e) { const i = e.target.dataset.i; if (i === undefined) return; (state[sel.value] || (state[sel.value] = []))[Number(i)] = e.target.checked; prog(); });
      U.$('#cl-reset', root).onclick = function () { state[sel.value] = []; draw(); };
      U.$('#cl-print', root).onclick = function () { if (typeof g.print === 'function') g.print(); };
      U.$('#cl-copy', root).onclick = function () { const st = state[sel.value] || []; U.copy(sel.value + '\n' + LISTS[sel.value].map(function (it, i) { return (st[i] ? '[x] ' : '[ ] ') + it; }).join('\n') + '\n', 'Checklist'); };
      draw();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
