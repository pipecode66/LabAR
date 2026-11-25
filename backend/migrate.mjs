import { createPostgresStore } from './postgres-store.mjs';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Configura POSTGRES_URL en el entorno privado antes de ejecutar la migración.');
  process.exitCode = 1;
} else {
  let store;
  try {
    store = createPostgresStore(connectionString, { sslCa: process.env.POSTGRES_SSL_CA });
    await store.ready;
    console.log('Esquema PostgreSQL de LabAR preparado correctamente.');
  } catch {
    console.error('No se pudo preparar el esquema. Revisa la conexión privada, TLS y los permisos de la base.');
    process.exitCode = 1;
  } finally { await store?.close(); }
}
