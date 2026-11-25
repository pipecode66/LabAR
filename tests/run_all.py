"""Ejecuta verificaciones de código, API/cámara e integración y conserva evidencia."""
from __future__ import annotations
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'final'
OUT.mkdir(parents=True, exist_ok=True)
environment = {**os.environ, 'PYTHONIOENCODING':'utf-8'}


def run(args, filename):
    result = subprocess.run(args, cwd=ROOT, env=environment, capture_output=True, text=True, encoding='utf-8', errors='replace')
    output = result.stdout + result.stderr
    (OUT / filename).write_text(output, encoding='utf-8')
    print(output, flush=True)
    return result.returncode, output


source_paths = [*sorted((ROOT/'backend').glob('*.mjs')), *sorted((ROOT/'frontend').glob('*.js'))]
for path in source_paths:
    code, _ = run(['node','--check',str(path)], 'ultima_sintaxis.txt')
    if code: sys.exit(code)
print('PASS | Sintaxis de todos los módulos JavaScript')
code, backend_output = run(['node','--test','--test-reporter=tap',str(ROOT/'tests/backend.test.mjs'),str(ROOT/'tests/camera.test.mjs')], 'resultado_backend.txt')
passed = int(re.search(r'^# pass (\d+)',backend_output,re.M).group(1))
failed = int(re.search(r'^# fail (\d+)',backend_output,re.M).group(1))
if code: sys.exit(code)
code, e2e_output = run([sys.executable,str(ROOT/'tests/e2e.py')], 'resultado_integracion.txt')
e2e_path = OUT/'resultado_e2e.json'
e2e = json.loads(e2e_path.read_text(encoding='utf-8')) if e2e_path.exists() else {'passed':0,'failed':1,'screenshots':[],'camera':{}}
manifest = {
    'date':datetime.now().astimezone().isoformat(),
    'version':'1.0.0',
    'backend':{'passed':passed,'failed':failed,'command':'npm test','log':'docs/final/resultado_backend.txt',
               'actualCommand':'node --test --test-reporter=tap tests/backend.test.mjs tests/camera.test.mjs'},
    'e2e':{'passed':e2e['passed'],'failed':e2e['failed'],'command':'python tests/e2e.py',
            'log':'docs/final/resultado_integracion.txt','scope':e2e.get('scope',[])},
    'camera':e2e.get('camera',{}),
    'screenshots':e2e.get('screenshots',[]),
    'sources':[{'path':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
               for path in [*source_paths, ROOT/'frontend/index.html',ROOT/'frontend/styles.css',ROOT/'package.json']],
    'physicalLabPilot':False,
}
(OUT/'evidencia_final.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
if code: sys.exit(code)
print(f"PASS | {passed} pruebas API/cámara + {e2e['passed']} comprobaciones de integración")
