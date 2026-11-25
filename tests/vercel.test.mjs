import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../backend/app.mjs';
import { createVercelHandler, normalizeApiUrl, vercelOptions } from '../api/index.mjs';
import { buildVercel } from '../scripts/build-vercel.mjs';

const privateUrl = 'postgresql://example:private-sentinel@example.invalid:6543/postgres';

function response() {
  const headers = new Map();
  return {
    headers,
    statusCode: null,
    headersSent: false,
    body: '',
    setHeader(name,value) { headers.set(name.toLowerCase(),value); },
    writeHead(status,extra={}) { this.statusCode=status;this.headersSent=true;for(const [name,value] of Object.entries(extra)) this.setHeader(name,value); },
    end(body='') { this.body+=body; },
  };
}

test('Vercel: configuración usa URL privada, cookie Secure y lista exacta de orígenes', () => {
  const options=vercelOptions({POSTGRES_URL:privateUrl,VERCEL_URL:'labar-preview.vercel.app',PUBLIC_ORIGIN:'https://labar.example.edu',POSTGRES_SSL_CA:'linea1\\nlinea2'});
  assert.equal(options.databaseUrl,privateUrl);
  assert.equal(options.secureCookie,true);
  assert.ok(options.allowedOrigins.includes('https://labar-theta.vercel.app'));
  assert.ok(options.allowedOrigins.includes('https://labar-preview.vercel.app'));
  assert.ok(options.allowedOrigins.includes('https://labar.example.edu'));
  assert.equal(options.postgresOptions.sslCa,'linea1\nlinea2');
  for(const env of [{},{POSTGRES_URL:' '},{POSTGRES_URL:privateUrl,VERCEL_URL:'usuario:clave@example.edu'},
    {POSTGRES_URL:privateUrl,PUBLIC_ORIGIN:'https://example.edu/ruta'}, {POSTGRES_URL:privateUrl,PUBLIC_ORIGIN:'https://usuario:clave@example.edu'}]) {
    assert.throws(()=>vercelOptions(env));
  }
});

test('Vercel: rewrite conserva ruta API y parámetros públicos, retira parámetro interno', () => {
  assert.equal(normalizeApiUrl('/api/index?__labar_path=health'),'/api/health');
  assert.equal(normalizeApiUrl('/api/index.mjs?__labar_path=attempts/abc/progress&foo=bar'),'/api/attempts/abc/progress?foo=bar');
  assert.equal(normalizeApiUrl('/api/health?__labar_path=profile'),'/api/health');
  for(const path of ['../backend/app.mjs','/health','health?x=1','health#fragment']) {
    assert.throws(()=>normalizeApiUrl('/api/index?__labar_path='+encodeURIComponent(path)),/Ruta API/);
  }
});

test('Vercel: sin POSTGRES_URL devuelve503 sin crear SQLite ni instancia volátil', async () => {
  let calls=0;
  const handler=createVercelHandler({env:{},appFactory:()=>{calls++;throw new Error('No debería ejecutarse');}});
  const res=response();
  await handler({url:'/api/bootstrap'},res);
  assert.equal(res.statusCode,503);
  assert.equal(calls,0);
  assert.equal(JSON.parse(res.body).error.code,'DATABASE_UNAVAILABLE');
  assert.match(res.headers.get('cache-control'),/no-store/);
});

test('Vercel: reutiliza aplicación y no necesita listen() para responder', async () => {
  let created=0,closed=0;
  const handler=createVercelHandler({env:{POSTGRES_URL:privateUrl},appFactory:()=>{
    created++;
    return {ready:Promise.resolve(),handler:async(req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({path:req.url}));},close:async()=>{closed++;}};
  }});
  try {
    for(const path of ['health','bootstrap']) {
      const res=response();await handler({url:'/api/index?__labar_path='+path},res);
      assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.body).path,'/api/'+path);
    }
    assert.equal(created,1);
  }finally{await handler.close();}
  assert.equal(closed,1);
});

test('Vercel: fallo de conexión no expone credenciales y se reintenta con nueva aplicación', async () => {
  let created=0,closed=0;
  const handler=createVercelHandler({env:{POSTGRES_URL:privateUrl},appFactory:()=>{
    const first=++created===1;
    return {ready:first?Promise.reject(new Error('Falló '+privateUrl)):Promise.resolve(),handler:async(req,res)=>{res.writeHead(200);res.end('{}');},close:async()=>{closed++;}};
  }});
  try {
    const failed=response();await handler({url:'/api/health'},failed);
    assert.equal(failed.statusCode,503);assert.equal(failed.body.includes('private-sentinel'),false);
    assert.equal(failed.headers.get('retry-after'),'10');assert.equal(closed,1);
    const recovered=response();await handler({url:'/api/health'},recovered);
    assert.equal(recovered.statusCode,200);assert.equal(created,2);
  }finally{await handler.close();}
});

test('Vercel: rechaza rutas de rewrite inválidas antes de abrir conexión', async () => {
  let calls=0;
  const handler=createVercelHandler({env:{POSTGRES_URL:privateUrl},appFactory:()=>{calls++;}});
  const res=response();await handler({url:'/api/index?__labar_path=..%2Fsecret'},res);
  assert.equal(res.statusCode,400);assert.equal(calls,0);
});

test('Vercel: adapter real conserva protección de origen y cookies a través del rewrite', async () => {
  const handler=createVercelHandler({env:{POSTGRES_URL:privateUrl},appFactory:options=>createApp({databasePath:':memory:',allowedOrigins:options.allowedOrigins,secureCookie:options.secureCookie})});
  const server=createServer(handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    const boot=await fetch(origin+'/api/index?__labar_path=bootstrap');
    assert.equal(boot.status,200);
    const cookie=boot.headers.get('set-cookie');assert.match(cookie,/Secure/);
    const request=async(publicOrigin)=>fetch(origin+'/api/index?__labar_path=profile',{
      method:'PUT',headers:{Cookie:cookie.split(';')[0],Origin:publicOrigin,'X-LabAR-Client':'web','Content-Type':'application/json'},body:JSON.stringify({audio:true}),
    });
    assert.equal((await request('https://labar-theta.vercel.app')).status,200);
    assert.equal((await request('https://sitio-ajeno.example')).status,403);
  }finally{await new Promise(resolve=>server.close(resolve));await handler.close();}
});

async function buildFixture() {
  const root=await mkdtemp(join(tmpdir(),'labar-build-'));
  for(const directory of ['frontend/assets','frontend/vendor','frontend/.private','backend','docs','data']) await mkdir(join(root,directory),{recursive:true});
  await writeFile(join(root,'package.json'),JSON.stringify({version:'1.0.0'}));
  await writeFile(join(root,'frontend/index.html'),'<!doctype html><title>LabAR</title>');
  await writeFile(join(root,'frontend/app.js'),'console.log("frontend");');
  await writeFile(join(root,'frontend/styles.css'),'body{color:black}');
  await writeFile(join(root,'frontend/assets/marker.svg'),'<svg/>');
  await writeFile(join(root,'frontend/vendor/jsQR.LICENSE'),'Licencia original');
  await writeFile(join(root,'frontend/README.md'),'No distribuir como recurso web');
  await writeFile(join(root,'frontend/.env'),'PRIVATE_SENTINEL');
  await writeFile(join(root,'frontend/.private/config.js'),'PRIVATE_SENTINEL');
  await writeFile(join(root,'backend/app.mjs'),'PRIVATE_BACKEND_SENTINEL');
  await writeFile(join(root,'docs/informe.pdf'),'PRIVATE_DOCUMENT_SENTINEL');
  await writeFile(join(root,'data/labar.sqlite'),'PRIVATE_DATABASE_SENTINEL');
  return root;
}

test('Vercel: build publica únicamente recursos del frontend y datos públicos de versión', async () => {
  const root=await buildFixture();
  try {
    const built=await buildVercel({projectRoot:root,commit:'test-commit'});
    assert.equal(built.outputDirectory,join(root,'public'));
    for(const file of ['index.html','app.js','styles.css','assets/marker.svg','vendor/jsQR.LICENSE']) assert.ok((await stat(join(root,'public',file))).isFile());
    for(const file of ['README.md','.env','.private/config.js','backend/app.mjs','docs/informe.pdf','data/labar.sqlite']) {
      await assert.rejects(stat(join(root,'public',file)),error=>error.code==='ENOENT');
    }
    const info=JSON.parse(await readFile(join(root,'public/build-info.json'),'utf8'));
    assert.equal(info.commit,'test-commit');assert.equal(info.version,'1.0.0');assert.equal(JSON.stringify(info).includes('PRIVATE'),false);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('Vercel: build rechaza enlace de salida y conserva el directorio apuntado', async () => {
  const root=await buildFixture();
  const outside=await mkdtemp(join(tmpdir(),'labar-output-target-'));
  try {
    await writeFile(join(outside,'conservar.txt'),'contenido a conservar');
    await symlink(outside,join(root,'public'),process.platform==='win32'?'junction':'dir');
    await assert.rejects(buildVercel({projectRoot:root}),/enlace simbólico/);
    assert.equal(await readFile(join(outside,'conservar.txt'),'utf8'),'contenido a conservar');
  }finally{await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});}
});

test('Vercel: configuración entrega public y conserva rutas API como función Node', async () => {
  const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.equal(config.outputDirectory,'public');assert.equal(config.buildCommand,'npm run build');
  assert.equal(config.installCommand,'npm ci');assert.equal(config.framework,null);
  assert.equal(config.functions['api/index.mjs'].includeFiles,'database/**');
  assert.ok(config.rewrites.some(rule=>rule.source==='/api/:path*' && rule.destination.includes('/api/index')));
  assert.ok(config.headers[0].headers.some(header=>header.key==='Permissions-Policy' && header.value.includes('camera=(self)')));
});
