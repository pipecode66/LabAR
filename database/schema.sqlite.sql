-- Esquema de desarrollo local; no se utiliza como persistencia en Vercel.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, profile_json TEXT NOT NULL,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
  status TEXT NOT NULL, updated_at TEXT NOT NULL, data_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS attempts_owner ON attempts(owner, updated_at DESC);
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
  created_at TEXT NOT NULL, data_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS issues_owner ON issues(owner, created_at DESC);
