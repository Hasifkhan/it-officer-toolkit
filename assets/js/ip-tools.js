/* ip-tools.js — Module A: IPv4 validator, subnet calculator, range generator, availability tracker, IP/MAC utilities */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc;

  /* =============== pure logic (no DOM; unit-tested) =============== */
  const ip = {};
  ITK.ip = ip;
  ip.MAX_RANGE = 65536;

  function bad(error) { return { ok: false, error: error }; }
  ip.parseIPv4 = function (input) {
    if (input == null) return bad('Enter an IPv4 address.');
    const s = String(input).trim();
    if (!s) return bad('Enter an IPv4 address.');
    if (/\s/.test(s)) return bad('The address contains spaces. Use dots only, e.g. 192.168.1.10.');
    if (s.indexOf(':') !== -1) return bad('This looks like IPv6 or includes a port number. Only plain IPv4 is supported here.');
    if (s.indexOf('/') !== -1) return bad('Remove the "/prefix" part — enter the address only.');
    const parts = s.split('.');
    if (parts.length !== 4) return bad('An IPv4 address needs exactly 4 numbers separated by dots (found ' + parts.length + ').');
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const p = parts[i];
      if (p === '') return bad('Octet ' + (i + 1) + ' is empty (check for double or trailing dots).');
      if (!/^\d+$/.test(p)) return bad('Octet ' + (i + 1) + ' ("' + p + '") must contain digits only.');
      if (p.length > 1 && p[0] === '0') return bad('Octet ' + (i + 1) + ' ("' + p + '") has a leading zero — remove it (leading zeros may be read as octal).');
      const n = Number(p);
      if (n > 255) return bad('Octet ' + (i + 1) + ' (' + n + ') is greater than 255.');
      v = v * 256 + n;
    }
    return { ok: true, value: v };
  };
  ip.toStr = function (n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); };
  ip.toBin = function (n) { return ip.toStr(n).split('.').map(function (o) { return ('00000000' + Number(o).toString(2)).slice(-8); }).join('.'); };
  ip.prefixToMask = function (p) { return p === 0 ? 0 : ((0xFFFFFFFF << (32 - p)) >>> 0); };
  /** Accepts "24", "/24" or a dotted mask like 255.255.255.0 */
  ip.parsePrefix = function (input) {
    const s = String(input == null ? '' : input).trim().replace(/^\//, '');
    if (!s) return bad('Enter a CIDR prefix (0–32) or a subnet mask.');
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      return n >= 0 && n <= 32 ? { ok: true, prefix: n } : bad('CIDR prefix must be between 0 and 32 (got ' + n + ').');
    }
    if (s.indexOf('.') !== -1) {
      const m = ip.parseIPv4(s);
      if (!m.ok) return bad('Invalid subnet mask: ' + m.error);
      const inv = (~m.value) >>> 0;
      if ((inv & (inv + 1)) !== 0) return bad('"' + s + '" is not a valid subnet mask (the 1-bits must be contiguous, e.g. 255.255.255.0).');
      let p = 0; for (let b = 31; b >= 0; b--) { if ((m.value >>> b) & 1) p++; else break; }
      return { ok: true, prefix: p };
    }
    return bad('Prefix must be a number 0–32 (e.g. 24 or /24) or a dotted mask (e.g. 255.255.255.0).');
  };
  ip.subnet = function (value, prefix) {
    const mask = ip.prefixToMask(prefix), wildcard = (~mask) >>> 0;
    const network = (value & mask) >>> 0, broadcast = (network | wildcard) >>> 0;
    const total = Math.pow(2, 32 - prefix);
    let usable, first, last;
    if (prefix === 32) { usable = 1; first = last = network; }
    else if (prefix === 31) { usable = 2; first = network; last = broadcast; }
    else { usable = total - 2; first = network + 1; last = broadcast - 1; }
    return { prefix: prefix, mask: mask, wildcard: wildcard, network: network, broadcast: broadcast, total: total, usable: usable, first: first, last: last };
  };
  ip.classful = function (v) {
    const o = v >>> 24;
    if (o < 128) return 'A'; if (o < 192) return 'B'; if (o < 224) return 'C'; if (o < 240) return 'D (multicast)'; return 'E (reserved)';
  };
  const SPECIAL = [
    ['0.0.0.0', 8, '"This network" / unspecified', 'Special', 'RFC 1122'],
    ['10.0.0.0', 8, 'Private (RFC 1918)', 'Private', 'RFC 1918'],
    ['100.64.0.0', 10, 'Shared address space (carrier-grade NAT)', 'Special', 'RFC 6598'],
    ['127.0.0.0', 8, 'Loopback', 'Special', 'RFC 1122'],
    ['169.254.0.0', 16, 'Link-local (APIPA) — usually means DHCP failed', 'Special', 'RFC 3927'],
    ['172.16.0.0', 12, 'Private (RFC 1918)', 'Private', 'RFC 1918'],
    ['192.0.0.0', 24, 'IETF protocol assignments', 'Special', 'RFC 6890'],
    ['192.0.2.0', 24, 'Documentation (TEST-NET-1)', 'Special', 'RFC 5737'],
    ['192.168.0.0', 16, 'Private (RFC 1918)', 'Private', 'RFC 1918'],
    ['198.18.0.0', 15, 'Network benchmarking', 'Special', 'RFC 2544'],
    ['198.51.100.0', 24, 'Documentation (TEST-NET-2)', 'Special', 'RFC 5737'],
    ['203.0.113.0', 24, 'Documentation (TEST-NET-3)', 'Special', 'RFC 5737'],
    ['224.0.0.0', 4, 'Multicast', 'Special', 'RFC 5771'],
    ['240.0.0.0', 4, 'Reserved for future use', 'Special', 'RFC 1112'],
    ['255.255.255.255', 32, 'Limited broadcast', 'Special', 'RFC 919']
  ].map(function (r) { return { net: ip.parseIPv4(r[0]).value, prefix: r[1], label: r[2], kind: r[3], rfc: r[4], text: r[0] + '/' + r[1] }; });
  ip.SPECIAL = SPECIAL;
  ip.classify = function (v) {
    let best = null;
    SPECIAL.forEach(function (r) { if (((v & ip.prefixToMask(r.prefix)) >>> 0) === r.net && (!best || r.prefix > best.prefix)) best = r; });
    return best ? { kind: best.kind, label: best.label, rfc: best.rfc, range: best.text } : { kind: 'Public', label: 'Public (globally routable) address', rfc: '', range: '' };
  };
  ip.range = function (startStr, endStr) {
    const a = ip.parseIPv4(startStr), b = ip.parseIPv4(endStr);
    if (!a.ok) return bad('Start address: ' + a.error);
    if (!b.ok) return bad('End address: ' + b.error);
    if (b.value < a.value) return bad('The range is reversed: the end address is lower than the start address.');
    const count = b.value - a.value + 1;
    if (count > ip.MAX_RANGE) return bad('This range has ' + count.toLocaleString('en-US') + ' addresses. The limit is ' + ip.MAX_RANGE.toLocaleString('en-US') + ' (a /16) to keep your browser responsive.');
    return { ok: true, start: a.value, end: b.value, count: count };
  };
  ip.parseMAC = function (input) {
    const s = String(input == null ? '' : input).trim();
    if (!s) return bad('Enter a MAC address.');
    const ok = /^[0-9a-f]{2}([:-])(?:[0-9a-f]{2}\1){4}[0-9a-f]{2}$/i.test(s) ||/^([0-9a-f]{4}\.){2}[0-9a-f]{4}$/i.test(s) || /^[0-9a-f]{12}$/i.test(s);
    if (!ok) return bad('Not a recognised MAC format. Use AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, AABB.CCDD.EEFF or AABBCCDDEEFF (hex digits 0–9, A–F only).');
    const hex = s.replace(/[^0-9a-f]/gi, '').toUpperCase();
    const pairs = hex.match(/../g), first = parseInt(hex.slice(0, 2), 16);
    return {
      ok: true, hex: hex,
      colon: pairs.join(':'), hyphen: pairs.join('-'),
      dotted: hex.toLowerCase().match(/..../g).join('.'), plain: hex,
      multicast: !!(first & 1), local: !!(first & 2),
      broadcast: hex === 'FFFFFFFFFFFF', zero: hex === '000000000000'
    };
  };
  ip.expandBulk = function (text, maxItems) {
    // tokens separated by newline/comma/semicolon/space; "a - b" or "a-b" ranges are expanded
    const out = [], problems = [];
    const lines = String(text).split(/[\n,;]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    lines.forEach(function (line) {
      line.replace(/(\d)\s*-\s*(?=\d)/g, '$1-').split(/\s+/).forEach(function (tok) {
        const rm = /^(\d{1,3}(?:\.\d{1,3}){3})-(\d{1,3}(?:\.\d{1,3}){3})$/.exec(tok);
        if (!rm) { out.push(tok); return; }
        const r = ip.range(rm[1], rm[2]);
        if (!r.ok) { problems.push(tok + ' — ' + r.error); return; }
        if (r.count > 1024) { problems.push(tok + ' — ranges inside a bulk add are limited to 1,024 addresses.'); return; }
        for (let v = r.start; v <= r.end; v++) out.push(ip.toStr(v));
      });
    });
    if (out.length > (maxItems || 2000)) { problems.push('Too many addresses (' + out.length + '); limit is ' + (maxItems || 2000) + ' per add.'); return { items: [], problems: problems }; }
    return { items: out, problems: problems };
  };

  /* =============== UI helpers =============== */
  function kvRow(k, v, copy) {
    return '<div class="k">' + esc(k) + '</div><div>' + v + '</div><div>' + (copy ? '<button type="button" class="btn btn-sm" data-copy="' + esc(copy) + '" aria-label="Copy ' + esc(k) + '">' + U.icon('copy', 14) + '</button>' : '') + '</div>';
  }
  function setErr(el, msg) { el.textContent = msg || ''; }

  /* =============== A1: IPv4 validator =============== */
  ITK.register({
    id: 'ipv4-validator', cat: 'ip', icon: 'check', title: 'IPv4 Validator',
    desc: 'Check one or many IPv4 addresses and see exactly what is wrong with invalid ones.',
    keywords: 'ip validate check address octet format',
    render: function (root, params) {
      root.innerHTML = '<section class="card"><div class="field"><label for="v-in">IPv4 addresses (one per line)</label>' +
        '<textarea class="textarea" id="v-in" rows="6" placeholder="192.168.1.10&#10;10.0.0.256&#10;172.16.5" spellcheck="false" aria-describedby="v-help"></textarea>' +
        '<div class="help" id="v-help">Up to 1,000 lines. Results update as you type. Nothing is sent anywhere.</div></div>' +
        '<div class="btn-row" style="margin-top:10px"><button class="btn btn-primary" id="v-go" type="button">Validate</button><button class="btn" id="v-ex" type="button">Load example</button><button class="btn" id="v-clr" type="button">Clear</button></div></section>' +
        '<section class="card" aria-live="polite" id="v-out"></section>';
      const inp = U.$('#v-in', root), out = U.$('#v-out', root);
      function run() {
        const lines = inp.value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l; });
        if (!lines.length) { out.innerHTML = '<div class="empty">Enter at least one IPv4 address above to validate it.</div>'; return; }
        if (lines.length > 1000) { out.innerHTML = U.alert('danger', 'Too many lines (' + lines.length + '). The limit is 1,000.'); return; }
        let ok = 0;
        const rows = lines.map(function (l, i) {
          const r = ip.parseIPv4(l);
          if (r.ok) { ok++; const c = ip.classify(r.value); return '<tr><td>' + (i + 1) + '</td><td class="mono">' + esc(l) + '</td><td>' + U.badge('Valid', 'success') + '</td><td>' + esc(c.kind + ' — ' + c.label) + ' · class ' + esc(ip.classful(r.value)) + '</td></tr>'; }
          return '<tr><td>' + (i + 1) + '</td><td class="mono">' + esc(l) + '</td><td>' + U.badge('Invalid', 'danger') + '</td><td>' + esc(r.error) + '</td></tr>';
        }).join('');
        out.innerHTML = '<p><strong>' + ok + '</strong> valid, <strong>' + (lines.length - ok) + '</strong> invalid.</p><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Input</th><th>Result</th><th>Details</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      }
      U.$('#v-go', root).onclick = run;
      inp.addEventListener('input', U.debounce(run, 200));
      U.$('#v-ex', root).onclick = function () { inp.value = '192.168.1.10\n10.0.0.256\n172.16.5\n192.168.01.1\n8.8.8.8\n169.254.10.20\n192.168.1.1/24'; run(); };
      U.$('#v-clr', root).onclick = function () { inp.value = ''; run(); inp.focus(); };
      run();
    }
  });

  /* =============== A2: Subnet calculator =============== */
  ITK.register({
    id: 'subnet-calc', cat: 'ip', icon: 'network', title: 'IPv4 Subnet Calculator',
    desc: 'Network, broadcast, masks, host range and counts for any IPv4 address and /0–/32 prefix.',
    keywords: 'cidr subnet mask wildcard broadcast network hosts usable netmask',
    render: function (root) {
      root.innerHTML = '<section class="card"><form id="s-form" novalidate><div class="form-grid">' +
        U.field('s-ip', 'IPv4 address', '<input class="input mono" id="s-ip" placeholder="192.168.1.10 or 192.168.1.10/24" autocomplete="off" spellcheck="false" aria-describedby="s-ip-err s-ip-help">', 'You may type address/prefix here, e.g. 10.1.2.3/20.', true) +
        U.field('s-p', 'CIDR prefix or subnet mask', '<input class="input mono" id="s-p" placeholder="24 or 255.255.255.0" autocomplete="off" spellcheck="false" aria-describedby="s-p-err s-p-help">', 'Prefix length 0–32 (with or without “/”) or a dotted mask.', true) +
        '</div><div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" type="submit">Calculate</button>' +
        ['/8', '/16', '/24', '/25', '/26', '/27', '/28', '/29', '/30', '/31', '/32'].map(function (p) { return '<button type="button" class="btn btn-sm" data-pfx="' + p + '">' + p + '</button>'; }).join('') +
        '</div></form></section><div id="s-out" aria-live="polite"></div>';
      const f = U.$('#s-form', root), ipEl = U.$('#s-ip', root), pEl = U.$('#s-p', root), out = U.$('#s-out', root);
      function calc() {
        setErr(U.$('#s-ip-err', root), ''); setErr(U.$('#s-p-err', root), '');
        let ipText = ipEl.value.trim(), pText = pEl.value.trim();
        if (ipText.indexOf('/') !== -1) { const x = ipText.split('/'); if (x.length !== 2) { setErr(U.$('#s-ip-err', root), 'Use the form address/prefix with a single "/".'); return; } ipText = x[0]; if (!pText) pText = x[1]; }
        const a = ip.parseIPv4(ipText), p = ip.parsePrefix(pText);
        let bad2 = false;
        if (!a.ok) { setErr(U.$('#s-ip-err', root), a.error); bad2 = true; }
        if (!p.ok) { setErr(U.$('#s-p-err', root), p.error); bad2 = true; }
        if (bad2) { out.innerHTML = ''; return; }
        const r = ip.subnet(a.value, p.prefix), cl = ip.classify(a.value);
        let note = '';
        if (p.prefix === 32) note = U.alert('info', '<strong>/32 — single host.</strong> Network, broadcast and the host are the same address; used for host routes and loopbacks.');
        else if (p.prefix === 31) note = U.alert('info', '<strong>/31 — point-to-point link (RFC 3021).</strong> Both addresses are usable and there is no broadcast address. Some older equipment does not support /31.');
        else if (p.prefix === 0) note = U.alert('info', '<strong>/0 — the entire IPv4 address space.</strong> Typically seen only as a default route (0.0.0.0/0).');
        const bc = p.prefix === 32 ? 'n/a (single host)' : (p.prefix === 31 ? ip.toStr(r.broadcast) + ' (not used on /31)' : ip.toStr(r.broadcast));
        out.innerHTML = note + '<section class="card"><h2>Result for ' + esc(ip.toStr(a.value)) + '/' + p.prefix + '</h2><div class="kv">' +
          kvRow('CIDR notation', '<span class="mono">' + ip.toStr(r.network) + '/' + p.prefix + '</span>', ip.toStr(r.network) + '/' + p.prefix) +
          kvRow('Network address', '<span class="mono">' + ip.toStr(r.network) + '</span>', ip.toStr(r.network)) +
          kvRow('Subnet mask', '<span class="mono">' + ip.toStr(r.mask) + '</span>', ip.toStr(r.mask)) +
          kvRow('Wildcard mask', '<span class="mono">' + ip.toStr(r.wildcard) + '</span>', ip.toStr(r.wildcard)) +
          kvRow('Broadcast address', '<span class="mono">' + esc(bc) + '</span>', p.prefix === 32 ? '' : ip.toStr(r.broadcast)) +
          kvRow('Total addresses', r.total.toLocaleString('en-US'), String(r.total)) +
          kvRow('Usable hosts', r.usable.toLocaleString('en-US'), String(r.usable)) +
          kvRow('First usable host', '<span class="mono">' + ip.toStr(r.first) + '</span>', ip.toStr(r.first)) +
          kvRow('Last usable host', '<span class="mono">' + ip.toStr(r.last) + '</span>', ip.toStr(r.last)) +
          kvRow('Address type', esc(cl.kind + ' — ' + cl.label), '') +
          kvRow('Classful class', esc(ip.classful(a.value)) + ' <span class="muted">(historical; modern networks use CIDR)</span>', '') +
          kvRow('IP (binary)', '<span class="mono">' + ip.toBin(a.value) + '</span>', '') +
          kvRow('Mask (binary)', '<span class="mono">' + ip.toBin(r.mask) + '</span>', '') +
          kvRow('Network (binary)', '<span class="mono">' + ip.toBin(r.network) + '</span>', '') +
          '</div></section>';
      }
      f.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
      U.$$('[data-pfx]', root).forEach(function (b) { b.onclick = function () { pEl.value = b.dataset.pfx.slice(1); if (ipEl.value.trim()) calc(); else ipEl.focus(); }; });
    }
  });

  /* =============== A3: Range generator =============== */
  ITK.register({
    id: 'range-generator', cat: 'ip', icon: 'list', title: 'IP Range Generator',
    desc: 'List every address between a start and end IPv4 address (up to 65,536) and export to CSV.',
    keywords: 'range list generate sequence csv export addresses',
    render: function (root) {
      root.innerHTML = '<section class="card"><form id="r-form" novalidate><div class="form-grid">' +
        U.field('r-a', 'Start address', '<input class="input mono" id="r-a" placeholder="192.168.1.1" autocomplete="off" spellcheck="false" aria-describedby="r-a-err">', '', true) +
        U.field('r-b', 'End address', '<input class="input mono" id="r-b" placeholder="192.168.1.50" autocomplete="off" spellcheck="false" aria-describedby="r-b-err">', '', true) +
        '</div><div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" type="submit">Generate</button></div></form></section><div id="r-out" aria-live="polite"></div>';
      const out = U.$('#r-out', root);
      U.$('#r-form', root).addEventListener('submit', function (e) {
        e.preventDefault();
        setErr(U.$('#r-a-err', root), ''); setErr(U.$('#r-b-err', root), '');
        const a = ip.parseIPv4(U.$('#r-a', root).value), b = ip.parseIPv4(U.$('#r-b', root).value);
        if (!a.ok || !b.ok) { if (!a.ok) setErr(U.$('#r-a-err', root), a.error); if (!b.ok) setErr(U.$('#r-b-err', root), b.error); out.innerHTML = ''; return; }
        const r = ip.range(U.$('#r-a', root).value, U.$('#r-b', root).value);
        if (!r.ok) { out.innerHTML = U.alert('danger', esc(r.error)); return; }
        const list = []; for (let v = r.start; v <= r.end; v++) list.push(ip.toStr(v));
        const shown = list.slice(0, 500);
        out.innerHTML = '<section class="card"><div class="card-head"><h2>' + r.count.toLocaleString('en-US') + ' address' + (r.count === 1 ? '' : 'es') + '</h2><div class="btn-row"><button class="btn btn-sm" id="r-copy" type="button">' + U.icon('copy', 14) + ' Copy list</button><button class="btn btn-sm btn-primary" id="r-csv" type="button">' + U.icon('download', 14) + ' Export CSV</button></div></div>' +
          '<p class="muted">' + esc(list[0]) + ' → ' + esc(list[list.length - 1]) + (list.length > shown.length ? ' · showing the first 500 below; copy/export include all.' : '') + '</p>' +
          '<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="table"><thead><tr><th>#</th><th>IP address</th></tr></thead><tbody>' +
          shown.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td class="mono">' + x + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
        U.$('#r-copy', root).onclick = function () { U.copy(list.join('\n'), 'IP list'); };
        U.$('#r-csv', root).onclick = function () { U.download('ip-range-' + list[0] + '-to-' + list[list.length - 1] + '.csv', U.toCSV(['No', 'IP Address'], list.map(function (x, i) { return [i + 1, x]; })), 'text/csv'); };
      });
    }
  });

  /* =============== A4: IP availability tracker =============== */
  ITK.register({
    id: 'ip-tracker', cat: 'ip', icon: 'server', title: 'IP Availability Tracker',
    desc: 'Keep a list of IPs with status, device, MAC, user and location. Search, edit, import/export CSV.',
    keywords: 'ip list used free reserved inventory address management dhcp static',
    render: function (root) {
      let api;
      const STAT = ['Used', 'Reserved', 'Free', 'Unknown'];
      const notice = U.alert('warn', '<strong>List-based, not verified.</strong> Statuses here are only what <em>you</em> record. This page cannot scan your network, so “Free” does not prove an address is unused. Before assigning an IP, confirm with your DHCP server/router lease table and a ping/ARP check from an authorised machine.');
      api = ITK.dataTable.create(root, {
        name: 'ip-tracker', statKey: 'ip', csvFile: 'ip-tracker', formTitle: 'Add or edit an IP record', listTitle: 'IP records', labelKey: 'ip',
        unique: 'ip', sortKey: 'ip', filter: { key: 'status', label: 'status' }, notice: notice,
        emptyText: 'No IP records yet. Add one above, paste a list in “Bulk add”, or import a CSV.',
        fields: [
          { key: 'ip', label: 'IP address', required: true, mono: true, sort: 'ip', max: 15, placeholder: '192.168.1.10', validate: function (v) { const r = ip.parseIPv4(v); return r.ok ? null : r.error; } },
          { key: 'status', label: 'Status', type: 'select', options: STAT, default: 'Unknown', required: true, badges: { Used: 'danger', Reserved: 'warn', Free: 'success', Unknown: '' } },
          { key: 'device', label: 'Device name', max: 80, placeholder: 'PC-ACC-01' },
          { key: 'mac', label: 'MAC address', mono: true, max: 17, placeholder: 'AA:BB:CC:DD:EE:FF', help: 'Any common format; stored as AA:BB:CC:DD:EE:FF.', normalize: function (v) { const m = ip.parseMAC(v); return m.ok ? m.colon : v; }, validate: function (v) { const m = ip.parseMAC(v); return m.ok ? null : m.error; } },
          { key: 'user', label: 'User', max: 80 },
          { key: 'department', label: 'Department', max: 80 },
          { key: 'location', label: 'Location', max: 80, placeholder: 'Floor 2, Room 204' }
        ],
        onChange: function (a) { renderExtras(a); }
      });
      function renderExtras(a) {
        const slot = a.slot('before'); if (!slot) return;
        const all = a.all(), cnt = {}; STAT.forEach(function (s) { cnt[s] = 0; }); all.forEach(function (r) { cnt[r.status] = (cnt[r.status] || 0) + 1; });
        const keep = slot.querySelector('#t-bulk') ? { bulk: slot.querySelector('#t-bulk').value, st: slot.querySelector('#t-bst').value, cidr: slot.querySelector('#t-cidr').value, n: slot.querySelector('#t-n').value } : { bulk: '', st: 'Unknown', cidr: '', n: '10' };
        const wasOpen = Array.prototype.map.call(slot.querySelectorAll('details'), function (d) { return d.open; });
        const res = slot.querySelector('#t-bres') ? slot.querySelector('#t-bres').innerHTML : '', cres = slot.querySelector('#t-cres') ? slot.querySelector('#t-cres').innerHTML : '';
        slot.innerHTML = '<div class="tiles" role="group" aria-label="Record counts">' + STAT.map(function (s) { return '<div class="tile"><b>' + cnt[s] + '</b><span>' + s + '</span></div>'; }).join('') + '<div class="tile"><b>' + all.length + '</b><span>Total recorded</span></div></div>' +
          '<details class="card"><summary style="cursor:pointer;font-weight:650">Bulk add IPs</summary><div style="margin-top:12px"><div class="field"><label for="t-bulk">Paste addresses</label><textarea class="textarea" id="t-bulk" rows="4" spellcheck="false" placeholder="192.168.1.10, 192.168.1.11&#10;192.168.1.20-192.168.1.30"></textarea><div class="help">Separate with new lines, commas or spaces. Ranges like 10.0.0.5-10.0.0.20 are expanded (max 1,024 per range). Duplicates are skipped.</div></div>' +
          '<div class="inline-fields" style="margin-top:10px"><div class="field"><label for="t-bst">Status for these addresses</label><select class="select" id="t-bst">' + STAT.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></div><button class="btn btn-primary" id="t-badd" type="button">Add addresses</button></div><div id="t-bres" aria-live="polite" style="margin-top:10px"></div></div></details>' +
          '<details class="card"><summary style="cursor:pointer;font-weight:650">Find candidate free addresses in a subnet (from your list)</summary><div style="margin-top:12px"><p class="muted">Lists addresses in the subnet that you have <em>not</em> recorded as Used, Reserved or Unknown. These are <strong>candidates only</strong> — verify before use.</p>' +
          '<div class="inline-fields"><div class="field"><label for="t-cidr">Subnet (CIDR, /16 or smaller)</label><input class="input mono" id="t-cidr" placeholder="192.168.1.0/24" autocomplete="off"></div><div class="field"><label for="t-n">How many</label><input class="input" id="t-n" type="number" min="1" max="200" value="10"></div><button class="btn btn-primary" id="t-find" type="button">Find candidates</button></div><div id="t-cres" aria-live="polite" style="margin-top:10px"></div></div></details>';
        Array.prototype.forEach.call(slot.querySelectorAll('details'), function (d, i) { d.open = !!wasOpen[i]; });
        slot.querySelector('#t-bulk').value = keep.bulk; slot.querySelector('#t-bst').value = keep.st; slot.querySelector('#t-cidr').value = keep.cidr; slot.querySelector('#t-n').value = keep.n;
        slot.querySelector('#t-bres').innerHTML = res; slot.querySelector('#t-cres').innerHTML = cres;
        slot.querySelector('#t-badd').onclick = function () {
          const text = slot.querySelector('#t-bulk').value, bres = slot.querySelector('#t-bres');
          if (!text.trim()) { bres.innerHTML = U.alert('danger', 'Paste at least one IP address first.'); return; }
          const ex = ip.expandBulk(text, 2000);
          if (!ex.items.length) { bres.innerHTML = U.alert('danger', esc(ex.problems.join(' ') || 'No addresses found.')); return; }
          const st = slot.querySelector('#t-bst').value;
          const r = a.addMany(ex.items.map(function (x) { return { ip: x, status: st }; }));
          const msg = ['<strong>' + r.added + ' added.</strong>']; if (r.dupes.length) msg.push(r.dupes.length + ' duplicate(s) skipped.');
          if (r.invalid.length) msg.push(r.invalid.length + ' invalid: ' + esc(r.invalid.slice(0, 4).join(' · ')) + (r.invalid.length > 4 ? ' · …' : ''));
          if (ex.problems.length) msg.push(esc(ex.problems.join(' ')));
          const b2 = document.querySelector('#t-bres'); if (b2) b2.innerHTML = U.alert(r.invalid.length || r.dupes.length || ex.problems.length ? 'warn' : 'success', msg.join('<br>'));
          const bt = document.querySelector('#t-bulk'); if (bt && !r.invalid.length && !ex.problems.length) bt.value = '';
        };
        slot.querySelector('#t-find').onclick = function () {
          const cres2 = slot.querySelector('#t-cres'), txt = slot.querySelector('#t-cidr').value.trim(), x = txt.split('/');
          const n = Math.floor(Number(slot.querySelector('#t-n').value));
          if (x.length !== 2) { cres2.innerHTML = U.alert('danger', 'Enter a subnet like 192.168.1.0/24.'); return; }
          const A = ip.parseIPv4(x[0]), P = ip.parsePrefix(x[1]);
          if (!A.ok) { cres2.innerHTML = U.alert('danger', esc(A.error)); return; }
          if (!P.ok) { cres2.innerHTML = U.alert('danger', esc(P.error)); return; }
          if (P.prefix < 16) { cres2.innerHTML = U.alert('danger', 'Subnets larger than /16 are not supported here (65,536 addresses max).'); return; }
          if (!(n >= 1 && n <= 200)) { cres2.innerHTML = U.alert('danger', 'Choose a count between 1 and 200.'); return; }
          const s = ip.subnet(A.value, P.prefix), status = {};
          a.all().forEach(function (r) { status[r.ip] = r.status; });
          const found = [];
          for (let v = s.first; v <= s.last && found.length < n; v++) { const k = ip.toStr(v), st = status[k]; if (!st || st === 'Free') found.push({ ip: k, st: st || 'not in your list' }); }
          if (!found.length) { cres2.innerHTML = U.alert('warn', 'No candidates: every address in ' + esc(ip.toStr(s.network) + '/' + P.prefix) + ' is recorded as Used, Reserved or Unknown.'); return; }
          cres2.innerHTML = '<p>' + found.length + ' candidate(s) in <span class="mono">' + esc(ip.toStr(s.network) + '/' + P.prefix) + '</span> (unverified):</p><div class="table-wrap"><table class="table"><thead><tr><th>IP address</th><th>Based on</th></tr></thead><tbody>' +
            found.map(function (f) { return '<tr><td class="mono">' + f.ip + '</td><td>' + esc(f.st) + '</td></tr>'; }).join('') + '</tbody></table></div><div class="btn-row" style="margin-top:8px"><button class="btn btn-sm" id="t-ccopy" type="button">' + U.icon('copy', 14) + ' Copy</button><button class="btn btn-sm" id="t-cadd" type="button">Add as “Free”</button></div>';
          slot.querySelector('#t-ccopy').onclick = function () { U.copy(found.map(function (f) { return f.ip; }).join('\n'), 'Candidates'); };
          slot.querySelector('#t-cadd').onclick = function () { const r2 = a.addMany(found.filter(function (f) { return f.st !== 'Free'; }).map(function (f) { return { ip: f.ip, status: 'Free' }; })); U.toast(r2.added + ' address(es) added as Free', 'success'); };
        };
      }
    }
  });

  /* =============== A5: IP & MAC utilities =============== */
  ITK.register({
    id: 'ip-mac-utils', cat: 'ip', icon: 'shield', title: 'IP & MAC Utilities',
    desc: 'Classify an IP (private, APIPA, loopback…) and validate or reformat a MAC address.',
    keywords: 'mac address normalize format private public apipa 169.254 rfc1918 oui',
    render: function (root) {
      root.innerHTML = '<div class="grid-2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px">' +
        '<section class="card"><h2>IP address type</h2>' + U.field('u-ip', 'IPv4 address', '<input class="input mono" id="u-ip" placeholder="169.254.12.7" autocomplete="off" spellcheck="false" aria-describedby="u-ip-err">', '', true) + '<div id="u-ipout" aria-live="polite" style="margin-top:10px"></div></section>' +
        '<section class="card"><h2>MAC address</h2>' + U.field('u-mac', 'MAC address', '<input class="input mono" id="u-mac" placeholder="aa-bb-cc-dd-ee-ff" autocomplete="off" spellcheck="false" aria-describedby="u-mac-err">', 'Accepts colon, hyphen, Cisco dotted or plain hex.', true) + '<div id="u-macout" aria-live="polite" style="margin-top:10px"></div></section></div>' +
        U.alert('info', '<strong>About your public IP.</strong> This page does not look up your public IP because that needs an external service and this toolkit makes no external calls. Check it from the device itself, e.g. <code>nslookup myip.opendns.com resolver1.opendns.com</code>, or your router’s WAN status page.') +
        '<section class="card"><h2>Special-purpose IPv4 ranges</h2><div class="table-wrap"><table class="table"><thead><tr><th>Range</th><th>Meaning</th><th>Reference</th></tr></thead><tbody>' +
        ip.SPECIAL.map(function (r) { return '<tr><td class="mono">' + r.text + '</td><td>' + esc(r.label) + '</td><td>' + esc(r.rfc) + '</td></tr>'; }).join('') + '</tbody></table></div><p class="muted" style="margin-top:8px">MAC vendor (OUI) lookup is not included because it needs a large database or an online service.</p></section>';
      const ipEl = U.$('#u-ip', root), macEl = U.$('#u-mac', root);
      function doIP() {
        const o = U.$('#u-ipout', root), e = U.$('#u-ip-err', root);
        if (!ipEl.value.trim()) { e.textContent = ''; o.innerHTML = '<span class="muted">Enter an address to classify it.</span>'; return; }
        const r = ip.parseIPv4(ipEl.value);
        if (!r.ok) { e.textContent = r.error; o.innerHTML = ''; return; }
        e.textContent = ''; const c = ip.classify(r.value);
        o.innerHTML = '<div class="kv">' + kvRow('Address', '<span class="mono">' + ip.toStr(r.value) + '</span>', ip.toStr(r.value)) + kvRow('Type', U.badge(c.kind, c.kind === 'Public' ? 'info' : (c.kind === 'Private' ? 'success' : 'warn')), '') + kvRow('Description', esc(c.label), '') + kvRow('Range', '<span class="mono">' + esc(c.range || '—') + '</span>', '') + kvRow('Reference', esc(c.rfc || '—'), '') + kvRow('Classful class', esc(ip.classful(r.value)), '') + '</div>' +
          (c.range === '169.254.0.0/16' ? '<p class="muted" style="margin-top:8px">An address like this on a PC usually means it could not reach a DHCP server — see the “Cannot Obtain DHCP Address” guide.</p>' : '');
      }
      function doMAC() {
        const o = U.$('#u-macout', root), e = U.$('#u-mac-err', root);
        if (!macEl.value.trim()) { e.textContent = ''; o.innerHTML = '<span class="muted">Enter a MAC address to validate and reformat it.</span>'; return; }
        const m = ip.parseMAC(macEl.value);
        if (!m.ok) { e.textContent = m.error; o.innerHTML = ''; return; }
        e.textContent = '';
        o.innerHTML = '<div class="kv">' + kvRow('Colon', '<span class="mono">' + m.colon + '</span>', m.colon) + kvRow('Hyphen (Windows)', '<span class="mono">' + m.hyphen + '</span>', m.hyphen) + kvRow('Dotted (Cisco)', '<span class="mono">' + m.dotted + '</span>', m.dotted) + kvRow('Plain', '<span class="mono">' + m.plain + '</span>', m.plain) +
          kvRow('Cast type', m.broadcast ? 'Broadcast' : (m.multicast ? 'Multicast' : 'Unicast'), '') + kvRow('Administration', m.local ? 'Locally administered (may be randomised/virtual)' : 'Universally administered (manufacturer-assigned)', '') + '</div>' +
          (m.zero ? '<p class="muted" style="margin-top:8px">All-zero MAC is not a real device address.</p>' : '');
      }
      ipEl.addEventListener('input', U.debounce(doIP, 120)); macEl.addEventListener('input', U.debounce(doMAC, 120));
      doIP(); doMAC();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
