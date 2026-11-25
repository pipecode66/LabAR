"""Publica informe/manual desde fuentes Markdown y evidencias verificadas.

Uso: python docs/final/generar_documentacion.py
Requiere evidencia_final.json; no asigna resultados de prueba por defecto.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

import pymupdf
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Flowable, Frame, Image, KeepTogether, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.platypus.tableofcontents import TableOfContents


BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
EVIDENCE = BASE / "evidencia_final.json"
NAVY = colors.HexColor("#142A4A")
TEAL = colors.HexColor("#00685F")
INK = colors.HexColor("#23343D")
MUTED = colors.HexColor("#53666F")
LINE = colors.HexColor("#D5E1E4")
PALE = colors.HexColor("#EFF6F7")
WIDTH = A4[0] - 88
DATE = "1 de noviembre de 2026"
AUTHOR = "Juan Felipe Jauregui Carrillo"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ptext(text):
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r"<font name='Mono'>\1</font>", text)
    return text.replace("  \n", "<br/>").replace("\n", " ")


def read_blocks(text):
    lines = text.splitlines()
    blocks = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("```"):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            blocks.append(("code", "\n".join(code)))
            i += 1
            continue
        heading = re.match(r"^(#{1,4})\s+(.+)$", line)
        if heading:
            blocks.append(("heading", len(heading[1]), heading[2]))
            i += 1
            continue
        image = re.match(r"^!\[(.*?)\]\((.*?)\)$", line)
        if image:
            blocks.append(("image", image[1], image[2]))
            i += 1
            continue
        if line.startswith("| ") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1]):
            rows = [[cell.strip() for cell in line.strip().strip("|").split("|")]]
            i += 2
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([cell.strip() for cell in lines[i].strip().strip("|").split("|")])
                i += 1
            blocks.append(("table", rows))
            continue
        bullet = re.match(r"^(-|\d+\.)\s+(.+)$", line)
        if bullet:
            blocks.append(("list", bullet[1], bullet[2]))
            i += 1
            continue
        paragraph = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#|```|!\[|\|\s|[-]\s|\d+\.\s)", lines[i]):
            paragraph.append(lines[i])
            i += 1
        blocks.append(("paragraph", "\n".join(paragraph)))
    return blocks


def table_widths(columns):
    ratios = {2: [.37, .63], 3: [.25, .43, .32], 4: [.20, .31, .26, .23]}.get(columns, [1 / columns] * columns)
    return [WIDTH * x for x in ratios]


def image_path(value):
    path = Path(value)
    return path if path.is_absolute() else ROOT / path


def register_fonts():
    fonts = Path("C:/Windows/Fonts")
    for name, filename in [("Body", "arial.ttf"), ("Body-Bold", "arialbd.ttf"), ("Body-Italic", "ariali.ttf"), ("Mono", "consola.ttf")]:
        pdfmetrics.registerFont(TTFont(name, str(fonts / filename)))
    pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body-Italic", boldItalic="Body-Bold")


def make_styles():
    body = ParagraphStyle("Body", fontName="Body", fontSize=10, leading=14.4, textColor=INK, spaceAfter=8)
    return {
        "body": body,
        "title": ParagraphStyle("Title", parent=body, fontName="Body-Bold", fontSize=33, leading=39, textColor=NAVY, spaceAfter=13),
        "subtitle": ParagraphStyle("Subtitle", parent=body, fontName="Body-Bold", fontSize=20, leading=26, textColor=TEAL, spaceAfter=18),
        "h1": ParagraphStyle("H1", parent=body, fontName="Body-Bold", fontSize=17, leading=22, textColor=NAVY, spaceBefore=17, spaceAfter=10, keepWithNext=True),
        "h2": ParagraphStyle("H2", parent=body, fontName="Body-Bold", fontSize=12, leading=16, textColor=TEAL, spaceBefore=12, spaceAfter=7, keepWithNext=True),
        "h3": ParagraphStyle("H3", parent=body, fontName="Body-Bold", fontSize=10.5, leading=14.5, spaceBefore=9, spaceAfter=5, keepWithNext=True),
        "caption": ParagraphStyle("Caption", parent=body, fontSize=8.3, leading=11.4, textColor=MUTED, spaceBefore=6, spaceAfter=12),
        "cell": ParagraphStyle("Cell", parent=body, fontSize=8.1, leading=11, spaceAfter=0),
        "cellhead": ParagraphStyle("CellHead", parent=body, fontName="Body-Bold", fontSize=8.1, leading=11, textColor=colors.white, spaceAfter=0),
        "code": ParagraphStyle("Code", parent=body, fontName="Mono", fontSize=8.2, leading=11.7, backColor=PALE, borderPadding=9, spaceBefore=6, spaceAfter=12),
        "list": ParagraphStyle("List", parent=body, leftIndent=14, firstLineIndent=-11, spaceAfter=5),
        "reference": ParagraphStyle("Reference", parent=body, fontSize=8.8, leading=12, leftIndent=12, firstLineIndent=-9, spaceAfter=3),
        "toc0": ParagraphStyle("TOC0", parent=body, fontName="Body-Bold", fontSize=10, leading=16, spaceBefore=6, leftIndent=0, firstLineIndent=0),
        "toc1": ParagraphStyle("TOC1", parent=body, fontSize=9, leading=13, leftIndent=12, firstLineIndent=0),
    }


class PDFDoc(BaseDocTemplate):
    def __init__(self, filename, document_title):
        super().__init__(filename, pagesize=A4, leftMargin=44, rightMargin=44, topMargin=46, bottomMargin=46,
                         title=document_title, author=AUTHOR, subject="LabAR Seguro · entrega final")
        self.document_title = document_title
        self.addPageTemplates([PageTemplate(id="main", frames=[Frame(44, 46, WIDTH, A4[1] - 92, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=self.draw_page)])

    def draw_page(self, c, doc):
        c.setStrokeColor(LINE)
        c.line(44, 33, A4[0] - 44, 33)
        c.setFont("Body", 7.5)
        c.setFillColor(MUTED)
        c.drawString(44, 21, f"LabAR Seguro · {AUTHOR}")
        c.drawRightString(A4[0] - 44, 21, f"01/11/2026 · {doc.page}")
        if doc.page > 1:
            c.setFont("Body-Bold", 7.5)
            c.setFillColor(TEAL)
            c.drawString(44, A4[1] - 26, self.document_title.upper())

    def afterFlowable(self, flowable):
        level = getattr(flowable, "toc_level", None)
        if level is not None:
            text = flowable.getPlainText()
            key = "h-" + hashlib.sha1(text.encode()).hexdigest()[:15]
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=level, closed=False)
            if level == 0:
                self.notify("TOCEntry", (level, text, self.page, key))


def screenshot_parts(width, height):
    if width < 800 and height / width > 2.8:
        midpoint = height // 2
        return [(0, midpoint + 12, "Parte superior"), (midpoint - 12, height, "Parte inferior")]
    return [(0, height, "")]


class ScreenshotFigure(Flowable):
    """Recorta la presentación dentro del PDF, preservando el PNG original."""

    def __init__(self, path):
        super().__init__()
        self.path = path
        with PILImage.open(path) as im:
            self.source_width, self.source_height = im.size
        self.parts = screenshot_parts(self.source_width, self.source_height)
        self.width = WIDTH
        if len(self.parts) == 2:
            self.panel_width = (WIDTH - 18) / 2
            self.scale = min(self.panel_width / self.source_width, 555 / max(end - start for start, end, _ in self.parts))
            self.height = 22 + max(end - start for start, end, _ in self.parts) * self.scale
        else:
            self.scale = min(WIDTH / self.source_width, 640 / self.source_height)
            self.height = self.source_height * self.scale

    def draw(self):
        if len(self.parts) == 1:
            display_width = self.source_width * self.scale
            self.canv.drawImage(str(self.path), (WIDTH - display_width) / 2, 0, width=display_width, height=self.height)
            return
        image_width = self.source_width * self.scale
        for index, (start, end, label) in enumerate(self.parts):
            column_x = index * (self.panel_width + 18)
            x = column_x + (self.panel_width - image_width) / 2
            slice_height = (end - start) * self.scale
            y = self.height - 22 - slice_height
            self.canv.setFont("Body-Bold", 8.5)
            self.canv.setFillColor(TEAL)
            self.canv.drawString(column_x, self.height - 10, label)
            self.canv.saveState()
            clip = self.canv.beginPath()
            clip.rect(x, y, image_width, slice_height)
            self.canv.clipPath(clip, stroke=0, fill=0)
            self.canv.drawImage(str(self.path), x, y - (self.source_height - end) * self.scale,
                                width=image_width, height=self.source_height * self.scale)
            self.canv.restoreState()


def make_pdf(markdown, output, title):
    styles = make_styles()
    blocks = read_blocks(markdown)
    story = []
    cover_done = False
    in_references = False
    for block in blocks:
        kind = block[0]
        if kind == "heading":
            _, level, text = block
            if level == 1:
                story.extend([Spacer(1, 26), Paragraph(ptext(text), styles["title"])])
            elif not cover_done and level == 2 and not re.match(r"\d+\.", text):
                story.append(Paragraph(ptext(text), styles["subtitle"]))
            else:
                if not cover_done:
                    story.append(PageBreak())
                    story.append(Paragraph("Contenido", styles["subtitle"]))
                    toc = TableOfContents()
                    toc.levelStyles = [styles["toc0"], styles["toc1"]]
                    story.extend([toc, PageBreak()])
                    cover_done = True
                style = "h1" if level == 2 else "h2" if level == 3 else "h3"
                para = Paragraph(ptext(text), styles[style])
                if "Referencias técnicas" in text:
                    in_references = True
                if level in (2, 3):
                    para.toc_level = level - 2
                story.append(para)
        elif kind == "paragraph":
            story.append(Paragraph(ptext(block[1]), styles["body"]))
        elif kind == "list":
            mark = "•" if block[1] == "-" else block[1]
            story.append(Paragraph(escape(mark) + " " + ptext(block[2]), styles["reference"] if in_references else styles["list"]))
        elif kind == "code":
            text = "<br/>".join(escape(line).replace(" ", "&#160;") for line in block[1].splitlines())
            story.append(Paragraph(text, styles["code"]))
        elif kind == "table":
            rows = block[1]
            cells = [[Paragraph(ptext(cell), styles["cellhead"] if index == 0 else styles["cell"]) for cell in row]
                     for index, row in enumerate(rows)]
            t = Table(cells, colWidths=table_widths(len(rows[0])), repeatRows=1, hAlign="LEFT")
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LINEBELOW", (0, 0), (-1, -1), .4, LINE),
            ]))
            story.extend([t, Spacer(1, 10)])
        elif kind == "image":
            path = image_path(block[2])
            if not path.exists():
                raise FileNotFoundError(path)
            img = ScreenshotFigure(path)
            caption = block[1]
            if len(img.parts) == 2:
                caption += " Captura original presentada en dos segmentos consecutivos, con un pequeño solapamiento para facilitar la lectura."
            story.append(KeepTogether([Spacer(1, 7), img, Paragraph(ptext(caption), styles["caption"])]))
    PDFDoc(str(output), title).multiBuild(story)


def add_runs(paragraph, text):
    text = text.replace("  \n", "\n")
    for part in re.split(r"(\*\*.+?\*\*|`.+?`)", text):
        if part.startswith("**") and part.endswith("**"):
            paragraph.add_run(part[2:-2]).bold = True
        elif part.startswith("`") and part.endswith("`"):
            run = paragraph.add_run(part[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(9)
        else:
            paragraph.add_run(part)


def field(paragraph, instruction):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar"); begin.set(qn("w:fldCharType"), "begin")
    code = OxmlElement("w:instrText"); code.set(qn("xml:space"), "preserve"); code.text = instruction
    separate = OxmlElement("w:fldChar"); separate.set(qn("w:fldCharType"), "separate")
    result = OxmlElement("w:t"); result.text = "Actualizar campo en Word"
    end = OxmlElement("w:fldChar"); end.set(qn("w:fldCharType"), "end")
    for element in [begin, code, separate, result, end]:
        run._r.append(element)


def make_docx(markdown, output, title):
    doc = Document()
    doc.core_properties.title = title
    doc.core_properties.author = AUTHOR
    doc.core_properties.subject = "LabAR Seguro · entrega final"
    for section in doc.sections:
        section.page_width = Cm(21)
        section.page_height = Cm(29.7)
        section.top_margin = Cm(1.8)
        section.bottom_margin = Cm(1.7)
        section.left_margin = Cm(1.8)
        section.right_margin = Cm(1.8)
    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(10)
    normal.paragraph_format.line_spacing = 1.12
    normal.paragraph_format.space_after = Pt(7)
    for style_name, size, color in [("Title", 30, "142A4A"), ("Subtitle", 19, "00685F"), ("Heading 1", 16, "142A4A"), ("Heading 2", 12, "00685F"), ("Heading 3", 10.5, "23343D")]:
        style = doc.styles[style_name]
        style.font.name = "Arial"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.keep_with_next = True
    header = doc.sections[0].header.paragraphs[0]
    header.text = "LABAR SEGURO · " + title.upper()
    header.style = "Caption"
    footer = doc.sections[0].footer.paragraphs[0]
    footer.add_run(f"{AUTHOR} · 01/11/2026 · ")
    field(footer, "PAGE")
    footer.style = "Caption"
    cover_done = False
    for block in read_blocks(markdown):
        kind = block[0]
        if kind == "heading":
            _, level, text = block
            if level == 1:
                doc.add_paragraph(text, "Title")
            elif not cover_done and level == 2 and not re.match(r"\d+\.", text):
                doc.add_paragraph(text, "Subtitle")
            else:
                if not cover_done:
                    doc.add_page_break()
                    doc.add_paragraph("Contenido", "Title")
                    field(doc.add_paragraph(), 'TOC \\o "1-2" \\h \\z \\u')
                    doc.add_page_break()
                    cover_done = True
                doc.add_heading(text, level=min(3, level - 1))
        elif kind == "paragraph":
            add_runs(doc.add_paragraph(), block[1])
        elif kind == "list":
            para = doc.add_paragraph(style="List Bullet" if block[1] == "-" else "List Number")
            add_runs(para, block[2])
        elif kind == "code":
            para = doc.add_paragraph()
            run = para.add_run(block[1]); run.font.name = "Consolas"; run.font.size = Pt(9)
            para.paragraph_format.left_indent = Cm(.3)
        elif kind == "table":
            rows = block[1]
            table = doc.add_table(rows=0, cols=len(rows[0]))
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            table.style = "Light Shading Accent 1"
            for index, row in enumerate(rows):
                cells = table.add_row().cells
                for col, text in enumerate(row):
                    para = cells[col].paragraphs[0]
                    add_runs(para, text)
                    for run in para.runs:
                        run.font.size = Pt(8.5)
                        if index == 0:
                            run.bold = True
                    para.paragraph_format.space_after = Pt(4)
                if index == 0:
                    props = table.rows[0]._tr.get_or_add_trPr()
                    repeat = OxmlElement("w:tblHeader"); props.append(repeat)
            doc.add_paragraph()
        elif kind == "image":
            path = image_path(block[2])
            with PILImage.open(path) as im:
                w, h = im.size
            parts = screenshot_parts(w, h)
            caption = block[1]
            if len(parts) == 2:
                figure_table = doc.add_table(rows=1, cols=2)
                figure_table.alignment = WD_TABLE_ALIGNMENT.CENTER
                figure_table.autofit = False
                for cell in figure_table.rows[0].cells:
                    cell.width = Cm(8.4)
                props = figure_table.rows[0]._tr.get_or_add_trPr()
                props.append(OxmlElement("w:cantSplit"))
                factor = min(7.9 / w, 18.8 / max(end - start for start, end, _ in parts))
                for cell, (start, end, label) in zip(figure_table.rows[0].cells, parts):
                    heading = cell.paragraphs[0]
                    heading.add_run(label).bold = True
                    heading.paragraph_format.keep_with_next = True
                    para = cell.add_paragraph()
                    para.alignment = 1
                    shape = para.add_run().add_picture(str(path), width=Cm(w * factor), height=Cm((end - start) * factor))
                    rect = OxmlElement("a:srcRect")
                    rect.set("l", "0"); rect.set("r", "0")
                    rect.set("t", str(round(start / h * 100000)))
                    rect.set("b", str(round((h - end) / h * 100000)))
                    shape._inline.graphic.graphicData.pic.blipFill.insert(1, rect)
                caption += " Captura original presentada en dos segmentos consecutivos con solapamiento."
            else:
                factor = min(16.8 / w, 21.5 / h)
                para = doc.add_paragraph()
                para.alignment = 1
                para.add_run().add_picture(str(path), width=Cm(w * factor), height=Cm(h * factor))
            doc.add_paragraph(caption, "Caption")
    settings = doc.settings.element
    update = OxmlElement("w:updateFields"); update.set(qn("w:val"), "true"); settings.append(update)
    doc.save(output)


def shot_markup(shot):
    return f'![{shot.get("caption", shot.get("id", "Evidencia"))}]({shot["path"]})'


def choose_shot(shots, *keywords):
    for word in keywords:
        for shot in shots:
            if word.lower() in (shot.get("id", "") + " " + shot.get("caption", "") + " " + shot["path"]).lower():
                return shot_markup(shot)
    return "La evidencia del recorrido se incluye en el informe técnico y en la carpeta de pruebas finales."


def report_shots(shots):
    preferred = ["03_inicio", "02_preferencias", "05_lista", "06_guia_2d", "07_resultado", "10_camara", "11_guia_ra", "12_pausa", "13_escritorio"]
    selected = []
    for identifier in preferred:
        found = next((shot for shot in shots if shot.get("id") == identifier), None)
        if found:
            selected.append(found)
    return selected or shots[:8]


def resolve_content(evidence):
    backend, e2e = evidence["backend"], evidence["e2e"]
    for suite in [backend, e2e]:
        if not isinstance(suite.get("passed"), int) or not isinstance(suite.get("failed"), int):
            raise ValueError("La evidencia necesita cantidades enteras reales de pruebas aprobadas y fallidas.")
        if not suite.get("log") or not (ROOT / suite["log"]).exists():
            raise ValueError("Falta el registro verificable de la suite.")
    camera = evidence.get("camera", {})
    shots = evidence.get("screenshots", [])
    total = backend["passed"] + e2e["passed"]
    failures = backend["failed"] + e2e["failed"]
    summary = (
        f'En el corte final se registraron **{backend["passed"]} pruebas aprobadas** en la suite de backend/módulos y '
        f'**{e2e["passed"]} comprobaciones aprobadas** de navegador, con **{failures} fallos registrados**. '
        f'Las cantidades pertenecen a sus respectivas suites y no acreditan una cobertura total de todos los dispositivos o escenarios.\n\n'
        f'Backend: `{backend.get("command", "npm test")}`. Registro: {backend["log"]}. '
        f'Navegador: `{e2e.get("command", "python tests/e2e.py")}`. Registro: {e2e["log"]}.'
    )
    matrix_rows = evidence.get("testMatrix", [])
    if not matrix_rows:
        log_text = (ROOT / backend["log"]).read_text(encoding="utf-8", errors="replace")
        for match in re.finditer(r"^(ok|not ok) \d+ - (.+)$", log_text, re.MULTILINE):
            matrix_rows.append(["API / módulos", match[2], "APROBADA" if match[1] == "ok" else "FALLIDA"])
        e2e_json_path = BASE / "resultado_e2e.json"
        if e2e_json_path.exists():
            e2e_results = json.loads(e2e_json_path.read_text(encoding="utf-8"))
            for row in e2e_results.get("results", []):
                matrix_rows.append(["Navegador", row.get("name", "Comprobación registrada"), "APROBADA" if row.get("passed") else "FALLIDA"])
        if not matrix_rows:
            matrix_rows = [["API y navegador", "Consultar el detalle de los registros de ambas suites.", "Ver registros citados"]]
    matrix = "| Área | Comprobación | Resultado o evidencia |\n| --- | --- | --- |\n" + "\n".join("| " + " | ".join(str(x) for x in row) + " |" for row in matrix_rows)
    camera_lines = [
        f'**Lectura desde imagen:** {"comprobada" if camera.get("imageMarkerTested") else "no acreditada por este registro"}.',
        f'**Cámara virtual reproducible:** {"comprobada" if camera.get("fakeCameraTested") else "no acreditada por este registro"}.',
        f'**Cámara o teléfono físico:** {"comprobado en el entorno descrito" if camera.get("physicalDeviceTested") else "sin prueba física documentada en este corte"}.',
    ]
    if camera.get("notes"):
        camera_lines.append(camera["notes"])
    retention = ("La sesión tiene una vigencia de 30 días. El servidor purga sesiones vencidas y sus registros relacionados al iniciar; "
                 "también rechaza y sustituye una sesión vencida cuando se presenta su cookie. El vencimiento no implica una tarea de borrado "
                 "que se ejecute continuamente sin reinicio. Las opciones de eliminación de la interfaz permiten solicitar el borrado antes de ese plazo. "
                 "Las operaciones de eliminación son borrado lógico SQL; no constituyen un borrado forense del archivo o sus registros auxiliares. "
                 "Las copias de seguridad externas no se modifican automáticamente al borrar datos de la base activa.")
    status = evidence.get("deliveryStatus", "La entrega incluye el frontend integrado con el diseño de Stitch, API y persistencia SQLite, preferencias, guía, evaluación, reportes y controles de datos. Los resultados anteriores describen lo verificado. Las limitaciones de cámara física y validación pedagógica permanecen explícitas; no se declara certificación de seguridad ni una instalación institucional en producción.")
    mappings = {
        "TEST_SUMMARY": summary,
        "TEST_MATRIX": matrix,
        "CAMERA_SUMMARY": "\n\n".join(camera_lines),
        "RETENTION_NOTE": retention,
        "DELIVERY_STATUS": status,
        "EXTRA_QA": ("**Verificación puntual adicional.** El registro docs/final/revision/resultado_textos_largos.txt comprueba un alias de 60 caracteres y un reporte de 1000 caracteres a 320 px, con texto ampliado y alto contraste, sin desbordamiento horizontal. Esta revisión se documenta por separado y no se suma a las cantidades de las suites anteriores."
                     if (BASE / "revision/resultado_textos_largos.txt").exists() else ""),
        "REPORT_SCREENSHOTS": "\n\n".join(shot_markup(x) for x in report_shots(shots)) or "Consultar la carpeta de evidencias finales registrada.",
        "MANUAL_HOME_SCREENSHOT": choose_shot(shots, "dashboard", "inicio", "welcome"),
        "MANUAL_PROFILE_SCREENSHOT": choose_shot(shots, "profile", "perfil", "preferencias"),
        "MANUAL_SCAN_SCREENSHOT": choose_shot(shots, "scan", "escaneo", "10_camara", "marker", "confirmacion"),
        "MANUAL_CHECKLIST_SCREENSHOT": choose_shot(shots, "checklist", "lista"),
        "MANUAL_GUIDE_SCREENSHOT": choose_shot(shots, "guide", "guia", "guía"),
        "MANUAL_RESULT_SCREENSHOT": choose_shot(shots, "result", "resultado"),
        "MANUAL_PRIVACY_SCREENSHOT": choose_shot(shots, "privacy", "privacidad"),
    }
    return mappings


def inventory():
    candidates = [ROOT / "Informe_TECNOLOGIASEMERGENTES.pdf"]
    candidates.extend(ROOT / name for name in ["README.md", "package.json"])
    candidates.extend(BASE / name for name in ["informe_fuente.md", "manual_fuente.md", "generar_documentacion.py", "evidencia_final.json"])
    candidates.extend(path for path in (ROOT / "docs").glob("*") if path.is_file())
    stitch = ROOT / "docs/stitch_labar_seguro_frontend_prototype/stitch_labar_seguro_frontend_prototype"
    candidates.extend(stitch.rglob("*"))
    candidates.extend((ROOT / "docs/archivo").rglob("*"))
    for folder in ["frontend", "backend", "tests"]:
        candidates.extend(path for path in (ROOT / folder).rglob("*") if path.is_file() and "__pycache__" not in path.parts and path.suffix not in [".y4m", ".sqlite", ".pyc"])
    rows = []
    for path in sorted(set(candidates)):
        if path.is_file():
            rows.append({"ruta": str(path.relative_to(ROOT)).replace("\\", "/"), "bytes": path.stat().st_size, "sha256": sha(path)})
    result = {"fecha_corte": "2026-11-01", "descripcion": "Materiales históricos y código disponibles al generar la consolidación.", "archivos": rows}
    (BASE / "inventario_fuentes.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def make_compendium():
    candidates = [
        ("Documentación final consolidada · 01/11/2026", BASE / "Documentacion_Final_LabAR_Seguro.pdf"),
        ("Manual de usuario · 01/11/2026", BASE / "Manual_Usuario_LabAR_Seguro.pdf"),
        ("Propuesta inicial · archivo de entrega", ROOT / "Informe_TECNOLOGIASEMERGENTES.pdf"),
        ("Propuesta y enfoque · versión de trabajo", ROOT / "docs/Informe_Proyecto_LabAR_Seguro.pdf"),
        ("Propuesta con personalización UX", ROOT / "docs/Proyecto_LabAR.pdf"),
        ("Actividad de avance · 29/10/2026", ROOT / "docs/Actividad_29-10-2026.pdf"),
    ]
    unique, duplicates = [], []
    hashes = {}
    for label, path in candidates:
        if not path.exists():
            continue
        with pymupdf.open(path) as doc:
            normalized = re.sub(r"\s+", " ", " ".join(page.get_text() for page in doc)).strip()
            key = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
            if key in hashes:
                duplicates.append({"ruta": str(path.relative_to(ROOT)), "equivalente_a": hashes[key]})
                continue
            hashes[key] = str(path.relative_to(ROOT))
            unique.append((label, path, len(doc), key))
    intro = [
        "# LabAR Seguro", "", "## Compendio documental", "",
        f"**Estudiante:** {AUTHOR}  \n**Asignatura:** Tecnologías Emergentes  \n**Fecha de compilación:** {DATE}", "",
        "Este archivo reúne la documentación final, el manual de usuario y los PDF históricos disponibles. Se preservan las versiones anteriores como evidencia de evolución; sus expresiones en futuro y estados del prototipo no sustituyen la descripción de la implementación final.", "",
        "Las fuentes con texto normalizado idéntico se incluyen una sola vez. Las versiones con cambios de contenido se conservan y se identifican por su rótulo. Los originales permanecen sin modificación.", "",
        "## 1. Índice del compendio", "", "| Documento | Páginas del original |", "| --- | --- |",
    ]
    intro.extend(f"| {label} | {pages} |" for label, _, pages, _ in unique)
    intro.extend(["", "Los marcadores laterales del lector PDF permiten abrir cada documento y sus secciones. Las páginas de los documentos incorporados conservan su numeración original."])
    index_path = BASE / "indice_compendio.pdf"
    styles = make_styles()
    intro_story = [Spacer(1, 15), Paragraph("LabAR Seguro", styles["title"]),
                   Paragraph("Compendio documental", styles["subtitle"]),
                   Paragraph(f"{AUTHOR}<br/>{DATE}", styles["body"]), Spacer(1, 12),
                   Paragraph("Este archivo reúne la documentación final, el manual de usuario y los PDF históricos disponibles. Se preservan como evidencia de evolución; los estados de versiones anteriores no sustituyen la descripción de la implementación final.", styles["body"]),
                   Paragraph("Las fuentes con texto normalizado idéntico se incluyen una sola vez. Las versiones con cambios se conservan y los originales permanecen sin modificación.", styles["body"]), Spacer(1, 10)]
    first_page = 2
    index_rows = [[Paragraph("Documento", styles["cellhead"]), Paragraph("Página del compendio", styles["cellhead"])]]
    for label, _, pages, _ in unique:
        index_rows.append([Paragraph(ptext(label), styles["cell"]), Paragraph(str(first_page), styles["cell"])])
        first_page += pages
    index_table = Table(index_rows, colWidths=[WIDTH - 110, 110], hAlign="LEFT")
    index_table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
                                    ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 9),
                                    ("BOTTOMPADDING", (0, 0), (-1, -1), 9), ("LINEBELOW", (0, 0), (-1, -1), .4, LINE)]))
    intro_story.extend([index_table, Spacer(1, 15), Paragraph("Los marcadores laterales del lector PDF permiten abrir cada documento y sus secciones. Los documentos incorporados conservan su numeración original.", styles["body"])])
    PDFDoc(str(index_path), "Compendio documental").build(intro_story)
    with pymupdf.open(index_path) as index_doc:
        if len(index_doc) != 1:
            raise ValueError("El índice del compendio debe ocupar una sola página para mantener sus números.")
    result = pymupdf.open(index_path)
    toc = [[1, "Presentación e índice", 1]]
    items = []
    for label, path, pages, normalized_hash in unique:
        start = len(result) + 1
        with pymupdf.open(path) as source:
            source_toc = source.get_toc()
            result.insert_pdf(source)
        toc.append([1, label, start])
        for level, text, page in source_toc:
            if page > 0:
                toc.append([min(level + 1, 4), text, start + page - 1])
        items.append({"titulo": label, "ruta": str(path.relative_to(ROOT)).replace("\\", "/"), "inicio_compendio": start,
                      "paginas": pages, "sha256": sha(path), "sha256_texto_normalizado": normalized_hash})
    result.set_toc(toc)
    result.set_metadata({"title": "LabAR Seguro · Compendio documental", "author": AUTHOR,
                         "subject": "Documentación final, manual y evolución documental del proyecto"})
    output = BASE / "Compendio_Documental_LabAR_Seguro.pdf"
    result.save(output, garbage=4, deflate=True)
    pages = len(result)
    result.close()
    (BASE / "indice_compendio.json").write_text(json.dumps({"documentos": items, "duplicados_omitidos": duplicates, "paginas": pages}, ensure_ascii=False, indent=2), encoding="utf-8")
    return output, pages


def validate_artifacts():
    rows = []
    for name in ["Documentacion_Final_LabAR_Seguro", "Manual_Usuario_LabAR_Seguro"]:
        pdfpath = BASE / f"{name}.pdf"
        with pymupdf.open(pdfpath) as doc:
            for index, page in enumerate(doc):
                for word in page.get_text("words"):
                    if word[0] < -.5 or word[1] < -.5 or word[2] > page.rect.width + .5 or word[3] > page.rect.height + .5:
                        raise ValueError(f"Texto fuera de página: {name}, página {index+1}")
            rows.append({"archivo": pdfpath.name, "paginas": len(doc), "imagenes": sum(len(p.get_images()) for p in doc), "marcadores": len(doc.get_toc()), "sha256": sha(pdfpath)})
        from zipfile import ZipFile
        with ZipFile(BASE / f"{name}.docx") as archive:
            assert archive.testzip() is None
    compendium_path = BASE / "Compendio_Documental_LabAR_Seguro.pdf"
    index = json.loads((BASE / "indice_compendio.json").read_text(encoding="utf-8"))
    with pymupdf.open(compendium_path) as compendium:
        assert len(compendium) == 1 + sum(item["paginas"] for item in index["documentos"])
        assert len(compendium.get_toc()) >= len(index["documentos"])
        rows.append({"archivo": compendium_path.name, "paginas": len(compendium), "marcadores": len(compendium.get_toc()), "sha256": sha(compendium_path)})
    (BASE / "verificacion_documentos.json").write_text(json.dumps({"resultado": "APROBADO", "archivos": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    return rows


def main():
    if not EVIDENCE.exists():
        raise SystemExit("Falta docs/final/evidencia_final.json con resultados y capturas verificadas. No se publican cifras supuestas.")
    evidence = json.loads(EVIDENCE.read_text(encoding="utf-8"))
    mappings = resolve_content(evidence)
    register_fonts()
    inventory()
    for source, name, title in [
        ("informe_fuente.md", "Documentacion_Final_LabAR_Seguro", "Documentación final consolidada"),
        ("manual_fuente.md", "Manual_Usuario_LabAR_Seguro", "Manual de usuario"),
    ]:
        text = (BASE / source).read_text(encoding="utf-8")
        for key, value in mappings.items():
            text = text.replace("{{" + key + "}}", value)
        if "{{" in text:
            raise ValueError("Hay variables sin resolver en " + source)
        (BASE / f"{name}.md").write_text(text, encoding="utf-8")
        make_pdf(text, BASE / f"{name}.pdf", title)
        make_docx(text, BASE / f"{name}.docx", title)
    compendium, pages = make_compendium()
    rows = validate_artifacts()
    print(json.dumps({"documentos": rows, "compendio": str(compendium), "paginas_compendio": pages}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

