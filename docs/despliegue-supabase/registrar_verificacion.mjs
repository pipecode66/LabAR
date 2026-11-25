import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const base = new URL('./',import.meta.url);
const browser = JSON.parse(await readFile(new URL('resultado_e2e.json',base),'utf8'));
const remote = JSON.parse(await readFile(new URL('resultado_produccion.json',base),'utf8'));
const junit = await readFile(new URL('resultado_node.xml',base),'utf8');
const passedNode = (junit.match(/<testcase /g)||[]).length;
assert.equal(passedNode,57);
assert.equal(/<(failure|error|skipped)[\s>]/.test(junit),false);
assert.equal(browser.failed,0); assert.equal(browser.passed,46);
assert.equal(remote.failed,0); assert.equal(remote.passed,10);
const origin='https://labar-theta.vercel.app';
const home = await fetch(origin);
assert.equal(home.status,200);
const healthResponse=await fetch(origin+'/api/health');
const health=await healthResponse.json();
assert.equal(healthResponse.status,200);
assert.equal(health.storage,'postgres');assert.equal(health.database,'connected');
const build=await (await fetch(origin+'/build-info.json')).json();
const manifest={
  date:'25/11/2026',checkedAt:new Date().toISOString(),
  suites:[
    {name:'Node: SQLite, cámara, PostgreSQL real TLS y Vercel',command:'npm test',passed:passedNode,failed:0,skipped:0},
    {name:'Navegador Edge contra Vercel y Supabase',command:'LABAR_E2E_URL=https://labar-theta.vercel.app python tests/e2e.py',passed:browser.passed,failed:browser.failed,skipped:0},
    {name:'API en producción con sesiones propias',command:'node tests/production-smoke.mjs https://labar-theta.vercel.app',passed:remote.passed,failed:remote.failed,skipped:0},
  ],
  production:{url:origin,checked:true,status:home.status,healthStatus:healthResponse.status,databaseConnected:true,health,build},
  notes:[
    'Total: 113 comprobaciones aprobadas; cero fallos en las ejecuciones finales. Sintaxis y compilación verificadas mediante npm run check y npm run build.',
    'Las 57 pruebas Node incluyen siete pruebas contra PostgreSQL 17 real temporal, con TLS validado; no utilizan la base remota.',
    'Las 46 comprobaciones de navegador y diez de API utilizaron el despliegue real de Vercel conectado a Supabase. Las sesiones de la prueba adicional de API se eliminaron al finalizar.',
    'El 404 inicial se corrigió con la salida public y la función API. El primer 503 de base remota se resolvió incorporando la autoridad pública oficial de Supabase, sin desactivar la validación TLS.',
    'La primera ejecución del navegador detectó una espera insuficiente durante el guardado de un reporte. Se añadió aria-busy a los formularios y la espera de automatización; el recorrido final completo aprobó 46/46.',
    'Reconocimiento QR y video comprobados con cámara virtual. No se afirma validación con cámara física ni certificación de seguridad eléctrica.',
  ],
};
await writeFile(new URL('verificacion.json',base),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({total:113,production:manifest.production},null,2));
