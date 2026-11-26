"""Regresión de origen en WebKit con emulación iPhone; no prueba hardware físico.

python tests/mobile_webkit.py https://labar-theta.vercel.app [--baseline]
Requiere pip install playwright y python -m playwright install webkit.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

origin = sys.argv[1].rstrip('/')
baseline = '--baseline' in sys.argv
out = Path(__file__).resolve().parents[1] / 'docs' / 'correccion-movil'
out.mkdir(parents=True, exist_ok=True)
results = []
requests = []
def record(name, condition):
    results.append({'name': name, 'passed': bool(condition)})
    assert condition, name
    print('PASS | '+name, flush=True)

error = None
with sync_playwright() as p:
    browser = p.webkit.launch()
    context = browser.new_context(**p.devices['iPhone 13'])
    page = context.new_page()
    def observe(response):
        if '/api/' in response.url and response.request.method != 'GET':
            requests.append({'path':response.url.split('/api/',1)[1],
                             'method':response.request.method, 'status':response.status,
                             'origin':response.request.all_headers().get('origin')})
    page.on('response', observe)
    try:
        response = page.goto(origin)
        expect(page.locator('#welcome-standard')).to_be_visible()
        page.locator('#welcome-standard').click()
        if baseline:
            expect(page.locator('#app-error')).to_be_visible()
            record('Fallo previo reproducido en WebKit', 'misma aplicación' in page.locator('#app-error').inner_text())
            page.screenshot(path=str(out/'webkit_antes.png'), full_page=True)
        else:
            expect(page.locator('[data-page="dashboard"]')).to_be_visible()
            record('Guía estándar guarda preferencias en WebKit móvil',True)
            record('Política conserva el origen de la aplicación',response.headers.get('referrer-policy')=='same-origin')
            page.locator('#start-practice').click()
            page.locator('[data-action="prepare"]').click()
            page.locator('#prepare-2d').click()
            expect(page.locator('[data-page="scan"]')).to_be_visible()
            record('Crea práctica desde iPhone emulado',True)
            page.locator('#confirm-yes').click()
            page.locator('#confirm-continue').click()
            for box in page.locator('input[name="check"]').all(): box.check()
            page.locator('#checklist-continue').click()
            expect(page.locator('[data-page="guide"]')).to_be_visible()
            record('Confirma equipo y guarda cinco verificaciones',True)
            page.screenshot(path=str(out/'webkit_guia.png'), full_page=True)
            for _ in range(5):
                with page.expect_response(lambda r:'/progress' in r.url and r.request.method=='POST') as saved:
                    page.locator('#guide-next').click()
                assert saved.value.status==200
            expect(page.locator('[data-page="quiz"]')).to_be_visible()
            for q in ['q1','q2','q3']: page.locator(f'input[name="{q}"][value="b"]').check()
            page.locator('#quiz-submit').click()
            expect(page.locator('#new-attempt')).to_be_visible()
            record('Completa guía y evaluación en WebKit móvil',True)
            page.reload()
            expect(page.locator('[data-page="dashboard"]')).to_be_visible()
            data = page.evaluate('fetch("/api/bootstrap").then(r=>r.json())')
            record('Resultado persiste al recargar',data['history'][0]['score']==3)
            record('Todas las mutaciones envían origen válido', bool(requests) and all(r['origin']==origin and r['status']<400 for r in requests))
            page.screenshot(path=str(out/'webkit_despues.png'), full_page=True)
    except Exception as failure:
        error = str(failure)
        print('FAIL | '+error, flush=True)
    finally:
        # El navegador ejecuta la misma política explícita de la corrección.
        try:
            page.evaluate('fetch("/api/data",{method:"DELETE",referrerPolicy:"same-origin",headers:{"Content-Type":"application/json","X-LabAR-Client":"web"},body:"{}"})')
        except Exception: pass
        context.close(); browser.close()
report={'date':datetime.now(timezone.utc).isoformat(),'url':origin,'baseline':baseline,
        'engine':'WebKit, emulación iPhone 13; sin dispositivo físico',
        'passed':sum(r['passed'] for r in results),'failed':int(bool(error)),
        'error':error,'results':results,'requests':requests}
(out/('webkit_antes.json' if baseline else 'webkit_despues.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8',newline='\n')
if error: sys.exit(1)
