"""Comprobación puntual de desbordamiento con datos válidos de longitud máxima."""
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait

root = Path(__file__).resolve().parents[3]
with tempfile.TemporaryDirectory(prefix='labar-long-text-') as temporary:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    env = {**os.environ, 'HOST': '127.0.0.1', 'PORT': str(port), 'DB_PATH': str(Path(temporary) / 'qa.sqlite')}
    process = subprocess.Popen(['node', 'backend/server.mjs'], cwd=root, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    driver = None
    try:
        origin = f'http://127.0.0.1:{port}'
        for _ in range(80):
            try:
                urllib.request.urlopen(origin + '/api/health', timeout=1).close()
                break
            except Exception:
                time.sleep(.1)
        options = Options()
        options.add_argument('--headless=new')
        options.add_argument('--hide-scrollbars')
        options.add_experimental_option('mobileEmulation', {'deviceMetrics': {'width': 320, 'height': 844, 'pixelRatio': 1}, 'userAgent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36'})
        driver = webdriver.Edge(options=options)
        driver.get(origin)
        WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.CSS_SELECTOR, '[data-page="welcome"]'))
        result = driver.execute_async_script('''const done=arguments[0];(async()=>{
            let r=await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json','X-LabAR-Client':'web'},body:JSON.stringify({displayName:'A'.repeat(60),largeText:true,highContrast:true})});
            if(!r.ok)throw Error(await r.text());
            r=await fetch('/api/issues',{method:'POST',headers:{'Content-Type':'application/json','X-LabAR-Client':'web'},body:JSON.stringify({message:'X'.repeat(1000)})});
            if(!r.ok)throw Error(await r.text());done('ok')})().catch(e=>done(e.message));''')
        assert result == 'ok', result
        driver.execute_script("location.hash='#dashboard'")
        driver.refresh()
        WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.CSS_SELECTOR, '[data-page="dashboard"]'))
        out = Path(__file__).resolve().parent
        results = []
        for name, page in [('alias', 'dashboard'), ('reporte', 'privacy')]:
            driver.execute_script('location.hash=arguments[0]', '#' + page)
            WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.CSS_SELECTOR, '[data-page="' + page + '"]'))
            widths = driver.execute_script('return [innerWidth,document.documentElement.scrollWidth]')
            assert widths[1] <= widths[0], (name, widths)
            if name == 'reporte':
                report = driver.find_element(By.CSS_SELECTOR, '[data-page="privacy"] .sub-card')
                driver.execute_script('arguments[0].scrollIntoView({block:"center"})', report)
            driver.save_screenshot(str(out / f'qa_{name}_320.png'))
            message = f'PASS {name}: 320px, largeText + highContrast, sin desbordamiento {widths}'
            results.append(message)
            print(message)
        (out / 'resultado_textos_largos.txt').write_text('\n'.join(results) + '\n', encoding='utf-8')
    finally:
        if driver:
            driver.quit()
        process.terminate()
        try:
            process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
