import { cp, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONS = new Set(['.html', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.license']);

/** Construye solo los recursos del navegador, nunca backend, documentos ni datos. */
export async function buildVercel({ projectRoot = ROOT, commit = process.env.VERCEL_GIT_COMMIT_SHA || null } = {}) {
  const root = resolve(projectRoot);
  const source = resolve(root, 'frontend');
  const output = resolve(root, 'public');
  if (dirname(output) !== root || basename(output) !== 'public' || output === source) throw new Error('La salida debe ser public dentro del proyecto.');
  if (!(await lstat(source)).isDirectory()) throw new Error('Falta el directorio frontend.');
  await lstat(resolve(source, 'index.html'));
  try {
    if ((await lstat(output)).isSymbolicLink()) throw new Error('La salida no puede ser un enlace simbólico.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Target absoluto validado: únicamente <projectRoot>/public, salida regenerable.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(source, output, { recursive: true, filter: async path => {
    const entry = await lstat(path);
    if (entry.isSymbolicLink()) throw new Error('No se publican enlaces simbólicos.');
    if (path !== source && basename(path).startsWith('.')) return false;
    if (entry.isDirectory()) return true;
    return !basename(path).startsWith('.') && EXTENSIONS.has(extname(path).toLowerCase());
  } });
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  await writeFile(resolve(output, 'build-info.json'), JSON.stringify({
    project: 'LabAR Seguro', version: pkg.version, commit, builtAt: new Date().toISOString(),
  }, null, 2) + '\n');
  return { outputDirectory: output };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const built = await buildVercel();
  console.log(`Frontend preparado en ${built.outputDirectory}`);
}
