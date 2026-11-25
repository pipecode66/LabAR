/** Prueba explícita remota: usa y elimina únicamente sus propias sesiones. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const origin = process.argv[2];
if (!origin || new URL(origin).origin !== origin) throw new Error('Indica un origen HTTPS sin barra final.');
const results = [];
const clients = [];
function check(name, action) { action(); results.push({name, passed:true}); console.log('PASS | '+name); }
function client() {
  let cookie = '';
  const request = async (path, method='GET', body) => {
    const response = await fetch(origin+path, {method, headers:{
      ...(cookie ? {Cookie:cookie} : {}),
      ...(method!=='GET' ? {Origin:origin,'X-LabAR-Client':'web','Content-Type':'application/json'} : {}),
    }, ...(method!=='GET' ? {body:JSON.stringify(body || {})} : {})});
    const next = response.headers.get('set-cookie');
    if (next) cookie = next.split(';')[0];
    return {status:response.status,data:await response.json(),headers:response.headers};
  };
  clients.push(request); return request;
}
let failure = null;
try {
  const health = await (await fetch(origin+'/api/health')).json();
  check('Supabase conectado desde Vercel',()=>assert.deepEqual([health.storage,health.database],['postgres','connected']));
  const one = client(), other = client();
  const boot = await one('/api/bootstrap');
  check('Sesión segura HttpOnly y Secure',()=>assert.match(boot.headers.get('set-cookie'),/HttpOnly.*Secure|Secure.*HttpOnly/i));
  await one('/api/profile','PUT',{displayName:'QA despliegue',largeText:true});
  const saved = await one('/api/bootstrap');
  check('Perfil persiste entre solicitudes remotas',()=>assert.equal(saved.data.profile.largeText,true));
  const attempt = await one('/api/attempts','POST',{mode:'2d'});
  check('Ejecución remota creada',()=>assert.equal(attempt.status,201));
  const base = '/api/attempts/'+attempt.data.id;
  await other('/api/bootstrap');
  const denied = await other(base+'/confirm','POST',{matches:true,model:'DT-830B'});
  check('Otra sesión no puede modificar la ejecución',()=>assert.equal(denied.status,404));
  const skipped = await one(base+'/progress','POST',{step:0,complete:true});
  check('Servidor exige preparación',()=>assert.equal(skipped.status,409));
  await one(base+'/confirm','POST',{matches:true,model:'DT-830B'});
  await one(base+'/checklist','POST',{checks:['equipment','ports','scale','source','supervision']});
  for(let step=0;step<5;step++) {
    const progressed = await one(base+'/progress','POST',{step,complete:true});
    assert.equal(progressed.status,200);
  }
  const quiz = await one(base+'/quiz','POST',{answers:{q1:'b',q2:'b',q3:'b'}});
  check('Cinco pasos y evaluación 3/3 en PostgreSQL',()=>assert.equal(quiz.data.score,3));
  const issue = await one('/api/issues','POST',{message:'Prueba automatizada de despliegue; se elimina al finalizar.'});
  check('Incidencia almacenada',()=>assert.equal(issue.status,201));
  const exported = await one('/api/export');
  check('Exportación incluye historial e incidencia',()=>{assert.equal(exported.data.attempts.length,1);assert.equal(exported.data.issues.length,1);});
  const removed = await one('/api/progress','DELETE');
  assert.equal(removed.status,200);
  const empty = await one('/api/bootstrap');
  check('Borrado de progreso conserva perfil',()=>{assert.equal(empty.data.history.length,0);assert.equal(empty.data.profile.largeText,true);});
} catch(error) { failure=error.message; console.error('FAIL | '+failure); }
finally {
  for(const request of clients) {
    try { assert.equal((await request('/api/data','DELETE')).status,200); }
    catch(error) { failure ||= 'No se pudo limpiar una sesión de prueba: '+error.message; }
  }
}
const report={date:new Date().toISOString(),origin,passed:results.length,failed:failure?1:0,error:failure,results,ownSessionsDeleted:!failure};
if(process.argv[3]) await writeFile(process.argv[3],JSON.stringify(report,null,2)+'\n');
if(failure) process.exitCode=1;
