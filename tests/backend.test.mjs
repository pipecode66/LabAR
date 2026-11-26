import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { request as httpRequest } from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApp } from '../backend/app.mjs';

const checks = ['equipment', 'ports', 'scale', 'source', 'supervision'];

async function fixture(databasePath = ':memory:', options = {}) {
  const app = createApp({ databasePath, ...options });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  function client() {
    let cookie = '';
    return {
      get cookie() { return cookie; },
      async request(path, { method = 'GET', body, headers = {}, raw } = {}) {
        const mutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
        const response = await fetch(origin + path, {
          method, headers: { ...(cookie ? { Cookie: cookie } : {}),
            ...(mutation ? { 'X-LabAR-Client': 'web', Origin: origin, 'Content-Type': 'application/json' } : {}), ...headers },
          ...(mutation ? { body: raw ?? JSON.stringify(body ?? {}) } : {}),
        });
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) cookie = setCookie.split(';')[0];
        const contentType = response.headers.get('content-type') || '';
        return { status: response.status, headers: response.headers,
          data: contentType.includes('application/json') ? await response.json() : await response.text() };
      },
    };
  }
  return { app, origin, client, close: app.close };
}

async function started(client, mode = '2d') {
  await client.request('/api/bootstrap');
  const created = await client.request('/api/attempts', { method: 'POST', body: { mode } });
  assert.equal(created.status, 201);
  return created.data;
}
async function ready(client, mode = '2d') {
  const attempt = await started(client, mode);
  const base = `/api/attempts/${attempt.id}`;
  assert.equal((await client.request(base + '/confirm', { method: 'POST', body: { matches: true, model: 'DT-830B' } })).status, 200);
  assert.equal((await client.request(base + '/checklist', { method: 'POST', body: { checks } })).data.status, 'active');
  return { attempt, base };
}
async function finishGuide(client, base) {
  for (let step = 0; step < 5; step++) {
    const result = await client.request(base + '/progress', { method: 'POST', body: { step, complete: true } });
    assert.equal(result.status, 200);
    assert.equal(result.data.completedSteps, step + 1);
  }
}

function observeRequests(f, path, count) {
  return new Promise(resolveObserved => {
    let observed = 0;
    const listener = req => {
      if (req.url === path && ++observed === count) {
        f.app.server.off('request', listener);
        resolveObserved();
      }
    };
    f.app.server.on('request', listener);
  });
}

function slowMutation(f, cookie, path, method, body) {
  const json = JSON.stringify(body);
  let request;
  const result = new Promise((resolveResult, reject) => {
    request = httpRequest(f.origin + path, { method, headers: {
      Cookie: cookie, Origin: f.origin, 'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json), 'X-LabAR-Client': 'web',
    } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolveResult({ status: response.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.write(json.slice(0, 1));
  });
  return { finish: () => request.end(json.slice(1)), result };
}

test('salud, bootstrap y contenido público no exponen claves de respuestas', async () => {
  const f = await fixture();
  try {
    const client = f.client();
    const health = await client.request('/api/health');
    assert.deepEqual(health.data, { status: 'ok', version: '1.0.0', storage: 'sqlite' });
    const boot = await client.request('/api/bootstrap');
    assert.equal(boot.status, 200);
    assert.equal(boot.data.profile.displayName, 'Estudiante');
    assert.equal(boot.data.practice.steps.length, 5);
    assert.equal(boot.data.practice.checklist.length, 5);
    assert.equal(boot.data.practice.quiz.length, 3);
    assert.equal(boot.data.attempt, null);
    assert.equal(boot.data.recommendation.detail, 'detailed');
    assert.ok(!JSON.stringify(boot.data.practice.quiz).includes('answer'));
    assert.match(boot.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    assert.match(boot.headers.get('cache-control'), /no-store/);
    assert.match(boot.headers.get('content-security-policy'), /script-src 'self'/);
  } finally { await f.close(); }
});

test('perfil: se actualiza parcialmente y rechaza tipos/campos inválidos', async () => {
  const f = await fixture();
  try {
    const c = f.client();
    const result = await c.request('/api/profile', { method: 'PUT', body: { displayName: ' Juan ', highContrast: true, experience: 'returning' } });
    assert.equal(result.status, 200);
    assert.equal(result.data.displayName, 'Juan');
    assert.equal(result.data.highContrast, true);
    assert.equal(result.data.largeText, false);
    for (const body of [{ experience: 'expert' }, { format: 'video' }, { audio: 'yes' }, { displayName: '' }, { displayName: 'x'.repeat(61) }, { admin: true }, {}]) {
      assert.equal((await c.request('/api/profile', { method: 'PUT', body })).status, 400);
    }
  } finally { await f.close(); }
});

test('actualizaciones parciales concurrentes conservan ambos cambios del perfil', async () => {
  const f = await fixture();
  try {
    const c = f.client(); await c.request('/api/bootstrap');
    const arrived = observeRequests(f, '/api/profile', 2);
    const name = slowMutation(f, c.cookie, '/api/profile', 'PUT', { displayName: 'Cambios simultáneos' });
    const contrast = slowMutation(f, c.cookie, '/api/profile', 'PUT', { highContrast: true });
    await arrived;
    name.finish(); contrast.finish();
    const responses = await Promise.all([name.result, contrast.result]);
    assert.ok(responses.every(item => item.status === 200));
    const profile = (await c.request('/api/bootstrap')).data.profile;
    assert.equal(profile.displayName, 'Cambios simultáneos');
    assert.equal(profile.highContrast, true);
  } finally { await f.close(); }
});

test('borrado completo invalida mutaciones que todavía estaban recibiendo su cuerpo', async () => {
  const f = await fixture();
  try {
    const c = f.client(); await c.request('/api/bootstrap');
    const arrived = observeRequests(f, '/api/issues', 1);
    const issue = slowMutation(f, c.cookie, '/api/issues', 'POST', { message: 'Esta incidencia tardía no debe recrear datos borrados.' });
    await arrived;
    assert.equal((await c.request('/api/data', { method: 'DELETE' })).status, 200);
    issue.finish();
    const response = await issue.result;
    assert.equal(response.status, 401);
    assert.equal(response.data.error.code, 'SESSION_EXPIRED');
    const boot = (await c.request('/api/bootstrap')).data;
    assert.deepEqual(boot.issues, []);
    assert.equal(boot.profile.displayName, 'Estudiante');
  } finally { await f.close(); }
});

test('cookie persiste perfil, progreso y reportes al reiniciar el servidor SQLite', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'labar-api-'));
  const db = join(directory, 'test.sqlite');
  let f;
  try {
    f = await fixture(db);
    const c = f.client();
    await c.request('/api/profile', { method: 'PUT', body: { displayName: 'Persistente', largeText: true } });
    const { base } = await ready(c);
    await c.request(base + '/progress', { method: 'POST', body: { step: 0, complete: true } });
    await c.request('/api/issues', { method: 'POST', body: { message: 'Incidencia que debe sobrevivir al reinicio.' } });
    const cookie = c.cookie;
    await f.close();
    f = await fixture(db);
    const result = await fetch(f.origin + '/api/bootstrap', { headers: { Cookie: cookie } });
    const boot = await result.json();
    assert.equal(boot.profile.displayName, 'Persistente');
    assert.equal(boot.profile.largeText, true);
    assert.equal(boot.attempt.step, 1);
    assert.equal(boot.attempt.completedSteps, 1);
    assert.equal(boot.issues.length, 1);
  } finally {
    if (f) await f.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('sesiones aisladas: otra cookie no lee ni modifica ejecuciones ajenas', async () => {
  const f = await fixture();
  try {
    const first = f.client(); const second = f.client();
    const attempt = await started(first);
    await second.request('/api/profile', { method: 'PUT', body: { displayName: 'Otra persona' } });
    assert.notEqual(first.cookie, second.cookie);
    const boot = await second.request('/api/bootstrap');
    assert.equal(boot.data.attempt, null);
    assert.deepEqual(boot.data.history, []);
    assert.equal((await second.request(`/api/attempts/${attempt.id}/confirm`, { method: 'POST', body: { matches: true, model: 'DT-830B' } })).status, 404);
    assert.equal((await second.request('/api/issues', { method: 'POST', body: { attemptId: attempt.id, message: 'No debo acceder a otra sesión.' } })).status, 404);
    const exported = await second.request('/api/export');
    assert.deepEqual(exported.data.attempts, []);
  } finally { await f.close(); }
});

test('sesiones vencidas se purgan al reiniciar y el token crudo no se guarda', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'labar-expiry-'));
  const dbPath = join(directory, 'expiry.sqlite');
  let f;
  try {
    f = await fixture(dbPath);
    const c = f.client(); await started(c);
    const cookie = c.cookie;
    await f.close();
    const db = new DatabaseSync(dbPath);
    const stored = db.prepare('SELECT token_hash FROM sessions').get();
    assert.notEqual(stored.token_hash, cookie.split('=')[1]);
    db.prepare('UPDATE sessions SET expires_at = ?').run('2000-01-01T00:00:00.000Z');
    db.close();
    f = await fixture(dbPath);
    const response = await fetch(f.origin + '/api/bootstrap', { headers: { Cookie: cookie } });
    const boot = await response.json();
    assert.equal(boot.attempt, null);
    assert.notEqual(response.headers.get('set-cookie').split(';')[0], cookie);
  } finally {
    if (f) await f.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('crear ejecución idempotente: no duplica una práctica activa', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const attempt = await started(c);
    const next = await c.request('/api/attempts', { method: 'POST', body: { mode: 'ar' } });
    assert.equal(next.status, 200); assert.equal(next.data.id, attempt.id);
    assert.equal((await c.request('/api/attempts', { method: 'POST', body: { mode: 'invalid' } })).status, 400);
  } finally { await f.close(); }
});

test('servidor impide iniciar guía sin confirmación y cinco verificaciones', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const attempt = await started(c); const base = `/api/attempts/${attempt.id}`;
    assert.equal((await c.request(base + '/progress', { method: 'POST', body: { step: 0, complete: true } })).status, 409);
    assert.equal((await c.request(base + '/checklist', { method: 'POST', body: { checks } })).status, 409);
    const mismatch = await c.request(base + '/confirm', { method: 'POST', body: { matches: false, model: 'DT-830B' } });
    assert.equal(mismatch.data.equipmentConfirmed, false);
    assert.equal((await c.request(base + '/confirm', { method: 'POST', body: { matches: true, model: 'OTHER' } })).status, 400);
    await c.request(base + '/confirm', { method: 'POST', body: { matches: true, model: 'DT-830B' } });
    const incomplete = await c.request(base + '/checklist', { method: 'POST', body: { checks: checks.slice(0, 4) } });
    assert.equal(incomplete.data.status, 'preparing');
    assert.equal((await c.request(base + '/progress', { method: 'POST', body: { step: 0, complete: true } })).status, 409);
    assert.equal((await c.request(base + '/checklist', { method: 'POST', body: { checks: [...checks, 'ports'] } })).status, 400);
    assert.equal((await c.request(base + '/checklist', { method: 'POST', body: { checks: ['invented'] } })).status, 400);
    assert.equal((await c.request(base + '/checklist', { method: 'POST', body: { checks } })).data.status, 'active');
  } finally { await f.close(); }
});

test('secuencia de pasos: no permite saltos; admite retroceso y exige guía completa antes de evaluar', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const { base } = await ready(c);
    assert.equal((await c.request(base + '/progress', { method: 'POST', body: { step: 4, complete: true } })).status, 409);
    assert.equal((await c.request(base + '/progress', { method: 'POST', body: { step: 4, complete: false } })).status, 409);
    assert.equal((await c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'b', q2: 'b', q3: 'b' } } })).status, 409);
    await c.request(base + '/progress', { method: 'POST', body: { step: 0, complete: true } });
    const back = await c.request(base + '/progress', { method: 'POST', body: { step: 0, complete: false } });
    assert.equal(back.data.step, 0); assert.equal(back.data.completedSteps, 1);
    await c.request(base + '/progress', { method: 'POST', body: { step: 1, complete: false } });
    for (const step of [-1, 5, 1.5, '2']) assert.equal((await c.request(base + '/progress', { method: 'POST', body: { step, complete: true } })).status, 400);
  } finally { await f.close(); }
});

test('pausa y alternativa 2D conservan paso; reingreso obliga a reconfirmar', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const { base } = await ready(c, 'ar');
    await c.request(base + '/progress', { method: 'POST', body: { step: 0, complete: true } });
    const paused = await c.request(base + '/pause', { method: 'POST', body: { reason: 'marker-lost' } });
    assert.equal(paused.data.status, 'paused'); assert.equal(paused.data.step, 1);
    assert.equal((await c.request(base + '/progress', { method: 'POST', body: { step: 1, complete: true } })).status, 409);
    const fallback = await c.request(base + '/mode', { method: 'POST', body: { mode: '2d' } });
    assert.equal(fallback.data.mode, '2d'); assert.equal(fallback.data.status, 'active'); assert.equal(fallback.data.step, 1);
    const resumed = await c.request(base + '/resume', { method: 'POST', body: {} });
    assert.equal(resumed.data.status, 'preparing'); assert.equal(resumed.data.equipmentConfirmed, false);
    assert.deepEqual(resumed.data.checklist, []); assert.equal(resumed.data.completedSteps, 1);
  } finally { await f.close(); }
});

test('retirar confirmación invalida lista previa y obliga a cinco comprobaciones nuevas', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const { base } = await ready(c);
    await c.request(base + '/progress', { method: 'POST', body: { step: 0, complete: true } });
    const rejected = await c.request(base + '/confirm', { method: 'POST', body: { matches: false, model: 'DT-830B' } });
    assert.equal(rejected.data.status, 'preparing');
    assert.deepEqual(rejected.data.checklist, []);
    assert.equal(rejected.data.step, 1);
    assert.equal((await c.request(base + '/progress', { method: 'POST', body: { step: 1, complete: true } })).status, 409);
    const accepted = await c.request(base + '/confirm', { method: 'POST', body: { matches: true, model: 'DT-830B' } });
    assert.equal(accepted.data.status, 'preparing');
    assert.equal((await c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'b', q2: 'b', q3: 'b' } } })).status, 409);
    await c.request(base + '/checklist', { method: 'POST', body: { checks } });
    assert.equal((await c.request(base + '/progress', { method: 'POST', body: { step: 1, complete: true } })).status, 200);
  } finally { await f.close(); }
});

test('calificación del servidor, retroalimentación y repetición generan un historial real', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const { base } = await ready(c);
    await finishGuide(c, base);
    assert.equal((await c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'b' } } })).status, 400);
    assert.equal((await c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'b', q2: 'b', q3: 'x' } } })).status, 400);
    assert.equal((await c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'b', q2: 'b', q3: 'b' }, score: 3 } })).status, 400);
    const result = await c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'a', q2: 'b', q3: 'b' } } });
    assert.equal(result.data.score, 2); assert.equal(result.data.status, 'completed');
    assert.deepEqual(result.data.result.reviewTopics, ['Escala DCV']);
    assert.equal(result.data.result.feedback.length, 3);
    assert.equal((await c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'b', q2: 'b', q3: 'b' } } })).status, 409);
    const boot = (await c.request('/api/bootstrap')).data;
    assert.equal(boot.attempt, null); assert.equal(boot.history.length, 1);
    assert.deepEqual(boot.recommendation.reviewTopics, ['Escala DCV']);
    assert.equal((await c.request('/api/attempts', { method: 'POST', body: { mode: '2d' } })).status, 201);
  } finally { await f.close(); }
});

test('doble envío concurrente de evaluación guarda un solo resultado inmutable', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const { base } = await ready(c); await finishGuide(c, base);
    const replies = await Promise.all([
      c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'b', q2: 'b', q3: 'b' } } }),
      c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'a', q2: 'a', q3: 'a' } } }),
    ]);
    assert.deepEqual(replies.map(item => item.status).sort(), [200, 409]);
    const winner = replies.find(item => item.status === 200).data;
    const boot = (await c.request('/api/bootstrap')).data;
    assert.equal(boot.history.length, 1);
    assert.equal(boot.history[0].score, winner.score);
    assert.deepEqual(boot.history[0].answers, winner.answers);
  } finally { await f.close(); }
});

test('personalización explicable: dos ejecuciones perfectas permiten guía compacta y puede apagarse', async () => {
  const f = await fixture();
  try {
    const c = f.client();
    await c.request('/api/profile', { method: 'PUT', body: { experience: 'returning' } });
    for (let run = 0; run < 2; run++) {
      const { base } = await ready(c); await finishGuide(c, base);
      await c.request(base + '/quiz', { method: 'POST', body: { answers: { q1: 'b', q2: 'b', q3: 'b' } } });
    }
    assert.equal((await c.request('/api/bootstrap')).data.recommendation.detail, 'compact');
    await c.request('/api/profile', { method: 'PUT', body: { personalization: false } });
    const standard = (await c.request('/api/bootstrap')).data.recommendation;
    assert.equal(standard.detail, 'detailed'); assert.match(standard.reason, /estándar/);
  } finally { await f.close(); }
});

test('incidencias se guardan con validación y exportación propia sin token', async () => {
  const f = await fixture();
  try {
    const c = f.client(); const attempt = await started(c);
    for (const body of [{ message: 'corto' }, { message: 'x'.repeat(1001) }, { message: 'Incidencia válida pero paso inválido', step: 5 }]) {
      assert.equal((await c.request('/api/issues', { method: 'POST', body })).status, 400);
    }
    const result = await c.request('/api/issues', { method: 'POST', body: { attemptId: attempt.id, step: 0, message: 'El marcador se ve borroso con esta iluminación.' } });
    assert.equal(result.status, 201); assert.equal(result.data.status, 'recorded');
    const exported = await c.request('/api/export');
    assert.equal(exported.data.issues.length, 1); assert.equal(exported.data.attempts.length, 1);
    assert.match(exported.headers.get('content-disposition'), /attachment/);
    assert.ok(!JSON.stringify(exported.data).includes(c.cookie.split('=')[1]));
  } finally { await f.close(); }
});

test('borrar progreso preserva preferencias y borrar todos los datos renueva sesión', async () => {
  const f = await fixture();
  try {
    const c = f.client();
    await c.request('/api/profile', { method: 'PUT', body: { displayName: 'Mi perfil', highContrast: true } });
    await started(c);
    await c.request('/api/issues', { method: 'POST', body: { message: 'Incidencia de prueba para eliminar.' } });
    assert.equal((await c.request('/api/progress', { method: 'DELETE' })).status, 200);
    let boot = (await c.request('/api/bootstrap')).data;
    assert.equal(boot.profile.displayName, 'Mi perfil'); assert.equal(boot.attempt, null); assert.deepEqual(boot.issues, []);
    const cookie = c.cookie;
    assert.equal((await c.request('/api/data', { method: 'DELETE' })).status, 200);
    boot = (await c.request('/api/bootstrap')).data;
    assert.equal(boot.profile.displayName, 'Estudiante'); assert.equal(boot.profile.highContrast, false);
    assert.notEqual(c.cookie, cookie);
  } finally { await f.close(); }
});

test('borrado de una sesión no elimina perfil ni progreso de otra', async () => {
  const f = await fixture();
  try {
    const one = f.client(); const two = f.client();
    await started(one); const other = await started(two);
    await two.request('/api/profile', { method: 'PUT', body: { displayName: 'Otra sesión intacta' } });
    await one.request('/api/progress', { method: 'DELETE' });
    let boot = (await two.request('/api/bootstrap')).data;
    assert.equal(boot.attempt.id, other.id);
    await one.request('/api/data', { method: 'DELETE' });
    boot = (await two.request('/api/bootstrap')).data;
    assert.equal(boot.attempt.id, other.id);
    assert.equal(boot.profile.displayName, 'Otra sesión intacta');
  } finally { await f.close(); }
});

test('protección de origen y cabecera rechaza solicitudes cruzadas', async () => {
  const f = await fixture();
  try {
    const c = f.client();
    assert.equal((await c.request('/api/profile', { method: 'PUT', body: { audio: true }, headers: { Origin: 'https://otro.example' } })).status, 403);
    assert.equal((await c.request('/api/profile', { method: 'PUT', body: { audio: true }, headers: { 'X-LabAR-Client': '' } })).status, 403);
    const cross = await fetch(f.origin + '/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-LabAR-Client': 'web' }, body: '{"audio":true}' });
    assert.equal(cross.status, 403);
    assert.equal(cross.headers.get('access-control-allow-origin'), null);
  } finally { await f.close(); }
});

test('origen HTTPS público explícito funciona tras proxy y no acepta otro origen', async () => {
  const f = await fixture(':memory:', { allowedOrigins: ['https://labar.example.edu'], secureCookie: true });
  try {
    const c = f.client(); const boot = await c.request('/api/bootstrap');
    assert.match(boot.headers.get('set-cookie'), /; Secure/);
    const accepted = await c.request('/api/profile', { method: 'PUT', body: { audio: true }, headers: { Origin: 'https://labar.example.edu' } });
    assert.equal(accepted.status, 200); assert.equal(accepted.data.audio, true);
    const rejected = await c.request('/api/profile', { method: 'PUT', body: { audio: false }, headers: { Origin: 'https://otro.example.edu', 'X-Forwarded-Proto': 'https' } });
    assert.equal(rejected.status, 403);
    assert.equal((await c.request('/api/bootstrap')).data.profile.audio, true);
  } finally { await f.close(); }
});

test('HTTPS tras proxy acepta el dominio de acceso y rechaza orígenes nulos o ajenos', async () => {
  const f = await fixture(':memory:', { secureCookie: true });
  try {
    const origin = f.origin.replace('http:', 'https:');
    const c = f.client();
    assert.equal((await c.request('/api/profile', {method:'PUT',body:{audio:true},headers:{Origin:origin}})).status,200);
    for (const rejected of ['null','https://otro.example',origin+'.evil.example']) {
      assert.equal((await c.request('/api/profile', {method:'PUT',body:{audio:false},headers:{Origin:rejected}})).status,403);
    }
    assert.equal((await fetch(f.origin)).headers.get('referrer-policy'),'same-origin');
  } finally { await f.close(); }
});

test('CLI rechaza un PUBLIC_ORIGIN con ruta o credenciales antes de abrir la base', () => {
  const script = fileURLToPath(new URL('../backend/server.mjs', import.meta.url));
  for (const origin of ['https://labar.example.edu/ruta', 'https://usuario:clave@labar.example.edu', 'file:///tmp', 'no-es-origen']) {
    const child = spawnSync(process.execPath, [script], {
      env: { ...process.env, PUBLIC_ORIGIN: origin }, encoding: 'utf8', timeout: 5000,
    });
    assert.equal(child.status, 1);
    assert.match(child.stderr, /PUBLIC_ORIGIN/);
  }
});

test('validación de cuerpo: JSON malformado, tipo, tamaño y array', async () => {
  const f = await fixture();
  try {
    const c = f.client();
    assert.equal((await c.request('/api/profile', { method: 'PUT', raw: '{oops' })).status, 400);
    assert.equal((await c.request('/api/profile', { method: 'PUT', raw: '[]' })).status, 400);
    assert.equal((await c.request('/api/profile', { method: 'PUT', raw: 'x'.repeat(17000) })).status, 413);
    assert.equal((await c.request('/api/profile', { method: 'PUT', body: {}, headers: { 'Content-Type': 'text/plain' } })).status, 415);
    const notFound = await c.request('/api/inexistente');
    assert.equal(notFound.status, 404); assert.equal(typeof notFound.data.error.message, 'string');
  } finally { await f.close(); }
});

test('archivos estáticos: entrega app, impide acceso a docs/base y rutas peligrosas', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'labar-static-'));
  await writeFile(join(directory, 'index.html'), '<!doctype html><title>Fixture estática</title>');
  await writeFile(join(directory, 'app.js'), 'export const fixture = true;');
  const f = await fixture(':memory:', { frontendDir: directory });
  try {
    const c = f.client(); const home = await c.request('/');
    assert.equal(home.status, 200); assert.match(home.headers.get('content-type'), /text\/html/);
    assert.equal((await c.request('/app.js')).status, 200);
    assert.equal((await c.request('/docs/Proyecto_LabAR.pdf')).status, 404);
    assert.equal((await c.request('/backend/app.mjs')).status, 404);
    assert.equal((await c.request('/data/labar.sqlite')).status, 404);
    assert.equal((await c.request('/%2e%2e%2fbackend/app.mjs')).status, 404);
    assert.equal((await c.request('/.env')).status, 404);
    assert.equal((await c.request('/%00')).status, 400);
  } finally { await f.close(); await rm(directory, { recursive: true, force: true }); }
});

test('límite de solicitudes protege API por sesión sin bloquear salud', async () => {
  const f = await fixture(':memory:', { rateLimit: 2 });
  try {
    const c = f.client();
    assert.equal((await c.request('/api/bootstrap')).status, 200);
    assert.equal((await c.request('/api/bootstrap')).status, 200);
    assert.equal((await c.request('/api/bootstrap')).status, 429);
    assert.equal((await c.request('/api/health')).status, 200);
  } finally { await f.close(); }
});
