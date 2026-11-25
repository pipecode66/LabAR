# LabAR Seguro · maqueta frontend v0.1

Base estática y navegable para validar el flujo de LabAR Seguro antes de integrar cámara, seguimiento de marcadores o un backend.

## Cómo abrirla

La maqueta no tiene dependencias. Puede abrirse `index.html` directamente en Chrome o Edge. Para probarla desde un servidor local:

```powershell
python -m http.server 8080 --directory frontend
```

Después, abrir `http://localhost:8080`.

## Alcance actual

- Flujo de selección, escaneo simulado, confirmación del equipo y lista preventiva.
- Guía visual de cinco pasos con representación esquemática del multímetro.
- Estado de pérdida del marcador y alternativa 2D.
- Evaluación formativa de tres preguntas.
- Navegación por teclado, foco visible, estados textuales y diseño móvil.

## No implementado todavía

- Acceso real a cámara.
- Detección o seguimiento de marcadores WebAR.
- Validación de conexiones eléctricas.
- Backend, cuentas, persistencia o analítica.
- Uso en equipos reales o procedimientos de alto voltaje.

La interfaz es un prototipo académico y no reemplaza al docente ni los protocolos del laboratorio.
