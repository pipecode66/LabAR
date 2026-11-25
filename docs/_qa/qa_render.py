import os
from pathlib import Path

import fitz
from PIL import Image, ImageDraw


document_path = Path(__file__).resolve().parents[1] / "Informe_Proyecto_LabAR_Seguro.pdf"
pdf = fitz.open(document_path)
out = os.path.join(os.environ["TEMP"], "labar_docx_qa")
os.makedirs(out, exist_ok=True)

thumbs = []
scale = 0.55
for index, page in enumerate(pdf):
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    canvas = Image.new("RGB", (image.width + 16, image.height + 34), "white")
    canvas.paste(image, (8, 8))
    ImageDraw.Draw(canvas).text(
        (8, image.height + 12), f"Pagina {index + 1}", fill="#142A4A"
    )
    thumbs.append(canvas)

cols = 4
rows = (len(thumbs) + cols - 1) // cols
width = max(image.width for image in thumbs)
height = max(image.height for image in thumbs)
sheet = Image.new("RGB", (cols * width, rows * height), "#DDE7EB")
for index, image in enumerate(thumbs):
    sheet.paste(image, ((index % cols) * width, (index // cols) * height))
sheet.save(os.path.join(out, "contact_sheet.png"))

for index in [0, 2, 5, 10, 13, 15]:
    page = pdf[index]
    pix = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
    pix.save(os.path.join(out, f"page_{index + 1}.png"))

print(f"{out}|pages={len(pdf)}")
