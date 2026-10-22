/* UI smoke test (needs Playwright + Chromium). Usage:
     node tests/ui-smoke.js http://localhost:8000/it-officer-toolkit/index.html [screenshotDir]
   Serve the project from a sub-folder URL to prove relative paths work (like a GitHub project page). */
const { chromium } = require('playwright');
const assert = require('assert');
const url = process.argv[2], shots = process.argv[3];
let pass = 0, fail = 0;
async function step(name, fn) { try { await fn(); pass++; console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + String(e.message).split('\n').slice(0,3).join(' | ') + '\n     ' + ((e.stack||'').split('\n').find(l=>l.includes('ui-smoke.js'))||'').trim()); } }

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: [] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
  const W = (ms) => page.waitForTimeout(ms || 350);
  const go = async (hash) => { await page.goto(url + hash); await page.waitForSelector('#page-h'); };
  const shot = async (n) => { if (shots) await page.screenshot({ path: shots + '/' + n + '.png', fullPage: false }); };

  await step('dashboard loads with all categories and cards', async () => {
    await page.goto(url); await page.waitForSelector('.tool-card');
    assert(await page.locator('.tool-card').count() >= 22);
    assert((await page.locator('h1').first().innerText()).includes('IT Officer Toolkit'));
    assert(await page.locator('#sidebar .nav-link').count() >= 11);
    await shot('01-dashboard');
  });

  const toolIds = ['ipv4-validator', 'subnet-calc', 'range-generator', 'ip-tracker', 'ip-mac-utils', 'net-guides', 'commands', 'daily-report', 'hw-guides', 'printer-guides', 'inventory', 'storage-converter', 'speed-converter', 'download-time', 'uptime-calc', 'ups-runtime', 'ports', 'dns-records', 'http-codes', 'windows-errors', 'checklists', 'password-tools'];
  await step('every tool route renders without errors', async () => {
    for (const id of toolIds) {
      await go('#/tool/' + id);
      assert((await page.locator('#tool-root').innerHTML()).length > 200, id + ' empty');
      assert(await page.locator('#tool-root .alert-danger:has-text("failed to load")').count() === 0, id + ' failed');
    }
    assert.deepStrictEqual(errors, []);
  });

  await step('subnet calculator /24, /31, /32, invalid', async () => {
    await go('#/tool/subnet-calc');
    await page.fill('#s-ip', '192.168.1.77/24'); await page.click('button:has-text("Calculate")');
    let t = await page.locator('#s-out').innerText();
    assert(t.includes('192.168.1.255') && t.includes('255.255.255.0') && t.includes('254'), t);
    await page.fill('#s-ip', '10.0.0.5'); await page.fill('#s-p', '31'); await page.click('button:has-text("Calculate")');
    assert((await page.locator('#s-out').innerText()).includes('RFC 3021'));
    await page.fill('#s-p', '255.255.255.255'); await page.click('button:has-text("Calculate")');
    assert((await page.locator('#s-out').innerText()).includes('single host'));
    await page.fill('#s-p', '33'); await page.click('button:has-text("Calculate")');
    assert((await page.locator('#s-p-err').innerText()).includes('between 0 and 32'));
    await page.fill('#s-ip', '300.1.1.1'); await page.fill('#s-p', '24'); await page.click('button:has-text("Calculate")');
    assert((await page.locator('#s-ip-err').innerText()).includes('255'));
    await go('#/tool/subnet-calc'); await page.fill('#s-ip', '10.1.2.3'); await page.fill('#s-p', '8'); await page.click('button:has-text("Calculate")');
    await shot('02-subnet');
  });

  await step('range generator: ok, reversed, too large', async () => {
    await go('#/tool/range-generator');
    await page.fill('#r-a', '192.168.1.1'); await page.fill('#r-b', '192.168.1.50'); await page.click('button:has-text("Generate")');
    assert((await page.locator('#r-out').innerText()).includes('50 addresses'));
    await page.fill('#r-a', '192.168.1.50'); await page.fill('#r-b', '192.168.1.1'); await page.click('button:has-text("Generate")');
    assert((await page.locator('#r-out').innerText()).includes('reversed'));
    await page.fill('#r-a', '10.0.0.0'); await page.fill('#r-b', '10.255.255.255'); await page.click('button:has-text("Generate")');
    assert((await page.locator('#r-out').innerText()).includes('limit'));
    await page.fill('#r-a', '10.0.0.1'); await page.fill('#r-b', '10.0.0.3'); await page.click('button:has-text("Generate")');
    const dl = page.waitForEvent('download'); await page.click('#r-csv'); const d = await dl;
    const txt = require('fs').readFileSync(await d.path(), 'utf8'); assert(txt.includes('10.0.0.2'));
  });

  await step('IP tracker: add, duplicate, invalid, bulk, filter, edit, delete, CSV import/export', async () => {
    await go('#/tool/ip-tracker');
    await page.fill('#ip-tracker-f-ip', '192.168.1.10'); await page.selectOption('#ip-tracker-f-status', 'Used'); await page.fill('#ip-tracker-f-mac', 'aa-bb-cc-dd-ee-ff'); await page.fill('#ip-tracker-f-device', '<b>PC1</b>');
    await page.click('#ip-tracker-submit');
    assert((await page.locator('#ip-tracker-tbody').innerText()).includes('AA:BB:CC:DD:EE:FF'));
    assert(await page.locator('#ip-tracker-tbody b').count() === 0, 'HTML must be escaped');
    await page.fill('#ip-tracker-f-ip', '192.168.1.10'); await page.click('#ip-tracker-submit');
    assert((await page.locator('#ip-tracker-f-ip-err').innerText()).includes('already exists'));
    await page.fill('#ip-tracker-f-ip', '192.168.1.999'); await page.click('#ip-tracker-submit');
    assert((await page.locator('#ip-tracker-f-ip-err').innerText()).includes('255'));
    await page.fill('#ip-tracker-f-ip', ''); await page.click('#ip-tracker-submit');
    assert((await page.locator('#ip-tracker-f-ip-err').innerText()).includes('required'));
    await page.click('summary:has-text("Bulk add")'); await page.fill('#t-bulk', '192.168.1.11-192.168.1.13, 192.168.1.10, bad'); await page.selectOption('#t-bst', 'Free'); await page.click('#t-badd');
    const res = await page.locator('#t-bres').innerText(); assert(res.includes('3 added') && res.includes('duplicate') && res.includes('invalid'), res);
    await page.selectOption('#ip-tracker-flt', 'Free'); assert(await page.locator('#ip-tracker-tbody tr').count() === 3);
    await page.selectOption('#ip-tracker-flt', ''); await page.fill('#ip-tracker-q', 'zzzz'); await W(); assert((await page.locator('#ip-tracker-tbody').innerText()).includes('No records match'));
    await page.fill('#ip-tracker-q', ''); await W();
    await page.click('summary:has-text("Find candidate")'); await page.fill('#t-cidr', '192.168.1.0/28'); await page.fill('#t-n', '14'); await page.click('#t-find');
    const cand = await page.locator('#t-cres').innerText(); assert(cand.includes('192.168.1.11') && cand.includes('192.168.1.14') && !cand.includes('192.168.1.10\n'), cand);
    await page.click('[data-edit]:first-of-type'); await page.fill('#ip-tracker-f-user', 'Rahim'); await page.click('#ip-tracker-submit');
    assert((await page.locator('#ip-tracker-tbody').innerText()).includes('Rahim'));
    const dl = page.waitForEvent('download'); await page.click('[data-act="export"]'); const csv = require('fs').readFileSync(await (await dl).path(), 'utf8'); assert(csv.includes('192.168.1.12') && csv.includes('IP address'));
    page.once('dialog', d => d.accept());
    await page.locator('[data-del]').first().click(); await page.click('dialog button[value="ok"]'); await W();
    assert(await page.locator('#ip-tracker-tbody tr').count() === 3);
    require('fs').writeFileSync('/tmp/imp.csv', 'IP address,Status,Device name\n10.9.9.1,Used,A\n10.9.9.1,Used,dup\nnotip,Free,x\n10.9.9.2,Weird,y\n');
    await page.setInputFiles('#ip-tracker-file', '/tmp/imp.csv'); await W();
    const ir = await page.locator('#ip-tracker-result').innerText(); assert(ir.includes('1 added') && ir.includes('duplicate') && ir.includes('invalid'), ir);
    require('fs').writeFileSync('/tmp/bad.csv', 'IP address,Status\n"unclosed,Used\n');
    await page.setInputFiles('#ip-tracker-file', '/tmp/bad.csv'); await W(); assert((await page.locator('#ip-tracker-result').innerText()).includes('Import failed'));
    await shot('03-tracker');
  });

  await step('without opt-in nothing is stored; with opt-in data survives reload', async () => {
    await go('#/tool/ip-tracker');
    assert(!(await page.evaluate(() => localStorage.getItem('itk.ip-tracker.data'))), 'data stored without consent');
    await page.check('#ip-tracker-persist');
    await page.fill('#ip-tracker-f-ip', '172.16.0.9'); await page.click('#ip-tracker-submit');
    assert((await page.evaluate(() => localStorage.getItem('itk.ip-tracker.data'))).includes('172.16.0.9'));
    await page.reload(); await page.waitForSelector('#ip-tracker-tbody');
    assert((await page.locator('#ip-tracker-tbody').innerText()).includes('172.16.0.9'));
    assert(await page.locator('#ip-tracker-persist').isChecked());
    await go('#/privacy'); await page.click('#clr-all'); await page.click('dialog button[value="ok"]'); await W();
    assert((await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('itk.')))).length === 0);
  });

  await step('daily report: add entries, totals, validation, duration, text, csv, draft', async () => {
    await go('#/tool/daily-report');
    await page.fill('#ri-name', 'Rahim'); await page.click('#re-submit');
    assert((await page.locator('#re-title-err').innerText()).includes('required'));
    await page.fill('#re-title', 'Fix printer'); await page.selectOption('#re-status', 'Completed'); await page.fill('#re-start', '09:00'); await page.fill('#re-end', '10:30'); await page.fill('#re-act', 'Restarted spooler');
    assert((await page.locator('#re-dur').innerText()).includes('1h 30m'));
    await page.click('#re-submit');
    await page.fill('#re-title', 'Bad time'); await page.fill('#re-start', '11:00'); await page.fill('#re-end', '10:00'); await page.click('#re-submit');
    assert((await page.locator('#re-time-err').innerText()).includes('after start'));
    await page.fill('#re-start', ''); await page.fill('#re-end', ''); await page.selectOption('#re-status', 'Pending'); await page.click('#re-submit');
    const tiles = await page.locator('#rp-tiles').innerText();
    assert(/2\s*Total tasks/.test(tiles) && /1\s*Completed/.test(tiles) && /1\s*Pending/.test(tiles) && /1h 30m/.test(tiles), tiles);
    const sheet = await page.locator('#report-sheet').innerText(); assert(sheet.includes('Rahim') && sheet.includes('Restarted spooler'));
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.click('#rp-copy'); const clip = await page.evaluate(() => navigator.clipboard.readText()); assert(clip.includes('DAILY IT ACTIVITY REPORT') && clip.includes('Total tasks: 2'), clip);
    const dl = page.waitForEvent('download'); await page.click('#rp-csv'); assert(require('fs').readFileSync(await (await dl).path(), 'utf8').includes('Fix printer'));
    await page.click('#dr-save'); await page.reload(); await page.waitForSelector('#re-title');
    assert(await page.locator('#rl-list .entry-item').count() === 0, 'entries not restored automatically');
    await page.click('#dr-load'); assert(await page.locator('#rl-list .entry-item').count() === 2);
    await page.click('#rl-list [data-edit]'); await page.fill('#re-title', 'Fix printer v2'); await page.click('#re-submit'); assert((await page.locator('#rl-list').innerText()).includes('v2'));
    await page.click('#rl-list [data-del]'); await page.click('dialog button[value="ok"]'); await W(); assert(await page.locator('#rl-list .entry-item').count() === 1);
    await shot('04-report');
  });

  await step('clipboard failure shows manual-copy fallback', async () => {
    const c2 = await browser.newContext(); const p2 = await c2.newPage();
    await p2.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } }); document.execCommand = () => false; });
    await p2.goto(url + '#/tool/commands'); await p2.waitForSelector('.codebox button'); await p2.click('.codebox button');
    await p2.waitForSelector('dialog.modal textarea'); assert((await p2.locator('.toast-error').count()) >= 1); await c2.close();
  });

  await step('commands: search, filter, copy, no-results', async () => {
    await go('#/tool/commands'); await page.fill('#cq', 'flushdns'); await W();
    assert(await page.locator('.cmd-card').count() === 1);
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']); await page.click('.cmd-card .codebox button');
    assert((await page.evaluate(() => navigator.clipboard.readText())) === 'ipconfig /flushdns');
    await page.fill('#cq', 'qqqqzzz'); await W(); assert((await page.locator('#clist').innerText()).includes('No commands match'));
    await page.fill('#cq', ''); await W(); await page.selectOption('#cs', 'PowerShell'); assert(await page.locator('.cmd-card').count() > 5);
  });

  await step('guides: search, deep link opens guide, bangla present', async () => {
    await go('#/tool/net-guides?open=dns-failure'); assert(await page.locator('#g-dns-failure[open]').count() === 1);
    assert((await page.locator('#g-dns-failure').innerText()).includes('বাংলা'));
    await page.fill('#gq', 'zzzzzz'); await W(); assert((await page.locator('#glist').innerText()).includes('No guides match'));
    await page.fill('#gq', ''); await W(); assert(await page.locator('details.guide').count() === 14);
    await go('#/tool/hw-guides'); await page.click('summary:has-text("Quick calculators")'); await page.fill('#b-d', '48000'); await page.fill('#b-f', '36000'); assert((await page.locator('#b-out').innerText()).includes('75.0%'));
  });

  await step('global search incl. no results and keyboard', async () => {
    await go('#/'); await page.fill('#global-search', 'subnet'); await W(); await page.waitForSelector('.sr-item');
    assert((await page.locator('.sr-item').first().innerText()).toLowerCase().includes('subnet'));
    await page.fill('#global-search', '3389'); await W(); await page.waitForSelector('.sr-item'); assert((await page.locator('.sr-item').first().innerText()).includes('RDP'));
    await page.keyboard.press('Enter'); await page.waitForSelector('#rq'); assert((await page.inputValue('#rq')) === '3389');
    await page.fill('#global-search', 'xyzzynothing'); await W(); await page.waitForSelector('.sr-empty');
  });

  await step('calculators', async () => {
    await go('#/tool/storage-converter'); await page.fill('#c-v', '1'); await page.selectOption('#c-u', 'GiB'); assert((await page.locator('#cout').innerText()).includes('1,073,741,824'));
    await page.fill('#c-v', '-3'); assert((await page.locator('#c-v-err').innerText()).length > 0);
    await go('#/tool/download-time'); await page.fill('#d-s', '1'); await page.selectOption('#d-su', 'GB'); await page.fill('#d-v', '8'); await page.selectOption('#d-vu', 'Mbps'); await page.fill('#d-e', '100'); await page.click('button:has-text("Calculate")');
    assert((await page.locator('#cout').innerText()).includes('16m 40s'));
    await go('#/tool/uptime-calc'); await page.click('button:has-text("Calculate")'); assert((await page.locator('#cout').innerText()).includes('99.9'));
    await go('#/tool/ups-runtime'); await page.click('button:has-text("Calculate")'); assert((await page.locator('#cout').innerText()).includes('Estimated runtime'));
  });

  await step('password generator and strength', async () => {
    await go('#/tool/password-tools'); await page.click('#g-go'); const p = await page.locator('#g-out code').first().innerText(); assert(p.length === 16, p);
    await page.fill('#g-len', '4'); await page.click('#g-go'); assert((await page.locator('#g-msg').innerText()).includes('8'));
    await page.fill('#g-len', '20'); await page.uncheck('#g-lo'); await page.uncheck('#g-up'); await page.uncheck('#g-sy'); await page.click('#g-go'); assert(/^\d{20}$/.test(await page.locator('#g-out code').first().innerText()));
    await page.uncheck('#g-di'); await page.click('#g-go'); assert((await page.locator('#g-msg').innerText()).includes('at least one'));
    await page.fill('#k-in', 'password'); assert((await page.locator('#k-res').innerText()).includes('Weak'));
    assert((await page.evaluate(() => Object.keys(localStorage).join(','))).indexOf('pass') === -1);
  });

  await step('inventory add/validate/edit', async () => {
    await go('#/tool/inventory'); await page.click('#inventory-submit'); assert((await page.locator('#inventory-f-name-err').innerText()).includes('required'));
    await page.fill('#inventory-f-name', 'PC-01'); await page.selectOption('#inventory-f-type', 'Laptop'); await page.fill('#inventory-f-serial', 'SN1'); await page.fill('#inventory-f-warrantyExpiry', '2020-01-01'); await page.click('#inventory-submit');
    assert((await page.locator('#inventory-tbody').innerText()).includes('Expired'));
    await page.fill('#inventory-f-name', 'PC-02'); await page.selectOption('#inventory-f-type', 'Laptop'); await page.fill('#inventory-f-serial', 'sn1'); await page.click('#inventory-submit');
    assert((await page.locator('#inventory-f-serial-err').innerText()).includes('already exists'));
    await page.fill('#inventory-f-mac', 'zz'); await page.click('#inventory-submit'); assert((await page.locator('#inventory-f-mac-err').innerText()).length > 0);
    await shot('05-inventory');
  });

  await step('dashboard activity summary counts and is remembered; off/reset work', async () => {
    await go('#/'); await go('#/tool/inventory'); await page.fill('#inventory-f-name', 'SUM-01'); await page.selectOption('#inventory-f-type', 'Printer'); await page.click('#inventory-submit');
    await page.fill('#inventory-f-name', 'SUM-02'); await page.selectOption('#inventory-f-type', 'Printer'); await page.click('#inventory-submit');
    await go('#/tool/password-tools'); await page.fill('#g-cnt', '3'); await page.click('#g-go');
    await go('#/'); await page.waitForSelector('.stat-tile');
    const tiles = await page.locator('.stat-tiles').innerText();
    assert(/\d+\s*Inventory items added/.test(tiles) && /\d+\s*Passwords generated/.test(tiles), tiles);
    const num = async (label) => Number((await page.locator('.stat-tile', { hasText: label }).locator('b').innerText()).trim());
    const inv0 = await num('Inventory items added'), pw0 = await num('Passwords generated'); assert(inv0 >= 3 && pw0 >= 3, inv0 + ' ' + pw0 + ' ' + decodeURIComponent(await page.evaluate(() => document.cookie)).slice(0, 140));
    assert((await page.locator('.stat-tile', { hasText: 'Inventory items added' }).innerText()).includes('In your list now: 3'));
    await page.reload(); await page.waitForSelector('.stat-tile'); assert((await num('Inventory items added')) === inv0 && (await num('Passwords generated')) === pw0, 'counters survive reload');
    if (url.startsWith('http')) { assert((await ctx.cookies()).some(c => c.name === 'itk_usage'), 'cookie set'); const c = (await ctx.cookies()).find(c => c.name === 'itk_usage'); assert(!/PC|SUM-0|pass/i.test(decodeURIComponent(c.value).replace(/subnet|password-tools/g, '')), 'cookie holds counts only: ' + c.value); }
    await page.click('#stats-reset'); await page.click('dialog button[value="ok"]'); await W(); assert((await num('Inventory items added')) === 0);
    await page.uncheck('#stats-on'); await W(); assert(await page.locator('.stat-tile').count() === 0 && (await page.locator('#stats-reset').isDisabled()));
    await go('#/tool/password-tools'); await page.click('#g-go'); await go('#/'); assert(await page.locator('.stat-tile').count() === 0, 'nothing counted while off');
    await page.check('#stats-on'); await W(); assert((await num('Passwords generated')) === 0); await shot('08-summary');
  });

  await step('theme toggle persists; dark screenshot', async () => {
    await go('#/'); await page.click('#theme-btn'); assert((await page.getAttribute('html', 'data-theme')) === 'dark');
    await page.reload(); assert((await page.getAttribute('html', 'data-theme')) === 'dark'); await shot('06-dark'); await page.click('#theme-btn');
  });

  await step('favourites and recents, clear history', async () => {
    await go('#/'); await page.click('[data-fav="subnet-calc"]');
    await page.reload(); await page.waitForSelector('.tool-card'); assert((await page.locator('h2:has-text("Favourites")').count()) === 1);
    await go('#/tool/ports'); await go('#/'); assert((await page.locator('h2:has-text("Recently used")').count()) === 1);
    await page.click('#clr-recent'); assert((await page.locator('h2:has-text("Recently used")').count()) === 0);
  });

  await step('mobile layout: menu collapses and opens, no horizontal scroll', async () => {
    const m = await browser.newContext({ viewport: { width: 375, height: 800 } }); const p = await m.newPage();
    await p.goto(url); await p.waitForSelector('.tool-card');
    assert(!(await p.locator('#sidebar').isVisible()), 'sidebar hidden');
    await p.click('#menu-btn'); assert(await p.locator('#sidebar').isVisible()); assert((await p.getAttribute('#menu-btn', 'aria-expanded')) === 'true');
    await p.click('#sidebar a[href="#/cat/ip"]'); await p.waitForSelector('h1:has-text("IP Address Tools")'); assert(!(await p.locator('#sidebar').isVisible()));
    for (const h of ['#/', '#/tool/ip-tracker', '#/tool/daily-report', '#/tool/commands', '#/tool/ports']) { await p.goto(url + h); await p.waitForSelector('#page-h'); const sw = await p.evaluate(() => document.documentElement.scrollWidth); assert(sw <= 380, h + ' scrollWidth ' + sw); }
    await p.goto(url + '#/tool/subnet-calc'); await p.waitForSelector('#s-ip'); if (shots) await p.screenshot({ path: shots + '/07-mobile.png' }); await m.close();
  });

  await step('unknown route shows not-found', async () => { await go('#/tool/nope'); assert((await page.locator('main').innerText()).includes('not found')); });

  await step('no console/page errors overall', async () => { assert.deepStrictEqual(errors, []); });

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close(); process.exit(fail ? 1 : 0);
})();
