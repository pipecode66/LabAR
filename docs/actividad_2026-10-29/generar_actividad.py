"""Genera el informe de avance con capturas reales y fuentes locales trazables."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)


BASE = Path(__file__).resolve().parent
DOCS = BASE.parent
ROOT = DOCS.parent
IMAGES = BASE / "evidencias"
OUTPUT = DOCS / "Actividad_29-10-2026.pdf"
manifest = json.loads((BASE / "verificacion.json").read_text(encoding="utf-8"))

for font, filename in [("Body", "arial.ttf"), ("Body-Bold", "arialbd.ttf"),
                       ("Body-Italic", "ariali.ttf"), ("Mono", "consola.ttf")]:
    pdfmetrics.registerFont(TTFont(font, str(Path("C:/Windows/Fonts") / filename)))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body-Italic", boldItalic="Body-Bold")

NAVY = colors.HexColor("#142A4A")
TEAL = colors.HexColor("#08766E")
INK = colors.HexColor("#23343D")
MUTED = colors.HexColor("#53666F")
LINE = colors.HexColor("#D5E1E4")
PALE = colors.HexColor("#EFF6F7")
AMBER = colors.HexColor("#FFF3DB")
GREEN = colors.HexColor("#E9F5F0")
WHITE = colors.white
PAGE_W, PAGE_H = A4
MARGIN = 44
WIDTH = PAGE_W - 2 * MARGIN

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("BodyLocal", fontName="Body", fontSize=10.2, leading=14.6,
                          textColor=INK, spaceAfter=9))
styles.add(ParagraphStyle("SmallLocal", parent=styles["BodyLocal"], fontSize=8.7, leading=12.4, spaceAfter=5))
styles.add(ParagraphStyle("CaptionLocal", parent=styles["BodyLocal"], fontSize=8.5, leading=11.8,
                          textColor=MUTED, spaceAfter=6))
styles.add(ParagraphStyle("LabelLocal", parent=styles["BodyLocal"], fontName="Body-Bold",
                          fontSize=9.2, leading=12, textColor=TEAL, spaceAfter=9))
styles.add(ParagraphStyle("H1Local", fontName="Body-Bold", fontSize=21, leading=26, textColor=NAVY, spaceAfter=12))
styles.add(ParagraphStyle("H2Local", fontName="Body-Bold", fontSize=12.8, leading=17, textColor=TEAL,
                          spaceBefore=7, spaceAfter=8))
styles.add(ParagraphStyle("TitleLocal", fontName="Body-Bold", fontSize=32, leading=37,
                          textColor=NAVY, spaceAfter=12))
styles.add(ParagraphStyle("SubtitleLocal", parent=styles["BodyLocal"], fontSize=15.5, leading=21,
                          textColor=TEAL, spaceAfter=19))
styles.add(ParagraphStyle("TableLocal", parent=styles["BodyLocal"], fontSize=8.5, leading=11.8, spaceAfter=0))
styles.add(ParagraphStyle("TableHeaderLocal", parent=styles["TableLocal"], fontName="Body-Bold", textColor=WHITE))
styles.add(ParagraphStyle("MonoLocal", fontName="Mono", fontSize=8.5, leading=12, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle("MetricLocal", parent=styles["BodyLocal"], fontName="Body-Bold", fontSize=23,
                          leading=29, alignment=TA_CENTER, textColor=TEAL, spaceAfter=2))
styles.add(ParagraphStyle("MetricLabelLocal", parent=styles["CaptionLocal"], alignment=TA_CENTER))


def p(text, style="BodyLocal"):
    return Paragraph(text, styles[style])


def table(rows, widths, header=True):
    data = [[p(str(cell), "TableHeaderLocal" if header and i == 0 else "TableLocal")
             for cell in row] for i, row in enumerate(rows)]
    t = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1 if header else 0)
    commands = [("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, -1), .4, LINE)]
    if header:
        commands += [("BACKGROUND", (0, 0), (-1, 0), NAVY),
                     ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE])]
    else:
        commands += [("BACKGROUND", (0, 0), (-1, -1), PALE)]
    t.setStyle(TableStyle(commands))
    return t


def callout(title, text, fill=PALE):
    t = Table([[p(title, "LabelLocal")], [p(text, "SmallLocal")]], colWidths=[WIDTH])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), .5, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 3, TEAL),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, 0), 10), ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 0), ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
    ]))
    return t


def scaled_image(name, max_w, max_h):
    path = IMAGES / name
    with PILImage.open(path) as im:
        w, h = im.size
    factor = min(max_w / w, max_h / h)
    return Image(str(path), width=w * factor, height=h * factor)


story = []


def section(label, title):
    story.extend([p(label.upper(), "LabelLocal"), p(title, "H1Local")])


def new_page():
    story.append(PageBreak())


def pair_page(number, title, intro, left, right, takeaway):
    new_page()
    section(f"Evidencias del desarrollo · {number}", title)
    story.append(p(intro))
    panels = []
    for code, image_name, heading, caption in [left, right]:
        panels.append([p(f"<b>{code} · {heading}</b>", "SmallLocal"),
                       scaled_image(image_name, 235, 493), Spacer(1, 7), p(caption, "CaptionLocal")])
    t = Table([[panels[0], panels[1]]], colWidths=[WIDTH / 2, WIDTH / 2])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                          ("LEFTPADDING", (0, 0), (-1, -1), 0),
                          ("RIGHTPADDING", (0, 0), (0, 0), 10),
                          ("LEFTPADDING", (1, 0), (1, 0), 10)]))
    story.extend([t, Spacer(1, 9), p(takeaway, "SmallLocal")])


# 1. Identificación y resumen verificable.
story.extend([Spacer(1, 16), p("TECNOLOGÍAS EMERGENTES · ENTREGA INDIVIDUAL", "LabelLocal"),
              p("Actividad 29/10/2026", "TitleLocal"),
              p("LabAR Seguro<br/>Informe de avances del proyecto de aula", "SubtitleLocal")])
story.append(table([
    ["Estudiante", "Juan Felipe Jauregui Carrillo"],
    ["Docente", "Jenny Esmeralda Zabaleta"],
    ["Institución", "FESC – Fundación de Estudios Superiores Comfanorte"],
    ["Fecha de corte", "29 de octubre de 2026"],
    ["Versión revisada", "Maqueta frontend v0.1 · HTML, CSS y JavaScript"],
], [104, WIDTH - 104], header=False))
story.extend([Spacer(1, 16), p("Propósito del proyecto", "H2Local"),
              p("LabAR Seguro propone apoyar a estudiantes universitarios principiantes durante una práctica supervisada de voltaje DC de baja tensión con un multímetro DT-830B. La solución proyecta usar realidad aumentada en el navegador para relacionar instrucciones con el instrumento físico y ofrecer una guía educativa personalizada."),
              p("Este informe presenta el avance que puede comprobarse en los archivos y en la ejecución actual: una base frontend navegable, controles de interacción, una guía visual y una evaluación formativa. Las capturas se obtuvieron del proyecto existente durante la preparación de esta actividad.")])
metrics = Table([
    [p("8", "MetricLocal"), p("5", "MetricLocal"), p("17", "MetricLocal"), p("12", "MetricLocal")],
    [p("vistas navegables", "MetricLabelLocal"), p("pasos de guía", "MetricLabelLocal"),
     p("comprobaciones aprobadas", "MetricLabelLocal"), p("capturas incluidas", "MetricLabelLocal")],
], colWidths=[WIDTH / 4] * 4)
metrics.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE),
                            ("TOPPADDING", (0, 0), (-1, 0), 10), ("BOTTOMPADDING", (0, -1), (-1, -1), 9)]))
story.extend([metrics, Spacer(1, 14), callout("Estado del corte", "El frontend permite demostrar el recorrido completo. Cámara, seguimiento AR y reconocimiento son simulaciones; la API, la persistencia y la personalización UX continúan pendientes de implementación.", AMBER)])

# 2. Requerimientos y desarrollo realizado.
new_page()
section("1 · Descripción de los avances", "Análisis, requerimientos y desarrollo")
story.append(p("Se definieron el problema, el público objetivo, el equipo compatible y el límite de una sola práctica. El informe previo describe la solución, sus riesgos, la arquitectura prevista y el prototipo. Este análisis documental se tradujo en los siguientes requerimientos y resultados observables; la validación con docente y usuarios sigue pendiente."))
story.append(table([
    ["Requerimiento", "Avance actual y evidencia", "Estado"],
    ["RF01. Seleccionar práctica", "Tarjeta DT-830B; habilitación de Continuar tras elegirla. E02.", "Implementado"],
    ["RF02. Identificar puesto", "Animación y resultado fijo LAB-01 mediante temporizador. E03.", "Simulado"],
    ["RF03. Confirmar equipo", "Elección Sí/No; aviso y botón desactivado si no coincide. E04.", "Implementado"],
    ["RF04. Verificar condiciones", "Cinco casillas, contador y habilitación al completar la lista. E05–E06.", "Implementado"],
    ["RF05. Guiar la práctica", "Cinco instrucciones con señal, explicación y navegación. E07.", "Guía visual implementada"],
    ["RF06. Recuperar la guía", "Estado de pérdida simulada y cambio de presentación a 2D. E08–E09.", "Implementado en maqueta"],
    ["RF07. Evaluar aprendizaje", "Tres preguntas; validación, resultado 0–3 y repaso. E10 y E12.", "Implementado"],
    ["RF08. Personalizar UX", "Perfil, preferencias y reglas descritos en el informe y prompt de diseño.", "Diseñado"],
    ["RNF01. Acceso y legibilidad", "Enfoque móvil, foco visible, controles semánticos y reducción de movimiento.", "Base implementada"],
], [120, 290, WIDTH - 410]))
story.extend([Spacer(1, 10), p("Avances técnicos de la base", "H2Local"),
              p("<b>HTML:</b> organiza ocho vistas mediante <font name='Mono'>data-screen</font>, formularios, alertas y componentes. <b>CSS:</b> define colores, tarjetas, botones, presentación del multímetro y ajustes de tamaño. <b>JavaScript:</b> mantiene el estado en memoria, alterna vistas, actualiza la guía y calcula los resultados.", "SmallLocal"),
              p("El levantamiento es inicial y deriva de la propuesta y el flujo definido. Los archivos revisados no documentan entrevistas, pruebas de campo ni aprobación técnica del contenido.", "CaptionLocal")])

# 3. Metodología y cronograma.
new_page()
section("2 · Metodología y cronograma", "Trazabilidad del avance por etapas")
story.append(p("La secuencia de entregables muestra un desarrollo incremental: delimitar la necesidad, especificar el recorrido, construir una primera interfaz y verificar sus interacciones. Cada incremento permite revisar decisiones antes de integrar la cámara y el seguimiento real."))
story.append(callout("Referencia temporal disponible", "Los documentos revisados no contienen un cronograma fechado por semanas o hitos. La tabla organiza el progreso por etapas y entregables; permite ubicar el corte actual sin atribuir fechas históricas ni porcentajes que no estén respaldados."))
story.append(Spacer(1, 12))
story.append(table([
    ["Etapa", "Actividad y entregable", "Relación con el corte actual"],
    ["1. Análisis", "Problema, usuario principiante, alcance DT-830B y práctica supervisada.", "Documentado en el informe inicial."],
    ["2. Requerimientos", "Flujo de selección, confirmación, lista, guía, recuperación y evaluación.", "Especificación inicial trasladada a la interfaz."],
    ["3. Diseño", "Ocho vistas navegables. Diseño de personalización y prompt para diez pantallas.", "Base visual implementada; rediseño de Stitch pendiente de recibir."],
    ["4. Implementación", "HTML/CSS/JS: estado, botones, lista, pasos, modo 2D y puntuación.", "Frontend v0.1 ejecutable y comprobado."],
    ["5. Verificación", "Ejecución del guion existente, comprobaciones complementarias y capturas.", "17 comprobaciones aprobadas en este corte."],
    ["6. Integración y validación", "Cámara, marcador real, personalización local y piloto supervisado.", "Siguientes incrementos; aún sin evidencia de ejecución."],
], [100, 215, WIDTH - 315]))
story.extend([Spacer(1, 12), p("Ubicación del proyecto dentro del proceso", "H2Local"),
              p("El proyecto está en la etapa de prototipo frontend funcional para demostrar la interacción. El siguiente hito verificable será integrar el diseño definitivo y cerrar el recorrido con validaciones de estado; después se desarrollarán las preferencias locales y la prueba WebAR. El avance actual sirve para revisar la experiencia antes de medir aprendizaje con estudiantes."),
              p("Se distingue el trabajo documentado del trabajo ejecutado: una especificación o un prompt acredita una decisión de diseño; las capturas, el código y la prueba actual acreditan el comportamiento del frontend.", "SmallLocal")])

# 4–8. Capturas del resultado visible.
pair_page("E01–E02", "Inicio y selección de práctica",
          "Las primeras vistas comunican el propósito del proyecto y limitan el recorrido al equipo y la práctica definidos.",
          ("E01", "E01_inicio.png", "Inicio", "Vista inicial con advertencia del prototipo y botón Comenzar recorrido."),
          ("E02", "E02_practica.png", "Práctica seleccionada", "DT-830B seleccionado. Continuar habilitado; osciloscopio permanece como opción futura."),
          "<b>Relación con el análisis:</b> el contenido visible mantiene el enfoque en principiantes y en una única práctica de voltaje DC de baja tensión.")

pair_page("E03–E04", "Identificación y confirmación manual",
          "El escaneo es una simulación visual. La confirmación manual sí ejecuta lógica de interfaz: una discrepancia presenta un aviso y desactiva el botón normal de avance.",
          ("E03", "E03_escaneo.png", "Escaneo simulado", "Resultado LAB-01 y guía DT-830B v1.0 después del temporizador."),
          ("E04", "E04_equipo_no_coincide.png", "Equipo diferente", "La opción No coincide muestra Detente y consulta; Preparar la práctica está desactivado."),
          "<b>Alcance técnico:</b> no hay reconocimiento por cámara ni verificación del instrumento físico. El código que simula el escaneo está en app.js, líneas 150–166.")

pair_page("E05–E06", "Lista preventiva: dos estados reales",
          "La comparación evidencia el cambio del contador y del botón al completar las cinco casillas. El resultado depende de las selecciones del usuario dentro de la maqueta.",
          ("E05", "E05_checklist_pendiente.png", "Lista incompleta", "Cuatro de cinco verificaciones; Iniciar guía visual permanece desactivado."),
          ("E06", "E06_checklist_completa.png", "Lista completa", "Cinco de cinco verificaciones; el botón de inicio se habilita."),
          "<b>Trazabilidad:</b> RF04. La lógica se documenta con una captura del archivo fuente en E11. Estas casillas no comprueban físicamente el circuito.")

pair_page("E07–E08", "Guía visual y pausa del recorrido",
          "La guía cambia el título, el texto y la señal según el paso actual. El botón de simulación permite revisar el estado previsto ante pérdida del marcador.",
          ("E07", "E07_guia_ar.png", "Guía, paso 2 de 5", "Señal COM + VΩmA y explicación de la conexión. La etiqueta indica AR simulada."),
          ("E08", "E08_marcador_perdido.png", "Pérdida simulada", "Pantalla de pausa con reintento, alternativa 2D y consulta al docente."),
          "<b>Desarrollo comprobable:</b> renderizado de pasos en app.js, líneas 213–244; transición al estado de pérdida y retorno a 2D en líneas 246–252.")

pair_page("E09–E10", "Continuidad 2D y evaluación",
          "Al elegir 2D se conserva el paso activo y cambia la presentación de la misma guía. Al terminar, el formulario calcula el resultado y ofrece retroalimentación.",
          ("E09", "E09_guia_2d.png", "Mismo paso en 2D", "Se conserva el paso 2 y aparece la etiqueta Guía 2D."),
          ("E10", "E10_resultado.png", "Resultado de la evaluación", "La ejecución con las tres respuestas correctas genera Resultado: 3 de 3."),
          "<b>Comprobaciones adicionales:</b> el formulario incompleto presenta error y tres respuestas incorrectas producen 0 de 3 con recomendación de repaso.")

# 9. Código real de controles.
new_page()
section("3 · Evidencia de código · E11", "Confirmación y lista preventiva")
story.append(p("Este extracto de <b>frontend/app.js, líneas 178–208</b>, se leyó directamente del archivo y se capturó en un visor con numeración. Permite relacionar el estado de los botones con los resultados de E04, E05 y E06.", "SmallLocal"))
story.append(scaled_image("E11_codigo_controles.png", WIDTH, 490))
story.extend([Spacer(1, 9), p("<b>Qué demuestra:</b> <font name='Mono'>setEquipmentMatch</font> controla el aviso y el botón de confirmación; <font name='Mono'>updateChecklist</font> cuenta las casillas marcadas y compara ese total con el número de verificaciones. Los eventos actualizan la pantalla al interactuar.", "SmallLocal"),
              p("Son controles de interfaz del recorrido normal. El endurecimiento de las transiciones y del historial queda pendiente antes de una integración real.", "CaptionLocal")])

# 10. Código real de evaluación.
new_page()
section("3 · Evidencia de código · E12", "Validación y cálculo de resultados")
story.append(p("El extracto de <b>frontend/app.js, líneas 262–293</b>, contiene la lectura del formulario, la comprobación de respuestas completas y el cálculo del puntaje. El resultado visible se muestra en E10.", "SmallLocal"))
story.append(scaled_image("E12_codigo_evaluacion.png", WIDTH, 490))
story.extend([Spacer(1, 9), p("<b>Qué demuestra:</b> se utiliza <font name='Mono'>FormData</font> para obtener tres respuestas; si falta alguna se muestra el error. Con <font name='Mono'>reduce</font> se cuentan los aciertos y se actualizan el título, el resultado y la recomendación de repaso.", "SmallLocal"),
              p("La retroalimentación actual distingue resultado perfecto y resultado con errores. La recomendación adaptativa por concepto y el perfil persistente pertenecen al siguiente incremento.", "CaptionLocal")])

# 11. Pruebas y arquitectura.
new_page()
section("4 · Avances técnicos y verificación", "Resultados de la ejecución actual")
story.append(p("Se ejecutó el guion existente <font name='Mono'>docs/_qa/test_frontend.py</font> y se amplió la comprobación durante la captura. El entorno fue Microsoft Edge con emulación móvil de <b>390 × 844 px</b>; los resultados corresponden a un navegador de escritorio, sin prueba en teléfono físico."))
story.append(callout("Resultado verificable", "17 comprobaciones aprobadas y 12 capturas guardadas. También pasó la revisión de sintaxis de JavaScript con node --check. El detalle se conserva en verificacion.json y resultado_verificacion.txt.", GREEN))
story.append(Spacer(1, 10))
story.append(table([
    ["Grupo comprobado", "Resultado observado"],
    ["Estructura y selección", "Ocho vistas; Continuar cambia de desactivado a habilitado al seleccionar."],
    ["Identificación y equipo", "Resultado simulado LAB-01; discrepancia con aviso y botón desactivado."],
    ["Lista preventiva", "Cinco casillas; 4/5 impide el avance por el botón; 5/5 lo habilita."],
    ["Guía y recuperación", "Cambio de paso; estado de pausa; regreso a 2D en el mismo paso."],
    ["Evaluación", "Formulario incompleto rechazado; resultados 3/3 y 0/3 correctos."],
    ["Estado y presentación", "Sin desbordamiento en la vista comprobada; recarga vuelve al inicio; almacenamiento vacío en origen limpio."],
    ["Código JavaScript", "node --check finaliza con código de salida 0."],
], [143, WIDTH - 143]))
story.extend([Spacer(1, 10), p("Frontend y API en el estado actual", "H2Local"),
              p("El navegador carga <font name='Mono'>index.html</font>, <font name='Mono'>styles.css</font> y <font name='Mono'>app.js</font>. La lógica modifica el DOM y conserva el estado en memoria. El servidor local usado para la captura solo entrega archivos estáticos: no constituye una API del proyecto. No hay cuentas, endpoints, base de datos ni sincronización implementados.", "SmallLocal"),
              p("Estas pruebas revisan interacciones de la maqueta. La compatibilidad WebAR, la precisión del anclaje, el aprendizaje y la seguridad de una práctica física requieren validaciones posteriores.", "CaptionLocal")])

# 12. Estado y próximos pasos.
new_page()
section("5 · Estado actual y continuidad", "Pendientes, prioridades y evidencias")
story.append(table([
    ["Estado", "Elementos del proyecto"],
    ["Desarrollado", "Base móvil de ocho vistas; selección; confirmación manual; lista; guía de cinco pasos; pausa simulada; presentación 2D; evaluación y reinicio."],
    ["En diseño / por integrar", "Personalización UX especificada; prompt de diez pantallas preparado. Aún no existe una exportación de Stitch entre los archivos revisados."],
    ["Pendiente de desarrollo", "Cámara real, detección y seguimiento de marcador, reglas de personalización, persistencia y validaciones globales de navegación."],
    ["Pendiente de validación", "Revisión docente del contenido, prueba en dispositivos físicos y piloto de usabilidad/aprendizaje. API institucional solo si el alcance futuro la requiere."],
], [111, WIDTH - 111]))
story.extend([Spacer(1, 10), p("Siguientes actividades previstas", "H2Local")])
story.append(table([
    ["Prioridad", "Actividad propuesta", "Criterio para demostrar avance"],
    ["1. Cerrar el recorrido", "Recibir e integrar el diseño de Stitch y validar transiciones, retroceso y reingreso.", "Capturas del nuevo diseño y pruebas que comprueben las precondiciones."],
    ["2. Personalización local", "Agregar nivel, formato, accesibilidad, reglas explicables y controles de borrado.", "Comparar dos perfiles y verificar que las preferencias se guardan y se eliminan."],
    ["3. Prueba WebAR", "Integrar cámara y un marcador del DT-830B con recuperación 2D.", "Demostración en un dispositivo físico y registro de pérdida/recuperación."],
    ["4. Validación académica", "Revisar contenido con docente y ejecutar piloto autorizado.", "Observaciones, errores, claridad y mejoras documentadas."],
], [85, 217, WIDTH - 302]))
story.extend([Spacer(1, 10), p("Ubicación de las evidencias y reproducción", "H2Local"),
              p("Las doce capturas E01–E12, los visores de código y los registros de verificación están en <b>docs/actividad_2026-10-29/</b>. El archivo <font name='Mono'>verificacion.json</font> relaciona cada imagen con su descripción y registra huellas SHA-256 de las fuentes y las capturas.", "SmallLocal"),
              p("Para revisar el frontend: ejecutar <font name='Mono'>python -m http.server 8080 --directory frontend</font> desde la carpeta del proyecto y abrir <font name='Mono'>http://localhost:8080</font>. El guion de captura permite reproducir la comprobación.", "SmallLocal"),
              p("<b>Fuentes locales:</b> informe previo docs/Proyecto_LabAR.pdf; documentación UX; frontend/index.html, styles.css, app.js y README.md; prompt de Stitch; guion de prueba y registro de esta actividad. El informe acredita el estado disponible en este corte, con sus avances y pendientes diferenciados.", "CaptionLocal")])


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.saved_pages = []

    def showPage(self):
        self.saved_pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self.saved_pages)
        for state in self.saved_pages:
            self.__dict__.update(state)
            self.setStrokeColor(LINE)
            self.setLineWidth(.5)
            self.line(MARGIN, 34, PAGE_W - MARGIN, 34)
            self.setFillColor(MUTED)
            self.setFont("Body", 8)
            self.drawString(MARGIN, 21, "LabAR Seguro · Juan Felipe Jauregui Carrillo")
            self.drawRightString(PAGE_W - MARGIN, 21, f"29/10/2026 · {self._pageNumber} / {total}")
            if self._pageNumber > 1:
                self.setFont("Body-Bold", 8)
                self.setFillColor(TEAL)
                self.drawString(MARGIN, PAGE_H - 27, "ACTIVIDAD 29/10/2026")
                self.setFont("Body", 8)
                self.setFillColor(MUTED)
                self.drawRightString(PAGE_W - MARGIN, PAGE_H - 27, "Informe individual de avance")
            super().showPage()
        super().save()


doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                        topMargin=46, bottomMargin=47,
                        title="Actividad 29/10/2026 — LabAR Seguro",
                        author="Juan Felipe Jauregui Carrillo",
                        subject="Avances individuales, evidencias de código y resultados del frontend de LabAR Seguro")
doc.build(story, canvasmaker=NumberedCanvas)
print(OUTPUT)

