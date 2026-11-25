/** PostgreSQL real local, TLS y bases temporales: no conecta al proyecto Supabase. */
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { createApp } from '../backend/app.mjs';
import { createPostgresStore, postgresPoolConfig } from '../backend/postgres-store.mjs';
import { findPostgresTools, startTemporaryPostgres } from './helpers/postgres-temporal.mjs';

const available = findPostgresTools();
const checks = ['equipment','ports','scale','source','supervision'];

describe('PostgreSQL real aislado con TLS', { skip: available ? false : 'Faltan binarios PostgreSQL/OpenSSL; no se probó una conexión real.' }, () => {
  let cluster;
  let admin;
  before(async () => {
    cluster = await startTemporaryPostgres();
    admin = new pg.Pool(postgresPoolConfig(cluster.url, { sslCa: cluster.sslCa }));
    await admin.query('CREATE ROLE anon; CREATE ROLE authenticated;');
  });
  beforeEach(async () => {
    await admin.query('DROP TABLE IF EXISTS public.labar_issues, public.labar_attempts, public.labar_sessions CASCADE');
  });
  after(async () => {
    await admin?.end();
    await cluster?.stop();
  });

  async function fixture() {
    const app = createApp({ databaseUrl: cluster.url, postgresOptions: { sslCa: cluster.sslCa } });
    await app.ready;
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${app.server.address().port}`;
    function client(sharedCookie = '') {
      let cookie = sharedCookie;
      return {
        get cookie() { return cookie; },
        async request(path, { method = 'GET', body, headers = {} } = {}) {
          const mutation = ['POST','PUT','DELETE'].includes(method);
          const response = await fetch(origin + path, {
            method,
            headers: { ...(cookie ? { Cookie: cookie } : {}),
              ...(mutation ? { Origin: origin, 'X-LabAR-Client':'web', 'Content-Type':'application/json' } : {}), ...headers },
            ...(mutation ? { body: JSON.stringify(body || {}) } : {}),
          });
          const nextCookie = response.headers.get('set-cookie');
          if (nextCookie) cookie = nextCookie.split(';')[0];
          return { status: response.status, data: await response.json(), headers: response.headers };
        },
      };
    }
    return { app, client, origin, close: app.close };
  }
  async function ready(c) {
    await c.request('/api/bootstrap');
    const created = await c.request('/api/attempts', { method:'POST', body:{mode:'2d'} });
    const base = `/api/attempts/${created.data.id}`;
    await c.request(base+'/confirm', {method:'POST',body:{matches:true,model:'DT-830B'}});
    await c.request(base+'/checklist', {method:'POST',body:{checks}});
    return { base, attempt: created.data };
  }

  test('conexión usa TLS validado y crea esquema con RLS y permisos restringidos', async () => {
    const store = createPostgresStore(cluster.url, { sslCa: cluster.sslCa });
    try {
      await store.ready;
      const tls = await admin.query('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()');
      assert.equal(tls.rows[0].ssl, true);
      const tables = await admin.query("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('labar_sessions','labar_attempts','labar_issues')");
      assert.equal(tables.rows.length, 3);
      assert.ok(tables.rows.every(table => table.relrowsecurity));
      const privileges = await admin.query("SELECT has_table_privilege('anon','public.labar_sessions','SELECT') AS anon_read, has_table_privilege('authenticated','public.labar_attempts','INSERT') AS auth_write");
      assert.equal(privileges.rows[0].anon_read, false);
      assert.equal(privileges.rows[0].auth_write, false);
    } finally { await store.close(); }
  });

  test('transacción real revierte cambios y conserva perfiles al reabrir el store', async () => {
    let store = createPostgresStore(cluster.url, { sslCa: cluster.sslCa });
    const hash = 'a'.repeat(64);
    try {
      await store.addSession(hash, { displayName:'Inicial' }, new Date().toISOString(), '2099-01-01T00:00:00.000Z');
      await assert.rejects(store.transaction(hash, async () => {
        await store.updateProfile(hash, { displayName:'No debe persistir' });
        throw new Error('rollback real');
      }), /rollback real/);
      assert.equal(JSON.parse((await store.session(hash)).profile_json).displayName, 'Inicial');
      await store.transaction(hash, () => store.updateProfile(hash, { displayName:'Persistente' }));
      await store.close();
      store = createPostgresStore(cluster.url, { sslCa: cluster.sslCa });
      assert.equal(JSON.parse((await store.session(hash)).profile_json).displayName, 'Persistente');
    } finally { await store.close(); }
  });

  test('API completa guarda perfil, guía, evaluación, reporte y exportación en PostgreSQL', async () => {
    const f = await fixture();
    try {
      const c = f.client();
      const health = await c.request('/api/health');
      assert.equal(health.status, 200);
      assert.equal(health.data.storage, 'postgres');
      assert.equal(health.data.database, 'connected');
      await c.request('/api/profile', {method:'PUT',body:{displayName:'PostgreSQL real',highContrast:true}});
      const {base} = await ready(c);
      for(let step=0;step<5;step++) assert.equal((await c.request(base+'/progress',{method:'POST',body:{step,complete:true}})).status,200);
      const result = await c.request(base+'/quiz',{method:'POST',body:{answers:{q1:'a',q2:'b',q3:'b'}}});
      assert.equal(result.data.score,2);
      assert.deepEqual(result.data.result.reviewTopics,['Escala DCV']);
      assert.equal((await c.request('/api/issues',{method:'POST',body:{message:'Reporte de prueba sobre PostgreSQL real.'}})).status,201);
      const exported = (await c.request('/api/export')).data;
      assert.equal(exported.profile.displayName,'PostgreSQL real');
      assert.equal(exported.attempts.length,1);
      assert.equal(exported.issues.length,1);
      assert.equal(JSON.stringify(exported).includes(c.cookie.split('=')[1]),false);
      const stored = await admin.query('SELECT profile_json FROM public.labar_sessions');
      assert.equal(stored.rows[0].profile_json.highContrast,true);
    } finally { await f.close(); }
  });

  test('dos instancias API comparten cookie, perfil y un único intento abierto', async () => {
    const first = await fixture();
    const second = await fixture();
    try {
      const one = first.client();
      await one.request('/api/bootstrap');
      const two = second.client(one.cookie);
      const responses = await Promise.all([
        one.request('/api/attempts',{method:'POST',body:{mode:'2d'}}),
        two.request('/api/attempts',{method:'POST',body:{mode:'ar'}}),
      ]);
      assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);
      assert.equal(responses[0].data.id,responses[1].data.id);
      await Promise.all([
        one.request('/api/profile',{method:'PUT',body:{displayName:'Cambios compartidos'}}),
        two.request('/api/profile',{method:'PUT',body:{largeText:true}}),
      ]);
      const profile = (await one.request('/api/bootstrap')).data.profile;
      assert.equal(profile.displayName,'Cambios compartidos');
      assert.equal(profile.largeText,true);
    } finally { await first.close(); await second.close(); }
  });

  test('dos evaluaciones concurrentes entre instancias guardan un solo resultado inmutable', async () => {
    const first = await fixture();
    const second = await fixture();
    try {
      const one = first.client(); const {base} = await ready(one);
      const two = second.client(one.cookie);
      for(let step=0;step<5;step++) await one.request(base+'/progress',{method:'POST',body:{step,complete:true}});
      const responses = await Promise.all([
        one.request(base+'/quiz',{method:'POST',body:{answers:{q1:'a',q2:'a',q3:'a'}}}),
        two.request(base+'/quiz',{method:'POST',body:{answers:{q1:'b',q2:'b',q3:'b'}}}),
      ]);
      assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
      const winner = responses.find(r=>r.status===200).data;
      const history = (await two.request('/api/bootstrap')).data.history;
      assert.equal(history.length,1);
      assert.equal(history[0].score,winner.score);
    } finally { await first.close(); await second.close(); }
  });

  test('aislamiento, borrado parcial y cascada completa no afectan otra sesión', async () => {
    const f = await fixture();
    try {
      const one=f.client(),two=f.client();
      const first=await ready(one),second=await ready(two);
      assert.equal((await two.request(first.base+'/confirm',{method:'POST',body:{matches:true,model:'DT-830B'}})).status,404);
      await one.request('/api/profile',{method:'PUT',body:{displayName:'Conservar perfil'}});
      await one.request('/api/issues',{method:'POST',body:{message:'Reporte antes del borrado parcial.'}});
      assert.equal((await one.request('/api/progress',{method:'DELETE'})).status,200);
      let boot=(await one.request('/api/bootstrap')).data;
      assert.equal(boot.profile.displayName,'Conservar perfil');
      assert.equal(boot.attempt,null);assert.deepEqual(boot.issues,[]);
      await one.request('/api/data',{method:'DELETE'});
      boot=(await two.request('/api/bootstrap')).data;
      assert.equal(boot.attempt.id,second.attempt.id);
      const remaining=await admin.query('SELECT COUNT(*)::integer AS count FROM public.labar_sessions');
      assert.equal(remaining.rows[0].count,1);
    } finally {await f.close();}
  });

  test('índice PostgreSQL impide dos intentos abiertos aunque un cliente omita la API', async () => {
    const store=createPostgresStore(cluster.url,{sslCa:cluster.sslCa});
    const hash='b'.repeat(64);const now=new Date().toISOString();
    try {
      await store.addSession(hash,{displayName:'Índice'},now,'2099-01-01T00:00:00.000Z');
      const first={id:randomUUID(),status:'preparing',updatedAt:now};
      await store.saveAttempt(hash,first);
      await assert.rejects(store.saveAttempt(hash,{...first,id:randomUUID()}),error=>error.code==='23505');
      assert.equal((await store.attempts(hash)).length,1);
    }finally{await store.close();}
  });
});
