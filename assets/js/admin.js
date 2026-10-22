/* admin.js — hidden admin dashboard at #/admin. Needs the optional analytics Worker. The token lives in sessionStorage only (cleared when the tab closes). */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc, A = ITK.analytics;
  const KEY = 'itk_admin_token';
  const tok = { get: function () { try { return g.sessionStorage.getItem(KEY) || ''; } catch (e) { return mem; } }, set: function (v) { mem = v; try { g.sessionStorage.setItem(KEY, v); } catch (e) { /* memory only */ } }, clear: function () { mem = ''; try { g.sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ } } };
  let mem = '';
  const tz = function () { return -new Date().getTimezoneOffset(); };
  const FLAG = function (cc) { return /^[A-Za-z]{2}$/.test(cc || '') ? String.fromCodePoint.apply(null, cc.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : ''; };
  let names; try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { names = null; }
  const cname = function (cc) { if (!cc) return 'Unknown'; try { return (names && names.of(cc.toUpperCase())) || cc; } catch (e) { return cc; } };
  const fmt = function (ts) { return new Date(ts).toLocaleString(); };

  function api(path, opts) {
    opts = opts || {};
    return g.fetch(A.endpoint + '/api/admin' + path, { method: opts.method || 'GET', credentials: 'omit', headers: Object.assign({ Authorization: 'Bearer ' + tok.get() }, opts.body ? { 'Content-Type': 'application/json' } : {}), body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        if (opts.raw && r.ok) return r;
        return r.json().catch(() => ({})).then(function (j) { if (!r.ok) { const e = new Error(j.error || ('Request failed (' + r.status + ')')); e.status = r.status; throw e; } return j; });
      });
  }

  function bars(rows, key, label, cls) {
    const max = Math.max.apply(null, rows.map(r => r[key]).concat(1));
    return '<div class="bars">' + rows.map(r => '<div class="bar-row"><span class="bar-l">' + label(r) + '</span><span class="bar-t"><i style="width:' + Math.max(2, Math.round(r[key] / max * 100)) + '%"></i></span><span class="bar-n">' + r[key] + '</span></div>').join('') + '</div>';
  }
  function chart(daily, today) {
    if (!daily.length) return '<p class="muted">No visits recorded yet.</p>';
    const map = {}; daily.forEach(d => { map[d.day] = d; });
    const days = [], base = new Date(today + 'T00:00:00Z'); for (let i = 29; i >= 0; i--) { const d = new Date(base.getTime() - i * 864e5).toISOString().slice(0, 10); days.push(map[d] || { day: d, visitors: 0, visits: 0 }); }
    const max = Math.max.apply(null, days.map(d => d.visitors).concat(1));
    return '<div class="chart" role="img" aria-label="Unique visitors per day, last 30 days">' + days.map(d => '<div class="chart-c" title="' + esc(d.day) + ': ' + d.visitors + ' visitors"><i style="height:' + Math.round(d.visitors / max * 100) + '%"></i></div>').join('') + '</div><div class="chart-x"><span>' + esc(days[0].day) + '</span><span>peak ' + max + ' / day</span><span>' + esc(days[29].day) + '</span></div>' +
      '<details><summary>Show as table</summary><div class="table-wrap"><table class="table"><thead><tr><th>Day</th><th>Unique visitors</th><th>Visits</th><th>Tool opens</th><th>New</th></tr></thead><tbody>' + daily.slice().reverse().map(d => '<tr><td>' + esc(d.day) + '</td><td>' + d.visitors + '</td><td>' + d.visits + '</td><td>' + d.tools + '</td><td>' + d.newVisitors + '</td></tr>').join('') + '</tbody></table></div></details>';
  }
  const tile = (n, l, s) => '<div class="stat-tile"><b>' + esc(String(n)) + '</b><span>' + esc(l) + '</span>' + (s ? '<small>' + esc(s) + '</small>' : '') + '</div>';

  function setup(root) {
    root.innerHTML = U.alert('info', '<strong>Analytics is not enabled.</strong> This site is running as a pure static site, so there is no visitor data to show. The admin area needs the small free Cloudflare Worker in the <span class="mono">analytics/</span> folder.') +
      '<section class="card"><h2>Enable it in 4 steps</h2><ol><li>Follow <span class="mono">analytics/README.md</span> to deploy the Worker and database (free tier).</li><li>Set <span class="mono">ALLOWED_ORIGINS</span> to your site address and create a secret <span class="mono">ADMIN_TOKEN</span> (long random value).</li><li>Put the Worker URL in <span class="mono">assets/js/config.js</span> as <span class="mono">analyticsEndpoint</span>.</li><li>Publish the site again and open <span class="mono">#/admin</span>.</li></ol></section>';
  }
  function login(root, msg) {
    root.innerHTML = '<section class="card" style="max-width:460px"><h2>Admin sign-in</h2>' + (msg ? '<div class="error" role="alert">' + esc(msg) + '</div>' : '') +
      '<form id="ad-form" autocomplete="off"><div class="field"><label for="ad-t">Admin token</label><input class="input" id="ad-t" type="password" autocomplete="off" spellcheck="false" required><div class="help">The ADMIN_TOKEN secret you set on the Worker. Kept only for this browser tab; never saved to disk.</div></div><div class="btn-row"><button class="btn btn-primary" type="submit">Sign in</button></div></form></section>';
    document.getElementById('ad-form').onsubmit = function (e) {
      e.preventDefault(); tok.set(document.getElementById('ad-t').value.trim());
      api('/ping').then(() => dash(root)).catch(function (er) { tok.clear(); login(root, er.status === 401 ? 'Wrong token.' : (er.status === 429 ? 'Too many failed attempts. Try again later.' : er.message === 'Failed to fetch' ? 'Cannot reach the analytics server. Check the endpoint and ALLOWED_ORIGINS.' : er.message)); });
    };
  }

  function dash(root) {
    let tab = 'overview', days = 30, S = null, logState = { offset: 0, country: '', q: '', from: '', to: '' };
    const TABS = [['overview', 'Overview'], ['visitors', 'Visitors'], ['blocked', 'Blocked IPs'], ['tools', 'Settings & data']];
    function frame(inner) {
      root.innerHTML = '<div class="tabs" role="tablist">' + TABS.map(t => '<button class="tab" role="tab" aria-selected="' + (t[0] === tab) + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '<span class="grow"></span><button class="btn btn-sm" id="ad-ref" type="button">Refresh</button> <button class="btn btn-sm" id="ad-out" type="button">Sign out</button></div><div id="ad-body" aria-live="polite">' + inner + '</div>';
      root.querySelector('.tabs').onclick = function (e) { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; show(); } };
      document.getElementById('ad-ref').onclick = show; document.getElementById('ad-out').onclick = function () { tok.clear(); login(root); };
    }
    function fail(e) { if (e.status === 401 || e.status === 429) { tok.clear(); login(root, e.status === 401 ? 'Session expired — sign in again.' : e.message); } else frame(U.alert('danger', esc(e.message))); }
    function show() { frame('<p class="muted">Loading…</p>'); ({ overview: overview, visitors: visitors, blocked: blocked, tools: settings })[tab]().catch(fail); }
    const body = () => document.getElementById('ad-body');

    function overview() {
      return api('/summary?tz=' + tz() + '&days=' + days).then(function (s) {
        S = s; const t = s.todayStats, nr = s.newReturning || { newV: 0, retV: 0 };
        body().innerHTML = '<div class="stat-tiles">' + tile(t.visitors, 'Visitors today', t.visits + ' visits · ' + t.tools + ' tool opens') + tile(s.activeNow, 'Active in last 5 min') + tile(s.last7.visitors, 'Visitors, 7 days') + tile(s.last30.visitors, 'Visitors, 30 days', s.last30.ips + ' distinct IPs') + tile(s.total.visitors, 'All time', s.total.events + ' events' + (s.total.firstTs ? ' since ' + new Date(s.total.firstTs).toLocaleDateString() : '')) + '</div>' +
          '<section class="card"><h2>Daily visitors <span class="muted" style="font-size:.8rem;font-weight:400">(your time zone)</span></h2>' + chart(s.daily, s.today) + '</section>' +
          '<div class="grid-2"><section class="card"><h2>Countries <span class="muted" style="font-size:.8rem;font-weight:400">(last ' + s.days + ' days)</span></h2>' + (s.countries.length ? bars(s.countries, 'visitors', r => FLAG(r.country) + ' ' + esc(cname(r.country))) : '<p class="muted">No data yet.</p>') + '</section>' +
          '<section class="card"><h2>Most used tools</h2>' + (s.tools.length ? bars(s.tools.slice(0, 12), 'opens', r => { const t = ITK.tools.find(x => x.id === r.tool); return esc(t ? t.title : r.tool); }) : '<p class="muted">No tool opens yet.</p>') + '</section>' +
          '<section class="card"><h2>New vs returning</h2>' + bars([{ n: 'New', v: nr.newV || 0 }, { n: 'Returning', v: nr.retV || 0 }], 'v', r => r.n) + '</section>' +
          '<section class="card"><h2>Devices &amp; browsers</h2>' + bars(s.devices, 'visitors', r => esc(r.name || 'Unknown')) + '<hr>' + bars(s.browsers.slice(0, 6), 'visitors', r => esc(r.name || 'Unknown')) + '<hr>' + bars(s.os.slice(0, 6), 'visitors', r => esc(r.name || 'Unknown')) + '</section></div>' +
          '<div class="btn-row"><label for="ad-days" class="label" style="margin:0">Window</label><select id="ad-days" class="input" style="width:auto">' + [7, 30, 90, 180].map(n => '<option' + (n === days ? ' selected' : '') + '>' + n + '</option>').join('') + '</select><span class="muted">days (charts show the last 30)</span></div>';
        document.getElementById('ad-days').onchange = function () { days = Number(this.value); show(); };
      });
    }

    function qs() { const p = new URLSearchParams({ tz: tz() }); ['country', 'q', 'from', 'to'].forEach(k => { if (logState[k]) p.set(k, logState[k]); }); return p; }
    function visitors() {
      const p = qs(); p.set('limit', 50); p.set('offset', logState.offset);
      return api('/log?' + p).then(function (r) {
        const from = r.total ? logState.offset + 1 : 0, to = logState.offset + r.rows.length;
        body().innerHTML = '<section class="card"><form id="lf" class="form-grid"><div class="field"><label for="lf-q">Search IP, city, tool</label><input class="input" id="lf-q" value="' + esc(logState.q) + '"></div><div class="field"><label for="lf-c">Country code</label><input class="input" id="lf-c" maxlength="2" placeholder="BD" value="' + esc(logState.country) + '"></div><div class="field"><label for="lf-f">From</label><input class="input" type="date" id="lf-f" value="' + esc(logState.from) + '"></div><div class="field"><label for="lf-t">To</label><input class="input" type="date" id="lf-t" value="' + esc(logState.to) + '"></div></form><div class="btn-row"><button class="btn btn-primary" id="lf-go" type="button">Apply</button><button class="btn" id="lf-clr" type="button">Clear</button><button class="btn" id="lf-csv" type="button">' + U.icon('download', 16) + ' Export CSV</button></div></section>' +
          '<section class="card"><p class="muted">' + from + '–' + to + ' of ' + r.total + ' events (newest first)</p><div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>IP address</th><th>Country</th><th>City</th><th>Event</th><th>Browser / OS</th><th>Device</th><th>Actions</th></tr></thead><tbody>' +
          (r.rows.length ? r.rows.map(function (x, i) { const t = x.tool && ITK.tools.find(y => y.id === x.tool); return '<tr><td>' + esc(fmt(x.ts)) + '</td><td class="mono">' + esc(x.ip || '—') + '</td><td>' + FLAG(x.country) + ' ' + esc(cname(x.country)) + '</td><td>' + esc(x.city || '') + '</td><td>' + (x.kind === 'tool' ? 'Tool: ' + esc(t ? t.title : x.tool) : 'Visit') + (x.is_returning ? ' <span class="badge">returning</span>' : '') + '</td><td>' + esc((x.browser || '') + ' / ' + (x.os || '')) + '</td><td>' + esc(x.device || '') + '</td><td>' + (x.ip ? '<button class="btn btn-sm" data-blk="' + i + '">Block</button> <button class="btn btn-sm btn-danger" data-del="' + i + '">Delete data</button>' : '') + '</td></tr>'; }).join('') : '<tr><td colspan="8" class="muted">No events match.</td></tr>') +
          '</tbody></table></div><div class="btn-row"><button class="btn" id="pg-p" type="button"' + (logState.offset ? '' : ' disabled') + '>Previous</button><button class="btn" id="pg-n" type="button"' + (to < r.total ? '' : ' disabled') + '>Next</button></div></section>';
        const apply = function () { logState.q = document.getElementById('lf-q').value.trim(); logState.country = document.getElementById('lf-c').value.trim().toUpperCase(); logState.from = document.getElementById('lf-f').value; logState.to = document.getElementById('lf-t').value; logState.offset = 0; show(); };
        document.getElementById('lf').onsubmit = function (e) { e.preventDefault(); apply(); }; document.getElementById('lf-go').onclick = apply;
        document.getElementById('lf-clr').onclick = function () { logState = { offset: 0, country: '', q: '', from: '', to: '' }; show(); };
        document.getElementById('pg-p').onclick = function () { logState.offset = Math.max(0, logState.offset - 50); show(); };
        document.getElementById('pg-n').onclick = function () { logState.offset += 50; show(); };
        document.getElementById('lf-csv').onclick = function () { api('/export.csv?' + qs(), { raw: true }).then(r => r.text()).then(t => { U.download('visitors-' + U.todayISO() + '.csv', t, 'text/csv;charset=utf-8'); U.toast('CSV downloaded', 'success'); }).catch(e => U.toast(e.message, 'error')); };
        body().onclick = function (e) {
          const b = e.target.closest('[data-blk],[data-del]'); if (!b) return; const row = r.rows[Number(b.dataset.blk !== undefined ? b.dataset.blk : b.dataset.del)];
          if (b.dataset.blk !== undefined) U.confirm('Block ' + row.ip + '? Future visits from it will be ignored (not recorded).', { okText: 'Block IP', danger: false }).then(ok => ok && api('/blocked', { method: 'POST', body: { ip: row.ip } }).then(() => U.toast('IP blocked', 'success')).catch(e => U.toast(e.message, 'error')));
          else U.confirm('Permanently delete all stored events for ' + row.ip + '?', { okText: 'Delete', danger: true }).then(ok => ok && api('/purge', { method: 'POST', body: { ip: row.ip } }).then(x => { U.toast(x.deleted + ' events deleted', 'success'); show(); }).catch(e => U.toast(e.message, 'error')));
        };
      });
    }

    function blocked() {
      return api('/blocked').then(function (r) {
        body().innerHTML = '<section class="card"><h2>Block an IP address</h2><form id="bf" class="form-grid"><div class="field"><label for="bf-ip">IP address</label><input class="input mono" id="bf-ip" required></div><div class="field"><label for="bf-n">Note (optional)</label><input class="input" id="bf-n" maxlength="100"></div></form><div class="btn-row"><button class="btn btn-primary" id="bf-go" type="button">Block</button></div><div class="help">Blocked IPs are silently ignored by the counter (useful for your own office or test machines). It does not stop them using the site.</div></section>' +
          '<section class="card"><h2>Blocked (' + r.rows.length + ')</h2>' + (r.rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>IP</th><th>Note</th><th>Added</th><th></th></tr></thead><tbody>' + r.rows.map((x, i) => '<tr><td class="mono">' + esc(x.ip) + '</td><td>' + esc(x.note || '') + '</td><td>' + esc(fmt(x.ts)) + '</td><td><button class="btn btn-sm" data-un="' + i + '">Unblock</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">Nothing blocked.</p>') + '</section>';
        document.getElementById('bf-go').onclick = function () { api('/blocked', { method: 'POST', body: { ip: document.getElementById('bf-ip').value.trim(), note: document.getElementById('bf-n').value.trim() } }).then(() => { U.toast('IP blocked', 'success'); show(); }).catch(e => U.toast(e.message, 'error')); };
        body().onclick = function (e) { const b = e.target.closest('[data-un]'); if (b) api('/blocked', { method: 'DELETE', body: { ip: r.rows[Number(b.dataset.un)].ip } }).then(() => { U.toast('Unblocked', 'success'); show(); }).catch(e => U.toast(e.message, 'error')); };
      });
    }

    function settings() {
      return Promise.all([api('/ping'), A.announcement()]).then(function (res) {
        const c = res[0].config, ann = res[1];
        body().innerHTML = '<section class="card"><h2>Announcement banner</h2><p class="muted">Shown on the dashboard of every visitor (plain text, max 300 characters). Leave empty to remove.</p><div class="field"><label for="an-t">Message</label><textarea class="input" id="an-t" rows="2" maxlength="300">' + esc(ann) + '</textarea></div><div class="btn-row"><button class="btn btn-primary" id="an-go" type="button">Publish</button></div></section>' +
          '<section class="card"><h2>Server configuration</h2><p>Set on the Worker (<span class="mono">wrangler.toml</span>); read-only here.</p><ul><li>IP storage mode: <strong>' + esc(c.ipMode) + '</strong> <span class="muted">(full · masked · hash · none)</span></li><li>Automatic deletion after: <strong>' + c.retentionDays + ' days</strong></li><li>Allowed website origin(s): <span class="mono">' + esc(c.allowedOrigins) + '</span></li><li>Visitor consent mode on this site: <strong>' + esc((ITK.config || {}).consentMode) + '</strong></li></ul></section>' +
          '<section class="card"><h2>Delete data</h2><div class="btn-row"><button class="btn" id="pg-old" type="button">Delete events older than 30 days</button><button class="btn btn-danger" id="pg-all" type="button">' + U.icon('trash', 16) + ' Delete ALL visitor data</button></div><div class="help">IP addresses are personal data in many countries. Delete on request and keep retention short.</div></section>';
        document.getElementById('an-go').onclick = function () { api('/announcement', { method: 'POST', body: { text: document.getElementById('an-t').value } }).then(() => U.toast('Announcement updated', 'success')).catch(e => U.toast(e.message, 'error')); };
        const purge = (body_, msg, danger) => U.confirm(msg, { okText: 'Delete', danger: danger }).then(ok => ok && api('/purge', { method: 'POST', body: body_ }).then(x => U.toast(x.deleted + ' events deleted', 'success')).catch(e => U.toast(e.message, 'error')));
        document.getElementById('pg-old').onclick = () => purge({ olderThanDays: 30 }, 'Delete all events older than 30 days?');
        document.getElementById('pg-all').onclick = () => purge({ all: true }, 'Permanently delete ALL visitor data? This cannot be undone.', true);
      });
    }
    show();
  }

  ITK.register({
    id: 'admin-dashboard', cat: 'admin', hidden: true, icon: 'server', title: 'Admin dashboard', desc: 'Daily visitors with country and IP address, tool usage and visitor management.', keywords: '',
    render: function (root) {
      if (!A || !A.configured) return setup(root);
      if (tok.get()) { api('/ping').then(() => dash(root)).catch(() => { tok.clear(); login(root); }); root.innerHTML = '<p class="muted">Checking session…</p>'; } else login(root);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
