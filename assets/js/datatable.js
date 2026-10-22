/* datatable.js — reusable CRUD table (form + search + filter + sort + CSV + optional browser-local persistence).
   Used by the IP Availability Tracker and the IT Inventory. */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc;
  const PAGE = 50;
  const MAX_CSV_BYTES = 1024 * 1024;

  function normKey(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function create(root, cfg) {
    const name = cfg.name, maxRows = cfg.maxRows || 5000;
    const dataKey = name + '.data', persKey = name + '.persist';
    const canPersist = ITK.storage.available();
    const S = { data: [], persist: false, q: '', filter: '', sortKey: cfg.sortKey || cfg.fields[0].key, sortDir: 1, page: 1, editing: null };
    const fieldByKey = {}; cfg.fields.forEach(function (f) { fieldByKey[f.key] = f; });

    function sanitize(rec) {
      const r = { id: String(rec && rec.id || U.uid()) };
      cfg.fields.forEach(function (f) { r[f.key] = String(rec && rec[f.key] != null ? rec[f.key] : '').slice(0, f.max || 200); });
      return r;
    }
    S.persist = canPersist && ITK.storage.get(persKey, false) === true;
    const loaded = S.persist ? ITK.storage.get(dataKey, []) : (ITK.mem[name] || []);
    S.data = (Array.isArray(loaded) ? loaded : []).slice(0, maxRows).map(sanitize);

    function save() {
      ITK.mem[name] = S.data;
      if (S.persist && !ITK.storage.set(dataKey, S.data)) {
        U.toast('Could not save to browser storage (blocked or full). Data stays in this session — export a CSV to keep a copy.', 'error', 7000);
      }
      if (cfg.onChange) cfg.onChange(api);
    }

    /* ----- validation ----- */
    function validateRecord(rec, ignoreId) {
      const errs = {};
      cfg.fields.forEach(function (f) {
        const v = rec[f.key];
        if (f.required && !v) { errs[f.key] = f.label + ' is required.'; return; }
        if (!v) return;
        if (v.length > (f.max || 200)) { errs[f.key] = f.label + ' is too long (max ' + (f.max || 200) + ' characters).'; return; }
        if (f.type === 'select' && f.options.indexOf(v) === -1) { errs[f.key] = f.label + ' must be one of: ' + f.options.join(', ') + '.'; return; }
        if (f.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v)))) { errs[f.key] = f.label + ' must be a valid date (YYYY-MM-DD).'; return; }
        if (f.validate) { const m = f.validate(v); if (m) errs[f.key] = m; }
      });
      if (cfg.unique && rec[cfg.unique] && !errs[cfg.unique]) {
        const k = rec[cfg.unique].toLowerCase();
        if (S.data.some(function (d) { return d.id !== ignoreId && String(d[cfg.unique]).toLowerCase() === k; })) {
          errs[cfg.unique] = fieldByKey[cfg.unique].label + ' "' + rec[cfg.unique] + '" already exists.';
        }
      }
      return errs;
    }
    function cleanValues(raw) {
      const rec = {};
      cfg.fields.forEach(function (f) {
        let v = String(raw[f.key] == null ? '' : raw[f.key]).trim();
        if (f.normalize && v) v = f.normalize(v);
        rec[f.key] = v;
      });
      return rec;
    }

    /* ----- skeleton ----- */
    const id = function (s) { return name + '-' + s; };
    function fieldHTML(f) {
      const fid = id('f-' + f.key);
      const common = 'id="' + fid + '" name="' + f.key + '" aria-describedby="' + fid + '-err' + (f.help ? ' ' + fid + '-help' : '') + '" maxlength="' + (f.max || 200) + '"' + (f.required ? ' aria-required="true"' : '');
      let ctl;
      if (f.type === 'select') {
        ctl = '<select class="select" ' + common.replace(/ maxlength="\d+"/, '') + '>' + (f.default ? '' : '<option value="">' + (f.required ? 'Select…' : '—') + '</option>') +
          f.options.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        ctl = '<textarea class="textarea" rows="2" ' + common + ' placeholder="' + esc(f.placeholder || '') + '"></textarea>';
      } else {
        ctl = '<input class="input' + (f.mono ? ' mono' : '') + '" type="' + (f.type === 'date' ? 'date' : 'text') + '" ' + common + ' placeholder="' + esc(f.placeholder || '') + '" autocomplete="off">';
      }
      return '<div class="field' + (f.wide ? ' wide' : '') + '"><label for="' + fid + '">' + esc(f.label) + (f.required ? '<span class="req" aria-hidden="true">*</span>' : '') + '</label>' + ctl +
        (f.help ? '<div class="help" id="' + fid + '-help">' + esc(f.help) + '</div>' : '') + '<div class="error" id="' + fid + '-err" role="alert"></div></div>';
    }
    root.innerHTML =
      (cfg.notice || '') +
      '<div data-slot="before"></div>' +
      '<section class="card" aria-labelledby="' + id('form-h') + '"><h2 id="' + id('form-h') + '">' + esc(cfg.formTitle || 'Add record') + '</h2>' +
      '<form id="' + id('form') + '" novalidate><div class="form-grid">' + cfg.fields.map(fieldHTML).join('') + '</div>' +
      '<div class="btn-row" style="margin-top:14px"><button type="submit" class="btn btn-primary" id="' + id('submit') + '">' + U.icon('plus', 16) + ' Add record</button>' +
      '<button type="button" class="btn" id="' + id('cancel') + '" hidden>Cancel edit</button></div></form></section>' +
      '<section class="card" aria-labelledby="' + id('list-h') + '"><div class="card-head"><h2 id="' + id('list-h') + '">' + esc(cfg.listTitle || 'Records') + ' <span class="muted" id="' + id('count') + '"></span></h2></div>' +
      '<div class="toolbar"><label class="sr-only" for="' + id('q') + '">Search records</label><input class="input" id="' + id('q') + '" type="search" placeholder="Search…" autocomplete="off">' +
      (cfg.filter ? '<label class="sr-only" for="' + id('flt') + '">Filter by ' + esc(cfg.filter.label) + '</label><select class="select" id="' + id('flt') + '"><option value="">All ' + esc(cfg.filter.label) + 's</option>' + fieldByKey[cfg.filter.key].options.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>' : '') +
      '</div><div class="btn-row" style="margin-bottom:12px">' +
      '<button type="button" class="btn btn-sm" data-act="export">' + U.icon('download', 14) + ' Export CSV</button>' +
      '<label class="btn btn-sm file-btn" style="position:relative">' + U.icon('upload', 14) + ' Import CSV<input type="file" accept=".csv,text/csv" id="' + id('file') + '"></label>' +
      '<button type="button" class="btn btn-sm" data-act="template">CSV template</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-act="clear">' + U.icon('trash', 14) + ' Clear all</button></div>' +
      '<div class="check" style="margin-bottom:10px"><input type="checkbox" id="' + id('persist') + '"' + (canPersist ? '' : ' disabled') + '><label for="' + id('persist') + '" style="font-weight:500">Save this list in this browser (LocalStorage)</label></div>' +
      '<div class="help" style="margin-bottom:12px">' + (canPersist ? 'Off by default. Saved data stays only in this browser on this device — it is not synced and not a secure backup. Export CSV regularly. Avoid shared computers.' : 'Browser storage is unavailable or blocked here, so saving is disabled. Your data is kept for this session only — use Export CSV.') + '</div>' +
      '<div id="' + id('result') + '" aria-live="polite"></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr id="' + id('thead') + '"></tr></thead><tbody id="' + id('tbody') + '"></tbody></table></div>' +
      '<div class="pager" id="' + id('pager') + '"></div></section>';

    const $ = function (s) { return document.getElementById(id(s)); };
    $('persist').checked = S.persist;
    const form = $('form');

    /* ----- rendering ----- */
    function cmp(f) {
      return function (a, b) {
        const x = a[f.key], y = b[f.key];
        if (f.sort === 'ip') {
          const px = ITK.ip.parseIPv4(x), py = ITK.ip.parseIPv4(y);
          const vx = px.ok ? px.value : Infinity, vy = py.ok ? py.value : Infinity;
          return vx === vy ? 0 : (vx < vy ? -1 : 1);
        }
        return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
      };
    }
    function visible() {
      const q = S.q.toLowerCase().split(/\s+/).filter(Boolean);
      let rows = S.data.filter(function (r) {
        if (S.filter && r[cfg.filter.key] !== S.filter) return false;
        if (!q.length) return true;
        const hay = cfg.fields.map(function (f) { return r[f.key]; }).join(' ').toLowerCase();
        return q.every(function (t) { return hay.indexOf(t) !== -1; });
      });
      const f = fieldByKey[S.sortKey], c = cmp(f);
      rows.sort(function (a, b) { return c(a, b) * S.sortDir; });
      return rows;
    }
    function badgeFor(f, v) {
      const map = f.badges || {};
      return v ? '<span class="badge' + (map[v] ? ' badge-' + map[v] : '') + '">' + esc(v) + '</span>' : '';
    }
    function renderTable() {
      const cols = cfg.fields.filter(function (f) { return !f.hideInTable; });
      $('thead').innerHTML = cols.map(function (f) {
        const cur = S.sortKey === f.key;
        return '<th scope="col" aria-sort="' + (cur ? (S.sortDir === 1 ? 'ascending' : 'descending') : 'none') + '"><button type="button" class="th-btn" data-sort="' + f.key + '">' + esc(f.label) + (cur ? (S.sortDir === 1 ? ' ▲' : ' ▼') : '') + '</button></th>';
      }).join('') + '<th scope="col">Actions</th>';
      const rows = visible();
      const pages = Math.max(1, Math.ceil(rows.length / PAGE));
      if (S.page > pages) S.page = pages;
      const slice = rows.slice((S.page - 1) * PAGE, S.page * PAGE);
      $('count').textContent = '(' + rows.length + (rows.length !== S.data.length ? ' of ' + S.data.length : '') + ')';
      if (!S.data.length) {
        $('tbody').innerHTML = '<tr><td colspan="' + (cols.length + 1) + '" class="empty">' + esc(cfg.emptyText || 'No records yet. Add one with the form above or import a CSV.') + '</td></tr>';
      } else if (!rows.length) {
        $('tbody').innerHTML = '<tr><td colspan="' + (cols.length + 1) + '" class="empty">No records match your search or filter.</td></tr>';
      } else {
        $('tbody').innerHTML = slice.map(function (r) {
          const label = esc(r[cfg.labelKey || cfg.fields[0].key]);
          return '<tr>' + cols.map(function (f) {
            let c;
            if (cfg.cellRender && cfg.cellRender[f.key]) c = cfg.cellRender[f.key](r[f.key], r);
            else if (f.badges) c = badgeFor(f, r[f.key]);
            else c = esc(r[f.key]);
            return '<td' + (f.mono ? ' class="mono nowrap"' : '') + '>' + c + '</td>';
          }).join('') + '<td class="nowrap"><button type="button" class="btn btn-sm" data-edit="' + esc(r.id) + '" aria-label="Edit ' + label + '">' + U.icon('edit', 14) + '</button> ' +
            '<button type="button" class="btn btn-sm btn-danger" data-del="' + esc(r.id) + '" aria-label="Delete ' + label + '">' + U.icon('trash', 14) + '</button></td></tr>';
        }).join('');
      }
      $('pager').innerHTML = pages > 1 ? '<button type="button" class="btn btn-sm" data-page="-1"' + (S.page <= 1 ? ' disabled' : '') + '>Previous</button> Page ' + S.page + ' of ' + pages + ' <button type="button" class="btn btn-sm" data-page="1"' + (S.page >= pages ? ' disabled' : '') + '>Next</button>' : '';
    }
    function refresh() { renderTable(); }

    /* ----- form ----- */
    function showErrors(errs) {
      cfg.fields.forEach(function (f) {
        const el = document.getElementById(id('f-' + f.key)), er = document.getElementById(id('f-' + f.key + '-err'));
        if (errs[f.key]) { er.textContent = errs[f.key]; el.setAttribute('aria-invalid', 'true'); } else { er.textContent = ''; el.removeAttribute('aria-invalid'); }
      });
    }
    function resetForm() {
      S.editing = null; form.reset(); showErrors({});
      cfg.fields.forEach(function (f) { if (f.default) document.getElementById(id('f-' + f.key)).value = f.default; });
      $('submit').innerHTML = U.icon('plus', 16) + ' Add record'; $('cancel').hidden = true;
    }
    function readForm() {
      const raw = {}; cfg.fields.forEach(function (f) { raw[f.key] = document.getElementById(id('f-' + f.key)).value; });
      return cleanValues(raw);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const rec = readForm(), errs = validateRecord(rec, S.editing);
      showErrors(errs);
      const keys = Object.keys(errs);
      if (keys.length) { document.getElementById(id('f-' + keys[0])).focus(); return; }
      if (S.editing) {
        const i = S.data.findIndex(function (d) { return d.id === S.editing; });
        if (i > -1) S.data[i] = Object.assign({ id: S.editing }, rec);
        U.toast('Record updated', 'success');
      } else {
        if (S.data.length >= maxRows) { U.toast('Limit of ' + maxRows + ' records reached.', 'error'); return; }
        S.data.push(Object.assign({ id: U.uid() }, rec));
        if (cfg.statKey) ITK.stats.inc(cfg.statKey, 1);
        U.toast('Record added', 'success');
      }
      save(); resetForm(); refresh();
    });
    $('cancel').addEventListener('click', resetForm);

    /* ----- table & toolbar events ----- */
    root.addEventListener('click', function (e) {
      const t = e.target.closest('[data-sort],[data-edit],[data-del],[data-page],[data-act]');
      if (!t || !root.contains(t)) return;
      if (t.dataset.sort) {
        if (S.sortKey === t.dataset.sort) S.sortDir = -S.sortDir; else { S.sortKey = t.dataset.sort; S.sortDir = 1; }
        refresh();
      } else if (t.dataset.edit) {
        const r = S.data.find(function (d) { return d.id === t.dataset.edit; }); if (!r) return;
        S.editing = r.id; showErrors({});
        cfg.fields.forEach(function (f) { document.getElementById(id('f-' + f.key)).value = r[f.key]; });
        $('submit').innerHTML = U.icon('check', 16) + ' Save changes'; $('cancel').hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById(id('f-' + cfg.fields[0].key)).focus();
      } else if (t.dataset.del) {
        const r = S.data.find(function (d) { return d.id === t.dataset.del; }); if (!r) return;
        U.confirm('Delete "' + r[cfg.labelKey || cfg.fields[0].key] + '"? This cannot be undone.').then(function (ok) {
          if (!ok) return;
          S.data = S.data.filter(function (d) { return d.id !== r.id; });
          if (S.editing === r.id) resetForm();
          save(); refresh(); U.toast('Record deleted', 'success');
        });
      } else if (t.dataset.page) {
        S.page += Number(t.dataset.page); refresh();
      } else if (t.dataset.act === 'export') {
        if (!S.data.length) { U.toast('Nothing to export yet.', 'error'); return; }
        U.download((cfg.csvFile || name) + '-' + U.todayISO() + '.csv', toCSV(S.data), 'text/csv');
      } else if (t.dataset.act === 'template') {
        U.download((cfg.csvFile || name) + '-template.csv', toCSV([]), 'text/csv');
      } else if (t.dataset.act === 'clear') {
        if (!S.data.length) { U.toast('The list is already empty.', 'info'); return; }
        U.confirm('Delete all ' + S.data.length + ' records' + (S.persist ? ' (including the copy saved in this browser)' : '') + '? Export a CSV first if you need a copy.', { okText: 'Delete all' }).then(function (ok) {
          if (!ok) return;
          S.data = []; resetForm(); save(); refresh(); U.toast('All records deleted', 'success');
        });
      }
    });
    $('q').addEventListener('input', U.debounce(function () { S.q = $('q').value; S.page = 1; refresh(); }, 120));
    if (cfg.filter) $('flt').addEventListener('change', function () { S.filter = $('flt').value; S.page = 1; refresh(); });
    $('persist').addEventListener('change', function () {
      if ($('persist').checked) {
        S.persist = true; ITK.storage.set(persKey, true);
        if (ITK.storage.set(dataKey, S.data)) U.toast('Saving enabled — data is stored in this browser only.', 'success');
        else { S.persist = false; $('persist').checked = false; ITK.storage.remove(persKey); U.toast('Browser storage is blocked or full; cannot save.', 'error', 5000); }
      } else {
        U.confirm('Stop saving and delete the copy stored in this browser? Records currently shown stay in this session.', { okText: 'Stop and delete saved copy' }).then(function (ok) {
          if (!ok) { $('persist').checked = true; return; }
          S.persist = false; ITK.storage.remove(persKey); ITK.storage.remove(dataKey); ITK.mem[name] = S.data;
          U.toast('Saved copy removed from this browser.', 'success');
        });
      }
    });

    /* ----- CSV ----- */
    function toCSV(rows) {
      return U.toCSV(cfg.fields.map(function (f) { return f.label; }), rows.map(function (r) { return cfg.fields.map(function (f) { return r[f.key]; }); }));
    }
    function importCSVText(text) {
      const p = U.parseCSV(text);
      if (p.error) return { error: p.error };
      if (p.rows.length < 2) return { error: 'The CSV needs a header row and at least one data row.' };
      const head = p.rows[0].map(normKey), map = {};
      cfg.fields.forEach(function (f) {
        const i = head.findIndex(function (h) { return h === normKey(f.label) || h === normKey(f.key); });
        if (i > -1) map[f.key] = i;
      });
      const missing = cfg.fields.filter(function (f) { return f.required && map[f.key] === undefined; });
      if (missing.length) return { error: 'Missing required column(s): ' + missing.map(function (f) { return f.label; }).join(', ') + '. Use "CSV template" for the expected header.' };
      const res = { added: 0, dupes: [], invalid: [], overflow: 0 };
      for (let r = 1; r < p.rows.length; r++) {
        const raw = {};
        cfg.fields.forEach(function (f) {
          let v = map[f.key] === undefined ? '' : String(p.rows[r][map[f.key]] || '').trim();
          if (f.type === 'select' && v) { const m = f.options.find(function (o) { return o.toLowerCase() === v.toLowerCase(); }); if (m) v = m; }
          raw[f.key] = v;
        });
        const rec = cleanValues(raw);
        if (!rec[cfg.unique || ''] && cfg.fields.every(function (f) { return !rec[f.key]; })) continue;
        const errs = validateRecord(rec);
        const ek = Object.keys(errs);
        if (ek.length) {
          if (cfg.unique && ek.length === 1 && ek[0] === cfg.unique && /already exists/.test(errs[ek[0]])) res.dupes.push('row ' + (r + 1) + ' (' + rec[cfg.unique] + ')');
          else res.invalid.push('row ' + (r + 1) + ': ' + errs[ek[0]]);
          continue;
        }
        if (S.data.length >= maxRows) { res.overflow++; continue; }
        S.data.push(Object.assign({ id: U.uid() }, rec)); res.added++;
      }
      if (cfg.statKey && res.added) ITK.stats.inc(cfg.statKey, res.added);
      return res;
    }
    function reportImport(res) {
      const out = $('result');
      if (res.error) { out.innerHTML = U.alert('danger', '<strong>Import failed.</strong> ' + esc(res.error)); return; }
      const parts = ['<strong>Import finished:</strong> ' + res.added + ' added.'];
      if (res.dupes.length) parts.push(res.dupes.length + ' duplicate(s) skipped (' + esc(res.dupes.slice(0, 5).join(', ')) + (res.dupes.length > 5 ? ', …' : '') + ').');
      if (res.invalid.length) parts.push(res.invalid.length + ' invalid row(s) skipped: ' + esc(res.invalid.slice(0, 5).join(' · ')) + (res.invalid.length > 5 ? ' · …' : ''));
      if (res.overflow) parts.push(res.overflow + ' row(s) skipped: limit of ' + maxRows + ' records.');
      out.innerHTML = U.alert(res.invalid.length || res.dupes.length || res.overflow ? 'warn' : 'success', parts.join('<br>'));
      if (res.added) { save(); refresh(); }
    }
    $('file').addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0]; e.target.value = '';
      if (!file) return;
      if (file.size > MAX_CSV_BYTES) { reportImport({ error: 'File is larger than 1 MB. Split it into smaller files.' }); return; }
      const fr = new FileReader();
      fr.onerror = function () { reportImport({ error: 'The file could not be read.' }); };
      fr.onload = function () { reportImport(importCSVText(String(fr.result))); };
      fr.readAsText(file);
    });

    /* ----- public API ----- */
    const api = {
      root: root,
      all: function () { return S.data.slice(); },
      refresh: refresh,
      slot: function (n) { return root.querySelector('[data-slot="' + n + '"]'); },
      has: function (key, value) { const v = String(value).toLowerCase(); return S.data.some(function (d) { return String(d[key]).toLowerCase() === v; }); },
      find: function (key, value) { const v = String(value).toLowerCase(); return S.data.find(function (d) { return String(d[key]).toLowerCase() === v; }); },
      /** Add many records, skipping invalid and duplicate ones. Returns {added, dupes, invalid, overflow}. */
      addMany: function (list) {
        const res = { added: 0, dupes: [], invalid: [], overflow: 0 };
        list.forEach(function (raw, i) {
          const rec = cleanValues(raw), errs = validateRecord(rec), ek = Object.keys(errs);
          if (ek.length) {
            if (cfg.unique && ek.length === 1 && ek[0] === cfg.unique && /already exists/.test(errs[ek[0]])) res.dupes.push(rec[cfg.unique]);
            else res.invalid.push((rec[cfg.unique] || 'item ' + (i + 1)) + ': ' + errs[ek[0]]);
            return;
          }
          if (S.data.length >= maxRows) { res.overflow++; return; }
          S.data.push(Object.assign({ id: U.uid() }, rec)); res.added++;
        });
        if (res.added) { if (cfg.statKey) ITK.stats.inc(cfg.statKey, res.added); save(); refresh(); }
        return res;
      },
      importCSVText: importCSVText   // exposed for tests
    };
    resetForm();
    refresh();
    if (cfg.onChange) cfg.onChange(api);
    return api;
  }
  ITK.dataTable = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
