# Actividad 29/10/2026 — LabAR Seguro

El documento de entrega es `../Actividad_29-10-2026.pdf`.

Esta carpeta conserva las evidencias que lo sustentan:

- `evidencias/E01_*.png` a `E10_*.png`: capturas del frontend existente ejecutado en Microsoft Edge, con emulación móvil 390 × 844 px y captura de página completa.
- `evidencias/E11_*.png` y `E12_*.png`: capturas de extractos reales de `frontend/app.js`, presentados en un visor con números de línea. No son capturas de un IDE.
- `verificacion.json`: resultados de 17 comprobaciones, entorno, procedencia y huellas SHA-256.
- `resultado_verificacion.txt`: salida legible de las comprobaciones.
- `capturar_evidencias.py`: guion de captura y comprobación, sin modificaciones al frontend.
- `generar_actividad.py`: generador del PDF.

Se reutilizan los datos académicos ya diligenciados en el informe previo. No se reconstruyen fechas históricas ni porcentajes de avance porque no hay un cronograma fechado entre los archivos disponibles.

## Reproducción

Desde la raíz del proyecto, con Python, Selenium, ReportLab, Pillow y Microsoft Edge disponibles:

```powershell
python docs/actividad_2026-10-29/capturar_evidencias.py
python docs/actividad_2026-10-29/generar_actividad.py
```

El generador usa las fuentes Arial y Consolas de Windows. La captura inicia un servidor HTTP temporal enlazado solo a `127.0.0.1` y lo cierra al terminar. Las pruebas se limitan al prototipo; cámara, seguimiento AR, API y personalización completa siguen pendientes.
