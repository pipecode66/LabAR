import { createApp } from '../backend/app.mjs';

const PRODUCTION_ORIGIN = 'https://labar-theta.vercel.app';

function publicOrigin(value) {
  const parsed = new URL(value);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('El origen público no es válido.');
  return parsed.origin;
}

/** Variables privadas del servidor: ninguna credencial se incorpora al frontend. */
export function vercelOptions(env = process.env) {
  if (typeof env.POSTGRES_URL !== 'string' || !env.POSTGRES_URL.trim()) throw new Error('Configura POSTGRES_URL en Vercel.');
  const origins = [PRODUCTION_ORIGIN];
  if (env.PUBLIC_ORIGIN) origins.push(publicOrigin(env.PUBLIC_ORIGIN));
  for (const value of [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (!value) continue;
    if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(value)) throw new Error('El dominio del despliegue no es válido.');
    origins.push(publicOrigin(`https://${value}`));
  }
  return {
    databaseUrl: env.POSTGRES_URL.trim(),
    ...(env.POSTGRES_SSL_CA ? { postgresOptions: { sslCa: env.POSTGRES_SSL_CA.replace(/\\n/g, '\n') } } : {}),
    allowedOrigins: [...new Set(origins)], secureCookie: true,
  };
}

export function normalizeApiUrl(rawUrl) {
  const url = new URL(rawUrl, 'https://labar.invalid');
  const path = url.searchParams.get('__labar_path');
  if (['/api/index', '/api/index.mjs', '/api'].includes(url.pathname) && path !== null) {
    if (!/^[a-z0-9/-]*$/i.test(path) || path.includes('..') || path.startsWith('/')) throw new Error('Ruta API no válida.');
    url.pathname = `/api/${path}`;
  }
  url.searchParams.delete('__labar_path');
  return url.pathname + url.search;
}

/** Entrada Node.js de Vercel: sin listen(), memoria volátil como BD ni disco temporal. */
export function createVercelHandler({ env = process.env, appFactory = createApp } = {}) {
  let app = null;
  const handler = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try { req.url = normalizeApiUrl(req.url || '/api'); }
    catch {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { code: 'INVALID_PATH', message: 'La ruta de la API no es válida.' } }));
      return;
    }
    try {
      if (!app) app = appFactory(vercelOptions(env));
      await app.ready;
      await app.handler(req, res);
    } catch (error) {
      const failedApp = app; app = null;
      try { await failedApp?.close(); } catch { /* No exponer detalles de conexión. */ }
      if (res.headersSent) { res.end(); return; }
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': '10' });
      const code = error?.cause?.code || error?.code;
      const safeCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'ENOTFOUND', 'ENETUNREACH', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOENT'];
      const diagnostic = safeCodes.includes(code) || /^[0-9A-Z]{5}$/.test(code || '') ? code : 'CONNECTION_CONFIGURATION';
      res.end(JSON.stringify({ error: {
        code: 'DATABASE_UNAVAILABLE',
        diagnostic,
        message: 'No se pudo conectar con la base de datos. Revisa POSTGRES_URL en Vercel y que Supabase esté activo.',
      } }));
    }
  };
  handler.close = async () => { const current = app; app = null; await current?.close(); };
  return handler;
}

export default createVercelHandler();
