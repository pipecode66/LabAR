"""Evidencia legible de código real; no contiene variables privadas del entorno."""
from pathlib import Path
import hashlib
from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
OUT = BASE / 'evidencias'
OUT.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 19)
title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 25)
for filename, start, end, output in [
    ('backend/postgres-store.mjs', 1, 38, '15_codigo_postgres.png'),
    ('api/index.mjs', 34, 73, '16_codigo_vercel.png'),
]:
    source = ROOT / filename
    raw = source.read_bytes()
    lines = raw.decode('utf-8').splitlines()[start-1:end]
    image = Image.new('RGB', (1840, 140+len(lines)*27), '#132533')
    draw = ImageDraw.Draw(image)
    draw.text((26, 20), 'LabAR Seguro | '+filename, font=title, fill='#8ef0df')
    draw.text((26, 60), 'SHA-256: '+hashlib.sha256(raw).hexdigest(), font=font, fill='#b6c9d4')
    for i, line in enumerate(lines, start):
        draw.text((26, 110+(i-start)*27), f'{i:3}  {line}', font=font, fill='#edf4f7')
    image.save(OUT / output)
