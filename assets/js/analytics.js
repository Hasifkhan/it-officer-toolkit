/* analytics.js — optional, privacy-conscious visit counter. Does nothing unless ITK.config.analyticsEndpoint is set.
   Sends only: a random visitor id, event type (visit / tool id), and whether the id existed before. The server derives IP, country, browser from the request.
   Honours Do Not Track / Global Privacy Control, and the visitor can opt out at any time. */
(function (g) {
  'use strict';
  const ITK = g.ITK, S = ITK.storage, U = ITK.util, cfg = ITK.config || {};
  const endpoint = String(cfg.analyticsEndpoint || '').replace(/\/+$/, '');
  const nav = g.navigator || {};
  const dnt = nav.doNotTrack === '1' || g.doNotTrack === '1' || nav.globalPrivacyControl === true;
  const A = { endpoint: endpoint, configured: !!endpoint, dnt: dnt };
  ITK.analytics = A;
  let memVid = null, sent = {};

  const state = () => S.get('analytics-consent', null);           // 'out' | 'in' | 'seen' | null
  A.state = state;
  A.active = function () {
    if (!A.configured || dnt) return false;
    const s = state();
    if (s === 'out') return false;
    return cfg.consentMode === 'optin' ? s === 'in' : true;
  };
  A.setOptOut = function (out) { S.set('analytics-consent', out ? 'out' : 'in'); if (out) { S.remove('vid'); memVid = null; } removeBanner(); };
  function vid() {
    let v = S.get('vid', null), returning = true;
    if (typeof v !== 'string' || !/^[a-z0-9]{8,40}$/i.test(v)) {
      returning = false; v = memVid;
      if (!v) { const a = new Uint8Array(12); try { g.crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); } v = Array.prototype.map.call(a, b => (b % 36).toString(36)).join(''); memVid = v; }
      S.set('vid', v);
    }
    return { id: v, returning: returning };
  }
  function send(kind, tool) {
    if (!A.active()) return;
    const k = kind + ':' + (tool || ''); if (sent[k]) return; sent[k] = 1;       // each event once per page load
    const v = vid(), body = { vid: v.id, kind: kind, returning: v.returning, lang: String(nav.language || '').slice(0, 16) };
    if (tool) body.tool = tool;
    try { g.fetch(endpoint + '/api/collect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true, credentials: 'omit', mode: 'cors' }).catch(function () {}); } catch (e) { /* analytics must never break the app */ }
  }
  A.visit = function () { send('visit'); };
  A.tool = function (id) { if (id && id !== 'admin-dashboard') send('tool', id); };
  A.announcement = function () {
    if (!A.configured) return Promise.resolve('');
    return g.fetch(endpoint + '/api/announcement', { credentials: 'omit' }).then(r => r.ok ? r.json() : { text: '' }).then(j => String(j.text || '')).catch(() => '');
  };

  function removeBanner() { const b = document.getElementById('itk-consent'); if (b) b.remove(); }
  A.showNotice = function () {
    if (!A.configured || dnt || document.getElementById('itk-consent')) return;
    const s = state(), optin = cfg.consentMode === 'optin';
    if (s === 'out' || s === 'seen' || (optin && s === 'in') || (!optin && s === 'in')) return;
    const b = document.createElement('div'); b.id = 'itk-consent'; b.className = 'consent no-print'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Visit counting notice');
    b.innerHTML = '<p>' + (optin ? 'May this site count your visit?' : 'This site counts visits.') + ' It records a random visitor ID, the pages/tools you open, your IP address, approximate country, browser and device type — never anything you type. Kept for a limited time. <a href="#/privacy">Details</a></p><div class="btn-row">' +
      (optin ? '<button class="btn btn-primary btn-sm" data-c="in">Accept</button><button class="btn btn-sm" data-c="out">No thanks</button>' : '<button class="btn btn-primary btn-sm" data-c="seen">OK</button><button class="btn btn-sm" data-c="out">Opt out</button>') + '</div>';
    b.onclick = function (e) {
      const c = e.target.closest('[data-c]'); if (!c) return; const v = c.dataset.c;
      if (v === 'out') A.setOptOut(true); else { S.set('analytics-consent', v); removeBanner(); if (v === 'in') A.visit(); }
    };
    document.body.appendChild(b);
  };
})(typeof window !== 'undefined' ? window : globalThis);
