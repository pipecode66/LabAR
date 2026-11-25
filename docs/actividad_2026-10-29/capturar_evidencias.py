"""Captura el frontend existente, verifica el recorrido y registra su procedencia.

No cambia el código del producto. Requiere Selenium y Microsoft Edge.
"""

from __future__ import annotations

import base64
import hashlib
import html
import json
import subprocess
import threading
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait


BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
IMAGES = BASE / "evidencias"
IMAGES.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, BrokenPipeError):
            pass


server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}"
checks = []
captures = []


def verify(name, condition, detail):
    if not condition:
        raise AssertionError(name + ": " + detail)
    checks.append({"prueba": name, "resultado": "APROBADA", "detalle": detail})


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def capture(driver, filename, description, kind="interfaz", source=None):
    driver.execute_script("window.scrollTo(0,0)")
    dimensions = driver.execute_script(
        "return {width:innerWidth,height:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)}"
    )
    shot = driver.execute_cdp_cmd(
        "Page.captureScreenshot",
        {"format": "png", "captureBeyondViewport": True,
         "clip": {"x": 0, "y": 0, "width": dimensions["width"], "height": dimensions["height"], "scale": 1}},
    )
    destination = IMAGES / filename
    destination.write_bytes(base64.b64decode(shot["data"]))
    captures.append({"archivo": str(destination.relative_to(ROOT)).replace("\\", "/"),
                     "descripcion": description, "tipo": kind, "dimensiones": dimensions,
                     "fuente": source, "sha256": sha(destination)})


options = Options()
options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
options.add_argument("--hide-scrollbars")
options.add_experimental_option("mobileEmulation", {
    "deviceMetrics": {"width": 390, "height": 844, "pixelRatio": 1},
    "userAgent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36",
})
driver = webdriver.Edge(options=options)
wait = WebDriverWait(driver, 8)


def element(selector):
    return driver.find_element(By.CSS_SELECTOR, selector)


def click(selector):
    element(selector).click()


def visible(name):
    return wait.until(lambda _: element(f'[data-screen="{name}"]').is_displayed())


try:
    driver.get(url + "/frontend/")
    visible("home")
    verify("Inicio y estructura", len(driver.find_elements(By.CSS_SELECTOR, "[data-screen]")) == 8,
           "Se encuentran ocho vistas; la vista inicial es home.")
    capture(driver, "E01_inicio.png", "Inicio: propósito, advertencia y acceso al recorrido.")
    click('[data-go="practice"]')
    visible("practice")
    verify("Selección de práctica", not element("#practice-continue").is_enabled(),
           "Continuar permanece desactivado antes de seleccionar la práctica.")
    click("#practice-card")
    verify("Práctica seleccionada", element("#practice-continue").is_enabled(),
           "La selección del DT-830B habilita Continuar.")
    capture(driver, "E02_practica.png", "Única práctica habilitada y selección activa.")
    click("#practice-continue")
    visible("scan")
    click("#scan-button")
    wait.until(lambda _: element("#scan-continue").is_enabled())
    verify("Escaneo simulado", "Puesto LAB-01" in element("#scan-result").text,
           "El temporizador muestra el resultado fijo LAB-01; no accede a cámara.")
    capture(driver, "E03_escaneo.png", "Resultado de escaneo simulado: puesto LAB-01.")
    click("#scan-continue")
    visible("confirm")
    click("#match-no")
    verify("Equipo diferente", element("#mismatch-notice").is_displayed() and not element("#confirm-continue").is_enabled(),
           "No coincide muestra aviso y mantiene desactivado el botón de avance.")
    capture(driver, "E04_equipo_no_coincide.png", "Discrepancia del equipo y botón de avance desactivado.")
    click("#match-yes")
    click("#confirm-continue")
    visible("checklist")
    boxes = driver.find_elements(By.CSS_SELECTOR, "#safety-checklist input")
    verify("Lista inicial", len(boxes) == 5 and not element("#checklist-continue").is_enabled(),
           "Existen cinco casillas y el botón inicia desactivado.")
    for box in boxes[:4]:
        driver.execute_script("arguments[0].click()", box)
    verify("Lista incompleta", not element("#checklist-continue").is_enabled() and "4 de 5" in element("#check-count").text,
           "Con cuatro verificaciones no se habilita Iniciar guía visual.")
    capture(driver, "E05_checklist_pendiente.png", "Cuatro de cinco verificaciones; avance desactivado.")
    driver.execute_script("arguments[0].click()", boxes[4])
    verify("Lista completa", element("#checklist-continue").is_enabled() and "5 de 5" in element("#check-count").text,
           "Con cinco verificaciones se habilita el botón en el recorrido normal.")
    capture(driver, "E06_checklist_completa.png", "Cinco verificaciones y botón de inicio habilitado.")
    click("#checklist-continue")
    visible("guide")
    click("#guide-next")
    verify("Guía dinámica", "Ubica los puertos" in element("#guide-title").text,
           "Siguiente cambia del paso 1 al paso 2 y actualiza la instrucción.")
    capture(driver, "E07_guia_ar.png", "Segundo paso de la guía: puertos COM y VΩmA; AR simulada.")
    step_before = element("#guide-counter").text
    click("#simulate-loss")
    visible("lost")
    verify("Pérdida simulada", "No cambies conexiones" in element('[data-screen="lost"]').text,
           "Se presenta un estado de pausa con alternativas de recuperación.")
    capture(driver, "E08_marcador_perdido.png", "Pausa ante pérdida de marcador simulada.")
    click("#lost-use-2d")
    visible("guide")
    verify("Alternativa 2D", element("#simulation-label").text == "Guía 2D" and element("#guide-counter").text == step_before,
           "El modo 2D conserva el segundo paso y actualiza la etiqueta de modalidad.")
    capture(driver, "E09_guia_2d.png", "Guía 2D en el mismo paso recuperado.")
    while element('[data-screen="guide"]').is_displayed():
        click("#guide-next")
    visible("quiz")
    click('#quiz-form button[type="submit"]')
    verify("Evaluación incompleta", element("#quiz-error").is_displayed() and not element("#quiz-result").is_displayed(),
           "El formulario solicita contestar las tres preguntas y no calcula un resultado incompleto.")
    for question in ("q1", "q2", "q3"):
        click(f'input[name="{question}"][value="b"]')
    click('#quiz-form button[type="submit"]')
    verify("Puntuación correcta", "3 de 3" in element("#result-score").text,
           "Las tres respuestas correctas producen un resultado de 3/3.")
    capture(driver, "E10_resultado.png", "Resultado verificable: tres respuestas correctas.")
    click("#repeat-quiz")
    for question in ("q1", "q2", "q3"):
        click(f'input[name="{question}"][value="a"]')
    click('#quiz-form button[type="submit"]')
    verify("Retroalimentación de repaso", "0 de 3" in element("#result-score").text and "Conviene repasar" in element("#result-title").text,
           "Tres respuestas incorrectas generan 0/3 y recomendación de repaso.")
    verify("Ancho móvil", driver.execute_script("return document.documentElement.scrollWidth <= innerWidth"),
           "La vista comprobada no presenta desbordamiento horizontal a 390 px.")
    driver.refresh()
    visible("home")
    verify("Estado temporal", driver.execute_script("return localStorage.length===0 && sessionStorage.length===0"),
           "La recarga vuelve al inicio; no hay preferencias ni progreso persistidos en este origen limpio.")
    capabilities = {"navegador": driver.capabilities.get("browserName"),
                    "version": driver.capabilities.get("browserVersion"),
                    "viewport": "390 × 844 px; emulación móvil de escritorio"}
finally:
    driver.quit()


def code_view(source, first, last, output_name, title):
    lines = (ROOT / source).read_text(encoding="utf-8-sig").splitlines()
    rows = "".join(
        f'<div class="line"><span class="num">{i}</span><code>{html.escape(lines[i-1])}</code></div>'
        for i in range(first, last + 1)
    )
    content = f'''<!doctype html><html lang="es"><meta charset="utf-8"><title>{html.escape(title)}</title>
    <style>*{{box-sizing:border-box}}html,body{{margin:0;background:#fff;color:#142a4a}}
    body{{font:18px "Segoe UI",sans-serif;width:1000px}}header{{padding:24px 30px;background:#eef5f6;border-bottom:2px solid #08766e}}
    h1{{font-size:23px;margin:0 0 8px}}p{{margin:0;line-height:1.5}}main{{padding:20px 20px 24px}}
    .line{{display:flex;align-items:flex-start;min-height:25px}}.num{{flex:0 0 48px;color:#667780;text-align:right;padding-right:15px;font:17px/25px Consolas,monospace}}
    code{{white-space:pre-wrap;overflow-wrap:anywhere;font:18px/25px Consolas,monospace;flex:1;color:#153948}}
    footer{{border-top:1px solid #d4e0e3;padding:16px 30px;font-size:15px;color:#526168}}</style>
    <header><h1>{html.escape(title)}</h1><p>{source} · líneas {first}–{last}</p></header>
    <main>{rows}</main><footer>Extracto leído directamente del archivo del proyecto. Sin cambios en el código.</footer></html>'''
    destination = BASE / output_name
    destination.write_text(content, encoding="utf-8")
    return destination


desktop_options = Options()
desktop_options.add_argument("--headless=new")
desktop_options.add_argument("--hide-scrollbars")
desktop_options.add_argument("--window-size=1000,1100")
desktop = webdriver.Edge(options=desktop_options)
try:
    for source, first, last, filename, shot, title in [
        ("frontend/app.js", 178, 208, "visor_controles.html", "E11_codigo_controles.png", "Confirmación y lista preventiva"),
        ("frontend/app.js", 262, 293, "visor_evaluacion.html", "E12_codigo_evaluacion.png", "Validación y puntuación de la evaluación"),
    ]:
        path = code_view(source, first, last, filename, title)
        desktop.get(url + "/" + str(path.relative_to(ROOT)).replace("\\", "/"))
        desktop.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", {"width": 1000, "height": 100, "deviceScaleFactor": 1, "mobile": False})
        capture(desktop, shot, title, "codigo", {"archivo": source, "primera_linea": first, "ultima_linea": last})
finally:
    desktop.quit()
    server.shutdown()
    server.server_close()

syntax = subprocess.run(["node", "--check", str(ROOT / "frontend/app.js")], capture_output=True, text=True, encoding="utf-8")
verify("Sintaxis JavaScript", syntax.returncode == 0, "node --check frontend/app.js finaliza con código 0.")
source_files = ["frontend/index.html", "frontend/styles.css", "frontend/app.js", "frontend/README.md", "docs/_qa/test_frontend.py"]
manifest = {
    "actividad": "Actividad 29/10/2026",
    "proyecto": "LabAR Seguro",
    "captura_iso8601": datetime.now().astimezone().isoformat(),
    "entorno": capabilities,
    "resultado": "APROBADO" if all(x["resultado"] == "APROBADA" for x in checks) else "FALLO",
    "pruebas": checks,
    "capturas": captures,
    "fuentes": [{"archivo": name, "sha256": sha(ROOT / name),
                  "lineas": len((ROOT / name).read_text(encoding="utf-8-sig").splitlines())} for name in source_files],
}
(BASE / "verificacion.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
log = ["LabAR Seguro | verificación del frontend existente", "Actividad 29/10/2026", ""]
log.extend(f'APROBADA | {item["prueba"]}: {item["detalle"]}' for item in checks)
log.extend(["", f"TOTAL: {len(checks)} comprobaciones aprobadas.", f"CAPTURAS: {len(captures)}.",
            "No se verificó hardware real, seguimiento AR ni un servicio API."])
(BASE / "resultado_verificacion.txt").write_text("\n".join(log), encoding="utf-8")
print(f"PASS: {len(checks)} comprobaciones; {len(captures)} capturas.")
print(f"Evidencias: {IMAGES}")
