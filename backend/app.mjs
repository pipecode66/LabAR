import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.mjs';
import { DEFAULT_PROFILE, PRACTICE, gradeQuiz, recommendationFor } from './practice.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COOKIE = 'labar_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;
const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };

export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function fail(status, code, message) { throw new HttpError(status, code, message); }
function hashToken(token) { return createHash('sha256').update(token).digest('hex'); }
function nowIso() { return new Date().toISOString(); }
function object(value, label = 'El cuerpo') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'INVALID_BODY', `${label} debe ser un objeto JSON.`);
  return value;
}
function onlyKeys(value, keys) {
  if (Object.keys(value).some(key => !keys.includes(key))) fail(400, 'UNKNOWN_FIELD', 'La solicitud contiene campos no permitidos.');
}
function modeValue(mode) {
  if (!['2d', 'ar'].includes(mode)) fail(400, 'INVALID_MODE', 'El modo debe ser 2d o ar.');
  return mode;
}
function requireUnfinished(attempt) {
  if (attempt.status === 'completed') fail(409, 'ATTEMPT_COMPLETED', 'La ejecución ya terminó. Inicia una nueva práctica para repetirla.');
}
function requireReady(attempt) {
  requireUnfinished(attempt);
  if (attempt.status !== 'active' || !attempt.equipmentConfirmed || attempt.checklist.length !== PRACTICE.checklist.length) {
    fail(409, 'PRECONDITIONS_REQUIRED', 'Confirma el equipo y completa la lista preventiva antes de avanzar.');
  }
}

async function readBody(req) {
  const type = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (req.method !== 'DELETE' && type !== 'application/json') fail(415, 'JSON_REQUIRED', 'Usa Content-Type application/json.');
  if (type && type !== 'application/json') fail(415, 'JSON_REQUIRED', 'Usa Content-Type application/json.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= MAX_BODY_BYTES) chunks.push(chunk);
  }
  if (size > MAX_BODY_BYTES) fail(413, 'BODY_TOO_LARGE', 'La solicitud supera el tamaño permitido.');
  if (!size) return {};
  try { return object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch (error) {
    if (error instanceof HttpError) throw error;
    fail(400, 'INVALID_JSON', 'El cuerpo JSON no es válido.');
  }
}

function validateProfile(body, current) {
  const allowed = Object.keys(DEFAULT_PROFILE);
  onlyKeys(body, allowed);
  if (!Object.keys(body).length) fail(400, 'EMPTY_PROFILE', 'Incluye al menos una preferencia.');
  if ('displayName' in body) {
    if (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.trim().length > 60 || /[\u0000-\u001f]/u.test(body.displayName)) {
      fail(400, 'INVALID_NAME', 'El nombre debe tener entre 1 y 60 caracteres.');
    }
    body.displayName = body.displayName.trim();
  }
  if ('experience' in body && !['beginner', 'returning'].includes(body.experience)) fail(400, 'INVALID_EXPERIENCE', 'Selecciona beginner o returning.');
  if ('format' in body && !['visual', 'text'].includes(body.format)) fail(400, 'INVALID_FORMAT', 'Selecciona visual o text.');
  for (const key of ['largeText', 'highContrast', 'reducedMotion', 'audio', 'personalization']) {
    if (key in body && typeof body[key] !== 'boolean') fail(400, 'INVALID_PREFERENCE', `${key} debe ser booleano.`);
  }
  return { ...current, ...body };
}

/** Crea un servidor sin escuchar. Las pruebas usan base temporal y puerto asignado por el SO. */
export function createApp({ databasePath = resolve(ROOT, 'data/labar.sqlite'), frontendDir = resolve(ROOT, 'frontend'),
  allowedOrigins = [], secureCookie = false, rateLimit = 600 } = {}) {
  const store = createStore(databasePath);
  const rates = new Map();
  let closed = false;

  function respond(res, status, body, extraHeaders = {}) {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders });
    res.end(payload);
  }

  function session(req, res) {
    const raw = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    const token = raw && /^[a-f0-9]{64}$/u.test(raw) ? raw : null;
    const hash = token ? hashToken(token) : null;
    const row = hash ? store.session(hash) : null;
    if (row && row.expires_at > nowIso()) return { hash, profile: JSON.parse(row.profile_json), createdAt: row.created_at };
    if (row) store.deleteSession(hash);
    const freshToken = randomBytes(32).toString('hex');
    const freshHash = hashToken(freshToken);
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + SESSION_MS).toISOString();
    store.addSession(freshHash, DEFAULT_PROFILE, createdAt, expiresAt);
    res.setHeader('Set-Cookie', `${COOKIE}=${freshToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}${secureCookie ? '; Secure' : ''}`);
    return { hash: freshHash, profile: { ...DEFAULT_PROFILE }, createdAt };
  }

  function ownedAttempt(owner, id) {
    const attempt = store.attempt(owner, id);
    if (!attempt) fail(404, 'ATTEMPT_NOT_FOUND', 'No se encontró esa ejecución en tu sesión.');
    return attempt;
  }
  function save(owner, attempt) {
    attempt.updatedAt = nowIso();
    return store.saveAttempt(owner, attempt);
  }

  async function route(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { fail(400, 'INVALID_URL', 'La dirección solicitada no es válida.'); }
    if (pathname.includes('\0') || pathname.includes('\\')) fail(400, 'INVALID_PATH', 'La ruta no es válida.');
    if (pathname === '/api/health' && req.method === 'GET') return respond(res, 200, { status: 'ok', version: '1.0.0', storage: 'sqlite' });

    if (!pathname.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(req.method)) fail(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (relative.split('/').some(part => part === '..' || part.startsWith('.'))) fail(404, 'NOT_FOUND', 'Archivo no encontrado.');
      const target = resolve(frontendDir, relative);
      const root = resolve(frontendDir);
      if (!target.startsWith(root + sep)) fail(404, 'NOT_FOUND', 'Archivo no encontrado.');
      let actual;
      try {
        actual = await realpath(target);
        if (!actual.startsWith((await realpath(root)) + sep) || !(await stat(actual)).isFile()) fail(404, 'NOT_FOUND', 'Archivo no encontrado.');
      } catch { fail(404, 'NOT_FOUND', 'Archivo no encontrado.'); }
      const mime = MIME[extname(actual).toLowerCase()];
      if (!mime) fail(404, 'NOT_FOUND', 'Archivo no encontrado.');
      const bytes = await readFile(actual);
      res.writeHead(200, { 'Content-Type': mime, 'Content-Length': bytes.length, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
      return;
    }

    let current = session(req, res);
    const minute = Math.floor(Date.now() / 60000);
    const rate = rates.get(current.hash);
    const count = rate?.minute === minute ? rate.count + 1 : 1;
    rates.set(current.hash, { minute, count });
    if (rates.size > 10000) for (const [key, value] of rates) if (value.minute < minute) rates.delete(key);
    if (count > rateLimit) fail(429, 'RATE_LIMIT', 'Demasiadas solicitudes. Espera un minuto y reintenta.');

    let body;
    if (MUTATIONS.has(req.method)) {
      const ownOrigin = `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
      if (req.headers['x-labar-client'] !== 'web' || !req.headers.origin || ![ownOrigin, ...allowedOrigins].includes(req.headers.origin)) {
        fail(403, 'ORIGIN_REJECTED', 'La solicitud debe proceder de la misma aplicación.');
      }
      body = await readBody(req);
      // El cuerpo puede llegar después de otras solicitudes de la misma sesión.
      // Releer evita sobrescribir preferencias nuevas o recrear datos tras un borrado.
      const latest = store.session(current.hash);
      if (!latest || latest.expires_at <= nowIso()) {
        if (latest) store.deleteSession(current.hash);
        fail(401, 'SESSION_EXPIRED', 'La sesión cambió o venció. Recarga la aplicación antes de continuar.');
      }
      current = { ...current, profile: JSON.parse(latest.profile_json) };
    }

    const history = () => store.attempts(current.hash);
    if (pathname === '/api/bootstrap' && req.method === 'GET') {
      const all = history();
      return respond(res, 200, { profile: current.profile, practice: PRACTICE,
        attempt: all.find(item => item.status !== 'completed') || null,
        history: all.filter(item => item.status === 'completed'),
        recommendation: recommendationFor(current.profile, all), issues: store.issues(current.hash) });
    }
    if (pathname === '/api/profile' && req.method === 'PUT') {
      const profile = validateProfile(body, current.profile);
      store.updateProfile(current.hash, profile);
      return respond(res, 200, profile);
    }
    if (pathname === '/api/history' && req.method === 'GET') return respond(res, 200, history());
    if (pathname === '/api/export' && req.method === 'GET') return respond(res, 200, {
      exportedAt: nowIso(), project: 'LabAR Seguro', version: '1.0.0', profile: current.profile,
      attempts: history(), issues: store.issues(current.hash),
      privacy: 'Incluye únicamente los datos de esta sesión de navegador. No se almacenan imágenes, video ni audio.',
    }, { 'Content-Disposition': 'attachment; filename="labar-mis-datos.json"' });
    if (pathname === '/api/progress' && req.method === 'DELETE') {
      onlyKeys(body, []); store.deleteProgress(current.hash);
      return respond(res, 200, { deleted: true, retained: 'profile' });
    }
    if (pathname === '/api/data' && req.method === 'DELETE') {
      onlyKeys(body, []); store.deleteSession(current.hash);
      res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureCookie ? '; Secure' : ''}`);
      return respond(res, 200, { deleted: true });
    }
    if (pathname === '/api/issues' && req.method === 'POST') {
      onlyKeys(body, ['attemptId', 'step', 'message']);
      if (typeof body.message !== 'string' || body.message.trim().length < 10 || body.message.trim().length > 1000 || /\u0000/u.test(body.message)) {
        fail(400, 'INVALID_MESSAGE', 'Describe la incidencia con entre 10 y 1000 caracteres.');
      }
      if (body.attemptId !== undefined && (typeof body.attemptId !== 'string' || !body.attemptId)) fail(400, 'INVALID_ATTEMPT', 'La ejecución indicada no es válida.');
      if (body.attemptId) ownedAttempt(current.hash, body.attemptId);
      if (body.step !== undefined && (!Number.isInteger(body.step) || body.step < 0 || body.step > 4)) fail(400, 'INVALID_STEP', 'El paso debe estar entre 0 y 4.');
      const issue = { id: randomUUID(), attemptId: body.attemptId || null, step: body.step ?? null,
        message: body.message.trim(), createdAt: nowIso(), status: 'recorded' };
      return respond(res, 201, store.addIssue(current.hash, issue));
    }
    if (pathname === '/api/attempts' && req.method === 'POST') {
      onlyKeys(body, ['mode']); const mode = modeValue(body.mode);
      const existing = history().find(item => item.status !== 'completed');
      if (existing) return respond(res, 200, existing);
      const now = nowIso();
      const attempt = { id: randomUUID(), practiceId: PRACTICE.id, practiceVersion: PRACTICE.version,
        status: 'preparing', mode, equipmentConfirmed: false, checklist: [], step: 0, completedSteps: 0,
        score: null, result: null, createdAt: now, updatedAt: now, completedAt: null, pauseReason: null };
      return respond(res, 201, store.saveAttempt(current.hash, attempt));
    }

    const match = /^\/api\/attempts\/([a-f0-9-]{36})\/(confirm|checklist|progress|pause|resume|mode|quiz)$/u.exec(pathname);
    if (match && req.method === 'POST') {
      const attempt = ownedAttempt(current.hash, match[1]);
      const action = match[2];
      requireUnfinished(attempt);
      if (action === 'confirm') {
        onlyKeys(body, ['matches', 'model']);
        if (typeof body.matches !== 'boolean' || body.model !== PRACTICE.model) fail(400, 'INVALID_CONFIRMATION', 'Confirma explícitamente el modelo DT-830B.');
        attempt.equipmentConfirmed = body.matches;
        if (!body.matches) attempt.checklist = [];
        attempt.status = body.matches && attempt.checklist.length === 5 ? 'active' : 'preparing';
      } else if (action === 'checklist') {
        onlyKeys(body, ['checks']);
        if (!attempt.equipmentConfirmed) fail(409, 'EQUIPMENT_REQUIRED', 'Confirma primero que el equipo coincide.');
        const ids = PRACTICE.checklist.map(item => item.id);
        if (!Array.isArray(body.checks) || body.checks.some(id => typeof id !== 'string' || !ids.includes(id)) || new Set(body.checks).size !== body.checks.length) {
          fail(400, 'INVALID_CHECKLIST', 'La lista debe contener verificaciones válidas y sin duplicados.');
        }
        attempt.checklist = ids.filter(id => body.checks.includes(id));
        attempt.status = attempt.checklist.length === ids.length ? 'active' : 'preparing';
      } else if (action === 'progress') {
        onlyKeys(body, ['step', 'complete']); requireReady(attempt);
        if (!Number.isInteger(body.step) || body.step < 0 || body.step >= PRACTICE.steps.length || typeof body.complete !== 'boolean') fail(400, 'INVALID_STEP', 'Indica un paso válido y complete como booleano.');
        if (body.complete) {
          if (body.step !== attempt.step) fail(409, 'STEP_SEQUENCE', 'Completa el paso que está activo antes de avanzar.');
          attempt.completedSteps = Math.max(attempt.completedSteps, body.step + 1);
          attempt.step = Math.min(body.step + 1, 4);
        } else {
          if (body.step > attempt.completedSteps) fail(409, 'STEP_SEQUENCE', 'No puedes saltar a un paso que no has alcanzado.');
          attempt.step = body.step;
        }
      } else if (action === 'pause') {
        onlyKeys(body, ['reason']);
        if (typeof body.reason !== 'string' || !['marker-lost', 'user', 'camera-error', 'page-hidden'].includes(body.reason)) fail(400, 'INVALID_REASON', 'Selecciona un motivo de pausa válido.');
        attempt.status = 'paused'; attempt.pauseReason = body.reason;
      } else if (action === 'resume') {
        onlyKeys(body, []);
        attempt.equipmentConfirmed = false; attempt.checklist = [];
        attempt.status = 'preparing'; attempt.pauseReason = null;
      } else if (action === 'mode') {
        onlyKeys(body, ['mode']); attempt.mode = modeValue(body.mode);
        if (attempt.status === 'paused' && attempt.equipmentConfirmed && attempt.checklist.length === 5) {
          attempt.status = 'active'; attempt.pauseReason = null;
        }
      } else if (action === 'quiz') {
        onlyKeys(body, ['answers']); requireReady(attempt);
        if (attempt.completedSteps !== 5) fail(409, 'GUIDE_REQUIRED', 'Completa los cinco pasos antes de responder la evaluación.');
        object(body.answers, 'answers'); onlyKeys(body.answers, ['q1', 'q2', 'q3']);
        if (!['q1', 'q2', 'q3'].every(id => ['a', 'b', 'c'].includes(body.answers[id]))) fail(400, 'INCOMPLETE_QUIZ', 'Responde las tres preguntas con opciones válidas.');
        attempt.result = gradeQuiz(body.answers); attempt.answers = body.answers;
        attempt.score = attempt.result.score; attempt.status = 'completed'; attempt.completedAt = nowIso();
      }
      return respond(res, 200, save(current.hash, attempt));
    }
    fail(404, 'API_NOT_FOUND', 'La operación solicitada no existe.');
  }

  const server = createServer((req, res) => {
    route(req, res).catch(error => {
      if (res.headersSent) { res.end(); return; }
      const status = error instanceof HttpError ? error.status : 500;
      respond(res, status, { error: {
        code: error instanceof HttpError ? error.code : 'INTERNAL_ERROR',
        message: error instanceof HttpError ? error.message : 'No fue posible completar la operación. Reintenta más tarde.',
      } });
    });
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.keepAliveTimeout = 5000;
  store.cleanup(nowIso());
  return {
    server,
    close: async () => {
      if (closed) return;
      closed = true;
      if (server.listening) await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
      store.close();
    },
  };
}
