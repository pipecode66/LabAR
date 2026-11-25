"""Pruebas de integración del navegador con API/SQLite temporal.

Ejecutar: python tests/e2e.py
Requiere Edge y las dependencias de tests/requirements.txt. Nunca usa data/labar.sqlite.
"""
from __future__ import annotations

import base64
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import traceback
import urllib.request
from datetime import datetime
from pathlib import Path

from PIL import Image

from selenium import webdriver
from selenium.common.exceptions import ElementClickInterceptedException, NoSuchElementException, StaleElementReferenceException
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('LABAR_E2E_OUTPUT', str(ROOT / 'docs' / 'final' / 'evidencias'))).resolve()
OUT.mkdir(parents=True, exist_ok=True)
results = []
shots = []
drivers = []


def record(name, condition=True, detail=''):
    if not condition:
        results.append({'name': name, 'passed': False, 'detail': detail})
        raise AssertionError(name + ': ' + detail)
    results.append({'name': name, 'passed': True, 'detail': detail})
    print('PASS | ' + name, flush=True)


def new_driver(downloads, *, camera='none', mobile=True):
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--hide-scrollbars')
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    options.add_experimental_option('prefs', {'download.default_directory': str(downloads),
        'download.prompt_for_download': False, 'profile.default_content_setting_values.media_stream_camera': 1 if camera != 'denied' else 2})
    if mobile:
        options.add_experimental_option('mobileEmulation', {'deviceMetrics': {'width': 390, 'height': 844, 'pixelRatio': 1},
            'userAgent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36'})
    else:
        options.add_argument('--window-size=1440,1000')
    if camera in ['valid', 'blank']:
        options.add_argument('--use-fake-device-for-media-stream')
        options.add_argument('--use-fake-ui-for-media-stream')
        filename = 'marcador-camara.y4m' if camera == 'valid' else 'sin-marcador.y4m'
        options.add_argument('--use-file-for-fake-video-capture=' + str(ROOT / 'tests/fixtures' / filename))
    elif camera == 'denied':
        options.add_argument('--use-fake-device-for-media-stream')
    driver = webdriver.Edge(options=options)
    driver.set_script_timeout(20)
    drivers.append(driver)
    return driver


def get(driver, selector):
    return driver.find_element(By.CSS_SELECTOR, selector)


def wait_page(driver, name):
    return WebDriverWait(driver, 12).until(EC.visibility_of_element_located((By.CSS_SELECTOR, f'[data-page="{name}"]')))


def click(driver, selector):
    def perform(browser):
        try:
            control = get(browser,selector)
            if not control.is_displayed() or not control.is_enabled(): return False
            browser.execute_script("arguments[0].scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})",control)
            control.click()
            return True
        except (StaleElementReferenceException,ElementClickInterceptedException,NoSuchElementException):
            return False
    WebDriverWait(driver,12).until(perform)
    WebDriverWait(driver,20).until(lambda browser: browser.execute_script('return !document.querySelector("[aria-busy=\\"true\\"]")'))


def fill(driver, selector, text):
    field = WebDriverWait(driver, 10).until(EC.visibility_of_element_located((By.CSS_SELECTOR, selector)))
    field.clear()
    field.send_keys(text)


def api(driver, path='/api/bootstrap', method='GET', body=None):
    return driver.execute_async_script('''const [path, method, body, done] = arguments;
      fetch(path, {method, headers:{'Content-Type':'application/json','X-LabAR-Client':'web'},
        ...(method === 'GET' ? {} : {body:JSON.stringify(body || {})})})
        .then(async r=>done({status:r.status,data:await r.json()})).catch(e=>done({error:e.message}));''', path, method, body)


def shot(driver, key, caption):
    WebDriverWait(driver, 7).until(lambda d: not d.find_elements(By.CSS_SELECTOR, '#toast:not([hidden])'))
    driver.execute_script('window.scrollTo(0,0)')
    dimensions = driver.execute_script('return {width:innerWidth,height:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)}')
    original_height = driver.execute_script('return innerHeight')
    # Expand only the viewport height: fixed navigation then sits below all page content.
    # Restore the actual test viewport immediately; no CSS, DOM or source is modified.
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride', {'width':dimensions['width'],'height':dimensions['height']+80,'deviceScaleFactor':1,'mobile':dimensions['width']<600})
    height = driver.execute_script('return Math.max(innerHeight,document.documentElement.scrollHeight)')
    image = driver.execute_cdp_cmd('Page.captureScreenshot', {'format':'png','captureBeyondViewport':True,
        'clip': {'x':0,'y':0,'width':dimensions['width'],'height':height,'scale':1}})
    driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride', {'width':dimensions['width'],'height':original_height,'deviceScaleFactor':1,'mobile':dimensions['width']<600})
    path = OUT / (key + '.png')
    path.write_bytes(base64.b64decode(image['data']))
    shots.append({'id':key,'path':str(path.relative_to(ROOT)).replace('\\','/'),'caption':caption})


def confirm_and_check(driver):
    wait_page(driver, 'scan')
    click(driver, '#confirm-yes')
    click(driver, '#confirm-continue')
    wait_page(driver, 'checklist')
    boxes = driver.find_elements(By.CSS_SELECTOR, 'input[name="check"]')
    assert len(boxes) == 5
    for checkbox in boxes:
        if not checkbox.is_selected():
            driver.execute_script('arguments[0].click()', checkbox)
    click(driver, '#checklist-continue')
    wait_page(driver, 'guide')


def begin_2d(driver):
    click(driver, '#start-practice')
    wait_page(driver, 'practice')
    # The detail page's primary action is linked to preparation.
    click(driver, '[data-action="prepare"]')
    wait_page(driver, 'prepare')
    click(driver, '#prepare-2d')
    wait_page(driver, 'scan')


temporary = tempfile.TemporaryDirectory(prefix='labar-e2e-')
work = Path(temporary.name)
with socket.socket() as binding:
    binding.bind(('127.0.0.1', 0))
    port = binding.getsockname()[1]
origin = os.environ.get('LABAR_E2E_URL', f'http://127.0.0.1:{port}').rstrip('/')
env = {**os.environ, 'HOST':'127.0.0.1','PORT':str(port),'DB_PATH':str(work/'e2e.sqlite')}
server_log = (work/'server.log').open('w', encoding='utf-8')
server = None if os.environ.get('LABAR_E2E_URL') else subprocess.Popen(['node','backend/server.mjs'], cwd=ROOT, env=env, stdout=server_log, stderr=subprocess.STDOUT)
failed = None
try:
    for _ in range(80):
        try:
            with urllib.request.urlopen(origin+'/api/health', timeout=1) as response:
                if response.status == 200: break
        except Exception: time.sleep(.1)
    else: raise RuntimeError('El servidor no inició: ' + (work/'server.log').read_text(encoding='utf-8'))
    record('Servidor/API disponible', detail='Servidor externo' if server is None else 'SQLite temporal')
    driver = new_driver(work)
    driver.get(origin)
    wait_page(driver, 'welcome')
    shot(driver, '01_bienvenida', 'Diseño de bienvenida integrado a partir de Stitch.')
    record('Bienvenida y recursos locales cargan', 'LabAR' in driver.title)
    click(driver, '#welcome-configure')
    wait_page(driver, 'profile')
    fill(driver, '[name="displayName"]', 'Juan Felipe')
    click(driver, '[name="largeText"]')
    click(driver, '[name="reducedMotion"]')
    shot(driver, '02_preferencias', 'Configuración de perfil, accesibilidad y personalización.')
    click(driver, '#profile-save')
    wait_page(driver, 'dashboard')
    boot = api(driver)['data']
    record('Perfil y preferencias se guardan en API', boot['profile']['displayName']=='Juan Felipe' and boot['profile']['largeText'])
    shot(driver, '03_inicio', 'Inicio personalizado con progreso e historial real de la sesión.')
    driver.refresh()
    wait_page(driver, 'dashboard')
    record('Perfil persiste al recargar', api(driver)['data']['profile']['displayName']=='Juan Felipe')
    driver.execute_script("location.hash = '#guide'")
    wait_page(driver, 'dashboard')
    record('Ruta directa de guía no permite saltar precondiciones', not driver.find_elements(By.CSS_SELECTOR, '[data-page="guide"]'))
    begin_2d(driver)
    click(driver, '#confirm-no')
    record('Discrepancia muestra bloqueo en interfaz', not get(driver, '#confirm-continue').is_enabled())
    shot(driver, '04_confirmacion', 'Confirmación manual del modelo y estado de discrepancia.')
    click(driver, '#confirm-yes')
    click(driver, '#confirm-continue')
    wait_page(driver, 'checklist')
    record('Checklist inicial bloquea su botón', not get(driver, '#checklist-continue').is_enabled())
    boxes = driver.find_elements(By.CSS_SELECTOR, 'input[name="check"]')
    for box in boxes[:4]: driver.execute_script('arguments[0].click()', box)
    record('Cuatro verificaciones siguen bloqueando avance', not get(driver, '#checklist-continue').is_enabled())
    driver.execute_script('arguments[0].click()', boxes[4])
    record('Cinco verificaciones habilitan avance', get(driver, '#checklist-continue').is_enabled())
    shot(driver, '05_lista', 'Lista preventiva completa; controles de interacción habilitados.')
    click(driver, '#checklist-continue')
    wait_page(driver, 'guide')
    shot(driver, '06_guia_2d', 'Guía 2D equivalente, paso a paso y con ayuda contextual.')
    record('Lista validada en servidor', api(driver)['data']['attempt']['status']=='active')
    click(driver, '#guide-next')
    WebDriverWait(driver, 8).until(lambda d: api(d)['data']['attempt']['step']==1)
    record('Progreso del paso persiste en la base de datos')
    driver.refresh()
    wait_page(driver, 'dashboard')
    click(driver, '#resume-attempt')
    # Resume must invalidate prior equipment/checklist before showing the retained step.
    WebDriverWait(driver, 10).until(lambda d: api(d)['data']['attempt']['status']=='preparing')
    record('Reanudación exige reconfirmación y lista', api(driver)['data']['attempt']['checklist']==[] and not api(driver)['data']['attempt']['equipmentConfirmed'])
    # Resume can land on practice, prepare or scan, according to the guided flow.
    page = get(driver, '[data-page]').get_attribute('data-page')
    if page=='practice': click(driver, '[data-action="prepare"]'); page='prepare'
    if page=='prepare': click(driver, '#prepare-2d')
    confirm_and_check(driver)
    record('Reanudación conserva el paso alcanzado', api(driver)['data']['attempt']['step']==1)
    for _ in range(4):
        click(driver, '#guide-next')
        time.sleep(.15)
    wait_page(driver, 'quiz')
    click(driver, '#quiz-submit')
    incomplete = api(driver)['data']
    record('Evaluación incompleta muestra aviso y no genera resultado', get(driver,'#quiz-error').is_displayed() and incomplete['attempt'] is not None and incomplete['attempt']['score'] is None and len(incomplete['history'])==0)
    for q in ['q1','q2','q3']: click(driver, f'input[name="{q}"][value="b"]')
    click(driver, '#quiz-submit')
    WebDriverWait(driver, 10).until(lambda d: len(api(d)['data']['history'])==1)
    record('Puntaje 3/3 calculado por servidor', api(driver)['data']['history'][0]['score']==3)
    shot(driver, '07_resultado', 'Evaluación y retroalimentación calculadas por el backend.')
    driver.refresh()
    wait_page(driver, 'dashboard')
    record('Historial persiste al recargar', len(api(driver)['data']['history'])==1)
    click(driver, 'a[href="#history"]')
    wait_page(driver, 'history')
    shot(driver, '08_historial', 'Historial de ejecuciones guardado por sesión anónima.')
    click(driver, '#history-report')
    fill(driver, '#issue-message', 'Revisión académica: comprobar el texto del selector con el docente.')
    click(driver, '#issue-submit')
    WebDriverWait(driver, 8).until(lambda d: len(api(d)['data']['issues'])==1)
    record('Reporte de inconsistencia se guarda realmente en la API')
    click(driver, 'a[href="#privacy"]')
    wait_page(driver, 'privacy')
    shot(driver, '09_privacidad', 'Controles para exportar datos y eliminar progreso o perfil.')
    click(driver, '#export-data')
    exported = WebDriverWait(driver, 10).until(lambda _: list(work.glob('*.json')) or False)
    data = json.loads(exported[0].read_text(encoding='utf-8'))
    record('Exportación descarga los datos propios', data['profile']['displayName']=='Juan Felipe' and len(data['attempts'])==1)
    record('Exportación incluye reporte y omite token de sesión', len(data['issues'])==1 and 'token' not in json.dumps(data).lower())
    click(driver, '#view-data')
    WebDriverWait(driver, 5).until(EC.visibility_of_element_located((By.ID,'detail-dialog')))
    record('Consulta de datos muestra el perfil propio', 'Juan Felipe' in get(driver,'#detail-body').text)
    click(driver,'#detail-close')
    click(driver,'#privacy-delete-progress')
    click(driver,'#confirm-dialog button[value="cancel"]')
    record('Cancelar borrado conserva historial', len(api(driver)['data']['history'])==1)
    click(driver,'#privacy-delete-progress')
    click(driver,'#confirm-action')
    wait_page(driver,'dashboard')
    erased = api(driver)['data']
    record('Borrar progreso elimina intentos y reportes', erased['history']==[] and erased['issues']==[] and erased['attempt'] is None)
    record('Borrar progreso conserva el perfil', erased['profile']['displayName']=='Juan Felipe' and erased['profile']['largeText'])
    click(driver,'a[href="#privacy"]')
    wait_page(driver,'privacy')
    click(driver,'#delete-data')
    click(driver,'#confirm-action')
    wait_page(driver,'welcome')
    cleared = api(driver)['data']
    record('Eliminar todos los datos reinicia perfil y sesión', cleared['profile']['displayName']=='Estudiante' and cleared['history']==[] and not cleared['profile']['largeText'])

    click(driver,'#welcome-configure')
    wait_page(driver,'profile')
    xss_alias = '<img src=x onerror=window.__xss=true>'
    fill(driver,'[name="displayName"]', xss_alias)
    click(driver,'[name="highContrast"]')
    click(driver,'input[name="format"][value="text"]')
    driver.execute_cdp_cmd('Network.enable',{})
    driver.execute_cdp_cmd('Network.setBlockedURLs',{'urls':[origin+'/api/profile']})
    click(driver,'#profile-save')
    WebDriverWait(driver, 8).until(EC.visibility_of_element_located((By.ID,'app-error')))
    record('Fallo de conexión conserva formulario y permite reintentar', get(driver,'#profile-save').is_enabled() and get(driver,'[name="displayName"]').get_attribute('value')==xss_alias)
    driver.execute_cdp_cmd('Network.setBlockedURLs',{'urls':[]})
    click(driver,'#profile-save')
    wait_page(driver,'dashboard')
    record('Alias se representa como texto sin ejecutar HTML', xss_alias in get(driver,'h1').text and not driver.execute_script('return !!window.__xss') and not driver.find_elements(By.CSS_SELECTOR,'#app img[src="x"]'))
    record('Formato y alto contraste se aplican y persisten', api(driver)['data']['profile']['format']=='text' and 'high-contrast' in get(driver,'html').get_attribute('class'))

    # Real QR decoder from the local jsQR bundle, without fabricating detections.
    record('Lector local disponible', driver.execute_script("return typeof window.jsQR === 'function'"))
    qr = driver.execute_async_script('''const done=arguments[0]; const image=new Image(); image.onload=()=>{
      const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
      const f=ctx.getImageData(0,0,c.width,c.height);const result=jsQR(f.data,c.width,c.height);done(result?.data||null);};image.src='/assets/marcador-labar.png';''')
    record('QR imprimible se decodifica con jsQR real', qr=='LABAR:DT830B:V1')
    # Camera behavior is tested in a separate browser/session with a real getUserMedia pipeline and a virtual source.
    camera_driver = new_driver(work, camera='valid')
    camera_driver.get(origin)
    wait_page(camera_driver, 'welcome')
    click(camera_driver, '#welcome-standard')
    wait_page(camera_driver, 'dashboard')
    click(camera_driver, '#start-practice')
    wait_page(camera_driver, 'practice')
    click(camera_driver, '[data-action="prepare"]')
    wait_page(camera_driver, 'prepare')
    click(camera_driver, '#prepare-camera')
    wait_page(camera_driver, 'scan')
    click(camera_driver, '#camera-start')
    WebDriverWait(camera_driver, 15).until(lambda d: d.execute_script('return [...document.querySelectorAll("video")].some(v=>v.srcObject?.active && v.videoWidth>0)') and get(d, '#confirm-yes').is_enabled())
    # A valid marker event must be visible in the scan state.
    record('Cámara virtual abre stream de video', camera_driver.execute_script('return [...document.querySelectorAll("video")].some(v=>v.srcObject?.active && v.videoWidth>0)'))
    shot(camera_driver, '10_camara', 'Cámara con fuente virtual de prueba y detección real del QR.')
    confirm_and_check(camera_driver)
    WebDriverWait(camera_driver, 15).until(lambda d: get(d,'#guide-next').is_enabled())
    record('Guía RA habilitada tras detectar marcador real en cámara virtual')
    shot(camera_driver, '11_guia_ra', 'Superposición contextual sobre el QR, procesada localmente.')
    camera_driver.execute_script('''const video=document.querySelector('video');const blank=document.createElement('canvas');
      blank.width=640;blank.height=480;blank.getContext('2d').fillRect(0,0,640,480);
      const stream=blank.captureStream(5);window.__testBlankStream=stream;video.srcObject=stream;video.play();''')
    wait_page(camera_driver, 'pause')
    shot(camera_driver, '12_pausa', 'Pausa de la ejecución y opciones de recuperación.')
    record('Pérdida de QR real en fuente virtual pausa la guía', api(camera_driver)['data']['attempt']['status']=='paused')
    click(camera_driver,'#pause-2d')
    wait_page(camera_driver,'guide')
    record('Recuperación tras perder QR conserva paso en 2D', api(camera_driver)['data']['attempt']['mode']=='2d' and api(camera_driver)['data']['attempt']['step']==0)
    click(camera_driver,'#guide-stop')
    wait_page(camera_driver,'pause')
    record('Botón Detener pausa la ejecución', api(camera_driver)['data']['attempt']['pauseReason']=='user')
    click(camera_driver,'#pause-teacher')
    WebDriverWait(camera_driver, 5).until(EC.visibility_of_element_located((By.ID,'detail-dialog')))
    record('Consulta al docente explica el mecanismo presencial', 'no contacta automáticamente' in get(camera_driver,'#detail-body').text)
    click(camera_driver,'#detail-close')

    denied = new_driver(work,camera='denied')
    denied.get(origin)
    denied.execute_cdp_cmd('Browser.setPermission', {'permission':{'name':'camera'},'setting':'denied','origin':origin})
    wait_page(denied,'welcome')
    click(denied,'#welcome-standard')
    wait_page(denied,'dashboard')
    record('Guía estándar desactiva personalización de forma persistente', api(denied)['data']['profile']['personalization'] is False)
    click(denied,'#start-practice')
    click(denied,'[data-action="prepare"]')
    wait_page(denied,'prepare')
    click(denied,'#prepare-camera')
    wait_page(denied,'scan')
    record('Modo AR bloquea confirmación antes de reconocer el marcador', not get(denied,'#confirm-yes').is_enabled())
    click(denied,'#camera-start')
    WebDriverWait(denied, 8).until(EC.visibility_of_element_located((By.ID,'app-error')))
    error_text = get(denied,'#app-error').text
    record('Permiso denegado muestra error y mantiene alternativa 2D', 'denegado' in error_text.lower() and get(denied,'#scan-use-2d').is_enabled(), error_text)
    blank = work/'imagen-sin-qr.png'
    Image.new('RGB',(400,400),'white').save(blank)
    get(denied,'#marker-file').send_keys(str(blank))
    WebDriverWait(denied, 8).until(lambda d: 'QR legible' in get(d,'#app-error').text)
    record('Imagen sin QR se rechaza sin habilitar confirmación', not get(denied,'#confirm-yes').is_enabled())
    get(denied,'#marker-file').send_keys(str(ROOT/'frontend/assets/marcador-labar.png'))
    WebDriverWait(denied, 10).until(lambda d: get(d,'#confirm-yes').is_enabled())
    record('Carga de imagen reconoce el QR y selecciona modo 2D', api(denied)['data']['attempt']['mode']=='2d')
    confirm_and_check(denied)
    for _ in range(5):
        click(denied,'#guide-next')
        time.sleep(.1)
    wait_page(denied,'quiz')
    for q in ['q1','q2','q3']: click(denied,f'input[name="{q}"][value="a"]')
    click(denied,'#quiz-submit')
    WebDriverWait(denied, 8).until(lambda d: len(api(d)['data']['history'])==1)
    record('Respuestas erróneas generan 0/3 y tres temas de repaso', api(denied)['data']['history'][0]['score']==0 and len(api(denied)['data']['history'][0]['result']['reviewTopics'])==3)
    shot(denied,'14_repaso','Resultado con errores y recomendaciones de repaso por concepto.')

    # Responsive layouts and local assets.
    desktop = new_driver(work, mobile=False)
    desktop.get(origin)
    wait_page(desktop,'welcome')
    shot(desktop,'13_escritorio','Diseño adaptable a escritorio con identidad visual de Stitch.')
    for width in [320,390,768,1440]:
        desktop.execute_cdp_cmd('Emulation.setDeviceMetricsOverride', {'width':width,'height':900,'deviceScaleFactor':1,'mobile':width<600})
        record(f'Bienvenida sin desbordamiento horizontal a {width}px', desktop.execute_script('return document.documentElement.scrollWidth<=innerWidth'))
    severe = [item for item in driver.get_log('browser') if item['level']=='SEVERE' and ('TypeError' in item['message'] or 'SyntaxError' in item['message'] or 'ReferenceError' in item['message'])]
    record('Recorrido sin errores JavaScript no controlados', not severe, str(severe))
except Exception as error:
    failed = str(error)
    print('FAIL | ' + failed, flush=True)
    traceback.print_exc()
    if drivers:
        try: shot(drivers[-1], 'fallo_ultima_pantalla', 'Pantalla durante el fallo de prueba; no es evidencia de aprobación.')
        except Exception: pass
finally:
    for browser in drivers:
        try: browser.quit()
        except Exception: pass
    if server is not None:
        server.terminate()
        try: server.wait(timeout=10)
        except subprocess.TimeoutExpired: server.kill(); server.wait()
    server_log.close()
    summary = {'date':datetime.now().astimezone().isoformat(),'passed':sum(r['passed'] for r in results),
        'failed':sum(not r['passed'] for r in results) + int(bool(failed) and not any(not r['passed'] for r in results)),
        'error':failed,'results':results,'screenshots':shots,
        'camera':{'physicalDeviceTested':False,'imageMarkerTested':any(r['name'].startswith('QR imprimible') and r['passed'] for r in results),
                  'fakeCameraTested':any(r['name'].startswith('Guía RA habilitada') and r['passed'] for r in results)},
        'scope':['Edge emulación móvil y escritorio', 'API externa: '+origin if server is None else 'API real con SQLite temporal','marcador QR y cámara virtual; sin hardware físico']}
    (OUT.parent/'resultado_e2e.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT.parent/'resultado_e2e.txt').write_text('\n'.join(('PASS' if r['passed'] else 'FAIL')+' | '+r['name'] for r in results) + ('\nERROR: '+failed if failed else '')+'\n',encoding='utf-8')
    temporary.cleanup()
if failed: sys.exit(1)
print(f"PASS: {summary['passed']} comprobaciones de integración.")
