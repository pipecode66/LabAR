import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;
const SCHEMA = new URL('../database/schema.postgres.sql', import.meta.url);
const MIGRATION_LOCK = 716524861;

/** La URL solo se utiliza en el servidor; nunca se serializa en una respuesta. */
export function postgresPoolConfig(connectionString, { sslCa, maxConnections = 3 } = {}) {
  let parsed;
  try { parsed = new URL(connectionString); }
  catch { throw new Error('POSTGRES_URL debe contener una conexión PostgreSQL válida.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.username || parsed.pathname === '/') {
    throw new Error('POSTGRES_URL debe contener una conexión PostgreSQL válida.');
  }
  if (!Number.isInteger(maxConnections) || maxConnections < 1 || maxConnections > 10) {
    throw new Error('El tamaño del pool debe estar entre 1 y 10.');
  }
  // pg-connection-string puede sobrescribir ssl al leer estos parámetros.
  // La política es TLS con validación de certificado, también con sslmode=require.
  for (const name of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl', 'uselibpqcompat']) parsed.searchParams.delete(name);
  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) },
    max: maxConnections, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000,
    allowExitOnIdle: true, application_name: 'labar-seguro',
  };
}

function json(value) { return typeof value === 'string' ? JSON.parse(value) : structuredClone(value); }
function iso(value) { return value instanceof Date ? value.toISOString() : String(value); }

export function createPostgresStore(connectionString, { pool: providedPool, sslCa, maxConnections = 3 } = {}) {
  const config = postgresPoolConfig(connectionString, { sslCa, maxConnections });
  const pool = providedPool || new Pool(config);
  // Los errores de clientes inactivos deben estar atendidos, sin escribir
  // mensajes de terceros que pudieran contener datos de conexión.
  pool.on?.('error', () => {});
  const context = new AsyncLocalStorage();
  let readyPromise;
  let closed = false;

  async function initialize() {
    const schema = await readFile(SCHEMA, 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK]);
      await client.query(schema);
      await client.query('COMMIT');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally { client.release(); }
  }
  function ready() {
    if (!readyPromise) readyPromise = initialize().catch(error => { readyPromise = null; throw error; });
    return readyPromise;
  }
  async function query(text, parameters = []) {
    await ready();
    return (context.getStore() || pool).query(text, parameters);
  }

  const store = {
    kind: 'postgres',
    get ready() { return ready(); },
    async health() { await query('SELECT 1 AS healthy'); },
    async cleanup(now) { await query('DELETE FROM public.labar_sessions WHERE expires_at < $1', [now]); },
    async session(hash) {
      const { rows } = await query('SELECT token_hash, profile_json, created_at, expires_at FROM public.labar_sessions WHERE token_hash = $1', [hash]);
      const row = rows[0];
      return row ? { ...row, profile_json: JSON.stringify(json(row.profile_json)), created_at: iso(row.created_at), expires_at: iso(row.expires_at) } : undefined;
    },
    async addSession(hash, profile, now, expires) {
      await query('INSERT INTO public.labar_sessions(token_hash, profile_json, created_at, expires_at) VALUES ($1, $2::jsonb, $3, $4)', [hash, JSON.stringify(profile), now, expires]);
    },
    async updateProfile(hash, profile) { await query('UPDATE public.labar_sessions SET profile_json = $2::jsonb WHERE token_hash = $1', [hash, JSON.stringify(profile)]); },
    async attempts(hash) {
      const { rows } = await query('SELECT data_json FROM public.labar_attempts WHERE owner = $1 ORDER BY updated_at DESC, id DESC', [hash]);
      return rows.map(row => json(row.data_json));
    },
    async attempt(hash, id) {
      const { rows } = await query('SELECT data_json FROM public.labar_attempts WHERE id = $1 AND owner = $2', [id, hash]);
      return rows[0] ? json(rows[0].data_json) : undefined;
    },
    async saveAttempt(hash, attempt) {
      await query(`INSERT INTO public.labar_attempts(id, owner, status, updated_at, data_json) VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT(id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at, data_json = EXCLUDED.data_json
        WHERE labar_attempts.owner = EXCLUDED.owner`, [attempt.id, hash, attempt.status, attempt.updatedAt, JSON.stringify(attempt)]);
      return attempt;
    },
    async issues(hash) {
      const { rows } = await query('SELECT data_json FROM public.labar_issues WHERE owner = $1 ORDER BY created_at DESC, id DESC', [hash]);
      return rows.map(row => json(row.data_json));
    },
    async addIssue(hash, issue) {
      await query('INSERT INTO public.labar_issues(id, owner, created_at, data_json) VALUES ($1, $2, $3, $4::jsonb)', [issue.id, hash, issue.createdAt, JSON.stringify(issue)]);
      return issue;
    },
    async deleteProgress(hash) {
      // Route mutations already hold the session transaction. For direct store
      // callers, wrap the two DELETE statements in the same atomic transaction.
      if (!context.getStore()) return store.transaction(hash, () => store.deleteProgress(hash));
      await query('DELETE FROM public.labar_issues WHERE owner = $1', [hash]);
      await query('DELETE FROM public.labar_attempts WHERE owner = $1', [hash]);
    },
    async deleteSession(hash) { await query('DELETE FROM public.labar_sessions WHERE token_hash = $1', [hash]); },
    async transaction(ownerHash, action) {
      await ready();
      if (context.getStore()) return action();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT token_hash FROM public.labar_sessions WHERE token_hash = $1 FOR UPDATE', [ownerHash]);
        const result = await context.run(client, action);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch {}
        throw error;
      } finally { client.release(); }
    },
    async close() { if (closed) return; closed = true; await pool.end(); },
  };
  return store;
}
