# Entrega documental final — LabAR Seguro

Documentos de entrega:

- `Documentacion_Final_LabAR_Seguro.pdf`, `.docx` y `.md`: informe consolidado con arquitectura, UX, API, operación, pruebas y capturas.
- `Manual_Usuario_LabAR_Seguro.pdf`, `.docx` y `.md`: instalación, uso, cámara/2D, progreso, reportes y privacidad.
- `Compendio_Documental_LabAR_Seguro.pdf`: documentación final, manual y PDF históricos distintos, con índice y marcadores.
- `indice_compendio.json`: procedencia y páginas de cada documento incorporado.
- `verificacion_documentos.json`: páginas, marcadores, huellas e integridad de los documentos publicados.

Fuentes:

- `informe_fuente.md`: consolidación de la propuesta, UX, diseño, implementación y resultados.
- `manual_fuente.md`: guía de operación para estudiante y administración local.
- `evidencia_final.json`: resultados reales y rutas de capturas del corte final, suministrados después de las pruebas.

Generación:

```powershell
python docs/final/generar_documentacion.py
```

El generador requiere Python, python-docx, ReportLab, PyMuPDF y Pillow, además de Arial/Consolas de Windows. Publica los dos documentos en Markdown, DOCX y PDF; crea un compendio PDF con índice y marcadores que incorpora los PDF históricos distintos; conserva inventarios con SHA-256 y comprueba integridad básica y límites de página.

Los archivos DOCX incluyen índice actualizable en Word. El PDF contiene índice de lectura y marcadores. Los originales históricos no se modifican. Las cifras de pruebas se leen de `evidencia_final.json` y se exige que existan los registros indicados.

Las capturas móviles largas se presentan en dos segmentos consecutivos para mejorar la lectura. El PDF aplica recorte de presentación y el DOCX usa recorte de fuente OOXML; los PNG de evidencia permanecen íntegros. Las imágenes y la cámara virtual de prueba no se presentan como una validación en teléfono físico o un piloto eléctrico.
