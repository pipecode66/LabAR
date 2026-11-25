import { resolve } from 'node:path';
import { createApp } from './app.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT debe ser un entero entre 0 y 65535.');
let publicOrigin;
if (process.env.PUBLIC_ORIGIN) {
  let parsed;
  try { parsed = new URL(process.env.PUBLIC_ORIGIN); }
  catch { throw new Error('PUBLIC_ORIGIN debe ser un origen HTTP o HTTPS válido.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
      parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('PUBLIC_ORIGIN solo admite protocolo, host y puerto; no rutas, credenciales ni parámetros.');
  }
  publicOrigin = parsed.origin;
}
if (process.env.SECURE_COOKIE !== undefined && !['true', 'false'].includes(process.env.SECURE_COOKIE)) {
  throw new Error('SECURE_COOKIE debe ser true o false.');
}
const app = createApp({
  ...(process.env.DB_PATH ? { databasePath: resolve(process.env.DB_PATH) } : {}),
  ...(process.env.POSTGRES_URL || process.env.DATABASE_URL ? { databaseUrl: process.env.POSTGRES_URL || process.env.DATABASE_URL } : {}),
  allowedOrigins: publicOrigin ? [publicOrigin] : [],
  secureCookie: process.env.SECURE_COOKIE !== undefined ? process.env.SECURE_COOKIE === 'true' : publicOrigin?.startsWith('https:') || false,
});
try {
  await app.ready;
  app.server.listen(port, host, () => {
    const actualPort = app.server.address().port;
    console.log(`LabAR Seguro: http://${host}:${actualPort}`);
    console.log(`Datos: ${process.env.POSTGRES_URL || process.env.DATABASE_URL ? 'PostgreSQL administrado' : 'SQLite local'}. Pulsa Ctrl+C para detener.`);
  });
} catch {
  console.error('No fue posible iniciar LabAR. Revisa la configuración privada de la base de datos y TLS.');
  await app.close();
  process.exitCode = 1;
}
async function stop() { await app.close(); process.exit(0); }
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
