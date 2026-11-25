import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function createStore(databasePath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`
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
  `);
  return {
    db,
    cleanup(now) { db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now); },
    session(hash) { return db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(hash); },
    addSession(hash, profile, now, expires) {
      db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').run(hash, JSON.stringify(profile), now, expires);
    },
    updateProfile(hash, profile) { db.prepare('UPDATE sessions SET profile_json = ? WHERE token_hash = ?').run(JSON.stringify(profile), hash); },
    attempts(hash) { return db.prepare('SELECT data_json FROM attempts WHERE owner = ? ORDER BY updated_at DESC, rowid DESC').all(hash).map(row => JSON.parse(row.data_json)); },
    attempt(hash, id) { const row = db.prepare('SELECT data_json FROM attempts WHERE id = ? AND owner = ?').get(id, hash); return row ? JSON.parse(row.data_json) : null; },
    saveAttempt(hash, attempt) {
      db.prepare(`INSERT INTO attempts(id, owner, status, updated_at, data_json) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at, data_json=excluded.data_json WHERE attempts.owner=excluded.owner`)
        .run(attempt.id, hash, attempt.status, attempt.updatedAt, JSON.stringify(attempt));
      return attempt;
    },
    issues(hash) { return db.prepare('SELECT data_json FROM issues WHERE owner = ? ORDER BY created_at DESC, rowid DESC').all(hash).map(row => JSON.parse(row.data_json)); },
    addIssue(hash, issue) { db.prepare('INSERT INTO issues VALUES (?, ?, ?, ?)').run(issue.id, hash, issue.createdAt, JSON.stringify(issue)); return issue; },
    deleteProgress(hash) {
      db.exec('BEGIN');
      try {
        db.prepare('DELETE FROM issues WHERE owner = ?').run(hash);
        db.prepare('DELETE FROM attempts WHERE owner = ?').run(hash);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    deleteSession(hash) { db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash); },
    close() { db.close(); },
  };
}
