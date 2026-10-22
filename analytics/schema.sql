-- D1 (SQLite) schema for IT Officer Toolkit visitor analytics
CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        INTEGER NOT NULL,               -- epoch milliseconds (UTC)
  vid       TEXT    NOT NULL,               -- anonymous visitor id (random, from a cookie)
  kind      TEXT    NOT NULL,               -- 'visit' | 'tool'
  tool      TEXT,                           -- tool id for kind = 'tool'
  is_returning INTEGER NOT NULL DEFAULT 0,  -- 1 if the browser had visited before
  ip        TEXT,                           -- stored according to IP_MODE (full | masked | hash | none)
  country   TEXT,                           -- ISO 3166-1 alpha-2, from Cloudflare
  region    TEXT,
  city      TEXT,
  browser   TEXT,
  os        TEXT,
  device    TEXT,
  lang      TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ts      ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_ip      ON events(ip);
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
CREATE TABLE IF NOT EXISTS blocked   (ip TEXT PRIMARY KEY, note TEXT, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings  (k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS auth_fail (ip TEXT NOT NULL, ts INTEGER NOT NULL);
