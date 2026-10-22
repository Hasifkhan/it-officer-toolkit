/* app.js — router, navigation, global search, favourites, recents, theme, privacy page */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, S = ITK.storage, esc = U.esc;
  const CATS = [
    { id: 'ip', title: 'IP Address Tools', icon: 'network', desc: 'Validate, subnet, range, track and classify addresses' },
    { id: 'network', title: 'Network Troubleshooting', icon: 'wifi', desc: 'Step-by-step guides for connectivity problems' },
    { id: 'commands', title: 'Windows Commands', icon: 'terminal', desc: 'CMD and PowerShell command library' },
    { id: 'reports', title: 'Daily Report', icon: 'file-text', desc: 'Generate your daily IT activity report' },
    { id: 'hardware', title: 'Hardware & Windows', icon: 'monitor', desc: 'PC, boot, driver, update and disk guides' },
    { id: 'printer', title: 'Printers & Peripherals', icon: 'printer', desc: 'Printer, scanner, projector and USB support' },
    { id: 'inventory', title: 'IT Inventory', icon: 'box', desc: 'Record and export your devices' },
    { id: 'calc', title: 'Calculators', icon: 'calculator', desc: 'Storage, speed, download time, uptime, UPS' },
    { id: 'reference', title: 'Reference & Checklists', icon: 'book', desc: 'Ports, DNS, HTTP, Windows errors, checklists' },
    { id: 'security', title: 'Password Utilities', icon: 'key', desc: 'Generate and check passwords locally' }
  ];
  const $ = U.$, main = $('#main');
  const toolById = function (id) { return ITK.tools.find(function (t) { return t.id === id; }); };
  const catById = function (id) { return CATS.find(function (c) { return c.id === id; }) || (id === 'admin' ? { id: 'admin', title: 'Admin', icon: 'server', desc: 'Visitor statistics and management' } : undefined); };

  /* ---------- favourites / recents ---------- */
  const favs = function () { const v = S.get('favorites', []); return Array.isArray(v) ? v.filter(function (id) { const t = toolById(id); return t && !t.hidden; }) : []; };
  const recents = function () { const v = S.get('recent', []); return Array.isArray(v) ? v.filter(function (id) { return toolById(id); }) : []; };
  function toggleFav(id) {
    let f = favs();
    f = f.indexOf(id) === -1 ? f.concat(id) : f.filter(function (x) { return x !== id; });
    if (!S.set('favorites', f) && S.available()) U.toast('Could not save favourites (storage full).', 'error');
    return f.indexOf(id) !== -1;
  }
  function addRecent(id) { const t0 = toolById(id); if (t0 && t0.hidden) return; ITK.stats.tool(id); if (ITK.analytics) ITK.analytics.tool(id); const r = [id].concat(recents().filter(function (x) { return x !== id; })).slice(0, 8); S.set('recent', r); }

  /* ---------- theme ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const b = $('#theme-btn'); b.innerHTML = U.icon(t === 'dark' ? 'sun' : 'moon', 20);
    b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); b.setAttribute('aria-pressed', String(t === 'dark'));
  }
  $('#theme-btn').addEventListener('click', function () {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t); S.set('theme', t);
  });
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  $('#app-version').textContent = ITK.VERSION;

  /* ---------- sidebar & mobile menu ---------- */
  const sidebar = $('#sidebar'), scrim = $('#scrim'), menuBtn = $('#menu-btn');
  function menu(open) {
    sidebar.classList.toggle('open', open); scrim.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    if (open) { const a = sidebar.querySelector('a'); if (a) a.focus(); }
  }
  menuBtn.addEventListener('click', function () { menu(!sidebar.classList.contains('open')); });
  scrim.addEventListener('click', function () { menu(false); menuBtn.focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sidebar.classList.contains('open')) { menu(false); menuBtn.focus(); } });
  function drawSidebar(activeCat, activePage) {
    sidebar.innerHTML = '<a class="nav-link" href="#/"' + (activePage === 'home' ? ' aria-current="page"' : '') + '>' + U.icon('home') + ' Dashboard</a><h2>Categories</h2>' +
      CATS.map(function (c) {
        const n = ITK.tools.filter(function (t) { return t.cat === c.id; }).length;
        return '<a class="nav-link" href="#/cat/' + c.id + '"' + (activeCat === c.id ? ' aria-current="page"' : '') + '>' + U.icon(c.icon) + ' ' + esc(c.title) + '<span class="nav-count">' + n + '</span></a>';
      }).join('') + '<h2>About</h2><a class="nav-link" href="#/privacy"' + (activePage === 'privacy' ? ' aria-current="page"' : '') + '>' + U.icon('lock') + ' Data &amp; privacy</a>';
  }

  /* ---------- cards ---------- */
  function card(t) {
    const on = favs().indexOf(t.id) !== -1;
    return '<div class="tool-card"><span class="tc-icon">' + U.icon(t.icon || 'box', 20) + '</span><h3><a href="#/tool/' + esc(t.id) + '">' + esc(t.title) + '</a></h3><p>' + esc(t.desc) + '</p>' +
      '<button type="button" class="fav-btn" data-fav="' + esc(t.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove ' : 'Add ') + esc(t.title) + (on ? ' from favourites' : ' to favourites') + '">' + U.icon('star', 18) + '</button></div>';
  }
  function grid(list) { return '<div class="grid-cards">' + list.map(card).join('') + '</div>'; }

  /* ---------- views ---------- */
  function currentCount(name) {
    if (S.get(name + '.persist', false) === true) { const d = S.get(name + '.data', []); return Array.isArray(d) ? d.length : 0; }
    return (ITK.mem[name] || []).length;
  }
  function fmtWhen(ts) { return ts ? new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  function summaryHTML() {
    const on = ITK.stats.enabled(), d = ITK.stats.get();
    const toolIds = Object.keys(d.t), opens = toolIds.reduce(function (a, k) { return a + d.t[k]; }, 0);
    const top = toolIds.sort(function (a, b) { return d.t[b] - d.t[a]; }).map(toolById).filter(Boolean)[0];
    const tile = function (n, label, sub) { return '<div class="stat-tile"><b>' + esc(n) + '</b><span>' + esc(label) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>'; };
    return '<section class="card" aria-labelledby="sum-h"><div class="card-head"><h2 id="sum-h">Your activity summary</h2><div class="btn-row">' +
      '<label class="check"><input type="checkbox" id="stats-on"' + (on ? ' checked' : '') + '> Remember my usage</label>' +
      '<button type="button" class="btn btn-sm" id="stats-reset"' + (on ? '' : ' disabled') + '>Reset counters</button></div></div>' +
      (on ? '<div class="stat-tiles">' +
        tile(d.inv, 'Inventory items added', 'In your list now: ' + currentCount('inventory')) +
        tile(d.pw, 'Passwords generated', 'Not stored — count only') +
        tile(d.ip, 'IP records added', 'In your list now: ' + currentCount('ip-tracker')) +
        tile(d.task, 'Report tasks logged') + tile(d.copy, 'Commands copied') + tile(opens, 'Tools opened', top ? 'Most used: ' + top.title : '') + tile(d.vis, 'Visits', 'Since ' + fmtWhen(d.first)) +
        '</div>' : '<p class="muted">Usage counting is turned off. Tick “Remember my usage” to start counting again.</p>') +
      '<p class="help" style="margin-top:10px">Remembered with a small cookie (' + esc(ITK.stats.via()) + ') on this browser only. It stores counts only — never your inventory, reports or passwords. “In your list now” shows items currently held in this tab or saved in this browser. Last visit: ' + fmtWhen(d.last) + '.</p></section>';
  }
  function viewHome() {
    const f = favs().map(toolById), r = recents().map(toolById);
    main.innerHTML = '<div class="hero"><h1 id="page-h" tabindex="-1">IT Officer Toolkit</h1><p>Practical Tools for Everyday IT Support — free, login-free, and everything runs locally in your browser.</p></div>' +
      summaryHTML() + (f.length ? '<div class="section-title"><h2>Favourites</h2></div>' + grid(f) : '') +
      (r.length ? '<div class="section-title"><h2>Recently used</h2><button class="btn btn-sm" id="clr-recent" type="button">Clear history</button></div>' + grid(r) : '') +
      CATS.map(function (c) {
        const list = ITK.tools.filter(function (t) { return t.cat === c.id; });
        return list.length ? '<div class="section-title"><h2>' + U.icon(c.icon, 20) + ' ' + esc(c.title) + '</h2><a href="#/cat/' + c.id + '">View all</a></div>' + grid(list) : '';
      }).join('');
    $('#stats-on').onchange = function () { ITK.stats.setEnabled(this.checked); viewHome(); U.toast(this.checked ? 'Usage will be remembered' : 'Usage counting off and counters deleted', 'success'); };
    $('#stats-reset').onclick = function () { U.confirm('Reset all usage counters to zero?', { okText: 'Reset counters' }).then(function (ok) { if (ok) { ITK.stats.reset(); ITK.stats.visit(); viewHome(); U.toast('Counters reset', 'success'); } }); };
    if (ITK.analytics && ITK.analytics.configured) ITK.analytics.announcement().then(function (t) { const h = main.querySelector('.hero'); if (t && h && !main.querySelector('.announce')) { const d = document.createElement('div'); d.className = 'alert alert-info announce'; d.setAttribute('role', 'status'); d.innerHTML = '<div class="alert-body"></div>'; d.firstChild.textContent = t; h.after(d); } });
    const b = $('#clr-recent'); if (b) b.onclick = function () { S.remove('recent'); viewHome(); U.toast('Recent history cleared', 'success'); };
  }
  function viewCat(id) {
    const c = catById(id);
    if (!c) return notFound();
    main.innerHTML = '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Dashboard</a> › ' + esc(c.title) + '</nav><div class="tool-head"><div><h1 id="page-h" tabindex="-1">' + esc(c.title) + '</h1><p>' + esc(c.desc) + '</p></div></div>' + grid(ITK.tools.filter(function (t) { return t.cat === id; }));
  }
  function viewTool(id, params) {
    const t = toolById(id);
    if (!t) return notFound();
    const c = catById(t.cat), on = favs().indexOf(t.id) !== -1;
    main.innerHTML = '<nav class="crumbs no-print" aria-label="Breadcrumb"><a href="#/">Dashboard</a> › <a href="#/cat/' + t.cat + '">' + esc(c.title) + '</a> › ' + esc(t.title) + '</nav>' +
      '<div class="tool-head"><div><h1 id="page-h" tabindex="-1">' + esc(t.title) + '</h1><p>' + esc(t.desc) + '</p></div><button type="button" class="btn btn-sm no-print" id="tool-fav" aria-pressed="' + on + '">' + U.icon('star', 16) + ' <span>' + (on ? 'Favourited' : 'Add to favourites') + '</span></button></div><div id="tool-root"></div>';
    $('#tool-fav').onclick = function () { const now = toggleFav(t.id); this.setAttribute('aria-pressed', String(now)); this.querySelector('span').textContent = now ? 'Favourited' : 'Add to favourites'; };
    addRecent(t.id);
    try { t.render($('#tool-root'), params || {}); }
    catch (e) { console.error(e); $('#tool-root').innerHTML = U.alert('danger', 'This tool failed to load: ' + esc(e.message)); }
  }
  function viewPrivacy() {
    const keys = S.keys();
    main.innerHTML = '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Dashboard</a> › Data &amp; privacy</nav><div class="tool-head"><div><h1 id="page-h" tabindex="-1">Data &amp; privacy</h1><p>What this website stores, and how to remove it.</p></div></div>' +
      '<section class="card"><h2>How your data is handled</h2><ul>' + (ITK.analytics && ITK.analytics.configured ? '<li><strong>Visit counting (enabled on this site).</strong> The site owner runs a small counter. It records a random visitor ID stored in this browser, which tools you open, and — from the request itself — your IP address, approximate country/city, browser, OS and device type, kept for a limited time. <strong>Nothing you type into the tools is ever sent.</strong> ' + (ITK.analytics.dnt ? 'Your browser sends Do Not Track / Global Privacy Control, so nothing is counted. ' : '') + '<label class="check"><input type="checkbox" id="an-out"' + (ITK.analytics.state() === 'out' ? ' checked' : '') + '> Do not count my visits</label></li>' : '<li><strong>No server, no account.</strong> This is a static website. Nothing you type is sent to any server, and no external APIs are called.</li>') +
      '<li><strong>Nothing is saved unless you choose.</strong> Inventory, IP tracker and report data are kept in memory for the current tab. Saving to this browser (LocalStorage) is an explicit opt-in.</li>' +
      '<li><strong>Preferences</strong> (theme, favourites, recently used tools) are stored in LocalStorage so they persist.</li>' +
      '<li><strong>Usage counters:</strong> a small first-party cookie (<span class="mono">itk_usage</span>, 1 year) remembers counts such as items added and passwords generated. It holds numbers only, is never used for tracking and is only sent to the site that serves this page. Turn it off or reset it on the dashboard.</li><li><strong>Passwords</strong> you generate or check are never stored anywhere.</li>' +
      '<li><strong>LocalStorage limits:</strong> it is specific to this browser and device, is not synced across devices, can be cleared by the browser, and is not encrypted or a secure backup. Export CSV regularly.</li>' +
      '<li><strong>Shared computers:</strong> do not enter confidential company information or turn on saving on a computer others use.</li></ul></section>' +
      '<section class="card"><h2>Data saved in this browser</h2>' + (S.available() ? (keys.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Size</th></tr></thead><tbody>' + keys.map(function (k) { return '<tr><td class="mono">' + esc(k) + '</td><td>' + S.size(k).toLocaleString('en-US') + ' characters</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">Nothing is saved in this browser right now.</p>') : U.alert('warn', 'Browser storage is unavailable or blocked, so nothing can be saved (the tools still work for this session).')) +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-danger" id="clr-all" type="button">' + U.icon('trash', 16) + ' Clear all saved data</button></div></section>';
    const ao = $('#an-out'); if (ao) ao.onchange = function () { ITK.analytics.setOptOut(this.checked); U.toast(this.checked ? 'Your visits will not be counted' : 'Visit counting allowed', 'success'); };
    $('#clr-all').onclick = function () {
      U.confirm('Delete everything this website saved in this browser (saved lists, report draft, favourites, history, theme, usage cookie)? In-memory data in this tab is cleared too.', { okText: 'Clear everything' }).then(function (ok) {
        if (!ok) return; S.clearAll(); ITK.stats.reset(); ITK.mem = {}; U.toast('All saved data cleared', 'success'); route();
      });
    };
  }
  function notFound() {
    main.innerHTML = '<div class="card empty"><h1 id="page-h" tabindex="-1">Page not found</h1><p>That page or tool does not exist.</p><a class="btn btn-primary" href="#/">Back to the dashboard</a></div>';
  }

  /* ---------- router ---------- */
  function parseHash() {
    const h = (location.hash || '#/').replace(/^#/, ''), i = h.indexOf('?');
    const path = i === -1 ? h : h.slice(0, i), params = {};
    if (i !== -1) new URLSearchParams(h.slice(i + 1)).forEach(function (v, k) { params[k] = v; });
    return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), params: params };
  }
  function route() {
    const r = parseHash(), p = r.parts;
    let cat = null, page = 'home';
    if (!p.length) viewHome();
    else if (p[0] === 'cat') { cat = p[1]; page = 'cat'; viewCat(p[1]); }
    else if (p[0] === 'tool') { const t = toolById(p[1]); cat = t && t.cat; page = 'tool'; viewTool(p[1], r.params); }
    else if (p[0] === 'admin') { cat = 'admin'; page = 'tool'; viewTool('admin-dashboard', {}); }
    else if (p[0] === 'privacy') { page = 'privacy'; viewPrivacy(); }
    else notFound();
    drawSidebar(cat, page); menu(false);
    const t = toolById(p[1]);
    document.title = (page === 'tool' && p[0] === 'admin' ? 'Admin — ' : page === 'tool' && t ? t.title + ' — ' : (page === 'privacy' ? 'Data & privacy — ' : '')) + 'IT Officer Toolkit';
    if (!(page === 'tool' && r.params.open)) g.scrollTo(0, 0);
    const h = $('#page-h'); if (h && !r.params.open) h.focus({ preventScroll: true });
  }
  g.addEventListener('hashchange', route);

  /* delegated: copy buttons and favourite stars */
  document.addEventListener('click', function (e) {
    const cp = e.target.closest('[data-copy]');
    if (cp) { e.preventDefault(); U.copy(cp.getAttribute('data-copy'), 'Copied').then(function (ok) { if (ok) ITK.stats.inc('copy', 1); }); return; }
    const fv = e.target.closest('[data-fav]');
    if (fv) {
      const on = toggleFav(fv.dataset.fav), t = toolById(fv.dataset.fav);
      fv.setAttribute('aria-pressed', String(on)); fv.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + t.title + (on ? ' from favourites' : ' to favourites'));
      const r = parseHash(); if (!r.parts.length) viewHome();
    }
  });

  /* ---------- global search ---------- */
  let index = null;
  function buildIndex() {
    index = [];
    const D = ITK.data, enc = encodeURIComponent;
    ITK.tools.filter(function (t) { return !t.hidden; }).forEach(function (t) { index.push({ type: 'Tool', title: t.title, sub: t.desc, hay: (t.title + ' ' + t.desc + ' ' + (t.keywords || '')).toLowerCase(), href: '#/tool/' + t.id, rank: 0 }); });
    (D.guides || []).forEach(function (x) {
      const tool = { network: 'net-guides', hardware: 'hw-guides', printer: 'printer-guides' }[x.cat];
      index.push({ type: 'Guide', title: x.title, sub: x.desc, hay: (x.title + ' ' + x.desc + ' ' + x.symptoms.join(' ') + ' ' + x.causes.join(' ')).toLowerCase(), href: '#/tool/' + tool + '?open=' + enc(x.id), rank: 1 });
    });
    (D.commands || []).forEach(function (x) { index.push({ type: 'Command', title: x.cmd, sub: x.purpose, hay: (x.name + ' ' + x.cmd + ' ' + x.purpose + ' ' + x.when).toLowerCase(), href: '#/tool/commands?q=' + enc(x.name), rank: 2 }); });
    (D.ports || []).forEach(function (x) { index.push({ type: 'Port', title: x.port + ' — ' + x.service, sub: x.proto + ' · ' + x.desc, hay: (x.port + ' ' + x.proto + ' ' + x.service + ' ' + x.desc).toLowerCase(), href: '#/tool/ports?q=' + enc(x.port), rank: 3 }); });
    (D.http || []).forEach(function (x) { index.push({ type: 'HTTP', title: x.code + ' ' + x.name, sub: x.desc, hay: (x.code + ' ' + x.name + ' ' + x.desc).toLowerCase(), href: '#/tool/http-codes?q=' + enc(x.code), rank: 3 }); });
    (D.winerr || []).forEach(function (x) { index.push({ type: 'Error', title: x.code + ' — ' + x.name, sub: x.desc, hay: (x.code + ' ' + x.name + ' ' + x.desc).toLowerCase(), href: '#/tool/windows-errors?q=' + enc(x.code), rank: 3 }); });
    (D.dns || []).forEach(function (x) { index.push({ type: 'DNS', title: x.type + ' record', sub: x.desc, hay: (x.type + ' ' + x.desc).toLowerCase(), href: '#/tool/dns-records?q=' + enc(x.type), rank: 3 }); });
  }
  function search(q) {
    if (!index) buildIndex();
    const s = q.trim().toLowerCase(), toks = s.split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    return index.filter(function (x) { return toks.every(function (t) { return x.hay.indexOf(t) !== -1; }); }).map(function (x) {
      const ti = x.title.toLowerCase();
      return { x: x, score: (ti === s ? 0 : (ti.indexOf(s) === 0 ? 1 : (ti.indexOf(s) !== -1 ? 2 : 3))) * 10 + x.rank };
    }).sort(function (a, b) { return a.score - b.score; }).slice(0, 12).map(function (o) { return o.x; });
  }
  const box = $('#global-search'), results = $('#search-results');
  let active = -1, current = [];
  function closeResults() { results.hidden = true; box.setAttribute('aria-expanded', 'false'); box.removeAttribute('aria-activedescendant'); active = -1; }
  function setActive(i) {
    const items = U.$$('.sr-item', results); active = i;
    items.forEach(function (el, n) { el.setAttribute('aria-selected', String(n === i)); });
    if (items[i]) { box.setAttribute('aria-activedescendant', items[i].id); items[i].scrollIntoView({ block: 'nearest' }); } else box.removeAttribute('aria-activedescendant');
  }
  function drawResults() {
    const q = box.value;
    if (!q.trim()) { closeResults(); return; }
    current = search(q);
    results.innerHTML = current.length ? current.map(function (x, i) {
      return '<a class="sr-item" role="option" id="sr-' + i + '" aria-selected="false" href="' + esc(x.href) + '">' + U.badge(x.type) + '<span><span class="sr-title">' + esc(x.title) + '</span><span class="sr-sub">' + esc(x.sub.length > 110 ? x.sub.slice(0, 107) + '…' : x.sub) + '</span></span></a>';
    }).join('') : '<div class="sr-empty">No results for “' + esc(q) + '”. Try a shorter keyword such as “dns”, “printer”, “443” or “subnet”.</div>';
    results.hidden = false; box.setAttribute('aria-expanded', 'true'); active = -1;
  }
  box.addEventListener('input', U.debounce(drawResults, 100));
  box.addEventListener('focus', function () { if (box.value.trim()) drawResults(); });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (results.hidden) drawResults(); setActive(Math.min(active + 1, current.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
    else if (e.key === 'Enter') { const t = current[active >= 0 ? active : 0]; if (t && !results.hidden) { e.preventDefault(); location.hash = t.href; closeResults(); box.blur(); } }
    else if (e.key === 'Escape') { closeResults(); }
  });
  results.addEventListener('click', function () { setTimeout(function () { closeResults(); box.value = ''; }, 0); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search')) closeResults(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); box.focus(); box.select(); }
  });

  ITK.stats.visit();
  if (ITK.analytics) { ITK.analytics.visit(); ITK.analytics.showNotice(); }
  const fp = document.getElementById('footer-priv'); if (fp && ITK.analytics && ITK.analytics.active()) fp.textContent = 'All tools run in your browser; your inputs are never sent. Anonymous visit counts are collected (see Data & privacy).';
  if (!S.available()) U.toast('Browser storage is blocked: favourites and saved lists are disabled, but all tools still work.', 'info', 6000);
  route();
})(typeof window !== 'undefined' ? window : globalThis);
