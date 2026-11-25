"""Genera un QR real, su SVG y vídeos sintéticos para probar cámara/RA."""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'frontend' / 'assets'
FIXTURES = ROOT / 'tests' / 'fixtures'
ASSETS.mkdir(parents=True, exist_ok=True)
FIXTURES.mkdir(parents=True, exist_ok=True)
VALUE = 'LABAR:DT830B:V1'
matrix = cv2.QRCodeEncoder_create().encode(VALUE)
matrix = np.pad(matrix, 4, constant_values=255)
image = Image.fromarray(matrix).resize((592, 592), Image.Resampling.NEAREST)
image.save(ASSETS / 'marcador-labar.png')
rectangles = ''.join(f'<rect x="{x}" y="{y}" width="1" height="1"/>' for y, row in enumerate(matrix) for x, value in enumerate(row) if value == 0)
size = len(matrix)
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Marcador LabAR DT830B"><rect width="100%" height="100%" fill="white"/><g fill="black">{rectangles}</g></svg>'
(ASSETS / 'marcador-labar.svg').write_text(svg, encoding='utf-8')

# Y4M is accepted by Chromium's --use-file-for-fake-video-capture.
for name, moving in [('marcador-camara.y4m', True), ('sin-marcador.y4m', False)]:
    with (FIXTURES / name).open('wb') as stream:
        stream.write(b'YUV4MPEG2 W640 H480 F5:1 Ip A1:1 C420jpeg\n')
        marker = np.array(image.resize((320, 320), Image.Resampling.NEAREST))
        for index in range(20):
            frame = np.full((480, 640, 3), 244, dtype=np.uint8)
            if moving:
                x = 140 + index * 2
                frame[80:400, x:x+320] = marker[:, :, None]
            yuv = cv2.cvtColor(frame, cv2.COLOR_RGB2YUV_I420)
            stream.write(b'FRAME\n')
            stream.write(yuv.tobytes())

assert cv2.QRCodeDetector().detectAndDecode(np.array(image))[0] == VALUE
print('Marcador QR verificado:', VALUE)
