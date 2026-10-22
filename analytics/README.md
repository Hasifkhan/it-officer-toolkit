# Optional visitor analytics + admin dashboard

The toolkit is a static site, and static hosting (GitHub Pages) **cannot see visitors' IP address or country**. To get the admin dashboard
(daily visitors, country, IP address, most-used tools, visitor log, CSV export, blocklist, announcements, data deletion) you deploy this
small **Cloudflare Worker + D1 database** (free tier is plenty for a small team). Skip this folder and the site works exactly as before.

## What is collected
Random visitor ID (stored in the visitor's browser), event type (visit / tool opened), tool id, IP address, country/city (from Cloudflare), browser/OS/device (parsed from the User-Agent), language.
**Never** anything typed into the tools (inventory, reports, passwords, IPs entered…).

## Deploy (about 10 minutes)
```bash
npm i -g wrangler && wrangler login
cd analytics
wrangler d1 create itk-analytics            # copy the database_id into wrangler.toml
wrangler d1 execute itk-analytics --remote --file=schema.sql
# edit wrangler.toml: ALLOWED_ORIGINS = "https://YOUR-USERNAME.github.io"  (origin only, no path)
wrangler secret put ADMIN_TOKEN             # long random value, 12+ chars. This is your admin password
wrangler secret put IP_SALT                 # only needed if IP_MODE = "hash"
wrangler deploy                             # prints https://itk-analytics.<you>.workers.dev
```
Then set `analyticsEndpoint` in `assets/js/config.js` to that URL, commit, and open `https://YOUR-USERNAME.github.io/it-officer-toolkit/#/admin`.

## Settings (wrangler.toml `[vars]`)
| Variable | Meaning |
|---|---|
| `ALLOWED_ORIGINS` | Comma-separated site origins allowed to send events and open admin. Anything else gets 403. |
| `IP_MODE` | `full` (store IP), `masked` (last IPv4 octet / IPv6 /48 zeroed), `hash` (salted hash, not readable), `none`. |
| `RETENTION_DAYS` | Events older than this are deleted automatically (default 90). |
| `consentMode` (config.js) | `notice` (count + notice with opt-out) or `optin` (count only after Accept). |

## Privacy and legal
IP addresses are **personal data** in many places (GDPR and others). You are responsible for telling visitors (the site shows a notice and
the Data & privacy page updates itself), keeping retention short, and deleting data on request (Admin → Visitors → Delete data). Do Not Track and Global Privacy Control are honoured.
For stricter compliance use `IP_MODE="masked"` and `consentMode: 'optin'`. This is not legal advice.

## Security notes
Admin access is one shared secret sent as a Bearer token over HTTPS, kept only in the browser tab's sessionStorage, compared in constant time, with failed-attempt throttling (10 per 15 min per IP).
It is a simple scheme suited to a small internal tool; use Cloudflare Access in front of the Worker if you need per-user logins. Rotate with `wrangler secret put ADMIN_TOKEN`.
The "Notice" mode records the first page load before the visitor can click Opt out; use `optin` if that is not acceptable.

## Tests
`node --no-warnings tests/worker.test.mjs` (Worker logic on real SQLite) and `tests/e2e-admin.mjs` (browser + Worker). They use a SQLite shim of D1 and a test header for country;
**a real Cloudflare deployment and real geo-IP lookups have not been tested.**
