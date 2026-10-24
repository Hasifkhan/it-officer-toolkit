/* rj45.js — RJ45 wiring and cabling: animated pinout diagrams for T568A/B, straight-through, crossover, rollover (console),
   loopback, PoE and T1/E1 (RJ48). Reference only; nothing is stored or sent. */
(function (g) {
  'use strict';
  const ITK = g.ITK, U = ITK.util, esc = U.esc;
  const R = {};
  ITK.rj45 = R;

  /* ---------- data ---------- */
  R.COLORS = {
    'W/O': { name: 'White/Orange', base: '#f8fafc', stripe: '#f97316' }, 'O': { name: 'Orange', base: '#f97316' },
    'W/G': { name: 'White/Green', base: '#f8fafc', stripe: '#22c55e' }, 'G': { name: 'Green', base: '#22c55e' },
    'W/B': { name: 'White/Blue', base: '#f8fafc', stripe: '#2563eb' }, 'B': { name: 'Blue', base: '#2563eb' },
    'W/Br': { name: 'White/Brown', base: '#f8fafc', stripe: '#92400e' }, 'Br': { name: 'Brown', base: '#92400e' }
  };
  R.STD = {
    A: ['W/G', 'G', 'W/O', 'B', 'W/B', 'O', 'W/Br', 'Br'],      // T568A, pin 1..8
    B: ['W/O', 'O', 'W/G', 'B', 'W/B', 'G', 'W/Br', 'Br']       // T568B, pin 1..8
  };
  const P8 = [1, 2, 3, 4, 5, 6, 7, 8];
  const straight = P8.map(function (i) { return [i, i]; });
  const cross100 = [[1, 3], [2, 6], [3, 1], [4, 4], [5, 5], [6, 2], [7, 7], [8, 8]];
  const crossGig = [[1, 3], [2, 6], [3, 1], [4, 7], [5, 8], [6, 2], [7, 4], [8, 5]];
  const roll = P8.map(function (i) { return [i, 9 - i]; });
  const FAST_L = { 1: 'TX+', 2: 'TX−', 3: 'RX+', 6: 'RX−' }, FAST_SW = { 1: 'RX+', 2: 'RX−', 3: 'TX+', 6: 'TX−' };
  const GIG = { 1: 'BI_DA+', 2: 'BI_DA−', 3: 'BI_DB+', 4: 'BI_DC+', 5: 'BI_DC−', 6: 'BI_DB−', 7: 'BI_DD+', 8: 'BI_DD−' };
  const flowFast = { 1: 'ab', 2: 'ab', 3: 'ba', 6: 'ba' };
  const flowGig = { 1: 'both', 2: 'both', 3: 'both', 4: 'both', 5: 'both', 6: 'both', 7: 'both', 8: 'both' };
  const power = function (pins, dir) { const o = {}; pins.forEach(function (p) { o[p] = dir || 'ab'; }); return o; };

  /* A variant describes one drawable wiring: map = [leftPin, rightPin] per wire; data/pwr = flow by LEFT pin ('ab' | 'ba' | 'both');
     sigL / sigR = signal names by pin on each end. */
  R.modes = [
    { id: 'straight-b', short: 'Straight-through (T568B)', title: 'Straight-through cable, T568B on both ends', left: 'PC / NIC', right: 'Switch / router port', std: 'B',
      use: 'PC, printer, IP phone, camera or AP to a switch or router. The most common patch cable. Both ends use the same standard; T568B is the most widely used in Bangladesh and North America.',
      tips: ['Same colour order on both ends: pin 1 to pin 1 … pin 8 to pin 8.', 'Fast Ethernet (10/100) only uses pairs on pins 1-2 and 3-6; Gigabit uses all four pairs.', 'Most modern ports have Auto-MDI/MDI-X, so a straight cable also works between two PCs.'],
      variants: [
        { id: 'fast', label: '10/100 Mbps (2 pairs)', map: straight, data: flowFast, sigL: FAST_L, sigR: FAST_SW },
        { id: 'gig', label: '1000 Mbps / Gigabit (4 pairs)', map: straight, data: flowGig, sigL: GIG, sigR: GIG }] },
    { id: 'straight-a', short: 'Straight-through (T568A)', title: 'Straight-through cable, T568A on both ends', left: 'PC / NIC', right: 'Switch / router port', std: 'A',
      use: 'Same function as T568B straight-through. T568A is common in government and some residential cabling and is the recommended pattern for new installations in some standards. Pick one standard and use it everywhere in a building.',
      tips: ['Never mix T568A on one wall port and T568B on the patch panel by accident: that creates an unintended crossover.', 'T568A and T568B differ only by swapping the orange and green pairs.'],
      variants: [
        { id: 'fast', label: '10/100 Mbps (2 pairs)', map: straight, data: flowFast, sigL: FAST_L, sigR: FAST_SW },
        { id: 'gig', label: '1000 Mbps / Gigabit (4 pairs)', map: straight, data: flowGig, sigL: GIG, sigR: GIG }] },
    { id: 'crossover', short: 'Crossover (A to B)', title: 'Crossover cable: T568A on one end, T568B on the other', left: 'PC 1 (T568A end)', right: 'PC 2 (T568B end)', std: 'A',
      use: 'Connects like devices directly: PC to PC, switch to switch (old switches without Auto-MDI-X), router to PC. The transmit pair of one side meets the receive pair of the other.',
      tips: ['Pins 1 and 3 swap, and pins 2 and 6 swap.', 'For Gigabit the other two pairs also swap (4↔7, 5↔8), so the blue and brown wires land on different pins at the far end and a plain A-to-B cable is not a true Gigabit crossover.', 'Auto-MDI-X (mandatory for 1000BASE-T) makes crossover cables unnecessary on most modern equipment.'],
      variants: [
        { id: 'fast', label: '10/100 Mbps (2 pairs)', map: cross100, data: flowFast, sigL: FAST_L, sigR: FAST_L },
        { id: 'gig', label: '1000 Mbps / Gigabit (4 pairs)', map: crossGig, data: flowGig, sigL: GIG, sigR: GIG }] },
    { id: 'rollover', short: 'Rollover (console)', title: 'Rollover (console) cable', left: 'Router / switch console port', right: 'PC serial adapter', std: 'B',
      use: 'Flat light-blue Cisco-style console cable: pin 1 goes to pin 8, 2 to 7 … 8 to 1, used with an RJ45-to-DB9 or USB-serial adapter to configure network equipment. It carries serial (RS-232), not Ethernet.',
      tips: ['Do not plug a rollover cable into an Ethernet port; it will not work and is not meant to carry network traffic.', 'Typical terminal settings: 9600 baud, 8 data bits, no parity, 1 stop bit, no flow control.', 'Signal names below follow the common Cisco console pinout; confirm with your vendor’s manual.'],
      variants: [{ id: 'console', label: 'Cisco-style console', map: roll, data: { 3: 'ab', 6: 'ba' },
        sigL: { 1: 'RTS', 2: 'DTR', 3: 'TXD', 4: 'GND', 5: 'GND', 6: 'RXD', 7: 'DSR', 8: 'CTS' }, sigR: { 1: 'CTS', 2: 'DSR', 3: 'RXD', 4: 'GND', 5: 'GND', 6: 'TXD', 7: 'DTR', 8: 'RTS' } }] },
    { id: 'loopback', short: 'Loopback plug', title: 'Loopback test plug', single: true, left: 'RJ45 loopback plug', std: 'B',
      use: 'A short plug that feeds the transmit pins back into the receive pins. Used to test a port or NIC (self-test, link-light check) without a second device.',
      tips: ['10/100 loopback: 1↔3 and 2↔6.', 'Gigabit loopback adds 4↔7 and 5↔8.', 'Use it only on the port you are testing; never on a live uplink.'],
      variants: [
        { id: 'fast', label: '10/100 loopback', arcs: [[1, 3, 90], [2, 6, 150]], data: { 1: 'ab', 2: 'ab' }, sigL: FAST_L, sigR: FAST_L },
        { id: 'gig', label: 'Gigabit loopback', arcs: [[1, 3, 90], [2, 6, 150], [4, 7, 90], [5, 8, 150]], data: { 1: 'ab', 2: 'ab', 4: 'ab', 5: 'ab' }, sigL: GIG, sigR: GIG }] },
    { id: 'poe', short: 'PoE (power over Ethernet)', title: 'Power over Ethernet (PoE)', left: 'Switch / PoE injector (PSE)', right: 'Camera, AP, phone (PD)', std: 'B',
      use: 'Carries DC power and data on the same cable, so IP cameras, access points and phones need no separate adapter. Wiring is a normal straight-through cable; the power is added on top.',
      tips: ['802.3af (up to 15.4 W), 802.3at (up to 30 W), 802.3bt Type 3 (up to 60 W) and Type 4 (up to 100 W) at the power source.', 'At 1000BASE-T all four pairs carry data, and power rides on them (“phantom” power).', 'Standard PoE negotiates before sending power. Passive PoE (always-on, often 24 V) is not standard: plugging it into a normal port can damage equipment.', 'Use solid-copper cable; copper-clad aluminium (CCA) overheats and fails.'],
      variants: [
        { id: 'a', label: 'Mode A (pairs 1-2 and 3-6)', map: straight, data: flowFast, pwr: power([1, 2, 3, 6]), sigL: { 1: 'TX+ & power', 2: 'TX− & power', 3: 'RX+ & power', 6: 'RX− & power' }, sigR: { 1: 'RX+ & power', 2: 'RX− & power', 3: 'TX+ & power', 6: 'TX− & power' } },
        { id: 'b', label: 'Mode B (spare pairs 4-5 and 7-8, 10/100 only)', map: straight, data: flowFast, pwr: power([4, 5, 7, 8]), sigL: Object.assign({ 4: 'DC power', 5: 'DC power', 7: 'DC power', 8: 'DC power' }, FAST_L), sigR: Object.assign({ 4: 'DC power', 5: 'DC power', 7: 'DC power', 8: 'DC power' }, FAST_SW) },
        { id: '4p', label: '4-pair PoE (802.3bt) with Gigabit', map: straight, data: flowGig, pwr: power(P8), sigL: { 1: 'DA+ & power', 2: 'DA− & power', 3: 'DB+ & power', 4: 'DC+ & power', 5: 'DC− & power', 6: 'DB− & power', 7: 'DD+ & power', 8: 'DD− & power' }, sigR: { 1: 'DA+ & power', 2: 'DA− & power', 3: 'DB+ & power', 4: 'DC+ & power', 5: 'DC− & power', 6: 'DB− & power', 7: 'DD+ & power', 8: 'DD− & power' } }] },
    { id: 'rj48', short: 'T1/E1 line (RJ48)', title: 'T1/E1 leased line (RJ48C)', left: 'Customer equipment (CSU/router)', right: 'Carrier demarc', std: 'B',
      use: 'An RJ45 plug used for T1/E1 telecom lines. It looks like an Ethernet cable but uses pins 1-2 and 4-5 instead of 1-2 and 3-6.',
      tips: ['RJ48C: pins 1-2 are the receive pair and pins 4-5 the transmit pair (verify with your carrier’s demarc specification).', 'A normal Ethernet cable (pins 1-2 and 3-6) will not carry a T1/E1 signal because pins 3-6 are not the second pair.', 'Do not connect a T1/E1 line to an Ethernet port or the reverse.'],
      variants: [{ id: 'rj48c', label: 'RJ48C', map: straight, data: { 1: 'ba', 2: 'ba', 4: 'ab', 5: 'ab' },
        sigL: { 1: 'RX ring', 2: 'RX tip', 4: 'TX ring', 5: 'TX tip' }, sigR: { 1: 'TX ring', 2: 'TX tip', 4: 'RX ring', 5: 'RX tip' } }] }
  ];
  R.mode = function (id) { return R.modes.filter(function (m) { return m.id === id; })[0]; };

  /** colour code of the wire that leaves LEFT pin `a` (uses the mode's left standard) */
  R.wireColor = function (mode, a) { return R.STD[mode.std][a - 1]; };
  /** wires for a variant: [{a, b, code, flow, pwr, sigA, sigB}] */
  R.wires = function (mode, v) {
    const pairs = v.map || [];
    return pairs.map(function (p) {
      const a = p[0], b = p[1];
      return { a: a, b: b, code: R.wireColor(mode, a), flow: v.data[a] || null, pwr: (v.pwr && v.pwr[a]) || null, sigA: v.sigL[a] || 'unused', sigB: v.sigR[b] || 'unused' };
    });
  };

  /* ---------- drawing ---------- */
  const PIN_Y = function (i) { return 78 + (i - 1) * 36; };
  const FLOW_LABEL = { ab: 'A → B', ba: 'B → A', both: 'both ways' };
  function wirePaint(code, w) {
    const c = R.COLORS[code];
    return c.stripe
      ? '<path class="rj-w" d="' + w + '" stroke="' + c.base + '" stroke-width="8"/><path class="rj-w" d="' + w + '" stroke="' + c.stripe + '" stroke-width="8" stroke-dasharray="9 9"/>'
      : '<path class="rj-w" d="' + w + '" stroke="' + c.base + '" stroke-width="8"/>';
  }
  function pulse(d, dir, halo, core, delay) {
    const cls = dir === 'ba' ? 'rj-ba' : 'rj-ab', st = delay ? ' style="animation-delay:' + delay + '"' : '';
    return '<path class="rj-p ' + cls + '" d="' + d + '" stroke="' + halo + '" stroke-width="10"' + st + '/><path class="rj-p ' + cls + '" d="' + d + '" stroke="' + core + '" stroke-width="5"' + st + '/>';
  }
  function plug(x, label, pinLabelsOnRight, colors) {
    let s = '<rect x="' + x + '" y="40" width="120" height="324" rx="14" class="rj-plug"/><text x="' + (x + 60) + '" y="24" text-anchor="middle" class="rj-t">' + esc(label) + '</text>';
    for (let i = 1; i <= 8; i++) {
      const y = PIN_Y(i), cx = pinLabelsOnRight ? x + 26 : x + 94, px = pinLabelsOnRight ? x : x + 108;
      s += '<rect x="' + px + '" y="' + (y - 7) + '" width="12" height="14" rx="2" class="rj-pin"/><circle cx="' + cx + '" cy="' + y + '" r="11" class="rj-n"' + (colors ? ' fill="' + colors[i - 1] + '"' : '') + '/><text x="' + cx + '" y="' + (y + 4) + '" text-anchor="middle" class="rj-nt">' + i + '</text>';
    }
    return s;
  }
  R.svg = function (mode, v) {
    const ws = R.wires(mode, v);
    let s = '<svg class="rj-svg" viewBox="0 0 760 380" role="img" aria-labelledby="rj-cap" xmlns="http://www.w3.org/2000/svg"><title id="rj-cap">' + esc(mode.title + ' — ' + v.label) + '. Wiring is listed in the table below.</title>';
    if (mode.single) {
      const X = 200, pw = 120, ax = X + pw; s += plug(X, mode.left, false);
      const used = {}; v.arcs.forEach(function (a) { used[a[0]] = used[a[1]] = 1; });
      for (let i = 1; i <= 8; i++) if (!used[i]) s += '<text x="' + (ax + 16) + '" y="' + (PIN_Y(i) + 4) + '" class="rj-sm">unused</text>';
      v.arcs.forEach(function (a) {
        const y1 = PIN_Y(a[0]), y2 = PIN_Y(a[1]), b = ax + a[2], d = 'M' + ax + ',' + y1 + ' C' + b + ',' + y1 + ' ' + b + ',' + y2 + ' ' + ax + ',' + y2;
        s += '<g class="rj-wire" data-a="' + a[0] + '">' + wirePaint(R.wireColor(mode, a[0]), d) + pulse(d, 'ab', '#fff', '#0f172a') + '</g>';
      });
      return s + '</svg>';
    }
    const LX = 30, RX = 610, x1 = LX + 120, x2 = RX;
    s += plug(LX, mode.left, false) + plug(RX, mode.right, true);
    ws.forEach(function (w) {
      const y1 = PIN_Y(w.a), y2 = PIN_Y(w.b), d = 'M' + x1 + ',' + y1 + ' C' + (x1 + 170) + ',' + y1 + ' ' + (x2 - 170) + ',' + y2 + ' ' + x2 + ',' + y2;
      const idle = !w.flow && !w.pwr;
      s += '<g class="rj-wire' + (idle ? ' rj-idle' : '') + '" data-a="' + w.a + '">' + wirePaint(w.code, d);
      if (w.pwr) s += pulse(d, w.pwr, '#fde047', '#78350f', '-0.35s');
      if (w.flow === 'both') s += pulse(d, 'ab', '#fff', '#0f172a') + pulse(d, 'ba', '#fff', '#0f172a', '-0.6s');
      else if (w.flow) s += pulse(d, w.flow, '#fff', '#0f172a');
      s += '<text x="' + (x1 + 8) + '" y="' + (y1 - 9) + '" class="rj-sm">' + esc(w.code) + '</text></g>';
    });
    return s + '</svg>';
  };

  /* ---------- UI ---------- */
  const swatch = function (code) { const c = R.COLORS[code]; return '<span class="rj-sw" style="background:' + (c.stripe ? 'repeating-linear-gradient(90deg,' + c.base + ' 0 4px,' + c.stripe + ' 4px 8px)' : c.base) + '" title="' + esc(c.name) + '"></span> ' + esc(c.name); };
  const CATS = [['Cat5', '10/100 Mbps', '100 MHz', '100 m', 'Obsolete'], ['Cat5e', '1 Gbps', '100 MHz', '100 m', 'Common minimum today'], ['Cat6', '1 Gbps (10 Gbps up to about 55 m)', '250 MHz', '100 m', 'Good general choice'], ['Cat6a', '10 Gbps', '500 MHz', '100 m', 'Offices, PoE, future-proofing'], ['Cat7', '10 Gbps', '600 MHz', '100 m', 'Shielded; non-RJ45 (GG45/TERA) connectors in the standard'], ['Cat8', '25/40 Gbps', '2000 MHz', 'about 30 m', 'Data centres (switch to server)']];

  ITK.register({
    id: 'rj45-wiring', cat: 'network', icon: 'network', title: 'RJ45 Wiring & Cable Types (animated)',
    desc: 'Animated pinouts for T568A/B, straight-through, crossover, rollover console, loopback, PoE and T1/E1, with colour codes and crimping steps.',
    keywords: 'rj45 ethernet cable t568a t568b straight crossover rollover console loopback poe pinout wiring crimp cat5e cat6 utp lan cable colour code rj48',
    render: function (root) {
      let mode = R.modes[0], vi = 0, playing = !(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches), sel = null, swapped = false;
      root.innerHTML = '<section class="card"><div class="rj-modes" role="group" aria-label="Cable type" id="rj-modes"></div>' +
        '<div class="rj-bar"><div class="field" style="margin:0;min-width:230px"><label for="rj-var">Variant</label><select class="select" id="rj-var"></select></div>' +
        '<div class="field" style="margin:0"><label for="rj-spd">Animation speed</label><select class="select" id="rj-spd"><option value="2.4s">Slow</option><option value="1.2s" selected>Normal</option><option value="0.6s">Fast</option></select></div>' +
        '<button type="button" class="btn" id="rj-play" aria-pressed="true"></button></div>' +
        '<h2 id="rj-title" style="margin-top:14px"></h2><p id="rj-use"></p><div id="rj-fig" class="rj-fig"></div>' +
        '<div class="rj-legend" aria-hidden="true"><span><i class="rj-dot"></i> data moving along the wire</span><span><i class="rj-dot rj-dot-p"></i> DC power</span><span><i class="rj-dot rj-dot-i"></i> faded wire = pin not used</span></div>' +
        '<div class="table-wrap"><table class="table"><caption class="sr-only" id="rj-cap2">Wiring table</caption><thead id="rj-th"></thead><tbody id="rj-tb"></tbody></table></div>' +
        '<p class="help">Tip: click a row to highlight one wire. Pin 1 is at the top in this drawing (not the physical view of the plug).</p><ul id="rj-tips"></ul></section>' +
        '<section class="card"><h2>T568A vs T568B: what actually changes</h2><p>Only the orange and green pairs trade places. Press the button to watch pins 1↔3 and 2↔6 swap.</p>' +
        '<div class="btn-row"><button type="button" class="btn" id="rj-swap">Switch to T568A</button></div><div class="rj-bars" id="rj-bars" aria-hidden="true"></div>' +
        '<div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Pin</th><th>T568A</th><th>T568B</th><th>Pair</th></tr></thead><tbody>' +
        [1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return '<tr><td>' + i + '</td><td>' + swatch(R.STD.A[i - 1]) + '</td><td>' + swatch(R.STD.B[i - 1]) + '</td><td>' + ['2', '2', '3', '1', '1', '3', '4', '4'][i - 1] + '</td></tr>'; }).join('') + '</tbody></table></div></section>' +
        '<section class="card"><h2>How to crimp an RJ45 plug (straight-through)</h2><ol><li>Strip about 25 mm of the outer jacket. Do not nick the pairs.</li><li>Untwist the pairs only as far as needed (keep twists to within 13 mm of the plug) and straighten the wires.</li><li>Arrange the colours in T568B or T568A order from pin 1 to pin 8.</li><li>Flatten the wires and trim them straight, leaving about 12 mm of wire.</li><li>Hold the plug with the clip facing down and the contacts facing up; pin 1 is on the left. Push the wires in until every wire touches the end of the plug and the jacket reaches the strain-relief area.</li><li>Crimp firmly with a RJ45 crimping tool, then repeat on the other end with the same standard.</li><li>Test with a cable tester: all 8 lights should go 1→8 in order (straight cable). Replace the plug if one fails.</li></ol>' +
        '<p class="help">Tools: crimper, stripper, side cutter, cable tester. Keep a channel to 100 m (about 90 m fixed cable + patch cords). Avoid sharp bends (keep a radius of at least 4× the cable width) and run data cable away from power cables.</p></section>' +
        '<section class="card"><h2>Cable categories</h2><div class="table-wrap"><table class="table"><thead><tr><th>Category</th><th>Typical speed</th><th>Frequency</th><th>Max length</th><th>Note</th></tr></thead><tbody>' +
        CATS.map(function (c) { return '<tr>' + c.map(function (x, i) { return '<td>' + (i === 0 ? '<strong>' + esc(x) + '</strong>' : esc(x)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
        '<p class="help">UTP is unshielded; F/UTP, S/FTP etc. add shielding for noisy places and need properly grounded shielded plugs and jacks. Figures are typical values from the TIA/ISO standards; check the cable datasheet.</p></section>';
      const $ = function (id) { return root.querySelector('#' + id); };
      $('rj-modes').innerHTML = R.modes.map(function (m) { return '<button type="button" class="chip" data-m="' + m.id + '" aria-pressed="false">' + esc(m.short) + '</button>'; }).join('');
      const PL = function () { const b = $('rj-play'); b.innerHTML = playing ? 'Pause animation' : 'Play animation'; b.setAttribute('aria-pressed', String(playing)); $('rj-fig').classList.toggle('rj-paused', !playing); };
      function draw() {
        const v = mode.variants[vi];
        $('rj-modes').querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === mode.id)); });
        $('rj-var').innerHTML = mode.variants.map(function (x, i) { return '<option value="' + i + '"' + (i === vi ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('');
        $('rj-var').disabled = mode.variants.length < 2;
        $('rj-title').textContent = mode.title; $('rj-use').textContent = mode.use;
        $('rj-fig').innerHTML = R.svg(mode, v);
        const ws = R.wires(mode, v);
        if (mode.single) {
          $('rj-th').innerHTML = '<tr><th>Pin</th><th>Wire colour</th><th>Signal</th><th>Connected to pin</th></tr>';
          $('rj-tb').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { const a = v.arcs.filter(function (x) { return x[0] === i || x[1] === i; })[0]; const other = a ? (a[0] === i ? a[1] : a[0]) : null; return '<tr data-a="' + (a && a[0] === i ? i : (a ? a[0] : '')) + '"' + (a ? ' tabindex="0" role="button" aria-pressed="false"' : '') + '><td>' + i + '</td><td>' + swatch(R.STD.B[i - 1]) + '</td><td>' + esc(v.sigL[i] || 'unused') + '</td><td>' + (other ? other : '<span class="muted">none</span>') + '</td></tr>'; }).join('');
        } else {
          $('rj-th').innerHTML = '<tr><th>Pin (end A)</th><th>Wire colour</th><th>Signal at A</th><th>Direction</th><th>Signal at B</th><th>Pin (end B)</th></tr>';
          $('rj-tb').innerHTML = ws.map(function (w) {
            const dir = w.flow ? FLOW_LABEL[w.flow] : '', pw = w.pwr ? (dir ? dir + ' + DC power A → B' : 'DC power A → B') : dir;
            return '<tr data-a="' + w.a + '" tabindex="0" role="button" aria-pressed="false" class="' + (w.flow || w.pwr ? '' : 'rj-rowidle') + '"><td>' + w.a + '</td><td>' + swatch(w.code) + '</td><td>' + esc(w.sigA) + '</td><td>' + esc(pw || '—') + '</td><td>' + esc(w.sigB) + '</td><td>' + w.b + '</td></tr>';
          }).join('');
        }
        $('rj-tips').innerHTML = mode.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
        sel = null; PL();
      }
      function pick(a) {
        sel = sel === a ? null : a; const fig = $('rj-fig');
        fig.classList.toggle('rj-focus', sel !== null);
        fig.querySelectorAll('.rj-wire').forEach(function (w) { w.classList.toggle('rj-sel', sel !== null && Number(w.dataset.a) === sel); });
        $('rj-tb').querySelectorAll('tr').forEach(function (r) { const on = sel !== null && Number(r.dataset.a) === sel; r.classList.toggle('rj-rowsel', on); if (r.hasAttribute('role')) r.setAttribute('aria-pressed', String(on)); });
      }
      $('rj-modes').onclick = function (e) { const b = e.target.closest('[data-m]'); if (!b) return; mode = R.mode(b.dataset.m); vi = 0; draw(); };
      $('rj-var').onchange = function () { vi = Number(this.value); draw(); };
      $('rj-spd').onchange = function () { $('rj-fig').style.setProperty('--rj-dur', this.value); };
      $('rj-play').onclick = function () { playing = !playing; PL(); };
      $('rj-tb').onclick = function (e) { const r = e.target.closest('tr[data-a]'); if (r && r.dataset.a) pick(Number(r.dataset.a)); };
      $('rj-tb').onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { const r = e.target.closest('tr[data-a]'); if (r && r.dataset.a) { e.preventDefault(); pick(Number(r.dataset.a)); } } };
      /* T568A/B morphing bars */
      const bars = $('rj-bars'); bars.innerHTML = R.STD.B.map(function (code, i) {
        const c = R.COLORS[code]; return '<i class="rj-bar8" data-c="' + code + '" style="background:' + (c.stripe ? 'repeating-linear-gradient(180deg,' + c.base + ' 0 9px,' + c.stripe + ' 9px 18px)' : c.base) + '"><b>' + (i + 1) + '</b></i>';
      }).join('');
      function place() { bars.querySelectorAll('.rj-bar8').forEach(function (el) { const code = el.dataset.c, idx = R.STD[swapped ? 'A' : 'B'].indexOf(code); el.style.left = (idx * 12.5) + '%'; el.querySelector('b').textContent = idx + 1; }); $('rj-swap').textContent = swapped ? 'Switch to T568B' : 'Switch to T568A'; }
      $('rj-swap').onclick = function () { swapped = !swapped; place(); };
      place(); draw();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
