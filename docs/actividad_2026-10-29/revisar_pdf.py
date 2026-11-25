"""Revisión de integridad, límites de página y procedencia del documento final."""

import hashlib
import json
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw


base = Path(__file__).resolve().parent
root = base.parents[1]
pdf = pymupdf.open(base.parent / "Actividad_29-10-2026.pdf")
manifest = json.loads((base / "verificacion.json").read_text(encoding="utf-8"))
out = base / "revision"
out.mkdir(exist_ok=True)
assert len(pdf) == 12
assert sum(len(page.get_images()) for page in pdf) == 12
assert all(item["resultado"] == "APROBADA" for item in manifest["pruebas"])

for item in manifest["fuentes"] + manifest["capturas"]:
    assert hashlib.sha256((root / item["archivo"]).read_bytes()).hexdigest() == item["sha256"], item["archivo"]

thumbs = []
for index, page in enumerate(pdf):
    assert len(page.get_text().strip()) > 100
    for word in page.get_text("words"):
        assert word[0] >= 0 and word[1] >= 0 and word[2] <= page.rect.width + 1 and word[3] <= page.rect.height + 1, (index + 1, word)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(.56, .56), alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    tile = Image.new("RGB", (image.width + 16, image.height + 28), "white")
    tile.paste(image, (8, 4))
    ImageDraw.Draw(tile).text((8, image.height + 8), f"Pagina {index+1}", fill="#142A4A")
    thumbs.append(tile)
    if index in [0, 2, 5, 8, 11]:
        page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False).save(str(out / f"pagina_{index+1:02}.png"))

width = max(im.width for im in thumbs)
height = max(im.height for im in thumbs)
sheet = Image.new("RGB", (width * 4, height * 3), "#D5E1E4")
for index, im in enumerate(thumbs):
    sheet.paste(im, ((index % 4) * width, (index // 4) * height))
sheet.save(out / "vista_general.png")
print("PASS: 12 páginas; 12 imágenes; texto dentro de página; hashes de fuentes y capturas intactos.")
print(out / "vista_general.png")
