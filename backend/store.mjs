import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function createStore(databasePath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(readFileSync(new URL('../database/schema.sqlite.sql', import.meta.url), 'utf8'));
  let mutationTail = Promise.resolve();
  return {
    kind: 'sqlite',
    db,
    health() { db.prepare('SELECT 1').get(); },
    async transaction(_owner, action) {
      // Async API handlers must not interleave read/modify/write sections even
      // though the local SQLite statements themselves remain synchronous.
      let unlock;
      const previous = mutationTail;
      mutationTail = new Promise(resolve => { unlock = resolve; });
      await previous;
      let began = false;
      try { db.exec('BEGIN IMMEDIATE'); began = true; const result = await action(); db.exec('COMMIT'); return result; }
      catch (error) { if (began) db.exec('ROLLBACK'); throw error; }
      finally { unlock(); }
    },
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
      db.prepare('DELETE FROM issues WHERE owner = ?').run(hash);
      db.prepare('DELETE FROM attempts WHERE owner = ?').run(hash);
    },
    deleteSession(hash) { db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash); },
    close() { db.close(); },
  };
}
