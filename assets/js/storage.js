/* storage.js — namespace, tool registry, safe LocalStorage wrapper, shared utilities, icons */
(function (g) {
  'use strict';
  const ITK = (g.ITK = g.ITK || {});
  ITK.VERSION = '1.0.0';
  ITK.mem = {};          // in-session data (lost on refresh unless the user opts in to saving)
  ITK.data = {};         // reference data exposed to global search
  ITK.tools = [];
  ITK.register = function (t) { ITK.tools.push(t); };

  /* ---------- storage ---------- */
  const PREFIX = 'itk.';
  const memStore = {};
  let avail = null;
  const storage = {
    available() {
      if (avail !== null) return avail;
      try { const k = PREFIX + '__t'; g.localStorage.setItem(k, '1'); g.localStorage.removeItem(k); avail = true; } catch (e) { avail = false; }
      return avail;
    },
    get(key, def) {
      if (storage.available()) {
        try { const v = g.localStorage.getItem(PREFIX + key); if (v !== null) return JSON.parse(v); } catch (e) { /* fall through */ }
      }
      return key in memStore ? memStore[key] : def;
    },
    /** returns true only if the value was really written to browser storage */
    set(key, val) {
      memStore[key] = val;
      if (!storage.available()) return false;
      try { g.localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    remove(key) {
      delete memStore[key];
      if (storage.available()) { try { g.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ } }
    },
    keys() {
      const out = [];
      if (!storage.available()) return out;
      try { for (let i = 0; i < g.localStorage.length; i++) { const k = g.localStorage.key(i); if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length)); } } catch (e) { /* ignore */ }
      return out;
    },
    size(key) { try { return (g.localStorage.getItem(PREFIX + key) || '').length; } catch (e) { return 0; } },
    clearAll() {
      storage.keys().forEach(storage.remove);
      Object.keys(memStore).forEach(function (k) { delete memStore[k]; });
    }
  };
  ITK.storage = storage;

  /* ---------- icons (consistent 24px line icons) ---------- */
  const ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
    terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="16" y1="11" x2="16.01" y2="11"/><line x1="8" y1="15" x2="8.01" y2="15"/><line x1="12" y1="15" x2="12.01" y2="15"/><line x1="16" y1="15" x2="16.01" y2="15"/><line x1="8" y1="19" x2="12" y2="19"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    network: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
  };
  const U = {};
  ITK.util = U;
  U.icon = function (name, size) {
    size = size || 18;
    return '<svg class="icon" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  };

  /* ---------- small helpers ---------- */
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  U.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
  U.debounce = function (fn, ms) { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 150); }; };
  U.todayISO = function () { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  U.fmtDuration = function (mins) {
    mins = Math.round(mins);
    if (!(mins > 0)) return '0m';
    const h = Math.floor(mins / 60), m = mins % 60;
    return (h ? h + 'h ' : '') + (m || !h ? m + 'm' : '').trim();
  };
  U.fmtNum = function (n, digits) {
    if (!isFinite(n)) return String(n);
    if (n === 0) return '0';
    const a = Math.abs(n);
    if (a >= 1e15 || a < 1e-6) return n.toExponential(4);
    return Number(n.toPrecision(digits || 12)).toLocaleString('en-US', { maximumFractionDigits: 8 });
  };
  U.alert = function (type, html) {
    const ic = { info: 'info', warn: 'alert', danger: 'alert', success: 'check' }[type] || 'info';
    return '<div class="alert alert-' + type + '" role="' + (type === 'danger' ? 'alert' : 'note') + '">' + U.icon(ic) + '<div class="alert-body">' + html + '</div></div>';
  };
  U.codebox = function (text) {
    return '<div class="codebox"><code>' + U.esc(text) + '</code><button type="button" data-copy="' + U.esc(text) + '" aria-label="Copy command ' + U.esc(text) + '">' + U.icon('copy', 14) + ' Copy</button></div>';
  };
  U.badge = function (text, kind) { return '<span class="badge' + (kind ? ' badge-' + kind : '') + '">' + U.esc(text) + '</span>'; };
  U.field = function (id, label, control, help, req) {
    return '<div class="field"><label for="' + id + '">' + U.esc(label) + (req ? '<span class="req" aria-hidden="true">*</span>' : '') + '</label>' + control +
      (help ? '<div class="help" id="' + id + '-help">' + U.esc(help) + '</div>' : '') + '<div class="error" id="' + id + '-err" role="alert"></div></div>';
  };

  /* ---------- toast ---------- */
  U.toast = function (msg, type, ms) {
    const c = document.getElementById('toasts');
    if (!c) return;
    const d = document.createElement('div');
    d.className = 'toast toast-' + (type || 'info');
    d.textContent = msg;
    c.appendChild(d);
    setTimeout(function () { d.remove(); }, ms || 3500);
  };

  /* ---------- dialogs ---------- */
  U.confirm = function (message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (typeof g.HTMLDialogElement === 'undefined') { resolve(g.confirm(message)); return; }
      const d = document.createElement('dialog');
      d.className = 'modal';
      d.setAttribute('aria-labelledby', 'cfm-t');
      d.innerHTML = '<form method="dialog"><h2 id="cfm-t">' + U.esc(opts.title || 'Please confirm') + '</h2><p>' + U.esc(message) + '</p><div class="modal-actions">' +
        '<button class="btn" value="cancel" autofocus>Cancel</button><button class="btn ' + (opts.danger === false ? 'btn-primary' : 'btn-solid-danger') + '" value="ok">' + U.esc(opts.okText || 'Delete') + '</button></div></form>';
      document.body.appendChild(d);
      d.addEventListener('close', function () { const ok = d.returnValue === 'ok'; d.remove(); resolve(ok); });
      d.showModal();
    });
  };
  function copyFallback(text) {
    if (typeof g.HTMLDialogElement === 'undefined') { g.prompt('Copy manually (Ctrl+C):', text); return; }
    const d = document.createElement('dialog');
    d.className = 'modal';
    d.innerHTML = '<form method="dialog"><h2>Copy manually</h2><p>Your browser blocked automatic copying. Select the text below and press Ctrl+C (or long-press → Copy on mobile).</p><textarea class="textarea" readonly aria-label="Text to copy"></textarea><div class="modal-actions"><button class="btn btn-primary" value="close">Close</button></div></form>';
    document.body.appendChild(d);
    const ta = d.querySelector('textarea'); ta.value = text;
    d.addEventListener('close', function () { d.remove(); });
    d.showModal(); ta.focus(); ta.select();
  }
  U.copy = async function (text, label) {
    text = String(text);
    try {
      if (g.navigator.clipboard && g.isSecureContext) { await g.navigator.clipboard.writeText(text); U.toast((label || 'Text') + ' copied to clipboard', 'success'); return true; }
    } catch (e) { /* try fallback */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      if (ok) { U.toast((label || 'Text') + ' copied to clipboard', 'success'); return true; }
    } catch (e) { /* fall through */ }
    U.toast('Copy failed — please copy the text manually.', 'error', 5000);
    copyFallback(text);
    return false;
  };

  /* ---------- files / CSV ---------- */
  U.download = function (filename, content, mime) {
    try {
      const blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
      const url = g.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { g.URL.revokeObjectURL(url); }, 1000);
      U.toast('Downloaded ' + filename, 'success');
    } catch (e) { U.toast('Download failed in this browser.', 'error'); }
  };
  function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;      // neutralise spreadsheet formula injection
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  /** header: array of strings, rows: array of arrays */
  U.toCSV = function (header, rows) {
    return '﻿' + [header].concat(rows).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  };
  /** RFC 4180-style parser. Returns {rows, error}. */
  U.parseCSV = function (text) {
    text = String(text).replace(/^﻿/, '');
    const first = text.split(/\r?\n/, 1)[0] || '';
    const delim = first.indexOf(',') === -1 && first.indexOf(';') !== -1 ? ';' : ',';
    const rows = []; let row = [], cell = '', q = false, i = 0, line = 1;
    while (i < text.length) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i += 2; continue; } q = false; i++; continue; }
        if (c === '\n') line++;
        cell += c; i++; continue;
      }
      if (c === '"') { if (cell === '') { q = true; i++; continue; } return { rows: [], error: 'Malformed CSV: unexpected quote on line ' + line + '.' }; }
      if (c === delim) { row.push(cell); cell = ''; i++; continue; }
      if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = ''; rows.push(row); row = []; line++; i++; continue;
      }
      cell += c; i++;
    }
    if (q) return { rows: [], error: 'Malformed CSV: a quoted field is never closed (starts before line ' + line + ').' };
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const clean = rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); })
      .map(function (r) { return r.map(function (x) { return /^'[=+\-@]/.test(x) ? x.slice(1) : x; }); });
    return { rows: clean, error: null };
  };

  /* ---------- usage counters (remembered in a first-party cookie) ----------
     Stores COUNTS ONLY (items added, passwords generated, tools opened…) — never the content of
     inventory, reports or passwords. Falls back to LocalStorage where cookies are unavailable (e.g. file://). */
  const stats = {};
  ITK.stats = stats;
  const CK = 'itk_usage', OFF = 'itk_stats_off';
  let cache = null, via = 'memory';
  function cookiePath() { try { return g.location.pathname.replace(/[^\/]*$/, '') || '/'; } catch (e) { return '/'; } }
  function getCookie(n) {
    try { const m = document.cookie.split('; ').filter(function (r) { return r.indexOf(n + '=') === 0; })[0]; return m ? decodeURIComponent(m.slice(n.length + 1)) : null; } catch (e) { return null; }
  }
  function setCookie(n, v, days) {
    try {
      const secure = g.location && g.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = n + '=' + encodeURIComponent(v) + '; max-age=' + Math.round(days * 86400) + '; path=' + cookiePath() + '; SameSite=Lax' + secure;
      return days <= 0 ? true : getCookie(n) !== null;
    } catch (e) { return false; }
  }
  function blank() { return { v: 1, vis: 0, first: 0, last: 0, inv: 0, ip: 0, pw: 0, task: 0, copy: 0, t: {} }; }
  function load() {
    if (cache) return cache;
    let o = null;
    const raw = getCookie(CK);
    if (raw) { try { o = JSON.parse(raw); via = 'cookie'; } catch (e) { o = null; } }
    if (!o) { o = storage.get('usage', null); if (o) via = 'browser storage'; }
    const b = blank();
    if (o && typeof o === 'object') ['vis', 'first', 'last', 'inv', 'ip', 'pw', 'task', 'copy'].forEach(function (k) { b[k] = Math.max(0, Number(o[k]) || 0); });
    if (o && o.t && typeof o.t === 'object') Object.keys(o.t).slice(0, 40).forEach(function (k) { b.t[String(k).slice(0, 40)] = Math.max(0, Number(o.t[k]) || 0); });
    cache = b; return b;
  }
  function persist() {
    const d = cache;
    let s = JSON.stringify(d);
    if (s.length > 3000) {            // keep the cookie well below the 4 KB limit
      const top = Object.keys(d.t).sort(function (a, b) { return d.t[b] - d.t[a]; }).slice(0, 15), nt = {};
      top.forEach(function (k) { nt[k] = d.t[k]; }); d.t = nt; s = JSON.stringify(d);
    }
    if (setCookie(CK, s, 365)) { via = 'cookie'; return; }
    via = storage.set('usage', d) ? 'browser storage' : 'memory';
  }
  stats.enabled = function () { return getCookie(OFF) !== '1' && storage.get('stats.off', false) !== true; };
  stats.setEnabled = function (on) {
    if (on) { setCookie(OFF, '', 0); storage.remove('stats.off'); persist(); }
    else { stats.reset(); setCookie(OFF, '1', 365); storage.set('stats.off', true); }
  };
  stats.get = function () { return JSON.parse(JSON.stringify(load())); };
  stats.via = function () { load(); return via; };
  stats.inc = function (key, n) {
    if (!stats.enabled()) return;
    const d = load(); n = n === undefined ? 1 : Number(n);
    if (!(n > 0) || !(key in d) || key === 't' || key === 'v') return;
    d[key] += n; d.last = Date.now(); persist();
  };
  stats.tool = function (id) {
    if (!stats.enabled()) return;
    const d = load(), k = String(id).slice(0, 40); d.t[k] = (d.t[k] || 0) + 1; d.last = Date.now(); persist();
  };
  stats.visit = function () {
    if (!stats.enabled()) return;
    let seen = false;
    try { seen = g.sessionStorage.getItem('itk.visit') === '1'; g.sessionStorage.setItem('itk.visit', '1'); } catch (e) { /* count every load */ }
    if (seen) return;
    const d = load(); d.vis += 1; if (!d.first) d.first = Date.now(); d.last = Date.now(); persist();
  };
  stats.reset = function () { cache = blank(); setCookie(CK, '', 0); storage.remove('usage'); via = 'memory'; };
})(typeof window !== 'undefined' ? window : globalThis);
