import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPostgresStore, postgresPoolConfig } from '../backend/postgres-store.mjs';

const testUrl = 'postgresql://labar_test:private-sentinel@example.invalid:6543/postgres?sslmode=require';

function controlledPool({ failSchemaOnce = false } = {}) {
  const calls = [];
  let schemaFailed = false;
  let clients = 0;
  const pool = {
    ended: false,
    calls,
    on() {},
    async query(text, values = []) { calls.push({ connection: 'pool', text, values }); return { rows: [] }; },
    async connect() {
      const connection = `client-${++clients}`;
      return {
        async query(text, values = []) {
          calls.push({ connection, text, values });
          if (failSchemaOnce && !schemaFailed && text.includes('CREATE TABLE')) { schemaFailed = true; throw new Error('fallo transitorio de prueba'); }
          return { rows: [] };
        },
        release() { calls.push({ connection, text: 'RELEASE', values: [] }); },
      };
    },
    async end() { pool.ended = true; },
  };
  return pool;
}

test('PostgreSQL: pool pequeño, TLS con certificado validado y sin opciones inseguras de URI', () => {
  const config = postgresPoolConfig(testUrl + '&ssl=false&sslrootcert=ignored&uselibpqcompat=true');
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.max, 3);
  assert.equal(config.allowExitOnIdle, true);
  assert.equal(config.connectionTimeoutMillis, 10000);
  const query = new URL(config.connectionString).searchParams;
  for (const name of ['sslmode','ssl','sslrootcert','uselibpqcompat']) assert.equal(query.has(name), false);
  const ca = '-----BEGIN CERTIFICATE-----\ncertificado de prueba\n-----END CERTIFICATE-----';
  assert.deepEqual(postgresPoolConfig(testUrl, { sslCa: ca, maxConnections: 2 }).ssl, { rejectUnauthorized: true, ca });
});

test('PostgreSQL: rechaza URLs y tamaños de pool inválidos sin revelar contraseñas', () => {
  for (const value of ['archivo.sqlite', 'https://user:private-sentinel@example.invalid/db', 'postgresql://example.invalid/db', 'postgresql://user@example.invalid/']) {
    assert.throws(() => postgresPoolConfig(value), error => !error.message.includes('private-sentinel') && /POSTGRES_URL/.test(error.message));
  }
  for (const maxConnections of [0, 11, 1.5, '3']) assert.throws(() => postgresPoolConfig(testUrl, { maxConnections }), /pool/);
});

test('PostgreSQL: esquema incluye relaciones, índice único de ejecución abierta y RLS', async () => {
  const schema = await readFile(new URL('../database/schema.postgres.sql', import.meta.url), 'utf8');
  for (const table of ['labar_sessions','labar_attempts','labar_issues']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
    assert.match(schema, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  }
  assert.match(schema, /ON DELETE CASCADE/);
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS labar_attempts_one_open_per_owner/);
  assert.match(schema, /WHERE status <> 'completed'/);
  assert.match(schema, /REVOKE ALL[\s\S]*FROM anon/);
  assert.match(schema, /REVOKE ALL[\s\S]*FROM authenticated/);
});

test('PostgreSQL: inicialización concurrente comparte promesa, DDL transaccional y bloqueo de migración', async () => {
  const pool = controlledPool();
  const store = createPostgresStore(testUrl, { pool });
  try {
    await Promise.all([store.ready, store.ready, store.ready]);
    const sql = pool.calls.map(call => call.text);
    assert.equal(sql.filter(text => text === 'BEGIN').length, 1);
    assert.equal(sql.filter(text => text.includes('pg_advisory_xact_lock')).length, 1);
    assert.equal(sql.filter(text => text.includes('CREATE TABLE')).length, 1);
    assert.equal(sql.filter(text => text === 'COMMIT').length, 1);
    assert.equal(sql.at(-1), 'RELEASE');
  } finally { await store.close(); }
});

test('PostgreSQL: una inicialización fallida revierte y permite reintentar', async () => {
  const pool = controlledPool({ failSchemaOnce: true });
  const store = createPostgresStore(testUrl, { pool });
  try {
    await assert.rejects(store.ready, /transitorio/);
    assert.equal(pool.calls.filter(call => call.text === 'ROLLBACK').length, 1);
    await store.ready;
    assert.equal(pool.calls.filter(call => call.text === 'COMMIT').length, 1);
    assert.equal(pool.calls.filter(call => call.text === 'RELEASE').length, 2);
  } finally { await store.close(); }
});

test('PostgreSQL: consultas parametrizadas y transacción por sesión usan una misma conexión', async () => {
  const pool = controlledPool();
  const store = createPostgresStore(testUrl, { pool });
  try {
    await store.ready;
    pool.calls.length = 0;
    const hash = 'a'.repeat(64);
    const unsafe = "nombre'); DROP TABLE labar_sessions; --";
    const result = await store.transaction(hash, async () => {
      await store.updateProfile(hash, { displayName: unsafe });
      await store.deleteProgress(hash);
      return 'ok';
    });
    assert.equal(result, 'ok');
    assert.equal(pool.calls[0].text, 'BEGIN');
    assert.match(pool.calls[1].text, /FOR UPDATE/);
    assert.deepEqual(pool.calls[1].values, [hash]);
    assert.equal(new Set(pool.calls.map(call => call.connection)).size, 1);
    assert.equal(pool.calls.some(call => call.text.includes(unsafe)), false);
    assert.ok(pool.calls.some(call => call.values.some(value => typeof value === 'string' && value.includes(unsafe))));
    assert.deepEqual(pool.calls.slice(-2).map(call => call.text), ['COMMIT','RELEASE']);
  } finally { await store.close(); }
});

test('PostgreSQL: error de una mutación hace rollback y libera el cliente', async () => {
  const pool = controlledPool();
  const store = createPostgresStore(testUrl, { pool });
  try {
    await store.ready;
    pool.calls.length = 0;
    await assert.rejects(store.transaction('b'.repeat(64), async () => { throw new Error('rechazo esperado'); }), /rechazo esperado/);
    assert.deepEqual(pool.calls.slice(-2).map(call => call.text), ['ROLLBACK','RELEASE']);
    assert.equal(pool.calls.some(call => call.text === 'COMMIT'), false);
  } finally { await store.close(); }
});

test('PostgreSQL: cerrar dos veces termina una sola vez el pool', async () => {
  const pool = controlledPool();
  let count = 0;
  pool.end = async () => { count++; };
  const store = createPostgresStore(testUrl, { pool });
  await store.close();
  await store.close();
  assert.equal(count, 1);
});
