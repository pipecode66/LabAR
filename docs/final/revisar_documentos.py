"""Genera vistas de revisión del informe y manual ya publicados."""

from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw


BASE = Path(__file__).resolve().parent
OUT = BASE / "revision"
OUT.mkdir(exist_ok=True)

for name in ["Documentacion_Final_LabAR_Seguro", "Manual_Usuario_LabAR_Seguro"]:
    source = BASE / f"{name}.pdf"
    if not source.exists():
        continue
    doc = pymupdf.open(source)
    thumbnails = []
    words = []
    for index, page in enumerate(doc):
        text = page.get_text()
        assert "{{" not in text, (source.name, index + 1, "Variable pendiente")
        words.append(len(text.split()))
        pix = page.get_pixmap(matrix=pymupdf.Matrix(.48, .48), alpha=False)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        tile = Image.new("RGB", (image.width + 16, image.height + 30), "white")
        tile.paste(image, (8, 4))
        ImageDraw.Draw(tile).text((8, image.height + 10), f"Pagina {index+1}", fill="#142A4A")
        thumbnails.append(tile)
        if index in [0, 3] or (page.get_images() and index % 3 == 0):
            page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False).save(OUT / f"{name}_pagina_{index+1:02}.png")
    cols = 4
    rows = (len(thumbnails) + cols - 1) // cols
    width = max(image.width for image in thumbnails)
    height = max(image.height for image in thumbnails)
    sheet = Image.new("RGB", (width * cols, height * rows), "#D5E1E4")
    for index, image in enumerate(thumbnails):
        sheet.paste(image, ((index % cols) * width, (index // cols) * height))
    sheet.save(OUT / f"{name}_vista_general.png")
    print(f"{source.name}: {len(doc)} páginas, {len(doc.get_toc())} marcadores, {sum(len(p.get_images()) for p in doc)} imágenes, mínimo {min(words)} palabras por página")
