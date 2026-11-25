param(
    [string]$OutputDirectory = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'

# Constantes de Word (se usan valores numéricos para que el script funcione
# independientemente del idioma configurado en Microsoft Word).
$wdCollapseEnd = 0
$wdAlignParagraphLeft = 0
$wdAlignParagraphCenter = 1
$wdAlignParagraphRight = 2
$wdAlignParagraphJustify = 3
$wdPageBreak = 7
$wdSectionBreakNextPage = 2
$wdStyleNormal = -1
$wdStyleTitle = -63
$wdStyleSubtitle = -75
$wdStyleHeading1 = -2
$wdStyleHeading2 = -3
$wdStyleHeading3 = -4
$wdPaperA4 = 7
$wdFormatDocumentDefault = 16
$wdExportFormatPDF = 17
$wdHeaderFooterPrimary = 1
$wdHeaderFooterFirstPage = 2
$wdFieldPage = 33
$wdStatisticPages = 2
$wdStatisticWords = 0
$wdLineSpaceMultiple = 5
$wdRowHeightAtLeast = 1
$wdCellAlignVerticalCenter = 1
$wdBorderTop = -1
$wdBorderLeft = -2
$wdBorderBottom = -3
$wdBorderRight = -4
$wdBorderHorizontal = -5
$wdBorderVertical = -6

function Get-OleColor([int]$r, [int]$g, [int]$b) {
    return $r + (256 * $g) + (65536 * $b)
}

$ColorNavy = Get-OleColor 20 42 74
$ColorTeal = Get-OleColor 0 140 140
$ColorCyan = Get-OleColor 16 185 201
$ColorAmber = Get-OleColor 243 164 45
$ColorGreen = Get-OleColor 42 157 103
$ColorRed = Get-OleColor 200 67 67
$ColorSlate = Get-OleColor 70 82 98
$ColorText = Get-OleColor 38 45 55
$ColorLight = Get-OleColor 239 246 248
$ColorLightBlue = Get-OleColor 232 242 250
$ColorLightAmber = Get-OleColor 255 247 229
$ColorLightGreen = Get-OleColor 234 247 240
$ColorWhite = Get-OleColor 255 255 255
$ColorBorder = Get-OleColor 200 213 220
$ColorMuted = Get-OleColor 105 117 128

function Move-To-End {
    $end = $script:doc.Content.End - 1
    $script:sel.SetRange($end, $end)
}

function Add-Paragraph {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [int]$Style = $wdStyleNormal,
        [int]$Alignment = $wdAlignParagraphJustify,
        [switch]$Bold,
        [switch]$Italic,
        [double]$FontSize = 0,
        [int]$FontColor = -1,
        [double]$SpaceBefore = -1,
        [double]$SpaceAfter = -1,
        [switch]$KeepWithNext,
        [switch]$NoIndent
    )
    Move-To-End
    $script:sel.Style = $Style
    $script:sel.ParagraphFormat.Alignment = $Alignment
    if ($NoIndent) { $script:sel.ParagraphFormat.FirstLineIndent = 0 }
    $script:sel.Font.Bold = [int]$Bold.IsPresent * -1
    $script:sel.Font.Italic = [int]$Italic.IsPresent * -1
    if ($FontSize -gt 0) { $script:sel.Font.Size = $FontSize }
    if ($FontColor -ge 0) { $script:sel.Font.Color = $FontColor }
    if ($SpaceBefore -ge 0) { $script:sel.ParagraphFormat.SpaceBefore = $SpaceBefore }
    if ($SpaceAfter -ge 0) { $script:sel.ParagraphFormat.SpaceAfter = $SpaceAfter }
    if ($KeepWithNext) { $script:sel.ParagraphFormat.KeepWithNext = -1 }
    $script:sel.TypeText($Text)
    $script:sel.TypeParagraph()
}

function Add-Heading1([string]$Text) {
    Add-Paragraph -Text $Text -Style $wdStyleHeading1 -Alignment $wdAlignParagraphLeft -NoIndent -KeepWithNext
}

function Add-Heading2([string]$Text) {
    Add-Paragraph -Text $Text -Style $wdStyleHeading2 -Alignment $wdAlignParagraphLeft -NoIndent -KeepWithNext
}

function Add-Heading3([string]$Text) {
    Add-Paragraph -Text $Text -Style $wdStyleHeading3 -Alignment $wdAlignParagraphLeft -NoIndent -KeepWithNext
}

function Add-Bullet([string]$Text, [int]$Level = 1) {
    Move-To-End
    $script:sel.Style = $wdStyleNormal
    $script:sel.Range.ListFormat.ApplyBulletDefault()
    $script:sel.ParagraphFormat.Alignment = $wdAlignParagraphLeft
    $script:sel.ParagraphFormat.LeftIndent = $script:word.CentimetersToPoints(0.65 + (($Level - 1) * 0.5))
    $script:sel.ParagraphFormat.FirstLineIndent = $script:word.CentimetersToPoints(-0.25)
    $script:sel.Font.Bold = 0
    $script:sel.Font.Italic = 0
    $script:sel.Font.Size = 10.5
    $script:sel.Font.Color = $ColorText
    $script:sel.TypeText($Text)
    $script:sel.TypeParagraph()
    $script:sel.Range.ListFormat.RemoveNumbers()
}

function Add-Numbered([string]$Text) {
    Move-To-End
    $script:sel.Style = $wdStyleNormal
    $script:sel.Range.ListFormat.ApplyNumberDefault()
    $script:sel.ParagraphFormat.Alignment = $wdAlignParagraphLeft
    $script:sel.ParagraphFormat.LeftIndent = $script:word.CentimetersToPoints(0.7)
    $script:sel.ParagraphFormat.FirstLineIndent = $script:word.CentimetersToPoints(-0.35)
    $script:sel.Font.Bold = 0
    $script:sel.Font.Italic = 0
    $script:sel.Font.Size = 10.5
    $script:sel.Font.Color = $ColorText
    $script:sel.TypeText($Text)
    $script:sel.TypeParagraph()
    $script:sel.Range.ListFormat.RemoveNumbers()
}

function Add-Table {
    param(
        [Parameter(Mandatory = $true)][object[]]$Rows,
        [Parameter(Mandatory = $true)][int]$Columns,
        [int[]]$Widths = @(),
        [switch]$Header,
        [switch]$Compact,
        [int]$HeaderColor = $ColorNavy
    )
    Move-To-End
    $range = $script:sel.Range
    $table = $script:doc.Tables.Add($range, $Rows.Count, $Columns)
    $table.AllowAutoFit = $true
    $table.Rows.AllowBreakAcrossPages = 0
    $table.Borders.Enable = 1
    foreach ($borderId in @($wdBorderTop, $wdBorderLeft, $wdBorderBottom, $wdBorderRight, $wdBorderHorizontal, $wdBorderVertical)) {
        $table.Borders.Item($borderId).Color = $ColorBorder
        $table.Borders.Item($borderId).LineWidth = 4
    }
    for ($r = 1; $r -le $Rows.Count; $r++) {
        $rowData = $Rows[$r - 1]
        for ($c = 1; $c -le $Columns; $c++) {
            $value = if ($c -le $rowData.Count) { [string]$rowData[$c - 1] } else { '' }
            $cell = $table.Cell($r, $c)
            $cell.Range.Text = $value
            $cell.VerticalAlignment = $wdCellAlignVerticalCenter
            $cell.Range.Font.Name = 'Aptos'
            $cell.Range.Font.Size = if ($Compact) { 8.5 } else { 9.25 }
            $cell.Range.Font.Color = $ColorText
            $cell.Range.ParagraphFormat.SpaceAfter = 2
            $cell.Range.ParagraphFormat.SpaceBefore = 2
            $cell.Range.ParagraphFormat.LineSpacingRule = 0
            $cell.Range.ParagraphFormat.Alignment = $wdAlignParagraphLeft
            if (($Header) -and ($r -eq 1)) {
                $cell.Shading.BackgroundPatternColor = $HeaderColor
                $cell.Range.Font.Color = $ColorWhite
                $cell.Range.Font.Bold = -1
                $cell.Range.ParagraphFormat.SpaceAfter = 4
                $cell.Range.ParagraphFormat.SpaceBefore = 4
            }
            elseif (($r % 2) -eq 1) {
                $cell.Shading.BackgroundPatternColor = $ColorLight
            }
        }
    }
    if ($Header) { $table.Rows.Item(1).HeadingFormat = -1 }
    if ($Widths.Count -eq $Columns) {
        for ($c = 1; $c -le $Columns; $c++) {
            $table.Columns.Item($c).PreferredWidth = $script:word.CentimetersToPoints($Widths[$c - 1])
        }
    }
    $table.Range.ParagraphFormat.KeepWithNext = 0
    # Colapsar una copia del rango al final y escribir el párrafo garantiza que
    # el contenido siguiente quede fuera de la última celda.
    $afterTable = $table.Range.Duplicate
    $afterTable.Collapse($wdCollapseEnd)
    $afterTable.Select()
    $script:sel.TypeParagraph()
    return $table
}

function Add-Callout {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$Text,
        [int]$FillColor = $ColorLightBlue,
        [int]$AccentColor = $ColorTeal
    )
    Move-To-End
    $range = $script:sel.Range
    $table = $script:doc.Tables.Add($range, 1, 1)
    $table.AllowAutoFit = $true
    $table.Borders.Enable = 1
    $table.Borders.Item($wdBorderLeft).Color = $AccentColor
    $table.Borders.Item($wdBorderLeft).LineWidth = 24
    foreach ($borderId in @($wdBorderTop, $wdBorderBottom, $wdBorderRight)) {
        $table.Borders.Item($borderId).Color = $FillColor
    }
    $cell = $table.Cell(1, 1)
    $cell.Shading.BackgroundPatternColor = $FillColor
    $cell.VerticalAlignment = $wdCellAlignVerticalCenter
    $cell.Range.Text = "$Title`r$Text"
    $cell.Range.Font.Name = 'Aptos'
    $cell.Range.Font.Size = 10
    $cell.Range.Font.Color = $ColorText
    $cell.Range.Paragraphs.Item(1).Range.Font.Bold = -1
    $cell.Range.Paragraphs.Item(1).Range.Font.Color = $AccentColor
    $cell.Range.ParagraphFormat.SpaceAfter = 4
    $cell.Range.ParagraphFormat.SpaceBefore = 3
    $table.Rows.Item(1).HeightRule = $wdRowHeightAtLeast
    $afterTable = $table.Range.Duplicate
    $afterTable.Collapse($wdCollapseEnd)
    $afterTable.Select()
    $script:sel.TypeParagraph()
}

function Add-PageBreak {
    Move-To-End
    $script:sel.InsertBreak($wdPageBreak)
}

function Add-HyperlinkParagraph {
    param(
        [Parameter(Mandatory = $true)][string]$Prefix,
        [Parameter(Mandatory = $true)][string]$Url
    )
    Move-To-End
    $script:sel.Style = $wdStyleNormal
    $script:sel.ParagraphFormat.Alignment = $wdAlignParagraphLeft
    $script:sel.ParagraphFormat.LeftIndent = $script:word.CentimetersToPoints(0.7)
    $script:sel.ParagraphFormat.FirstLineIndent = $script:word.CentimetersToPoints(-0.7)
    $script:sel.ParagraphFormat.SpaceAfter = 7
    $script:sel.Font.Name = 'Aptos'
    $script:sel.Font.Size = 9.5
    $script:sel.Font.Color = $ColorText
    $script:sel.TypeText($Prefix + ' ')
    $anchor = $script:sel.Range
    [void]$script:doc.Hyperlinks.Add($anchor, $Url, $null, $null, $Url)
    Move-To-End
    $script:sel.TypeParagraph()
}

function Save-WordDocument {
    param(
        [Parameter(Mandatory = $true)]$Document,
        [Parameter(Mandatory = $true)][string]$Path
    )
    # Una variable local fuertemente tipada produce la referencia COM esperada
    # por Word 16 en Windows PowerShell 5.1.
    [string]$localPath = [System.IO.Path]::GetFullPath($Path)
    $Document.SaveAs2([ref]$localPath)
}

$outputDocx = Join-Path $OutputDirectory 'Informe_Proyecto_LabAR_Seguro.docx'
$outputPdf = Join-Path $OutputDirectory 'Informe_Proyecto_LabAR_Seguro.pdf'

$word = $null
$doc = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Add()
    $sel = $word.Selection
    $script:word = $word
    $script:doc = $doc
    $script:sel = $sel

    # Configuración de página y estilos.
    $section = $doc.Sections.Item(1)
    $section.PageSetup.PaperSize = $wdPaperA4
    $section.PageSetup.TopMargin = $word.CentimetersToPoints(2.3)
    $section.PageSetup.BottomMargin = $word.CentimetersToPoints(2.2)
    $section.PageSetup.LeftMargin = $word.CentimetersToPoints(2.5)
    $section.PageSetup.RightMargin = $word.CentimetersToPoints(2.3)
    $section.PageSetup.HeaderDistance = $word.CentimetersToPoints(1.0)
    $section.PageSetup.FooterDistance = $word.CentimetersToPoints(1.0)
    $section.PageSetup.DifferentFirstPageHeaderFooter = -1

    $normal = $doc.Styles.Item($wdStyleNormal)
    $normal.Font.Name = 'Aptos'
    $normal.Font.Size = 10.5
    $normal.Font.Color = $ColorText
    $normal.ParagraphFormat.Alignment = $wdAlignParagraphJustify
    $normal.ParagraphFormat.LineSpacingRule = $wdLineSpaceMultiple
    $normal.ParagraphFormat.LineSpacing = 13.8
    $normal.ParagraphFormat.SpaceAfter = 6
    $normal.ParagraphFormat.FirstLineIndent = $word.CentimetersToPoints(0.55)
    $normal.ParagraphFormat.WidowControl = -1

    $titleStyle = $doc.Styles.Item($wdStyleTitle)
    $titleStyle.Font.Name = 'Aptos Display'
    $titleStyle.Font.Size = 30
    $titleStyle.Font.Bold = -1
    $titleStyle.Font.Color = $ColorNavy
    $titleStyle.ParagraphFormat.Alignment = $wdAlignParagraphLeft
    $titleStyle.ParagraphFormat.SpaceAfter = 10

    $subtitleStyle = $doc.Styles.Item($wdStyleSubtitle)
    $subtitleStyle.Font.Name = 'Aptos'
    $subtitleStyle.Font.Size = 15
    $subtitleStyle.Font.Color = $ColorTeal
    $subtitleStyle.ParagraphFormat.Alignment = $wdAlignParagraphLeft
    $subtitleStyle.ParagraphFormat.SpaceAfter = 12

    $h1 = $doc.Styles.Item($wdStyleHeading1)
    $h1.Font.Name = 'Aptos Display'
    $h1.Font.Size = 17
    $h1.Font.Bold = -1
    $h1.Font.Color = $ColorNavy
    $h1.ParagraphFormat.SpaceBefore = 16
    $h1.ParagraphFormat.SpaceAfter = 7
    $h1.ParagraphFormat.KeepWithNext = -1
    $h1.ParagraphFormat.KeepTogether = -1
    $h1.ParagraphFormat.PageBreakBefore = 0
    $h1.ParagraphFormat.FirstLineIndent = 0

    $h2 = $doc.Styles.Item($wdStyleHeading2)
    $h2.Font.Name = 'Aptos Display'
    $h2.Font.Size = 12.5
    $h2.Font.Bold = -1
    $h2.Font.Color = $ColorTeal
    $h2.ParagraphFormat.SpaceBefore = 10
    $h2.ParagraphFormat.SpaceAfter = 5
    $h2.ParagraphFormat.KeepWithNext = -1
    $h2.ParagraphFormat.FirstLineIndent = 0

    $h3 = $doc.Styles.Item($wdStyleHeading3)
    $h3.Font.Name = 'Aptos'
    $h3.Font.Size = 10.5
    $h3.Font.Bold = -1
    $h3.Font.Color = $ColorSlate
    $h3.ParagraphFormat.SpaceBefore = 8
    $h3.ParagraphFormat.SpaceAfter = 3
    $h3.ParagraphFormat.KeepWithNext = -1
    $h3.ParagraphFormat.FirstLineIndent = 0

    # PORTADA
    Add-Paragraph -Text 'TECNOLOGÍAS EMERGENTES' -Alignment $wdAlignParagraphLeft -Bold -FontSize 11 -FontColor $ColorTeal -SpaceAfter 26 -NoIndent
    Add-Paragraph -Text 'LabAR' -Style $wdStyleTitle -Alignment $wdAlignParagraphLeft -NoIndent
    Add-Paragraph -Text 'SEGURO' -Alignment $wdAlignParagraphLeft -Bold -FontSize 30 -FontColor $ColorCyan -SpaceAfter 4 -NoIndent
    Add-Paragraph -Text 'Guía WebAR personalizada para el aprendizaje y uso inicial seguro del multímetro digital' -Style $wdStyleSubtitle -Alignment $wdAlignParagraphLeft -NoIndent

    $coverRows = @(
        @('PRIMERA ENTREGA', 'Propuesta inicial de proyecto'),
        @('TECNOLOGÍA CENTRAL', 'WebAR · seguimiento visual · personalización UX basada en reglas'),
        @('ALCANCE DEL MVP', 'Un equipo, una práctica guiada, experiencia adaptativa y evaluación formativa')
    )
    $coverTable = Add-Table -Rows $coverRows -Columns 2 -Widths @(4.2, 11.2) -Compact
    for ($r = 1; $r -le 3; $r++) {
        $coverTable.Cell($r,1).Range.Font.Bold = -1
        $coverTable.Cell($r,1).Range.Font.Color = $ColorTeal
        $coverTable.Cell($r,1).Shading.BackgroundPatternColor = $ColorLightBlue
        $coverTable.Cell($r,2).Shading.BackgroundPatternColor = $ColorWhite
    }

    Add-Paragraph -Text ' ' -SpaceAfter 18 -NoIndent
    Add-Paragraph -Text 'Asignatura: Tecnologías Emergentes' -Alignment $wdAlignParagraphLeft -FontSize 10.5 -NoIndent
    Add-Paragraph -Text 'Estudiante(s): [Completar nombres]' -Alignment $wdAlignParagraphLeft -FontSize 10.5 -NoIndent
    Add-Paragraph -Text 'Docente: [Completar nombre]' -Alignment $wdAlignParagraphLeft -FontSize 10.5 -NoIndent
    Add-Paragraph -Text 'Programa / institución: [Completar]' -Alignment $wdAlignParagraphLeft -FontSize 10.5 -NoIndent
    Add-Paragraph -Text 'Fecha: 3 de septiembre de 2026' -Alignment $wdAlignParagraphLeft -FontSize 10.5 -NoIndent
    Add-Paragraph -Text 'Versión 1.1 · Documento editable' -Alignment $wdAlignParagraphRight -Italic -FontSize 9 -FontColor $ColorMuted -SpaceBefore 26 -NoIndent

    Add-PageBreak

    # TABLA DE CONTENIDO
    Add-Paragraph -Text 'Contenido' -Style $wdStyleTitle -Alignment $wdAlignParagraphLeft -NoIndent
    Add-Paragraph -Text 'El índice se actualiza automáticamente al abrir el documento en Word.' -Alignment $wdAlignParagraphLeft -Italic -FontSize 9.5 -FontColor $ColorMuted -NoIndent
    Move-To-End
    $tocRange = $sel.Range
    [void]$doc.TablesOfContents.Add($tocRange, $true, 1, 2)
    Move-To-End
    $sel.TypeParagraph()
    Add-PageBreak

    # FICHA EJECUTIVA
    Add-Heading1 'Ficha ejecutiva de la propuesta'
    Add-Callout -Title 'Idea seleccionada' -Text 'LabAR Seguro es una aplicación WebAR personalizada para teléfonos móviles. Reconoce un marcador situado junto a un multímetro y superpone indicaciones de identificación, preparación, precaución y procedimiento; además, adapta el nivel de detalle, el formato y los refuerzos según las preferencias y el progreso del estudiante. No sustituye al docente ni certifica seguridad: funciona como apoyo didáctico contextual para principiantes.' -FillColor $ColorLightBlue -AccentColor $ColorTeal

    $fichaRows = @(
        @('Aspecto', 'Definición'),
        @('Usuario principal', 'Estudiante universitario que utiliza por primera vez un multímetro digital en un laboratorio básico de electrónica.'),
        @('Necesidad', 'Consultar instrucciones en el punto de uso sin apartar continuamente la atención del equipo ni depender de una explicación repetida.'),
        @('Propuesta de valor', 'Orientación visual, secuencial, contextual y personalizada sobre el equipo físico, con verificación previa y retroalimentación formativa.'),
        @('Tecnologías emergentes', 'Realidad aumentada móvil, WebAR y seguimiento visual de marcadores; personalización explicable basada en reglas, recursos 2D/3D ligeros y analítica local como tecnologías habilitadoras.'),
        @('MVP', 'Guía personalizada para una práctica de voltaje DC de baja tensión con un DT-830B, un marcador, diez pantallas conectadas y una evaluación formativa.'),
        @('Beneficio esperado', 'Más autonomía y comprensión operativa, menos omisiones de pasos y menor demanda de aclaraciones básicas al instructor.'),
        @('Límite esencial', 'No se utilizará en circuitos energizados de red, procedimientos de alto riesgo ni sin supervisión y aprobación del responsable del laboratorio.')
    )
    Add-Table -Rows $fichaRows -Columns 2 -Widths @(4.0, 11.5) -Header | Out-Null

    Add-Heading2 'Criterio de selección de la idea'
    Add-Paragraph -Text 'Se eligió esta propuesta porque la tecnología no es un adorno: la realidad aumentada resuelve la distancia entre la instrucción y el objeto al que se refiere. Además, el alcance puede demostrarse con un solo equipo, un teléfono y un marcador impreso; el prototipo visual se traduce naturalmente en pantallas de cámara, capas informativas, alertas y pasos de interacción. La idea permite investigar un problema concreto, construir un MVP dentro de un semestre y evaluar resultados con indicadores observables.'

    Add-Heading2 'Enfoque definido del proyecto'
    Add-Paragraph -Text 'LabAR Seguro tendrá un enfoque educativo, preventivo, personalizado y de apoyo contextual. Su público principal serán estudiantes universitarios principiantes que realizan una inducción o práctica básica de electrónica y aún no dominan el uso del multímetro digital. Como actores secundarios se consideran docentes, monitores y responsables de laboratorio, quienes validarán el contenido y conservarán la autoridad sobre la práctica. La solución no estará dirigida al uso doméstico de la electricidad ni a técnicos que trabajen de manera autónoma en escenarios de riesgo.'
    Add-Paragraph -Text 'El contexto inicial será un laboratorio universitario presencial y supervisado. La experiencia se diseñará para un puesto de trabajo controlado, un modelo específico de multímetro DT-830B y una práctica aprobada de medición de voltaje continuo (DC) de baja tensión. El teléfono funcionará como una capa de orientación accesible desde el navegador: acercará la instrucción al instrumento real, pero no reemplazará el protocolo institucional, el criterio técnico ni la intervención del docente.'
    Add-Paragraph -Text 'El caso de uso principal comenzará cuando el estudiante abra LabAR Seguro mediante un enlace o código QR. Después de conocer los límites de la herramienta, elegirá la práctica, autorizará la cámara, enfocará el marcador del puesto y confirmará que el equipo coincide con la guía. A continuación, completará una lista preventiva y avanzará por cinco instrucciones breves acompañadas de una etiqueta o flecha sobre la vista del multímetro. Si se pierde el marcador o existe una discrepancia, la experiencia se pausará y ofrecerá el modo 2D o la opción de consultar al instructor. El recorrido finalizará con una evaluación formativa de tres preguntas.'
    Add-Paragraph -Text 'La fase actual dispone de una maqueta frontend móvil y navegable, construida con HTML, CSS y JavaScript sin dependencias. Esa base representa ocho vistas y los estados principales; el siguiente diseño visual ampliará el recorrido a diez pantallas para incorporar configuración de perfil, inicio personalizado y controles de datos. En ambos casos se simulan la cámara, el reconocimiento y las capas AR. El MVP posterior incorporará seguimiento visual real y reglas locales de personalización. Quedan fuera de esta etapa el backend institucional, la integración con un LMS, el reconocimiento general de instrumentos, el diagnóstico eléctrico automático, la certificación de competencias, las mediciones de red o alto voltaje y el despliegue para múltiples laboratorios.'

    $focusRows = @(
        @('Dimensión', 'Decisión de enfoque', 'Razón'),
        @('Público', 'Estudiante universitario principiante.', 'Permite diseñar lenguaje, ayudas y evaluación para una necesidad concreta.'),
        @('Contexto', 'Laboratorio de electrónica presencial y supervisado.', 'Mantiene la autoridad docente y un entorno controlado.'),
        @('Equipo', 'Un multímetro DT-830B.', 'Evita aplicar instrucciones genéricas a controles diferentes.'),
        @('Práctica', 'Voltaje DC de baja tensión.', 'Hace posible un piloto limitado y excluye escenarios de alto riesgo.'),
        @('Interfaz actual', 'Prototipo web móvil con cámara y AR simuladas.', 'Valida primero el flujo, la comprensión y la falla segura.'),
        @('Personalización', 'Reglas transparentes según nivel, preferencias, progreso, errores y condición técnica.', 'Adapta la ayuda sin convertir la seguridad en una variable.'),
        @('Evolución', 'WebAR con marcador y alternativa 2D.', 'Añade el anclaje espacial sin depender de reconocimiento general por IA.')
    )
    Add-Table -Rows $focusRows -Columns 3 -Widths @(3.0, 5.2, 7.0) -Header -Compact -HeaderColor $ColorTeal | Out-Null
    Add-Callout -Title 'Relación con el frontend' -Text 'Cada vista responde a una necesidad del informe: límites, selección, escaneo, confirmación, lista preventiva, guía contextual, pérdida segura del anclaje y evaluación. La maqueta permite validar esta trazabilidad antes de integrar WebAR.' -FillColor $ColorLightBlue -AccentColor $ColorTeal

    Add-Heading2 'Pregunta orientadora'
    Add-Callout -Title 'Pregunta del proyecto' -Text '¿Cómo puede una guía contextual mediante realidad aumentada apoyar la autonomía y reducir los errores de procedimiento de estudiantes principiantes durante una práctica básica con multímetro digital en un laboratorio universitario de electrónica?' -FillColor $ColorLightAmber -AccentColor $ColorAmber

    Add-Heading2 'Objetivo general'
    Add-Paragraph -Text 'Diseñar y validar un prototipo de aplicación WebAR que guíe a estudiantes principiantes en la preparación y ejecución de una práctica básica con multímetro digital, mediante instrucciones superpuestas, controles preventivos y retroalimentación formativa.'

    Add-Heading2 'Objetivos específicos'
    Add-Bullet 'Identificar los pasos, dudas frecuentes y precauciones que deben comunicarse al usar el multímetro seleccionado, con validación de un docente o encargado del laboratorio.'
    Add-Bullet 'Diseñar un flujo móvil accesible que integre escaneo del marcador, lista de verificación, guía paso a paso, advertencias y evaluación corta.'
    Add-Bullet 'Implementar un MVP WebAR para una práctica de medición de voltaje continuo de baja tensión, sin requerir gafas ni hardware especializado.'
    Add-Bullet 'Evaluar comprensión, errores de procedimiento, autonomía, usabilidad y estabilidad técnica mediante un piloto controlado con estudiantes.'

    Add-PageBreak

    # 1. INTRODUCCIÓN
    Add-Heading1 '1. Introducción'
    Add-Paragraph -Text 'Los laboratorios universitarios permiten convertir conceptos abstractos en habilidades observables. En electrónica, comprender una magnitud no es suficiente: el estudiante debe reconocer el instrumento, seleccionar la función adecuada, conectar las puntas en los puertos correctos, establecer un rango seguro, interpretar la lectura y actuar bajo las reglas del laboratorio. Para quien se enfrenta por primera vez a un multímetro, estas decisiones se concentran en pocos minutos y se realizan mientras alterna la mirada entre el equipo, el circuito, el manual y el instructor.'
    Add-Paragraph -Text 'LabAR Seguro surge como una respuesta a esa separación entre la información y el objeto físico. La propuesta consiste en una aplicación web móvil que utiliza la cámara del teléfono para identificar un marcador asociado al multímetro y colocar sobre la vista real etiquetas, flechas, zonas de precaución y una secuencia breve de acciones. El propósito es ofrecer información justo en el momento y lugar en que se necesita, sin convertir el teléfono en una autoridad autónoma ni reemplazar la supervisión humana.'
    Add-Paragraph -Text 'La literatura aporta una base razonable para explorar esta dirección. Tuli et al. (2022) desarrollaron un manual de laboratorio con realidad aumentada para electrónica y reportaron mejores resultados académicos en el grupo experimental frente al grupo de control. Más recientemente, Singh y Ahmad (2024) evaluaron un entorno de realidad aumentada para equipos de laboratorio con 80 estudiantes; informaron una puntuación SUS de 80,9 y mejoras en habilidades operativas frente a instrucciones convencionales. Estos resultados no garantizan que LabAR Seguro produzca el mismo efecto, pero justifican formular y evaluar la hipótesis en un contexto local.'
    Add-Paragraph -Text 'El alcance inicial se limita deliberadamente a una práctica de medición de voltaje continuo de baja tensión con un modelo de multímetro. Esta decisión convierte una visión amplia —asistir diferentes equipos y laboratorios— en un MVP verificable. La primera entrega define el problema, la solución, su carácter emergente, el impacto esperado y los riesgos; asimismo, deja especificado el prototipo visual que se presentará en la siguiente clase.'
    Add-Callout -Title 'Propósito en una frase' -Text 'Acercar la instrucción al equipo físico: ver el multímetro, reconocer qué controlar y avanzar paso a paso con apoyo visual contextual.' -FillColor $ColorLightGreen -AccentColor $ColorGreen

    # 2. PROBLEMA
    Add-Heading1 '2. Planteamiento del problema'
    Add-Heading2 '2.1 Situación actual'
    Add-Paragraph -Text 'En una práctica introductoria, las instrucciones suelen entregarse mediante una demostración del docente, un manual impreso o digital y, en ocasiones, un video. Estos recursos son valiosos, pero están separados del instrumento real. El estudiante debe traducir una fotografía o una descripción general a un modelo específico, localizar controles físicamente y recordar el orden de los pasos. Cuando varios grupos trabajan al mismo tiempo, las consultas básicas se repiten y la retroalimentación del instructor compite con otras tareas de supervisión.'
    Add-Paragraph -Text 'Tuli et al. (2022) señalan que los manuales tradicionales de laboratorio pueden ser estáticos y poco interactivos, y que atender simultáneamente las dudas de varios grupos representa un reto para el instructor. Singh y Ahmad (2024) también describen dificultades asociadas con la complejidad de los equipos, la experiencia previa limitada y los riesgos de operación en laboratorios de electrónica. Por tanto, el problema no es la inexistencia de contenido, sino su presentación descontextualizada y la falta de una guía progresiva en el punto de uso.'

    Add-Heading2 '2.2 Población afectada y actores involucrados'
    Add-Bullet 'Beneficiarios directos: estudiantes de primeros semestres o participantes de una inducción que aún no dominan el uso del multímetro.'
    Add-Bullet 'Beneficiarios indirectos: docentes, monitores y auxiliares, quienes podrían dedicar menos tiempo a repetir instrucciones básicas y más a resolver dudas conceptuales o situaciones críticas.'
    Add-Bullet 'Actor responsable del contenido: docente o encargado del laboratorio, quien valida la secuencia, el lenguaje, las advertencias y el equipo compatible.'
    Add-Bullet 'Actor institucional: programa académico o laboratorio, que define protocolos, permisos de uso, mantenimiento y condiciones de despliegue.'

    Add-Heading2 '2.3 Causas y consecuencias'
    $causeRows = @(
        @('Causa observable', 'Consecuencia posible', 'Necesidad de diseño'),
        @('Manual separado del equipo', 'Cambio constante de atención y dificultad para ubicar controles.', 'Indicación anclada visualmente al componente correspondiente.'),
        @('Demostración única para todo el grupo', 'El estudiante puede olvidar pasos cuando inicia su práctica.', 'Secuencia breve que pueda pausar, repetir y consultar.'),
        @('Diferencias entre modelos de multímetro', 'Una imagen genérica puede no coincidir con puertos o selector.', 'Contenido versionado para un modelo claramente identificado.'),
        @('Alta demanda simultánea al instructor', 'Esperas y repetición de preguntas operativas básicas.', 'Autoservicio limitado para dudas previstas, sin eliminar la supervisión.'),
        @('Exceso de información en pantalla', 'Distracción, oclusión del equipo o falsa sensación de control.', 'Una instrucción por paso, jerarquía visual y botón visible para detenerse.')
    )
    Add-Table -Rows $causeRows -Columns 3 -Widths @(4.5, 5.0, 5.7) -Header -Compact | Out-Null

    Add-Heading2 '2.4 Delimitación del problema'
    Add-Paragraph -Text 'El proyecto no pretende resolver toda la seguridad del laboratorio ni detectar automáticamente cualquier error eléctrico. Se concentra en la orientación inicial para una tarea de baja tensión previamente aprobada. La variable de interés es si una guía contextual facilita que el estudiante complete correctamente la secuencia, comprenda la función de los controles y solicite menos aclaraciones básicas, manteniendo siempre las normas institucionales.'
    Add-Callout -Title 'Problema central' -Text 'La información existe, pero no siempre aparece vinculada al control físico, al paso actual y al modelo exacto de instrumento cuando el principiante la necesita.' -FillColor $ColorLightAmber -AccentColor $ColorAmber

    # 3. SOLUCIÓN
    Add-Heading1 '3. Solución propuesta: ¿qué tiene de innovador?'
    Add-Heading2 '3.1 Descripción de LabAR Seguro'
    Add-Paragraph -Text 'LabAR Seguro será una experiencia WebAR accesible desde un enlace o código QR. Antes de iniciar, el estudiante podrá declarar su nivel, formato preferido y necesidades de accesibilidad, o continuar con la experiencia estándar. Después seleccionará la práctica, aceptará las condiciones de uso de cámara y seguridad, y enfocará un marcador situado junto al multímetro compatible. Al reconocerlo, la aplicación mostrará una capa sobre el video en vivo: primero identificará el selector, la pantalla y los puertos; luego presentará una lista de condiciones previas; finalmente guiará una secuencia de medición de voltaje continuo de baja tensión.'
    Add-Paragraph -Text 'Cada paso combinará una instrucción breve, una señal visual anclada a la zona relevante, una razón —por qué se realiza— y controles para avanzar, retroceder o detener la guía. Un motor de reglas ajustará el detalle, el canal y los refuerzos con base en preferencias, historial y errores; siempre explicará el motivo de la adaptación. Las advertencias críticas interrumpirán el flujo y requerirán confirmación para todos los perfiles. Al terminar, una evaluación de tres preguntas comprobará conceptos esenciales y ofrecerá retroalimentación; no emitirá una certificación de seguridad.'

    Add-Heading2 '3.2 Flujo principal de uso'
    Add-Numbered 'Ingresar a LabAR Seguro y leer el alcance: apoyo didáctico, equipo compatible y obligación de seguir al docente.'
    Add-Numbered 'Elegir “Multímetro digital” y la práctica “Medición de voltaje DC de baja tensión”.'
    Add-Numbered 'Autorizar la cámara y escanear el marcador del puesto de trabajo.'
    Add-Numbered 'Confirmar visualmente que el modelo detectado coincide con el instrumento real.'
    Add-Numbered 'Completar la lista previa: área seca, puntas en buen estado, fuente dentro del rango autorizado y selector inicialmente apagado.'
    Add-Numbered 'Seguir la guía superpuesta paso a paso; detenerse y llamar al instructor ante una discrepancia.'
    Add-Numbered 'Responder la evaluación corta, revisar errores y cerrar la sesión sin guardar imágenes de cámara.'

    Add-Heading2 '3.3 Componentes funcionales'
    $functionRows = @(
        @('Componente', 'Función', 'Valor para el usuario'),
        @('Inicio seguro', 'Presenta compatibilidad, límites y consentimiento de cámara.', 'Evita iniciar con expectativas equivocadas.'),
        @('Perfil y motor de reglas', 'Combina preferencias, progreso, errores y estado técnico.', 'Adapta detalle, formato y refuerzos de manera explicable.'),
        @('Escáner de marcador', 'Asocia el puesto con el modelo y la práctica correctos.', 'Reduce ambigüedad entre instrumentos.'),
        @('Exploración AR', 'Etiqueta selector, puertos, pantalla y zonas de precaución.', 'Relaciona término, ubicación y función.'),
        @('Lista previa', 'Solicita confirmar condiciones observables antes de avanzar.', 'Transforma la prevención en una acción explícita.'),
        @('Guía contextual', 'Entrega una instrucción por paso con flecha o resaltado.', 'Disminuye búsqueda y carga visual innecesaria.'),
        @('Modo 2D alternativo', 'Muestra la misma secuencia con imagen anotada.', 'Mantiene acceso si la cámara o WebAR falla.'),
        @('Evaluación formativa', 'Tres preguntas y explicación inmediata.', 'Comprueba comprensión sin certificar competencia.'),
        @('Reporte de problema', 'Permite indicar marcador, contenido o equipo inconsistente.', 'Facilita mantener la guía actualizada.')
    )
    Add-Table -Rows $functionRows -Columns 3 -Widths @(3.4, 6.0, 5.8) -Header -Compact | Out-Null

    Add-Heading2 '3.4 ¿Dónde está la innovación?'
    Add-Paragraph -Text 'La innovación no consiste en reemplazar un PDF por otro formato digital. LabAR Seguro combina cuatro decisiones: (1) información situada sobre el instrumento real; (2) adaptación a un modelo y una práctica específicos; (3) progresión condicionada por controles preventivos; y (4) despliegue desde el navegador de un teléfono común. El resultado esperado es una experiencia “en el punto de acción”, más cercana a una asistencia contextual que a una biblioteca de contenidos.'

    $comparisonRows = @(
        @('Alternativa', 'Fortaleza', 'Limitación frente al problema', 'Diferencia de LabAR Seguro'),
        @('Manual impreso o PDF', 'Contenido estable y fácil de distribuir.', 'Exige localizar en el equipo aquello que describe el texto.', 'Ancla la indicación al control visible y al paso actual.'),
        @('Video tutorial', 'Demuestra movimiento y secuencia.', 'Puede corresponder a otro modelo; obliga a alternar entre video y equipo.', 'Superpone una instrucción breve sobre el instrumento real.'),
        @('QR con página informativa', 'Acceso rápido y económico.', 'Abre contenido, pero no mantiene referencias espaciales ni progreso.', 'Usa el marcador para identificación y seguimiento de capas contextuales.'),
        @('Simulador virtual', 'Permite practicar sin riesgo sobre un modelo digital.', 'Separa el aprendizaje del equipo físico disponible.', 'Conserva el entorno real y añade información digital.'),
        @('Aplicación AR genérica', 'Puede incluir experiencias ricas y múltiples equipos.', 'Requiere mayor desarrollo, almacenamiento y configuración.', 'MVP web enfocado en un único equipo, sin instalación ni gafas.')
    )
    Add-Table -Rows $comparisonRows -Columns 4 -Widths @(3.0, 3.4, 4.8, 4.5) -Header -Compact | Out-Null

    Add-Heading2 '3.5 Alcance del producto mínimo viable'
    $scopeRows = @(
        @('Incluido en el MVP', 'No incluido en esta fase'),
        @('Un modelo de multímetro digital.', 'Reconocimiento automático de cualquier equipo sin marcador.'),
        @('Una práctica de voltaje DC de baja tensión aprobada.', 'Mediciones en red eléctrica, alto voltaje o procedimientos de alto riesgo.'),
        @('Marcador visual, etiquetas, flechas y resaltados 2D.', 'Modelo 3D fotorealista o seguimiento espacial avanzado.'),
        @('Ocho pantallas y un flujo completo.', 'Panel institucional, gamificación extensa o integración con LMS.'),
        @('Cuestionario de tres preguntas y datos locales mínimos.', 'Calificación oficial, certificación o diagnóstico automatizado.'),
        @('Prueba piloto pequeña y supervisada.', 'Despliegue general en todos los laboratorios.')
    )
    Add-Table -Rows $scopeRows -Columns 2 -Widths @(7.7, 7.7) -Header -Compact -HeaderColor $ColorTeal | Out-Null
    Add-Callout -Title 'Regla de seguridad del producto' -Text 'Si la imagen, el equipo o la instrucción no coinciden, la aplicación debe pedir que el usuario se detenga y consulte al responsable del laboratorio. Nunca debe improvisar una recomendación.' -FillColor $ColorLightAmber -AccentColor $ColorRed

    # 4. DEFENSA TECNOLOGÍA EMERGENTE
    Add-Heading1 '4. Defensa como proyecto de tecnología emergente'
    Add-Heading2 '4.1 Tecnología principal: realidad aumentada móvil'
    Add-Paragraph -Text 'La realidad aumentada integra información digital con una vista del entorno físico y mantiene una relación espacial entre ambas. A diferencia de la realidad virtual, no reemplaza el laboratorio: utiliza el instrumento real como centro de la experiencia. En LabAR Seguro, esta capacidad es esencial porque permite señalar el puerto, el selector o la zona que corresponde a cada instrucción.'
    Add-Paragraph -Text 'El proyecto se implementará como WebAR, es decir, una experiencia de realidad aumentada ejecutada desde el navegador. La especificación WebXR Device API del World Wide Web Consortium describe el acceso web a dispositivos y sensores de realidad virtual y aumentada. A junio de 2026 continuaba como Candidate Recommendation Draft, y MDN advierte que WebXR mantiene disponibilidad limitada en navegadores; esa combinación de estandarización en curso, rápida evolución y compatibilidad desigual es propia de una tecnología emergente (W3C, 2026; MDN Web Docs, 2026).'

    Add-Heading2 '4.2 Tecnologías y aporte concreto'
    $techRows = @(
        @('Tecnología', 'Uso en el proyecto', 'Aporte'),
        @('Realidad aumentada móvil', 'Superponer etiquetas, flechas y estados sobre la cámara.', 'Vincula la explicación con el instrumento y el contexto inmediato.'),
        @('WebAR / WebXR', 'Entregar la experiencia mediante un enlace web seguro.', 'Reduce barreras de instalación y facilita actualizar contenido centralmente.'),
        @('Visión por computador basada en marcadores', 'Detectar un patrón y estimar su posición y orientación.', 'Ofrece un punto de anclaje estable y controlable para el MVP.'),
        @('Gráficos web 2D/3D', 'Renderizar resaltados, animaciones y controles.', 'Representa relaciones espaciales y secuencias sin hardware especializado.'),
        @('Aplicación web progresiva', 'Cachear contenido básico y conservar progreso local.', 'Permite continuidad limitada ante conectividad inestable.'),
        @('Analítica local mínima', 'Registrar paso completado, tiempo y errores del cuestionario sin video.', 'Hace posible evaluar el piloto con menor exposición de datos.')
    )
    Add-Table -Rows $techRows -Columns 3 -Widths @(4.0, 5.5, 5.7) -Header -Compact | Out-Null

    Add-Heading2 '4.3 Arquitectura conceptual'
    Add-Paragraph -Text 'La arquitectura propuesta separa la captura de cámara, el reconocimiento visual, el contenido pedagógico y el registro de evaluación. Esta separación permite sustituir una librería o actualizar una instrucción sin rediseñar todo el producto.'
    $archRows = @(
        @('1 · Estudiante y teléfono', '→', '2 · Interfaz WebAR', '→', '3 · Detector de marcador'),
        @('Ve el equipo y controla el avance.', '', 'Gestiona cámara, accesibilidad y estado.', '', 'Identifica modelo y calcula el anclaje.'),
        @('↓', '', '↓', '', '↓'),
        @('6 · Resultado local', '←', '5 · Motor de secuencia', '←', '4 · Repositorio validado'),
        @('Progreso, respuestas y reporte; no video.', '', 'Activa paso, alerta y retroalimentación.', '', 'Pasos, recursos y versión por equipo.')
    )
    $archTable = Add-Table -Rows $archRows -Columns 5 -Widths @(4.1, 0.7, 4.1, 0.7, 4.1) -Compact
    foreach ($r in @(1,4)) {
        foreach ($c in @(1,3,5)) {
            $archTable.Cell($r,$c).Shading.BackgroundPatternColor = $ColorNavy
            $archTable.Cell($r,$c).Range.Font.Color = $ColorWhite
            $archTable.Cell($r,$c).Range.Font.Bold = -1
            $archTable.Cell($r,$c).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
        }
    }
    foreach ($r in @(1,3,4)) {
        foreach ($c in @(2,4)) {
            $archTable.Cell($r,$c).Range.Font.Color = $ColorTeal
            $archTable.Cell($r,$c).Range.Font.Bold = -1
            $archTable.Cell($r,$c).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
        }
    }
    foreach ($c in 1..5) { $archTable.Cell(3,$c).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter }

    Add-Heading2 '4.4 Por qué la tecnología es necesaria y no decorativa'
    Add-Paragraph -Text 'Si se elimina la realidad aumentada, la propuesta se convierte en una guía móvil convencional y reaparece la tarea de traducir una imagen genérica al equipo real. El seguimiento del marcador aporta la referencia espacial que define la solución. Al mismo tiempo, el proyecto evita atribuirle capacidades inexistentes: el MVP no “entiende” eléctricamente el circuito ni verifica que una conexión sea segura. Su inteligencia reside en presentar una secuencia validada y contextual, mientras que la decisión técnica y la supervisión continúan en manos humanas.'

    Add-Heading2 '4.5 Factibilidad técnica preliminar'
    Add-Paragraph -Text 'Un primer desarrollo puede construirse con tecnologías web abiertas: HTML, CSS y JavaScript para la interfaz; A-Frame o Three.js para la escena; y una librería de seguimiento por marcador como AR.js. La documentación de AR.js contempla marcadores de patrón y código de barras, adecuados para una prueba controlada. Esta ruta permite validar el concepto antes de considerar reconocimiento sin marcadores, integración con sensores o modelos tridimensionales complejos.'
    Add-Callout -Title 'Criterio de éxito tecnológico' -Text 'El MVP será válido si mantiene la indicación alineada de forma comprensible mientras el marcador esté visible y ofrece inmediatamente un modo 2D cuando no pueda hacerlo.' -FillColor $ColorLightGreen -AccentColor $ColorGreen

    # 5. IMPACTO
    Add-Heading1 '5. Impacto y relevancia'
    Add-Heading2 '5.1 Impacto educativo y social'
    Add-Paragraph -Text 'El impacto esperado es educativo: facilitar el paso de la explicación abstracta a una acción guiada, especialmente para estudiantes sin experiencia previa. Una secuencia visible y repetible puede favorecer la autonomía, permitir que cada persona avance a su ritmo y liberar tiempo del instructor para preguntas conceptuales o situaciones que sí requieren juicio experto. El proyecto también puede apoyar la inducción de nuevos usuarios y estandarizar la presentación de pasos previamente aprobados.'
    Add-Paragraph -Text 'La relevancia social proviene de diseñar para distintos modos de acceso desde el inicio. La guía incluirá alto contraste, tamaño de texto ajustable, controles grandes, lenguaje directo, iconos acompañados de texto, narración opcional y un modo 2D. Las Pautas de Accesibilidad para el Contenido Web 2.2 recomiendan que la información sea perceptible, operable, comprensible y robusta; por ello servirán como referencia de diseño, aunque el cumplimiento completo deberá verificarse mediante pruebas (W3C, 2023).'

    Add-Heading2 '5.2 Impacto tecnológico e institucional'
    Add-Paragraph -Text 'En el plano tecnológico, LabAR Seguro explora una interfaz espacial desde la web y genera conocimiento local sobre compatibilidad, legibilidad y seguimiento en teléfonos disponibles entre los estudiantes. Para la institución, un repositorio versionado puede facilitar que cada guía muestre responsable, fecha de revisión y equipo compatible. El valor empresarial potencial se encuentra en un modelo replicable para inducción técnica, mantenimiento asistido o capacitación de equipos, pero esos escenarios quedan fuera de la validación académica inicial.'

    Add-Heading2 '5.3 Evaluación del impacto esperado'
    Add-Paragraph -Text 'No se presentarán como resultados los beneficios que aún no han sido medidos. Se propone un piloto con entre 8 y 15 estudiantes, realizado en una práctica de baja tensión y con supervisión. Cada participante ejecutará tareas comparables utilizando primero el recurso habitual o mediante grupos balanceados, según lo autorice el docente. Los siguientes umbrales son metas de validación, no datos obtenidos.'
    $metricRows = @(
        @('Indicador', 'Cómo se mide', 'Meta inicial de validación'),
        @('Errores de procedimiento', 'Lista de cotejo aplicada por observador.', 'Reducción de al menos 25 % frente al recurso habitual.'),
        @('Autonomía', 'Cantidad de ayudas directas solicitadas por tarea.', 'Reducción de al menos 20 % sin omitir controles críticos.'),
        @('Comprensión', 'Prueba breve equivalente antes y después.', 'Mejora media de al menos 15 puntos porcentuales.'),
        @('Usabilidad', 'System Usability Scale al finalizar.', 'Puntuación SUS igual o superior a 70.'),
        @('Estabilidad del anclaje', 'Porcentaje de tiempo útil con marcador visible.', 'Al menos 90 % en los teléfonos de prueba compatibles.'),
        @('Accesibilidad básica', 'Revisión por teclado, contraste, zoom y lector de pantalla en modo 2D.', 'Sin barreras críticas en el flujo principal.'),
        @('Validez del contenido', 'Lista de pasos revisada por responsable del laboratorio.', '100 % de instrucciones y advertencias aprobadas antes del piloto.')
    )
    Add-Table -Rows $metricRows -Columns 3 -Widths @(4.0, 5.8, 5.4) -Header -Compact | Out-Null

    Add-Heading2 '5.4 Beneficiarios y posibilidad de crecimiento'
    Add-Paragraph -Text 'El beneficiario inmediato será el estudiante principiante. A mediano plazo, si la evaluación demuestra utilidad y seguridad, el modelo puede extenderse a otros multímetros o equipos de baja complejidad mediante paquetes de contenido versionados. Cualquier expansión debe comenzar con observación de usuarios y validación del responsable; no se asumirá que una guía sirve para instrumentos o contextos distintos.'
    Add-Callout -Title 'Resultado mínimo valioso' -Text 'Aunque la hipótesis no alcance todos los umbrales, el piloto producirá evidencia sobre dónde la realidad aumentada ayuda, dónde distrae y qué debe conservarse en una guía 2D.' -FillColor $ColorLightBlue -AccentColor $ColorTeal

    # 6. RETOS
    Add-Heading1 '6. Retos y limitaciones'
    Add-Heading2 '6.1 Matriz de riesgos y mitigación'
    $riskRows = @(
        @('Riesgo o limitación', 'Probabilidad / impacto', 'Medida de mitigación'),
        @('Instrucción incompleta o desactualizada', 'Media / Alta', 'Validación docente, control de versión, equipo compatible visible y bloqueo del piloto si cambia el procedimiento.'),
        @('Falla de seguimiento por luz, ángulo u oclusión', 'Alta / Media', 'Marcador de alto contraste, prueba ambiental, mensaje de pérdida de anclaje y cambio inmediato al modo 2D.'),
        @('Falsa sensación de seguridad', 'Media / Alta', 'Aviso persistente de apoyo educativo, botón “Detener y consultar”, supervisión y exclusión de tareas de alto riesgo.'),
        @('Distracción u oclusión visual', 'Media / Media', 'Una instrucción por pantalla, capas pequeñas, pausa manual y pruebas de carga cognitiva con usuarios.'),
        @('Incompatibilidad de navegador o dispositivo', 'Alta / Media', 'Matriz de teléfonos soportados, detección previa y ruta 2D sin AR.'),
        @('Acceso desigual a teléfono o datos', 'Media / Media', 'Dispositivo de préstamo, contenidos ligeros y caché local cuando sea viable.'),
        @('Privacidad de la cámara', 'Media / Alta', 'Procesamiento en el dispositivo, consentimiento claro, no almacenar ni transmitir video y cierre explícito de sesión.'),
        @('Contenido inaccesible', 'Media / Media', 'Texto alternativo, contraste, zoom, narración opcional, controles grandes y evaluación con usuarios diversos.'),
        @('Tiempo de desarrollo insuficiente', 'Media / Media', 'Congelar alcance en un equipo y una práctica; reutilizar componentes y posponer 3D avanzado.'),
        @('Resultados de piloto no generalizables', 'Alta / Baja', 'Reportar tamaño y contexto de muestra; presentar hallazgos como exploratorios.')
    )
    Add-Table -Rows $riskRows -Columns 3 -Widths @(4.7, 3.1, 7.4) -Header -Compact -HeaderColor $ColorRed | Out-Null

    Add-Heading2 '6.2 Limitaciones técnicas'
    Add-Paragraph -Text 'La estabilidad de una experiencia WebAR depende de la cámara, el navegador, la iluminación, el tamaño del marcador y la capacidad de procesamiento. El teléfono introduce además una tensión ergonómica: sostenerlo mientras se manipula equipo puede ser incómodo o inseguro. Por ello, el piloto debe permitir apoyar el dispositivo en un soporte y nunca exigir una mano ocupada durante una conexión. La especificación WebXR y su compatibilidad siguen evolucionando, de modo que el modo 2D no es accesorio, sino parte de la continuidad del servicio.'

    Add-Heading2 '6.3 Limitaciones pedagógicas y de seguridad'
    Add-Paragraph -Text 'La aplicación puede guiar acciones previstas, pero no observar todas las condiciones del circuito ni interpretar de manera confiable una situación no contemplada. Tampoco demuestra por sí sola que el estudiante comprenda los fundamentos. El docente conserva la autoridad sobre la práctica y sobre cualquier desviación. Los avisos críticos deben redactarse a partir del protocolo institucional, no desde supuestos del equipo desarrollador.'

    Add-Heading2 '6.4 Privacidad, ética y accesibilidad'
    Add-Paragraph -Text 'El permiso de cámara puede generar desconfianza y revelar accidentalmente personas u objetos del entorno. El diseño aplicará minimización de datos: el video se procesa en memoria para detectar el marcador, no se almacena, no se envía a un servidor y se descarta al cerrar la sesión. Las métricas del piloto utilizarán identificadores seudónimos y consentimiento informado. La accesibilidad se validará tanto en la interfaz AR como en la alternativa 2D, porque algunas personas no podrán o no querrán sostener y mover un teléfono.'

    Add-Heading2 '6.5 Condiciones para implementar'
    Add-Bullet 'Autorización del responsable del laboratorio y validación escrita del contenido antes de cualquier prueba con estudiantes.'
    Add-Bullet 'Selección de una fuente de baja tensión, un modelo específico de multímetro y un puesto de prueba controlado.'
    Add-Bullet 'Pruebas previas en los navegadores y teléfonos definidos como compatibles.'
    Add-Bullet 'Disponibilidad de guía 2D, soporte para teléfono y mecanismo visible para abandonar la experiencia.'
    Add-Bullet 'Protocolo de piloto con consentimiento, observación, criterios de suspensión y reporte transparente de incidentes.'
    Add-Callout -Title 'Conclusión de viabilidad' -Text 'LabAR Seguro es viable como proyecto académico si mantiene el alcance reducido, valida el contenido con un experto y evalúa la realidad aumentada como apoyo —no como sustituto de la supervisión—. Su valor se comprobará con evidencia del piloto, no con la novedad visual por sí sola.' -FillColor $ColorLightGreen -AccentColor $ColorGreen

    Add-PageBreak

    # ANEXO PROTOTIPO
    Add-Heading1 'Anexo A. Especificación del prototipo visual inicial'
    Add-Paragraph -Text 'La primera maqueta frontend ya se plantea como una aplicación web móvil navegable en HTML, CSS y JavaScript. No utiliza la cámara real ni ejecuta seguimiento: representa el recorrido completo y diferencia con claridad las capas simuladas de realidad aumentada. La referencia visual utiliza un marco móvil cercano a 390 × 844 píxeles y servirá como base para iterar el diseño antes de integrar WebAR.'

    Add-Heading2 'A.1 Pantallas mínimas'
    $screenRows = @(
        @('N.º', 'Pantalla', 'Elementos que debe mostrar', 'Decisión que valida'),
        @('01', 'Bienvenida y límites', 'Nombre, propuesta de valor, equipo compatible, aviso de supervisión y botón “Comenzar”.', 'El usuario entiende qué hace y qué no hace la solución.'),
        @('02', 'Selección de práctica', 'Tarjeta “Multímetro digital”, práctica de voltaje DC, duración y nivel.', 'El alcance es específico y el contenido está versionado.'),
        @('03', 'Permiso y escaneo', 'Vista de cámara simulada, marco de enfoque, instrucción y alternativa “Usar guía 2D”.', 'Existe consentimiento y ruta de respaldo.'),
        @('04', 'Equipo identificado', 'Modelo, fotografía miniatura, coincidencia Sí/No y versión de la guía.', 'Se evita aplicar instrucciones a otro instrumento.'),
        @('05', 'Lista previa', 'Cuatro controles, explicación breve y botón bloqueado hasta confirmar.', 'La prevención ocurre antes del procedimiento.'),
        @('06', 'Vista AR paso a paso', 'Cámara simulada, resaltado del puerto/selector, paso 2 de 5, por qué, anterior, siguiente y detener.', 'La información está anclada y la carga visual es limitada.'),
        @('07', 'Advertencia o pérdida de anclaje', 'Mensaje de pausa, acción segura y opciones reintentar / modo 2D / consultar.', 'La aplicación falla de forma segura.'),
        @('08', 'Evaluación y cierre', 'Tres preguntas, retroalimentación, resumen de pasos y reporte de problema.', 'El flujo termina en comprensión, no solo en interacción.')
    )
    Add-Table -Rows $screenRows -Columns 4 -Widths @(1.0, 3.2, 7.2, 4.0) -Header -Compact | Out-Null

    Add-Heading2 'A.2 Flujo de interacción'
    $flowRows = @(
        @('INICIO', '→', 'PRÁCTICA', '→', 'ESCANEO', '→', 'CONFIRMACIÓN'),
        @('↓', '', '', '', '', '', '↓'),
        @('CIERRE', '←', 'EVALUACIÓN', '←', 'GUÍA AR', '←', 'LISTA PREVIA')
    )
    $flowTable = Add-Table -Rows $flowRows -Columns 7 -Widths @(2.2, 0.6, 2.2, 0.6, 2.2, 0.6, 2.2) -Compact
    foreach ($r in @(1,3)) {
        foreach ($c in @(1,3,5,7)) {
            $flowTable.Cell($r,$c).Shading.BackgroundPatternColor = if ($r -eq 1) { $ColorNavy } else { $ColorTeal }
            $flowTable.Cell($r,$c).Range.Font.Color = $ColorWhite
            $flowTable.Cell($r,$c).Range.Font.Bold = -1
            $flowTable.Cell($r,$c).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
        }
        foreach ($c in @(2,4,6)) {
            $flowTable.Cell($r,$c).Range.Font.Color = $ColorAmber
            $flowTable.Cell($r,$c).Range.Font.Bold = -1
            $flowTable.Cell($r,$c).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
        }
    }
    $flowTable.Cell(2,1).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
    $flowTable.Cell(2,7).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter

    Add-Heading2 'A.3 Matriz de trazabilidad entre informe y prototipo'
    $traceRows = @(
        @('Problema', 'Función', 'Pantalla', 'Indicador asociado'),
        @('La instrucción está separada del equipo.', 'Capa anclada al control físico.', '06 · Vista AR', 'Errores de procedimiento.'),
        @('Puede confundirse el modelo.', 'Confirmación de instrumento y versión.', '04 · Equipo identificado', 'Incidencias por incompatibilidad.'),
        @('Se omiten condiciones previas.', 'Lista de verificación obligatoria.', '05 · Lista previa', 'Cumplimiento de controles críticos.'),
        @('El seguimiento puede fallar.', 'Pausa segura y modo 2D.', '03 y 07', 'Continuidad del flujo y estabilidad.'),
        @('La novedad no demuestra aprendizaje.', 'Evaluación formativa y retroalimentación.', '08 · Evaluación', 'Cambio pretest/postest.'),
        @('La cámara genera inquietud.', 'Consentimiento y no almacenamiento.', '01 y 03', 'Comprensión del permiso.'),
        @('La interfaz puede ser inaccesible.', 'Texto, audio, contraste, zoom y alternativa 2D.', 'Todas', 'Pruebas de accesibilidad básica.')
    )
    Add-Table -Rows $traceRows -Columns 4 -Widths @(4.2, 4.3, 2.8, 4.2) -Header -Compact | Out-Null

    Add-Heading2 'A.4 Sistema visual recomendado'
    $visualRows = @(
        @('Elemento', 'Especificación'),
        @('Paleta', 'Azul noche #142A4A para estructura; turquesa #008C8C para acciones; ámbar #F3A42D para atención; rojo #C84343 solo para detenerse.'),
        @('Tipografía', 'Aptos, Inter o Roboto; cuerpo mínimo de 16 px en móvil; títulos de 24–30 px.'),
        @('Iconografía', 'Iconos simples acompañados de texto. No comunicar peligro únicamente mediante color.'),
        @('Capa AR', 'Máximo una flecha principal, una etiqueta y el contador de paso; evitar cubrir la pantalla o el selector.'),
        @('Controles', 'Botones de al menos 44 × 44 px; “Detener” siempre visible y separado de “Siguiente”.'),
        @('Estados', 'Preparado, buscando marcador, anclado, marcador perdido, paso completado y bloqueo preventivo.')
    )
    Add-Table -Rows $visualRows -Columns 2 -Widths @(3.6, 11.8) -Header -Compact -HeaderColor $ColorTeal | Out-Null

    Add-Heading2 'A.5 Microcopy sugerida'
    Add-Bullet 'Bienvenida: “Te ayudaremos a ubicar controles y seguir una práctica aprobada. Tu docente sigue siendo la referencia principal”.'
    Add-Bullet 'Escaneo: “Apunta al marcador del puesto. Mantén el teléfono estable y confirma el modelo antes de continuar”.'
    Add-Bullet 'Pérdida de anclaje: “Pausa. Ya no vemos el marcador. No cambies conexiones hasta recuperar la guía o consultar al instructor”.'
    Add-Bullet 'Discrepancia: “El equipo no coincide con esta guía. Detente y solicita la versión correcta”.'
    Add-Bullet 'Cierre: “Terminaste la guía formativa. Este resultado no reemplaza la validación del docente”.'

    Add-Heading2 'A.6 Entregable para la próxima clase'
    Add-Paragraph -Text 'Se recomienda presentar las ocho pantallas enlazadas y una demostración de 60 a 90 segundos del recorrido: seleccionar práctica → escanear → confirmar equipo → completar lista → avanzar por un paso AR → experimentar una pérdida de marcador → cambiar al modo 2D → responder una pregunta. Esta secuencia demuestra la idea central, el manejo de riesgo y la coherencia con el informe.'
    Add-Paragraph -Text 'La base entregada se encuentra en la carpeta frontend y puede abrirse desde index.html. Sus estados son deliberadamente simulados: su objetivo actual es revisar la arquitectura de información, los textos de seguridad, la navegación y la comprensión del flujo, no demostrar aún reconocimiento visual real.'

    Add-PageBreak

    # ANEXO DE PERSONALIZACIÓN UX
    Add-Heading1 'Anexo B. Diseño funcional de experiencia personalizada'
    Add-Paragraph -Text 'La personalización de la experiencia de usuario en LabAR Seguro adaptará la cantidad de ayuda, el formato de presentación, el ritmo y las recomendaciones según el perfil y el progreso del estudiante. No alterará el protocolo de la práctica. La confirmación del equipo, la lista preventiva, las advertencias, el botón Detener y la supervisión docente serán invariantes para todos los perfiles.'
    Add-Callout -Title 'Principio rector de personalización' -Text 'Se adapta la forma de aprender; nunca se reducen ni se permiten omitir las reglas de seguridad.' -FillColor $ColorLightAmber -AccentColor $ColorAmber

    Add-Heading2 'B.1 Perfil de usuario específico'
    Add-Paragraph -Text 'Para diseñar una experiencia concreta se propone la siguiente persona ficticia, construida como referencia de diseño y no como una etiqueta permanente para los estudiantes.'
    $personaRows = @(
        @('Característica', 'Perfil de referencia: Valentina Rojas'),
        @('Edad', '19 años.'),
        @('Rol', 'Estudiante de primer semestre de Ingeniería Electrónica que asiste a su primera práctica con multímetro.'),
        @('Contexto', 'Laboratorio universitario presencial y supervisado; teléfono Android de gama media; multímetro DT-830B y batería didáctica de 9 V autorizada.'),
        @('Necesidades', 'Reconocer selector y puertos, comprender el orden del procedimiento, confirmar antes de actuar y recibir retroalimentación inmediata.'),
        @('Comportamiento digital', 'Usa aplicaciones móviles todos los días, prefiere contenido breve y visual, consulta tutoriales paso a paso y suele omitir textos largos cuando cree haber entendido.'),
        @('Nivel tecnológico', 'Intermedio en aplicaciones móviles; básico en realidad aumentada, instrumentación y mediciones electrónicas.'),
        @('Dificultades previsibles', 'Puede confundir COM y VΩmA, elegir una escala inadecuada, perder el marcador o interpretar una instrucción rápida sin leer su justificación.'),
        @('Motivación', 'Completar la práctica con autonomía progresiva y entender qué hace cada control, sin depender de memorizar una demostración única.'),
        @('Necesidad de confianza', 'Saber cuándo puede avanzar y cuándo debe detenerse para consultar al docente.')
    )
    Add-Table -Rows $personaRows -Columns 2 -Widths @(4.0, 11.4) -Header -Compact -HeaderColor $ColorTeal | Out-Null
    Add-Paragraph -Text 'La edad y el programa académico describen la población objetivo, pero no se utilizarán para disminuir contenido, restringir oportunidades ni asignar una calificación. La personalización operará mediante estados temporales y preferencias controladas por la persona.'

    Add-Heading2 'B.2 Variables de personalización'
    Add-Paragraph -Text 'El sistema utilizará variables directamente relacionadas con la interacción y el aprendizaje. Se incluyen cinco para superar el mínimo solicitado y demostrar qué cambio visible produce cada una.'
    $personalizationRows = @(
        @('Variable', 'Dato o fuente', 'Cambio observable en la interfaz'),
        @('1. Nivel de experiencia', 'Declarado: primera práctica, principiante con práctica previa o recurrente.', 'Define tutorial completo o breve, profundidad de “¿Por qué?” y cantidad de ayudas; nunca elimina controles preventivos.'),
        @('2. Preferencias de presentación y accesibilidad', 'Elección voluntaria: AR/2D, texto normal/ampliado, contraste, reducción de movimiento y audio.', 'Cambia modalidad, tamaño, contraste, movimiento y canal de explicación sin modificar el contenido esencial.'),
        @('3. Historial de progreso', 'Prácticas iniciadas o terminadas, último paso validado y número de intentos.', 'Ofrece continuar o repasar; al retomar obliga a repetir la lista preventiva.'),
        @('4. Errores y rendimiento formativo', 'Categoría de respuestas incorrectas, repeticiones, ayudas y resultado 0–3.', 'Activa refuerzo sobre selector, puertos o reacción ante discrepancias y recomienda un repaso específico.'),
        @('5. Condición técnica', 'Permiso de cámara, soporte WebAR, pérdida de marcador y disponibilidad de red.', 'Cambia a modo 2D conservando el paso cuando la cámara o el anclaje no son utilizables.')
    )
    Add-Table -Rows $personalizationRows -Columns 3 -Widths @(3.5, 5.3, 6.4) -Header -Compact | Out-Null

    Add-Heading2 'B.3 Esquema funcional: qué cambia según el usuario'
    Add-Paragraph -Text 'La personalización será explicable y basada en reglas. Primero se combinan datos declarados por el usuario, contexto técnico e historial local; después un motor de reglas selecciona una variante de interfaz; al finalizar, el resultado actualiza el estado para la siguiente sesión.'
    $uxFlowRows = @(
        @('1 · Preferencias', '→', '2 · Contexto', '→', '3 · Reglas', '→', '4 · Experiencia adaptada'),
        @('Nivel, formato y accesibilidad', '', 'Equipo, cámara e historial', '', 'Prioridad y condiciones auditables', '', 'Detalle, modo, ayudas y recomendación'),
        @('', '', '', '', '↓', '', ''),
        @('7 · Control del usuario', '←', '6 · Perfil actualizado', '←', '5 · Resultado', '', ''),
        @('Ver, cambiar, apagar o borrar', '', 'Estado temporal, no etiqueta fija', '', 'Progreso, errores y evaluación', '', '')
    )
    $uxFlowTable = Add-Table -Rows $uxFlowRows -Columns 7 -Widths @(2.8, 0.5, 2.8, 0.5, 2.8, 0.5, 2.8) -Compact
    foreach ($r in @(1,4)) {
        foreach ($c in @(1,3,5,7)) {
            if (($r -eq 4) -and ($c -eq 7)) { continue }
            $uxFlowTable.Cell($r,$c).Shading.BackgroundPatternColor = if ($r -eq 1) { $ColorNavy } else { $ColorTeal }
            $uxFlowTable.Cell($r,$c).Range.Font.Color = $ColorWhite
            $uxFlowTable.Cell($r,$c).Range.Font.Bold = -1
            $uxFlowTable.Cell($r,$c).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
        }
    }
    foreach ($r in @(1,3,4)) {
        foreach ($c in @(2,4,6)) {
            $uxFlowTable.Cell($r,$c).Range.Font.Color = $ColorAmber
            $uxFlowTable.Cell($r,$c).Range.Font.Bold = -1
            $uxFlowTable.Cell($r,$c).Range.ParagraphFormat.Alignment = $wdAlignParagraphCenter
        }
    }

    $userTypeRows = @(
        @('Tipo o estado de usuario', 'Evidencia utilizada', 'Qué cambia en LabAR Seguro', 'Qué no cambia'),
        @('Primer acceso', 'Sin historial y nivel “primera práctica”.', 'Onboarding completo, etiquetas ampliadas, glosario y explicación de cada paso.', 'Confirmación, lista, advertencias y supervisión.'),
        @('Con dificultad puntual', 'Dos errores similares, repetición o solicitud de ayuda.', 'Pausa, ampliación del control, lenguaje más directo y demostración 2D antes de reintentar.', 'No se aprueba ni se salta el paso problemático.'),
        @('Usuario que retoma', 'Existe un último paso guardado.', 'Resumen de lo realizado y retorno al paso validado.', 'Debe repetir la lista preventiva antes de continuar.'),
        @('Recurrente con buen desempeño', 'Dos prácticas terminadas y evaluación 3/3.', 'Instrucciones introductorias compactas y razones disponibles bajo demanda.', 'Pasos críticos, límites y botón Detener.'),
        @('Preferencia accesible', 'Texto ampliado, alto contraste, menos movimiento, audio o 2D.', 'Presentación, controles y canal de explicación.', 'Secuencia y contenido preventivo equivalente.'),
        @('Problema técnico', 'Cámara denegada, WebAR incompatible o marcador inestable.', 'Cambio a guía 2D conservando el paso y una explicación del motivo.', 'No continúa una capa AR desalineada.')
    )
    Add-Table -Rows $userTypeRows -Columns 4 -Widths @(3.2, 3.5, 5.1, 3.4) -Header -Compact | Out-Null

    Add-Heading3 'Reglas iniciales del MVP'
    Add-Bullet 'Si no existe historial, mostrar el tutorial y las explicaciones completas.'
    Add-Bullet 'Si hay dos errores sobre la escala, pausar y ampliar visualmente la zona DCV antes de permitir otro intento.'
    Add-Bullet 'Si el marcador se pierde durante varios segundos, detener la guía AR y ofrecer el mismo paso en 2D.'
    Add-Bullet 'Si la evaluación es menor a 2 de 3, recomendar el módulo relacionado con el error y una nueva evaluación.'
    Add-Bullet 'Si se retoma una sesión incompleta, recuperar el último paso solo después de repetir la verificación preventiva.'
    Add-Bullet 'Si el usuario desactiva la personalización, ofrecer una experiencia estándar detallada; nunca retirar seguridad.'

    Add-Heading2 'B.4 Justificación técnica'
    Add-Heading3 'B.4.1 ¿Qué datos necesita el sistema?'
    $dataRows = @(
        @('Categoría', 'Campos mínimos', 'Finalidad', 'Tratamiento'),
        @('Sesión', 'Identificador local aleatorio, práctica y versión de guía.', 'Mantener estado y compatibilidad.', 'No requiere nombre ni documento.'),
        @('Preferencias declaradas', 'Nivel, modo AR/2D, tamaño, contraste, movimiento y audio.', 'Configurar la presentación.', 'Voluntarias, editables y eliminables.'),
        @('Progreso', 'Paso actual, finalización, intentos y ayudas.', 'Continuar y decidir el nivel de apoyo.', 'Estado temporal; no etiqueta permanente.'),
        @('Rendimiento', 'Categoría del error y resultado de evaluación 0–3.', 'Recomendar refuerzo concreto.', 'Uso formativo, no calificación oficial.'),
        @('Estado técnico', 'Permiso, soporte WebAR y pérdida del marcador.', 'Seleccionar AR o alternativa 2D.', 'Puede procesarse durante la sesión.'),
        @('Datos excluidos', 'Video, fotografías, audio crudo, ubicación exacta, contactos, biometría, diagnóstico médico.', 'No son necesarios para personalizar el MVP.', 'No se recopilan ni se transmiten.')
    )
    Add-Table -Rows $dataRows -Columns 4 -Widths @(2.8, 4.4, 4.2, 3.8) -Header -Compact -HeaderColor $ColorTeal | Out-Null

    Add-Heading3 'B.4.2 ¿Dónde se almacenan?'
    Add-Paragraph -Text 'La maqueta visual actual mantiene su estado solo mientras la página está abierta y no persiste información. En el MVP, las preferencias y el progreso podrán guardarse por defecto en el navegador del estudiante mediante localStorage o IndexedDB, asociados con un identificador aleatorio. Los contenidos de la práctica se distribuirán como recursos versionados y validados. La cámara se procesará en memoria para localizar el marcador; sus fotogramas no se almacenarán ni se enviarán a un servidor.'
    Add-Paragraph -Text 'Si en una fase futura se necesita sincronización institucional, se utilizará una API sobre HTTPS y una base de datos cifrada con identificadores seudónimos, control de acceso por roles, registro de accesos, copias de seguridad y un plazo explícito de retención. Los reportes para el docente serán agregados cuando el tamaño del grupo lo permita. La interfaz siempre ofrecerá “Ver mis datos”, “Restablecer preferencias” y “Eliminar mi progreso”.'

    Add-Heading3 'B.4.3 ¿Cómo se procesan?'
    Add-Paragraph -Text 'El MVP utilizará reglas determinísticas ejecutadas en el cliente. Esta decisión es adecuada para un conjunto pequeño de variables porque reduce costo, funciona sin una base histórica extensa y permite explicar exactamente por qué apareció una recomendación. La prioridad de decisión será: seguridad obligatoria → preferencia de accesibilidad → compatibilidad técnica → nivel de experiencia → rendimiento.'
    $ruleRows = @(
        @('Condición evaluada', 'Respuesta del sistema', 'Explicación visible'),
        @('Primera práctica = sí', 'Activa guía detallada.', '“Mostramos más contexto porque es tu primera práctica”.'),
        @('Errores de escala ≥ 2', 'Muestra zoom del selector y microexplicación.', '“Reforzamos DCV porque hubo dos intentos incorrectos”.'),
        @('WebAR no disponible', 'Cambia al modo 2D en el mismo paso.', '“Este dispositivo no admite la vista AR; el contenido es equivalente”.'),
        @('Evaluación < 2/3', 'Sugiere repaso dirigido.', '“Conviene revisar puertos o escala antes de repetir”.'),
        @('Preferencia de personalización = apagada', 'Carga la variante estándar.', '“Usas la guía estándar; puedes cambiarlo en Preferencias”.')
    )
    Add-Table -Rows $ruleRows -Columns 3 -Widths @(4.0, 5.0, 6.2) -Header -Compact | Out-Null
    Add-Paragraph -Text 'Una fase posterior podría evaluar recomendaciones basadas en análisis de comportamiento, pero solo después de reunir datos suficientes y autorizados, compararlas con las reglas y medir sesgos. Ningún modelo podrá declarar segura una conexión, eliminar un control preventivo, asignar calificaciones definitivas ni reemplazar el criterio del docente.'

    Add-Heading3 'B.4.4 ¿Qué riesgos éticos o de privacidad existen?'
    $ethicsRows = @(
        @('Riesgo', 'Posible consecuencia', 'Medida de prevención'),
        @('Recolección excesiva', 'Perfil académico innecesario o vigilancia.', 'Minimización, almacenamiento local por defecto y finalidad explícita.'),
        @('Captura accidental', 'Aparición de rostros u objetos del laboratorio.', 'Procesamiento local; no guardar ni transmitir cámara; permiso contextual.'),
        @('Falta de consentimiento', 'El usuario desconoce por qué cambia la interfaz.', 'Explicación breve, modo estándar y controles para revisar o desactivar.'),
        @('Etiquetado permanente', 'Encerrar al estudiante en un nivel bajo.', 'Estados temporales, actualización con progreso y posibilidad de corregir el perfil.'),
        @('Sesgo de recomendación', 'Ayudas menos útiles para ciertos ritmos o dispositivos.', 'No usar atributos sensibles; pruebas diversas; revisión docente y control del usuario.'),
        @('Reidentificación', 'Resultados individuales visibles en grupos pequeños.', 'Seudonimización, agregación y umbral mínimo para reportes.'),
        @('Acceso no autorizado', 'Exposición del progreso o preferencias.', 'HTTPS, cifrado, control de roles, retención limitada y eliminación.'),
        @('Automatización insegura', 'Confianza excesiva o supresión de una advertencia.', 'Seguridad invariable, confirmación humana y bloqueo ante discrepancias.'),
        @('Brecha digital', 'Exclusión por dispositivo, cámara o conectividad.', 'Guía 2D equivalente, contenido ligero y dispositivo de préstamo.')
    )
    Add-Table -Rows $ethicsRows -Columns 3 -Widths @(3.6, 5.2, 6.4) -Header -Compact -HeaderColor $ColorRed | Out-Null

    Add-Heading2 'B.5 Interfaz funcional propuesta'
    Add-Paragraph -Text 'El prototipo de personalización ampliará la base navegable actual de ocho vistas a diez pantallas conectadas. Agregará perfil y preferencias antes del inicio personalizado, y reorganizará los estados de preparación, falla y resultado para hacer visible la adaptación. Permitirá seleccionar nivel, formato y opciones de accesibilidad, consultar una explicación de uso de datos y continuar sin personalización. El inicio mostrará la recomendación y su motivo; la guía mostrará una variante detallada o compacta; el resultado propondrá un repaso específico; y el perfil permitirá modificar, apagar o borrar la personalización.'
    $personalUiRows = @(
        @('Pantalla o componente', 'Dato de entrada', 'Cambio visible'),
        @('Perfil y preferencias', 'Nivel y elecciones explícitas.', 'Vista previa de texto, contraste, movimiento, audio y modo.'),
        @('Inicio personalizado', 'Historial y práctica incompleta.', 'Continuar, comenzar desde cero o recomendación explicada.'),
        @('Guía paso a paso', 'Nivel, preferencia y errores.', 'Detalle, zoom, audio, refuerzo 2D o explicación “¿Por qué?”.'),
        @('Falla segura', 'Estado de cámara o marcador.', 'Pausa y transición al mismo paso en 2D.'),
        @('Resultado', 'Evaluación e intentos.', 'Repaso de selector, puertos o reacción ante discrepancia.'),
        @('Privacidad', 'Decisión del usuario.', 'Ver datos, restablecer, desactivar o eliminar progreso.')
    )
    Add-Table -Rows $personalUiRows -Columns 3 -Widths @(4.0, 4.6, 6.6) -Header -Compact -HeaderColor $ColorTeal | Out-Null

    Add-Heading2 'B.6 Criterios para validar la personalización'
    Add-Paragraph -Text 'La actividad puede evaluarse comparando una variante estándar con la personalizada. Se medirán finalización, errores por categoría, intentos por paso, uso de ayuda, cambios a 2D, diferencia entre diagnóstico y evaluación, claridad percibida y cumplimiento de controles preventivos. El tiempo se interpretará junto con los errores y no como indicador único, porque una ejecución más lenta puede representar una revisión responsable.'
    Add-Callout -Title 'Conclusión del Anexo B' -Text 'LabAR Seguro puede ofrecer personalización útil desde un MVP basado en reglas transparentes y datos locales mínimos. La evolución hacia algoritmos inteligentes solo se justificará si demuestra una mejora medible, conserva el control del usuario y mantiene intactas todas las condiciones de seguridad.' -FillColor $ColorLightGreen -AccentColor $ColorGreen

    Add-PageBreak

    # REFERENCIAS
    Add-Heading1 'Referencias'
    Add-Paragraph -Text 'Formato APA 7. Enlaces consultados para sustentar la propuesta tecnológica y pedagógica.' -Alignment $wdAlignParagraphLeft -Italic -FontSize 9.5 -FontColor $ColorMuted -NoIndent

    Add-HyperlinkParagraph -Prefix 'AR.js Organization. (s. f.). AR.js documentation: Marker based.' -Url 'https://ar-js-org.github.io/AR.js-Docs/marker-based/'
    Add-HyperlinkParagraph -Prefix 'Azuma, R. T. (1997). A survey of augmented reality. Presence: Teleoperators and Virtual Environments, 6(4), 355–385.' -Url 'https://doi.org/10.1162/pres.1997.6.4.355'
    Add-HyperlinkParagraph -Prefix 'Hallmann, J., Stechert, C., Ahmed, S. I.-U., & Balzerkiewitz, H.-P. (2023). Supporting student laboratory experiments with augmented reality experience. Proceedings of the Design Society, 3, 3235–3244.' -Url 'https://doi.org/10.1017/pds.2023.324'
    Add-HyperlinkParagraph -Prefix 'MDN Web Docs. (2026). WebXR Device API.' -Url 'https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API'
    Add-HyperlinkParagraph -Prefix 'Singh, G., & Ahmad, F. (2024). An interactive augmented reality framework to enhance the user experience and operational skills in electronics laboratories. Smart Learning Environments, 11, Article 5.' -Url 'https://doi.org/10.1186/s40561-023-00287-1'
    Add-HyperlinkParagraph -Prefix 'Tuli, N., Singh, G., Mantri, A., & Sharma, S. (2022). Augmented reality learning environment to aid engineering students in performing practical laboratory experiments in electronics engineering. Smart Learning Environments, 9, Article 26.' -Url 'https://doi.org/10.1186/s40561-022-00207-9'
    Add-HyperlinkParagraph -Prefix 'World Wide Web Consortium. (2023). Web Content Accessibility Guidelines (WCAG) 2.2.' -Url 'https://www.w3.org/TR/WCAG22/'
    Add-HyperlinkParagraph -Prefix 'World Wide Web Consortium. (2026, 9 de junio). WebXR Device API (Candidate Recommendation Draft).' -Url 'https://www.w3.org/TR/webxr/'

    Add-Callout -Title 'Nota para la entrega' -Text 'Antes de presentar, reemplace los campos entre corchetes de la portada y confirme con el docente si la institución exige una plantilla, extensión o norma de citación diferente.' -FillColor $ColorLightAmber -AccentColor $ColorAmber

    # Encabezado y pie de página.
    foreach ($sec in $doc.Sections) {
        $sec.PageSetup.DifferentFirstPageHeaderFooter = -1
        $header = $sec.Headers.Item($wdHeaderFooterPrimary).Range
        $header.Text = 'LABAR SEGURO  ·  PROPUESTA INICIAL'
        $header.Font.Name = 'Aptos'
        $header.Font.Size = 8
        $header.Font.Bold = -1
        $header.Font.Color = $ColorTeal
        $header.ParagraphFormat.Alignment = $wdAlignParagraphRight
        $footer = $sec.Footers.Item($wdHeaderFooterPrimary).Range
        $footer.Text = 'Tecnologías Emergentes    ·    '
        $footer.Font.Name = 'Aptos'
        $footer.Font.Size = 8
        $footer.Font.Color = $ColorMuted
        $footer.ParagraphFormat.Alignment = $wdAlignParagraphCenter
        $footer.Collapse($wdCollapseEnd)
        [void]$footer.Fields.Add($footer, $wdFieldPage)
    }

    # Actualizar campos, propiedades y metadatos.
    Write-Output 'STAGE=updating_toc'
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    Write-Output ("TABLES_BEFORE_SAVE=" + $doc.Tables.Count)
    Write-Output ("PAGES_BEFORE_SAVE=" + $doc.ComputeStatistics($wdStatisticPages))

    # Revisión ortográfica automática se conserva desactivada durante la generación.
    Write-Output 'STAGE=saving_docx'
    Save-WordDocument -Document $doc -Path ([string]$outputDocx)
    Write-Output 'STAGE=exporting_pdf'
    [string]$localPdfPath = [System.IO.Path]::GetFullPath([string]$outputPdf)
    [int]$localPdfFormat = $wdExportFormatPDF
    $doc.SaveAs2([ref]$localPdfPath, [ref]$localPdfFormat)
    Write-Output 'STAGE=computing_statistics'

    $pages = $doc.ComputeStatistics($wdStatisticPages)
    $words = $doc.ComputeStatistics($wdStatisticWords)
    Write-Output "DOCX=$outputDocx"
    Write-Output "PDF=$outputPdf"
    Write-Output "PAGES=$pages"
    Write-Output "WORDS=$words"
}
finally {
    if ($doc -ne $null) {
        try { $doc.Close($false) } catch {}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc)
    }
    if ($word -ne $null) {
        try { $word.Quit() } catch {}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}








