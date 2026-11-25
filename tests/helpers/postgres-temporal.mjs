/** Clúster PostgreSQL temporal, aislado y con TLS para pruebas reproducibles.
 * No utiliza el servicio PostgreSQL instalado ni sus bases de datos.
 */
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createServer } from 'node:net';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

async function runControl(executable, args, timeout) {
  // pg_ctl lanza un proceso persistente. No heredar pipes de execFile evita
  // esperar indefinidamente a que el servidor cierre descriptores heredados.
  return new Promise((resolveExit, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: 'ignore' });
    const timer = setTimeout(() => { child.kill(); reject(new Error('pg_ctl excedió el tiempo de la prueba.')); }, timeout);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => {
      clearTimeout(timer);
      if (code === 0) resolveExit(); else reject(new Error(`pg_ctl terminó con código ${code}.`));
    });
  });
}

export function findPostgresTools() {
  const extension = process.platform === 'win32' ? '.exe' : '';
  const candidates = [
    process.env.LABAR_TEST_PG_BIN,
    'C:/Program Files/PostgreSQL/17/bin',
    'C:/Program Files/PostgreSQL/18/bin',
    '/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/16/bin',
    '/usr/lib/postgresql/18/bin', '/opt/homebrew/opt/postgresql@17/bin',
    ...String(process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':'),
  ].filter(Boolean);
  const bin = candidates.find(directory => ['initdb', 'pg_ctl', 'postgres'].every(name => existsSync(join(directory, name + extension))));
  const opensslCandidates = [
    process.env.LABAR_TEST_OPENSSL,
    'C:/Program Files/Git/usr/bin/openssl.exe',
    ...candidates.map(directory => join(directory, 'openssl' + extension)),
    '/usr/bin/openssl', '/opt/homebrew/bin/openssl',
  ].filter(Boolean);
  const openssl = opensslCandidates.find(path => existsSync(path));
  return bin && openssl ? { bin, openssl, extension } : null;
}

async function unusedLoopbackPort() {
  const probe = createServer();
  await new Promise((resolveListen, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolveListen);
  });
  const port = probe.address().port;
  await new Promise((resolveClose, reject) => probe.close(error => error ? reject(error) : resolveClose()));
  return port;
}

function assertOwnedTemporaryDirectory(directory) {
  const root = resolve(tmpdir());
  const target = resolve(directory);
  if (!target.startsWith(root + sep) || !target.slice(root.length + 1).startsWith('labar-postgres-') || target === root) {
    throw new Error('La limpieza del clúster se limitó al directorio temporal creado por esta prueba.');
  }
}

export async function startTemporaryPostgres() {
  const tools = findPostgresTools();
  if (!tools) throw new Error('Prueba PostgreSQL real no disponible: faltan initdb/pg_ctl y OpenSSL.');
  const directory = await mkdtemp(join(tmpdir(), 'labar-postgres-'));
  assertOwnedTemporaryDirectory(directory);
  const data = join(directory, 'cluster');
  const certificate = join(directory, 'server.crt');
  const key = join(directory, 'server.key');
  const logfile = join(directory, 'postgres.log');
  const control = join(tools.bin, 'pg_ctl' + tools.extension);
  const port = await unusedLoopbackPort();
  let started = false;
  let stopped = false;

  async function stop() {
    if (stopped) return;
    stopped = true;
    assertOwnedTemporaryDirectory(directory);
    if (started || existsSync(join(data, 'postmaster.pid'))) {
      await runControl(control, ['-D', data, '-m', 'fast', '-w', '-t', '20', 'stop'], 25000);
    }
    await rm(directory, { recursive: true, force: true });
  }

  try {
    await execute(tools.openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', key, '-out', certificate, '-days', '1', '-subj', '/CN=localhost',
      '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { windowsHide: true, timeout: 20000 });
    await execute(join(tools.bin, 'initdb' + tools.extension), [
      '-D', data, '--auth-local=trust', '--auth-host=trust', '--username=labar_test',
      '--encoding=UTF8', '--no-locale',
    ], { windowsHide: true, timeout: 45000 });
    // Estos argumentos solo contienen rutas del directorio temporal de esta prueba.
    const options = `-p ${port} -h 127.0.0.1 -c ssl=on -c "ssl_cert_file=${certificate.replaceAll('\\', '/')}" -c "ssl_key_file=${key.replaceAll('\\', '/')}"`;
    await runControl(control, ['-D', data, '-l', logfile, '-o', options, '-w', '-t', '30', 'start'], 35000);
    started = true;
    return {
      url: `postgresql://labar_test@127.0.0.1:${port}/postgres`,
      sslCa: await readFile(certificate, 'utf8'),
      directory,
      stop,
    };
  } catch (error) {
    let diagnostic = '';
    if (existsSync(logfile)) diagnostic = (await readFile(logfile, 'utf8')).slice(-1500);
    try { await stop(); } catch { /* El error original conserva el motivo de la prueba. */ }
    throw new Error(`No se pudo iniciar el clúster PostgreSQL temporal: ${error.message}\n${diagnostic}`);
  }
}
