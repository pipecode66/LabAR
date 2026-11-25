"""Genera el addendum y modelo físico sin alterar la entrega histórica.

python docs/despliegue-supabase/generar_documentos.py
Lee verificacion.json si existe; nunca convierte una comprobación pendiente en PASS.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZipFile

import pymupdf
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.platypus.tableofcontents import TableOfContents

BASE = Path(__file__).resolve().parent
AUTHOR = 'Juan Felipe Jauregui Carrillo'
DATE = '25/11/2026'
WIDTH = A4[0] - 88
NAVY = colors.HexColor('#142A4A')
TEAL = colors.HexColor('#00685F')
INK = colors.HexColor('#23343D')
LINE = colors.HexColor('#D5E1E4')
PALE = colors.HexColor('#EFF6F7')


def read_blocks(markdown):
    lines = markdown.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith('```'):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code.append(lines[i]); i += 1
            yield ('code', '\n'.join(code))
            i += 1
            continue
        heading = re.match(r'^(#{1,4})\s+(.+)$', line)
        if heading:
            yield ('heading', len(heading[1]), heading[2])
            i += 1
            continue
        if line.startswith('|') and i + 1 < len(lines) and re.match(r'^\|[\s:|-]+\|$', lines[i+1]):
            rows = [[cell.strip() for cell in line.strip().strip('|').split('|')]]
            i += 2
            while i < len(lines) and lines[i].startswith('|'):
                rows.append([cell.strip() for cell in lines[i].strip().strip('|').split('|')]); i += 1
            yield ('table', rows)
            continue
        bullet = re.match(r'^(?:-|\d+\.)\s+(.+)$', line)
        if bullet:
            yield ('list', bullet[1]); i += 1
            continue
        paragraph = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|\||```|(?:-|\d+\.)\s)', lines[i]):
            paragraph.append(lines[i]); i += 1
        yield ('paragraph', '\n'.join(paragraph))


def ptext(text):
    value = escape(text)
    value = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', value)
    value = re.sub(r'`(.+?)`', r'<font name="Mono">\1</font>', value)
    return value.replace('\n', '<br/>')


def evidence_text():
    path = BASE / 'verificacion.json'
    if not path.exists():
        return ('Al generar este documento no se había incorporado el registro final de las nuevas pruebas y de la conexión en producción. '
                'El estado de verificación permanece pendiente. La presencia del código, el esquema o las variables indicadas por el usuario '
                'no se presenta como una prueba de conexión remota.')
    evidence = json.loads(path.read_text(encoding='utf-8'))
    result = ['Fecha del registro: ' + str(evidence.get('date', 'no indicada')) + '.']
    suites = evidence.get('suites', [])
    if suites:
        result += ['', '| Suite | Comando | Aprobadas | Fallidas | Omitidas |', '| --- | --- | --- | --- | --- |']
        for suite in suites:
            result.append('| ' + ' | '.join(str(suite.get(key, 'no registrado')) for key in ['name', 'command', 'passed', 'failed', 'skipped']) + ' |')
    remote = evidence.get('production', {})
    if remote.get('checked'):
        result += ['', 'Sitio comprobado: ' + str(remote.get('url', 'no registrado')) + '.',
                   'Estado HTTP registrado: ' + str(remote.get('status', 'no registrado')) + '.',
                   'Conexión de base remota confirmada por la comprobación: ' + ('sí' if remote.get('databaseConnected') else 'no') + '.']
    else:
        result += ['', 'La conexión a Supabase en producción todavía no está confirmada por una comprobación remota registrada.']
    for note in evidence.get('notes', []):
        result += ['', str(note)]
    return '\n'.join(result)


def fonts():
    directory = Path('C:/Windows/Fonts')
    for name, file in [('Body', 'arial.ttf'), ('Body-Bold', 'arialbd.ttf'), ('Body-Italic', 'ariali.ttf'), ('Mono', 'consola.ttf')]:
        pdfmetrics.registerFont(TTFont(name, str(directory / file)))
    pdfmetrics.registerFontFamily('Body', normal='Body', bold='Body-Bold', italic='Body-Italic', boldItalic='Body-Bold')


def styles():
    body = ParagraphStyle('Body', fontName='Body', fontSize=10, leading=14.5, textColor=INK, spaceAfter=9)
    return {
        'body': body,
        'title': ParagraphStyle('Title', parent=body, fontName='Body-Bold', fontSize=31, leading=37, textColor=NAVY, spaceAfter=16),
        'subtitle': ParagraphStyle('Subtitle', parent=body, fontName='Body-Bold', fontSize=19, leading=25, textColor=TEAL, spaceAfter=18),
        'h1': ParagraphStyle('H1', parent=body, fontName='Body-Bold', fontSize=16, leading=21, textColor=NAVY, spaceBefore=15, spaceAfter=9, keepWithNext=True),
        'h2': ParagraphStyle('H2', parent=body, fontName='Body-Bold', fontSize=11.5, leading=16, textColor=TEAL, spaceBefore=10, spaceAfter=7, keepWithNext=True),
        'list': ParagraphStyle('List', parent=body, leftIndent=12, firstLineIndent=-9, spaceAfter=6),
        'cell': ParagraphStyle('Cell', parent=body, fontSize=8.1, leading=11.5, spaceAfter=0),
        'head': ParagraphStyle('Head', parent=body, fontName='Body-Bold', fontSize=8.1, leading=11.5, textColor=colors.white, spaceAfter=0),
        'code': ParagraphStyle('Code', parent=body, fontName='Mono', fontSize=8.5, leading=12, backColor=PALE, borderPadding=9, spaceBefore=6, spaceAfter=12),
        'toc': ParagraphStyle('TOC', parent=body, fontSize=10, leading=15, spaceBefore=5),
    }


class PDFDocument(BaseDocTemplate):
    def __init__(self, path, title):
        super().__init__(str(path), pagesize=A4, leftMargin=44, rightMargin=44, topMargin=46, bottomMargin=46, title=title, author=AUTHOR)
        self.label = title
        self.addPageTemplates([PageTemplate(id='main', frames=[Frame(44, 46, WIDTH, A4[1]-92, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=self.footer)])

    def footer(self, c, doc):
        c.setStrokeColor(LINE); c.line(44, 33, A4[0]-44, 33)
        c.setFont('Body', 7.5); c.setFillColor(INK)
        c.drawString(44, 21, 'LabAR Seguro · ' + AUTHOR)
        c.drawRightString(A4[0]-44, 21, f'{DATE} · {doc.page}')
        if doc.page > 1:
            c.setFont('Body-Bold', 7.5); c.setFillColor(TEAL)
            c.drawString(44, A4[1]-27, self.label.upper())

    def afterFlowable(self, flowable):
        if getattr(flowable, 'document_heading', False):
            text = flowable.getPlainText()
            key = 'h-' + hashlib.sha1(text.encode()).hexdigest()[:15]
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, 0, closed=False)
            self.notify('TOCEntry', (0, text, self.page, key))


def make_pdf(markdown, path, title):
    s = styles()
    story = [Spacer(1, 20)]
    cover_done = False
    for block in read_blocks(markdown):
        if block[0] == 'heading':
            _, level, text = block
            if level == 1:
                story.append(Paragraph(ptext(text), s['title']))
            elif not cover_done and not re.match(r'^\d+\.', text):
                story.append(Paragraph(ptext(text), s['subtitle']))
            else:
                if not cover_done:
                    story += [PageBreak(), Paragraph('Contenido', s['title'])]
                    toc = TableOfContents(); toc.levelStyles = [s['toc']]
                    story += [toc, PageBreak()]
                    cover_done = True
                heading = Paragraph(ptext(text), s['h1'] if level == 2 else s['h2'])
                heading.document_heading = level == 2
                story.append(heading)
        elif block[0] == 'paragraph': story.append(Paragraph(ptext(block[1]), s['body']))
        elif block[0] == 'list': story.append(Paragraph('• ' + ptext(block[1]), s['list']))
        elif block[0] == 'code': story.append(Paragraph(escape(block[1]).replace('\n', '<br/>'), s['code']))
        elif block[0] == 'table':
            rows = block[1]
            data = [[Paragraph(ptext(cell), s['head'] if index==0 else s['cell']) for cell in row] for index,row in enumerate(rows)]
            widths = [WIDTH/len(rows[0])] * len(rows[0])
            t = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
            t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),NAVY),
                ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('LEFTPADDING',(0,0),(-1,-1),8),
                ('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
                ('LINEBELOW',(0,0),(-1,-1),.4,LINE)]))
            story += [t, Spacer(1, 9)]
    PDFDocument(path, title).multiBuild(story)


def add_runs(paragraph, text):
    for part in re.split(r'(\*\*.+?\*\*|`.+?`)', text):
        if part.startswith('**'):
            paragraph.add_run(part[2:-2]).bold = True
        elif part.startswith('`'):
            run = paragraph.add_run(part[1:-1]); run.font.name = 'Consolas'; run.font.size = Pt(9)
        else: paragraph.add_run(part)


def field(paragraph, instruction):
    run = paragraph.add_run()
    begin = OxmlElement('w:fldChar'); begin.set(qn('w:fldCharType'), 'begin')
    code = OxmlElement('w:instrText'); code.set(qn('xml:space'), 'preserve'); code.text = instruction
    end = OxmlElement('w:fldChar'); end.set(qn('w:fldCharType'), 'end')
    for node in [begin, code, end]: run._r.append(node)


def make_docx(markdown, path, title):
    doc = Document(); doc.core_properties.author = AUTHOR; doc.core_properties.title = title
    for section in doc.sections:
        section.page_width=Cm(21); section.page_height=Cm(29.7)
        section.top_margin=Cm(1.8); section.bottom_margin=Cm(1.7)
        section.left_margin=Cm(1.8); section.right_margin=Cm(1.8)
    normal=doc.styles['Normal']; normal.font.name='Arial'; normal.font.size=Pt(10)
    normal.paragraph_format.line_spacing=1.12; normal.paragraph_format.space_after=Pt(7)
    for name,size,color in [('Title',30,'142A4A'),('Subtitle',19,'00685F'),('Heading 1',16,'142A4A'),('Heading 2',12,'00685F')]:
        st=doc.styles[name]; st.font.name='Arial'; st.font.size=Pt(size); st.font.color.rgb=RGBColor.from_string(color)
        st.paragraph_format.keep_with_next=True
    doc.sections[0].header.paragraphs[0].text='LABAR SEGURO · ' + title.upper()
    footer=doc.sections[0].footer.paragraphs[0]; footer.add_run(f'{AUTHOR} · {DATE} · '); field(footer,'PAGE')
    cover_done=False
    for block in read_blocks(markdown):
        kind=block[0]
        if kind=='heading':
            _,level,text=block
            if level==1: doc.add_paragraph(text,'Title')
            elif not cover_done and not re.match(r'^\d+\.',text): doc.add_paragraph(text,'Subtitle')
            else:
                if not cover_done:
                    doc.add_page_break(); doc.add_paragraph('Contenido','Title'); field(doc.add_paragraph(),'TOC \\o "1-2" \\h \\z \\u'); doc.add_page_break(); cover_done=True
                doc.add_heading(text,level=min(2,level-1))
        elif kind=='paragraph': add_runs(doc.add_paragraph(),block[1])
        elif kind=='list': add_runs(doc.add_paragraph(style='List Bullet'),block[1])
        elif kind=='code':
            run=doc.add_paragraph().add_run(block[1]); run.font.name='Consolas'; run.font.size=Pt(9)
        elif kind=='table':
            table=doc.add_table(rows=0,cols=len(block[1][0])); table.style='Light Shading Accent 1'
            for index,row in enumerate(block[1]):
                cells=table.add_row().cells
                for col,value in enumerate(row):
                    add_runs(cells[col].paragraphs[0],value)
                    for run in cells[col].paragraphs[0].runs: run.font.size=Pt(8.5)
                if index==0:
                    repeat=OxmlElement('w:tblHeader'); table.rows[0]._tr.get_or_add_trPr().append(repeat)
            doc.add_paragraph()
    update=OxmlElement('w:updateFields'); update.set(qn('w:val'),'true'); doc.settings.element.append(update)
    doc.save(path)


def main():
    fonts()
    results=evidence_text()
    report=[]
    for source,name,title in [
        ('addendum_fuente.md','Addendum_Despliegue_Vercel_Supabase','Addendum técnico: Vercel y Supabase'),
        ('modelo_fuente.md','Modelo_Base_de_Datos_LabAR_Seguro','Modelo físico de base de datos'),
    ]:
        text=(BASE/source).read_text(encoding='utf-8').replace('{{RESULTADOS}}',results)
        assert '{{' not in text
        (BASE/(name+'.md')).write_text(text,encoding='utf-8')
        make_pdf(text,BASE/(name+'.pdf'),title)
        make_docx(text,BASE/(name+'.docx'),title)
        with pymupdf.open(BASE/(name+'.pdf')) as pdf:
            for i,page in enumerate(pdf):
                for word in page.get_text('words'):
                    assert word[0]>=0 and word[1]>=0 and word[2]<=page.rect.width+.5 and word[3]<=page.rect.height+.5,(name,i+1,word)
            report.append({'file':name+'.pdf','pages':len(pdf),'bookmarks':len(pdf.get_toc()),'sha256':hashlib.sha256((BASE/(name+'.pdf')).read_bytes()).hexdigest()})
        with ZipFile(BASE/(name+'.docx')) as archive: assert archive.testzip() is None
    (BASE/'verificacion_documentos.json').write_text(json.dumps({'result':'APROBADO','documents':report},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__': main()
