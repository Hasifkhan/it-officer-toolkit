/* report-generator.js — Module D: Daily IT Activity Report Generator */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc;
  const CATS = ['Network', 'Hardware', 'Software', 'Printer / Peripheral', 'Windows / OS', 'Email / Accounts', 'CCTV / Security', 'Server / Backup', 'User Support', 'Documentation / Procurement', 'Other'];
  const STATUSES = ['Completed', 'In Progress', 'Pending', 'Escalated'];
  const DRAFT_KEY = 'report.draft';

  /* ---------- pure logic ---------- */
  const rpt = {};
  ITK.report = rpt;
  rpt.toMin = function (t) { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  /** returns {mins} | {none:true} | {error} */
  rpt.duration = function (start, end) {
    if (!start && !end) return { none: true };
    if (!start || !end) return { error: 'Enter both start and end time, or leave both empty.' };
    const a = rpt.toMin(start), b = rpt.toMin(end);
    if (a === null || b === null) return { error: 'Times must be in 24-hour HH:MM format.' };
    if (b <= a) return { error: 'End time must be after start time (same day). Split overnight work into two entries.' };
    return { mins: b - a };
  };
  rpt.summary = function (entries) {
    const s = { total: entries.length, completed: 0, inProgress: 0, pending: 0, escalated: 0, open: 0, minutes: 0, timed: 0 };
    entries.forEach(function (e) {
      if (e.status === 'Completed') s.completed++; else if (e.status === 'In Progress') s.inProgress++; else if (e.status === 'Pending') s.pending++; else if (e.status === 'Escalated') s.escalated++;
      const d = rpt.duration(e.start, e.end); if (d.mins) { s.minutes += d.mins; s.timed++; }
    });
    s.open = s.total - s.completed;
    return s;
  };
  function fmtDate(d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return d || '';
    const x = new Date(d + 'T00:00:00'); return isNaN(x) ? d : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  rpt.buildText = function (info, entries) {
    const s = rpt.summary(entries), L = [];
    L.push('DAILY IT ACTIVITY REPORT', '========================');
    L.push('Date: ' + fmtDate(info.date)); if (info.name) L.push('Name: ' + info.name); if (info.designation) L.push('Designation: ' + info.designation); if (info.department) L.push('Department: ' + info.department);
    L.push('', 'SUMMARY', '-------');
    L.push('Total tasks: ' + s.total, 'Completed: ' + s.completed, 'Pending / open: ' + s.open + ' (In progress ' + s.inProgress + ', Pending ' + s.pending + ', Escalated ' + s.escalated + ')');
    L.push('Recorded work duration: ' + (s.timed ? U.fmtDuration(s.minutes) + ' (from ' + s.timed + ' of ' + s.total + ' task' + (s.total === 1 ? '' : 's') + ' with start/end times)' : 'not recorded'));
    L.push('', 'TASK DETAILS', '------------');
    if (!entries.length) L.push('No tasks recorded.');
    entries.forEach(function (e, i) {
      const d = rpt.duration(e.start, e.end);
      L.push((i + 1) + '. ' + e.title + '  [' + (e.category || 'Uncategorised') + ']  - ' + e.status);
      if (d.mins) L.push('   Time: ' + e.start + ' - ' + e.end + ' (' + U.fmtDuration(d.mins) + ')');
      [['Problem', e.problem], ['Action taken', e.action], ['Resolution', e.resolution], ['Pending work', e.pendingWork], ['Next action', e.next], ['Remarks', e.remarks]].forEach(function (p) { if (p[1]) L.push('   ' + p[0] + ': ' + p[1].replace(/\r?\n/g, ' ')); });
      L.push('');
    });
    const pend = entries.filter(function (e) { return e.pendingWork || e.next; });
    if (pend.length) {
      L.push('PENDING WORK AND NEXT ACTIONS', '-----------------------------');
      pend.forEach(function (e) { L.push('- ' + e.title + (e.pendingWork ? ' | Pending: ' + e.pendingWork.replace(/\r?\n/g, ' ') : '') + (e.next ? ' | Next: ' + e.next.replace(/\r?\n/g, ' ') : '')); });
    }
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  };
  rpt.buildCSV = function (info, entries) {
    return U.toCSV(['Date', 'Name', 'Designation', 'Department', 'Task Title', 'Category', 'Problem', 'Action Taken', 'Resolution', 'Status', 'Start', 'End', 'Duration (min)', 'Pending Work', 'Next Action', 'Remarks'],
      entries.map(function (e) { const d = rpt.duration(e.start, e.end); return [info.date, info.name, info.designation, info.department, e.title, e.category, e.problem, e.action, e.resolution, e.status, e.start, e.end, d.mins || '', e.pendingWork, e.next, e.remarks]; }));
  };

  /* ---------- UI ---------- */
  function sel(id, opts, ph) { return '<select class="select" id="' + id + '">' + (ph ? '<option value="">' + ph + '</option>' : '') + opts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>'; }
  function ta(id, label, ph) { return '<div class="field wide"><label for="' + id + '">' + label + '</label><textarea class="textarea" id="' + id + '" rows="2" maxlength="1500" placeholder="' + esc(ph || '') + '"></textarea></div>'; }

  ITK.register({
    id: 'daily-report', cat: 'reports', icon: 'file-text', title: 'Daily IT Activity Report',
    desc: 'Log tasks during the day and produce a clean report: copy as text, print/PDF, or export CSV.',
    keywords: 'daily report activity log tasks summary print pdf csv duration work',
    render: function (root) {
      const S = ITK.mem.report || (ITK.mem.report = { info: { name: '', designation: '', department: '', date: U.todayISO() }, entries: [] });
      let editing = null;
      const canSave = ITK.storage.available();

      root.innerHTML =
        '<div class="no-print">' + U.alert('info', '<strong>Only what you enter appears in the report.</strong> Nothing is invented: times, statuses and totals come from your entries. Data stays in this browser tab unless you choose <em>Save draft</em>. Do not enter passwords or confidential details on shared computers.') +
        '<section class="card"><h2>Report details</h2><div class="form-grid">' +
        U.field('ri-name', 'Employee / IT Officer name', '<input class="input" id="ri-name" maxlength="80" autocomplete="name">') +
        U.field('ri-des', 'Designation', '<input class="input" id="ri-des" maxlength="80" placeholder="IT Officer">') +
        U.field('ri-dep', 'Department', '<input class="input" id="ri-dep" maxlength="80" placeholder="Information Technology">') +
        U.field('ri-date', 'Report date', '<input class="input" id="ri-date" type="date">') +
        '</div></section>' +
        '<section class="card"><h2 id="re-h">Add a task</h2><form id="re-form" novalidate><div class="form-grid">' +
        U.field('re-title', 'Task title', '<input class="input" id="re-title" maxlength="120" aria-describedby="re-title-err" placeholder="e.g. Fixed printer offline issue">', '', true) +
        U.field('re-cat', 'Task category', sel('re-cat', CATS, 'Select…')) +
        U.field('re-status', 'Status', sel('re-status', STATUSES) .replace('<select', '<select aria-describedby="re-status-err"'), '', true) +
        U.field('re-start', 'Start time (optional)', '<input class="input" id="re-start" type="time" aria-describedby="re-time-err">', '24-hour clock') +
        U.field('re-end', 'End time (optional)', '<input class="input" id="re-end" type="time" aria-describedby="re-time-err">') +
        '<div class="field"><span class="label">Duration</span><div id="re-dur" class="muted" aria-live="polite" style="min-height:38px;display:flex;align-items:center">—</div><div class="error" id="re-time-err" role="alert"></div></div>' +
        ta('re-prob', 'Problem description', 'What was reported or observed?') + ta('re-act', 'Action taken', 'What did you do?') + ta('re-res', 'Resolution', 'Outcome (leave blank if none yet)') +
        ta('re-pend', 'Pending work', 'What remains?') + ta('re-next', 'Next action', 'Planned follow-up') + ta('re-rem', 'Remarks', '') +
        '</div><div class="btn-row" style="margin-top:14px"><button type="submit" class="btn btn-primary" id="re-submit">' + U.icon('plus', 16) + ' Add task</button><button type="button" class="btn" id="re-cancel" hidden>Cancel edit</button></div></form></section>' +
        '<section class="card"><div class="card-head"><h2>Tasks <span class="muted" id="rl-count"></span></h2></div><div id="rl-list"></div></section></div>' +
        '<section class="card"><div class="card-head no-print"><h2>Report preview</h2><div class="btn-row">' +
        '<button class="btn btn-sm btn-primary" id="rp-copy" type="button">' + U.icon('copy', 14) + ' Copy as text</button>' +
        '<button class="btn btn-sm" id="rp-print" type="button">' + U.icon('printer', 14) + ' Print / Save as PDF</button>' +
        '<button class="btn btn-sm" id="rp-csv" type="button">' + U.icon('download', 14) + ' Export CSV</button></div></div>' +
        '<div class="tiles no-print" id="rp-tiles"></div><div id="report-sheet" class="report-sheet" aria-live="polite"></div></section>' +
        '<section class="card no-print"><h2>Draft & data</h2><p class="muted">Optional: save your current report as a draft in this browser so it survives a refresh. Drafts are not synced, not encrypted and not a backup.</p><div class="btn-row">' +
        '<button class="btn" id="dr-save" type="button"' + (canSave ? '' : ' disabled') + '>Save draft in this browser</button><button class="btn" id="dr-load" type="button"' + (canSave ? '' : ' disabled') + '>Restore saved draft</button><button class="btn btn-danger" id="dr-del" type="button"' + (canSave ? '' : ' disabled') + '>Delete saved draft</button><button class="btn btn-danger" id="dr-clear" type="button">Clear this report</button></div>' +
        '<p class="help" id="dr-status" style="margin-top:8px"></p>' + (canSave ? '' : '<p class="help">Browser storage is unavailable, so drafts cannot be saved. Use Copy or Export CSV.</p>') + '</section>';

      const $ = function (id) { return document.getElementById(id); };
      const fields = { title: 're-title', category: 're-cat', status: 're-status', start: 're-start', end: 're-end', problem: 're-prob', action: 're-act', resolution: 're-res', pendingWork: 're-pend', next: 're-next', remarks: 're-rem' };
      const infoMap = { name: 'ri-name', designation: 'ri-des', department: 'ri-dep', date: 'ri-date' };

      function loadInfo() { Object.keys(infoMap).forEach(function (k) { $(infoMap[k]).value = S.info[k] || ''; }); }
      function readInfo() { Object.keys(infoMap).forEach(function (k) { S.info[k] = $(infoMap[k]).value.trim(); }); }
      Object.keys(infoMap).forEach(function (k) { $(infoMap[k]).addEventListener('input', function () { readInfo(); drawReport(); }); });

      function updateDur() {
        const d = rpt.duration($('re-start').value, $('re-end').value);
        $('re-dur').textContent = d.mins ? U.fmtDuration(d.mins) + ' (' + d.mins + ' min)' : '—';
        $('re-time-err').textContent = d.error || '';
      }
      $('re-start').addEventListener('input', updateDur); $('re-end').addEventListener('input', updateDur);

      function clearForm() {
        editing = null; $('re-form').reset(); $('re-title').removeAttribute('aria-invalid'); $('re-title-err').textContent = '';
        $('re-h').textContent = 'Add a task'; $('re-submit').innerHTML = U.icon('plus', 16) + ' Add task'; $('re-cancel').hidden = true; updateDur();
      }
      $('re-cancel').onclick = clearForm;
      $('re-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const rec = {}; Object.keys(fields).forEach(function (k) { rec[k] = $(fields[k]).value.trim(); });
        let bad = false;
        if (!rec.title) { $('re-title-err').textContent = 'Task title is required.'; $('re-title').setAttribute('aria-invalid', 'true'); $('re-title').focus(); bad = true; } else { $('re-title-err').textContent = ''; $('re-title').removeAttribute('aria-invalid'); }
        const d = rpt.duration(rec.start, rec.end);
        if (d.error) { $('re-time-err').textContent = d.error; if (!bad) $('re-start').focus(); bad = true; }
        if (bad) return;
        if (editing) { const i = S.entries.findIndex(function (x) { return x.id === editing; }); if (i > -1) S.entries[i] = Object.assign({ id: editing }, rec); U.toast('Task updated', 'success'); }
        else { if (S.entries.length >= 200) { U.toast('Limit of 200 tasks per report.', 'error'); return; } S.entries.push(Object.assign({ id: U.uid() }, rec)); ITK.stats.inc('task', 1); U.toast('Task added', 'success'); }
        clearForm(); drawAll();
      });

      function drawList() {
        $('rl-count').textContent = '(' + S.entries.length + ')';
        $('rl-list').innerHTML = S.entries.length ? S.entries.map(function (e, i) {
          const d = rpt.duration(e.start, e.end);
          return '<div class="entry-item"><div><strong>' + (i + 1) + '. ' + esc(e.title) + '</strong> ' + U.badge(e.status, e.status === 'Completed' ? 'success' : (e.status === 'Escalated' ? 'danger' : 'warn')) + (e.category ? ' ' + U.badge(e.category) : '') + (d.mins ? ' <span class="muted">' + esc(e.start) + '–' + esc(e.end) + ' · ' + U.fmtDuration(d.mins) + '</span>' : '') + '</div>' +
            '<div class="btn-row"><button class="btn btn-sm" data-edit="' + esc(e.id) + '" aria-label="Edit task ' + esc(e.title) + '">' + U.icon('edit', 14) + '</button><button class="btn btn-sm btn-danger" data-del="' + esc(e.id) + '" aria-label="Delete task ' + esc(e.title) + '">' + U.icon('trash', 14) + '</button></div></div>';
        }).join('') : '<div class="empty">No tasks yet. Add your first task above.</div>';
      }
      $('rl-list').addEventListener('click', function (ev) {
        const b = ev.target.closest('[data-edit],[data-del]'); if (!b) return;
        const id = b.dataset.edit || b.dataset.del, e = S.entries.find(function (x) { return x.id === id; }); if (!e) return;
        if (b.dataset.edit) {
          editing = id; Object.keys(fields).forEach(function (k) { $(fields[k]).value = e[k] || ''; });
          $('re-h').textContent = 'Edit task'; $('re-submit').innerHTML = U.icon('check', 16) + ' Save changes'; $('re-cancel').hidden = false; updateDur();
          $('re-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('re-title').focus();
        } else {
          U.confirm('Delete task “' + e.title + '”?').then(function (ok) { if (!ok) return; S.entries = S.entries.filter(function (x) { return x.id !== id; }); if (editing === id) clearForm(); drawAll(); U.toast('Task deleted', 'success'); });
        }
      });

      function drawReport() {
        const s = rpt.summary(S.entries), i = S.info;
        $('rp-tiles').innerHTML = [['Total tasks', s.total], ['Completed', s.completed], ['Pending / open', s.open], ['Recorded duration', s.timed ? U.fmtDuration(s.minutes) : '—']].map(function (t) { return '<div class="tile"><b>' + esc(t[1]) + '</b><span>' + t[0] + '</span></div>'; }).join('');
        const rows = S.entries.map(function (e, n) {
          const d = rpt.duration(e.start, e.end);
          const line = function (l, v) { return v ? '<tr><th>' + l + '</th><td>' + esc(v).replace(/\n/g, '<br>') + '</td></tr>' : ''; };
          return '<div class="rs-task"><strong>' + (n + 1) + '. ' + esc(e.title) + '</strong> — ' + esc(e.status) + (e.category ? ' · ' + esc(e.category) : '') + '<table>' +
            (d.mins ? line('Time', e.start + ' – ' + e.end + ' (' + U.fmtDuration(d.mins) + ')') : '') + line('Problem', e.problem) + line('Action taken', e.action) + line('Resolution', e.resolution) + line('Pending work', e.pendingWork) + line('Next action', e.next) + line('Remarks', e.remarks) + '</table></div>';
        }).join('');
        $('report-sheet').innerHTML = '<h2>DAILY IT ACTIVITY REPORT</h2><div class="rs-sub">' + esc(fmtDate(i.date)) + '</div>' +
          '<table><tr><th>Name</th><td>' + esc(i.name || '—') + '</td></tr><tr><th>Designation</th><td>' + esc(i.designation || '—') + '</td></tr><tr><th>Department</th><td>' + esc(i.department || '—') + '</td></tr></table>' +
          '<h3>Summary</h3><table><tr><th>Total tasks</th><td>' + s.total + '</td></tr><tr><th>Completed</th><td>' + s.completed + '</td></tr><tr><th>Pending / open</th><td>' + s.open + ' (In progress ' + s.inProgress + ', Pending ' + s.pending + ', Escalated ' + s.escalated + ')</td></tr>' +
          '<tr><th>Recorded duration</th><td>' + (s.timed ? esc(U.fmtDuration(s.minutes)) + ' <span style="color:#666">(from ' + s.timed + ' of ' + s.total + ' tasks with times)</span>' : 'Not recorded') + '</td></tr></table>' +
          '<h3>Task details</h3>' + (rows || '<p>No tasks recorded.</p>');
      }
      function drawAll() { drawList(); drawReport(); }

      $('rp-copy').onclick = function () { readInfo(); if (!S.entries.length) { U.toast('Add at least one task before copying.', 'error'); return; } U.copy(rpt.buildText(S.info, S.entries), 'Report'); };
      $('rp-csv').onclick = function () { readInfo(); if (!S.entries.length) { U.toast('Add at least one task before exporting.', 'error'); return; } U.download('daily-it-report-' + (S.info.date || U.todayISO()) + '.csv', rpt.buildCSV(S.info, S.entries), 'text/csv'); };
      $('rp-print').onclick = function () { readInfo(); if (!S.entries.length) { U.toast('Add at least one task before printing.', 'error'); return; } if (typeof g.print === 'function') g.print(); else U.toast('Printing is not available in this browser.', 'error'); };

      function draftStatus() {
        const d = ITK.storage.get(DRAFT_KEY, null);
        $('dr-status').textContent = d && d.savedAt ? 'Saved draft: ' + new Date(d.savedAt).toLocaleString() + ' (' + (d.entries || []).length + ' task(s)).' : 'No saved draft.';
      }
      $('dr-save').onclick = function () {
        readInfo();
        const ok = ITK.storage.set(DRAFT_KEY, { info: S.info, entries: S.entries, savedAt: Date.now() });
        if (ok) U.toast('Draft saved in this browser', 'success'); else U.toast('Could not save (storage blocked or full).', 'error', 5000);
        draftStatus();
      };
      $('dr-load').onclick = function () {
        const d = ITK.storage.get(DRAFT_KEY, null);
        if (!d || !Array.isArray(d.entries)) { U.toast('No saved draft found.', 'error'); return; }
        function apply() {
          const str = function (v) { return String(v == null ? '' : v).slice(0, 1500); };
          S.info = { name: str(d.info && d.info.name), designation: str(d.info && d.info.designation), department: str(d.info && d.info.department), date: str(d.info && d.info.date) || U.todayISO() };
          S.entries = d.entries.slice(0, 200).map(function (e) { const r = { id: U.uid() }; Object.keys(fields).forEach(function (k) { r[k] = str(e && e[k]); }); if (STATUSES.indexOf(r.status) === -1) r.status = 'Pending'; return r; });
          loadInfo(); clearForm(); drawAll(); U.toast('Draft restored', 'success');
        }
        if (S.entries.length) U.confirm('Replace the current report with the saved draft?', { okText: 'Restore draft', danger: false }).then(function (ok) { if (ok) apply(); }); else apply();
      };
      $('dr-del').onclick = function () { U.confirm('Delete the draft saved in this browser?').then(function (ok) { if (ok) { ITK.storage.remove(DRAFT_KEY); draftStatus(); U.toast('Saved draft deleted', 'success'); } }); };
      $('dr-clear').onclick = function () { U.confirm('Clear all details and tasks from this report? (A saved draft is not affected.)', { okText: 'Clear report' }).then(function (ok) { if (!ok) return; S.entries = []; S.info = { name: '', designation: '', department: '', date: U.todayISO() }; loadInfo(); clearForm(); drawAll(); }); };

      loadInfo(); updateDur(); drawAll(); draftStatus();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
