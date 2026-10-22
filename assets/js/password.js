/* password.js — Module I: password generator and strength guidance.
   Privacy: everything runs locally. Passwords are NEVER stored (no LocalStorage/IndexedDB/cookies) and never sent anywhere. */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc;
  const pw = {};
  ITK.password = pw;

  const SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.?/~' };
  const AMBIGUOUS = 'Il1O0o|`\'"';
  const COMMON = ['password', 'passw0rd', '123456', '12345678', 'qwerty', 'admin', 'welcome', 'letmein', 'iloveyou', 'abc123', '111111', 'bangladesh', 'dhaka', 'company', 'login', 'default'];

  /** unbiased random integer in [0, max) using Web Crypto; throws if unavailable */
  pw.randInt = function (max, cryptoObj) {
    const c = cryptoObj || g.crypto;
    if (!c || !c.getRandomValues) throw new Error('Secure random generator (Web Crypto) is not available in this browser.');
    const limit = Math.floor(0x100000000 / max) * max, buf = new Uint32Array(1);
    let x;
    do { c.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % max;
  };
  pw.generate = function (opts, cryptoObj) {
    const len = opts.length;
    const sets = ['lower', 'upper', 'digits', 'symbols'].filter(function (k) { return opts[k]; }).map(function (k) {
      let s = SETS[k]; if (opts.noAmbiguous) s = s.split('').filter(function (ch) { return AMBIGUOUS.indexOf(ch) === -1; }).join(''); return s;
    });
    if (!sets.length) throw new Error('Select at least one character type.');
    if (len < sets.length) throw new Error('Length must be at least ' + sets.length + ' to include every selected type.');
    const pool = sets.join(''), out = [];
    sets.forEach(function (s) { out.push(s[pw.randInt(s.length, cryptoObj)]); });     // guarantee one of each selected type
    while (out.length < len) out.push(pool[pw.randInt(pool.length, cryptoObj)]);
    for (let i = out.length - 1; i > 0; i--) { const j = pw.randInt(i + 1, cryptoObj); const t = out[i]; out[i] = out[j]; out[j] = t; }   // Fisher–Yates
    return { password: out.join(''), poolSize: pool.length, bits: len * Math.log2(pool.length) };
  };
  /** Rough guidance only: charset-based entropy minus penalties for obvious patterns. */
  pw.assess = function (p) {
    if (!p) return { level: 0, label: '', bits: 0, tips: [] };
    let pool = 0; const has = { lower: /[a-z]/.test(p), upper: /[A-Z]/.test(p), digits: /\d/.test(p), symbols: /[^A-Za-z0-9]/.test(p) };
    if (has.lower) pool += 26; if (has.upper) pool += 26; if (has.digits) pool += 10; if (has.symbols) pool += 32;
    let bits = p.length * Math.log2(pool || 1);
    const tips = [], low = p.toLowerCase();
    if (p.length < 12) tips.push('Use at least 12 characters (14–16+ is better).');
    if (!(has.lower && has.upper)) tips.push('Mix upper- and lower-case letters.');
    if (!has.digits) tips.push('Add digits.');
    if (!has.symbols) tips.push('Add symbols.');
    if (/(.)\1{2,}/.test(p)) { bits *= 0.7; tips.push('Avoid repeated characters (aaa, 111).'); }
    if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf|zxcv)/i.test(p)) { bits *= 0.6; tips.push('Avoid keyboard or number sequences.'); }
    if (COMMON.some(function (w) { return low.indexOf(w) !== -1; })) { bits = Math.min(bits, 28); tips.push('Contains a very common word or pattern.'); }
    if (/^\d+$/.test(p)) { bits = Math.min(bits, 30); }
    const level = bits < 40 ? 1 : (bits < 60 ? 2 : (bits < 80 ? 3 : 4));
    return { level: level, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][level], bits: bits, tips: tips };
  };
  const COLORS = ['', 'var(--danger)', '#d97706', '#2563eb', 'var(--success)'];

  ITK.register({
    id: 'password-tools', cat: 'security', icon: 'key', title: 'Password Generator & Strength Check',
    desc: 'Generate random passwords with Web Crypto and get strength guidance. Processed locally, never stored.',
    keywords: 'password generator random strong secure strength check crypto passphrase',
    render: function (root) {
      root.innerHTML = U.alert('info', '<strong>Privacy:</strong> passwords are generated and checked inside your browser only. They are not sent to any server and are <em>never</em> saved to LocalStorage or anywhere else; they disappear when you leave this page. Still, avoid using a generated password on a computer you do not trust.') +
        '<section class="card"><h2>Generator</h2><div class="form-grid">' +
        U.field('g-len', 'Length', '<input class="input" id="g-len" type="number" min="8" max="128" value="16" aria-describedby="g-len-err">', '8–128 characters. 16 or more is recommended.') +
        U.field('g-cnt', 'How many', '<input class="input" id="g-cnt" type="number" min="1" max="10" value="1" aria-describedby="g-cnt-err">', '1–10 passwords.') +
        '</div><fieldset style="border:0;padding:0;margin:14px 0 0"><legend class="label">Character types</legend><div style="display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:6px">' +
        [['g-lo', 'Lowercase (a–z)', true], ['g-up', 'Uppercase (A–Z)', true], ['g-di', 'Digits (0–9)', true], ['g-sy', 'Symbols (!@#…)', true], ['g-am', 'Exclude look-alike characters (I l 1 O 0 o | …)', false]].map(function (c) { return '<label class="check"><input type="checkbox" id="' + c[0] + '"' + (c[2] ? ' checked' : '') + '> ' + c[1] + '</label>'; }).join('') +
        '</div></fieldset><div class="btn-row" style="margin-top:14px"><button class="btn btn-primary" id="g-go" type="button">Generate</button></div><div id="g-msg" class="error" role="alert" style="margin-top:8px"></div><div id="g-out" aria-live="polite" style="margin-top:10px"></div></section>' +
        '<section class="card"><h2>Check a password’s strength</h2><div class="field"><label for="k-in">Password to check</label><div style="display:flex;gap:8px"><input class="input mono" id="k-in" type="password" autocomplete="off" spellcheck="false" autocapitalize="off" aria-describedby="k-help"><button class="btn" id="k-show" type="button" aria-pressed="false">Show</button></div><div class="help" id="k-help">Checked in your browser only. Use a similar example instead of your real password if you prefer.</div></div>' +
        '<div class="meter" style="margin-top:12px" role="img" aria-label="Strength meter"><i id="k-bar"></i></div><p id="k-res" aria-live="polite" style="margin-top:8px"></p></section>' +
        '<section class="card"><h2>Guidance and limits</h2><ul><li>Length matters most; unique passwords per account beat clever ones. Use a password manager approved by your organisation.</li><li>Enable multi-factor authentication wherever possible.</li><li>The strength result is a rough estimate (character variety, length and some obvious patterns). It cannot know if a password was leaked.</li><li>Never email or chat passwords, and never store them in the inventory or reports.</li></ul></section>';

      const $ = function (id) { return document.getElementById(id); };
      function opts() { return { length: Number($('g-len').value), lower: $('g-lo').checked, upper: $('g-up').checked, digits: $('g-di').checked, symbols: $('g-sy').checked, noAmbiguous: $('g-am').checked }; }
      $('g-go').onclick = function () {
        const o = opts(), cnt = Number($('g-cnt').value), msg = $('g-msg'); msg.textContent = ''; $('g-out').innerHTML = '';
        if (!Number.isInteger(o.length) || o.length < 8 || o.length > 128) { msg.textContent = 'Length must be a whole number from 8 to 128.'; return; }
        if (!Number.isInteger(cnt) || cnt < 1 || cnt > 10) { msg.textContent = 'How many must be a whole number from 1 to 10.'; return; }
        if (!(o.lower || o.upper || o.digits || o.symbols)) { msg.textContent = 'Select at least one character type.'; return; }
        const rows = [];
        try { for (let i = 0; i < cnt; i++) rows.push(pw.generate(o)); } catch (e) { msg.textContent = e.message; return; }
        ITK.stats.inc('pw', rows.length);
        $('g-out').innerHTML = rows.map(function (r, i) {
          const a = pw.assess(r.password);
          return '<div class="codebox" style="margin:6px 0"><code data-pw="' + i + '"></code><button type="button" data-cp="' + i + '" aria-label="Copy password ' + (i + 1) + '">' + U.icon('copy', 14) + ' Copy</button></div><div class="help" style="margin:0 0 6px">' + esc(a.label) + ' · about ' + Math.round(r.bits) + ' bits</div>';
        }).join('');
        rows.forEach(function (r, i) { $('g-out').querySelector('[data-pw="' + i + '"]').textContent = r.password; });   // textContent: never parsed as HTML
        $('g-out').onclick = function (e) { const b = e.target.closest('[data-cp]'); if (b) U.copy(rows[Number(b.dataset.cp)].password, 'Password'); };
      };
      $('k-show').onclick = function () { const t = $('k-in').type === 'password'; $('k-in').type = t ? 'text' : 'password'; $('k-show').textContent = t ? 'Hide' : 'Show'; $('k-show').setAttribute('aria-pressed', String(t)); };
      $('k-in').addEventListener('input', function () {
        const a = pw.assess($('k-in').value), bar = $('k-bar');
        bar.style.width = (a.level * 25) + '%'; bar.style.background = COLORS[a.level] || 'transparent';
        $('k-res').innerHTML = a.level ? '<strong>' + a.label + '</strong> (≈ ' + Math.round(a.bits) + ' bits)' + (a.tips.length ? '<ul style="margin:6px 0 0">' + a.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') : '';
      });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
