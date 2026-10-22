/* Minimal Cloudflare D1 look-alike on top of node:sqlite, used to test analytics/worker.js with real SQL. */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
export function makeDB() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(fs.readFileSync(path.join(dir, '..', 'analytics', 'schema.sql'), 'utf8'));
  const DB = {
    prepare(sql) {
      let binds = []; const st = raw.prepare(sql);
      const o = {
        bind(...b) { binds = b; return o; },
        async all() { return { results: st.all(...binds).map(r => ({ ...r })) }; },
        async first() { const r = st.get(...binds); return r ? { ...r } : null; },
        async run() { const r = st.run(...binds); return { meta: { changes: Number(r.changes) } }; }
      };
      return o;
    }
  };
  return { DB, raw };
}
/** Build a Request like Cloudflare delivers it (cf object + CF-Connecting-IP). */
export function req(url, { method = 'GET', headers = {}, body, ip = '203.0.113.7', country = 'BD', city = 'Dhaka', origin = 'https://me.github.io' } = {}) {
  const h = new Headers(headers);
  if (ip) h.set('CF-Connecting-IP', ip);
  if (origin) h.set('Origin', origin);
  if (!h.has('User-Agent')) h.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36');
  const r = new Request(url, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
  Object.defineProperty(r, 'cf', { value: { country, city, region: 'Dhaka Division' } });
  return r;
}
