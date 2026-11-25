# LabAR Seguro · frontend integrado v1.0

Interfaz móvil y de escritorio recreada a partir de las diez pantallas de Stitch y del sistema visual LabAR Precision. HTML, CSS y JavaScript con módulos nativos; recursos locales y sin dependencia de CDN.

## Cómo abrirla

La interfaz requiere la API del proyecto. Desde la raíz:

```powershell
npm ci
npm start
```

Después, abrir `http://localhost:3000`. No se ejecuta mediante `file://` ni con un servidor estático independiente.

Para Vercel, `npm run build` genera los recursos públicos y `api/index.mjs` atiende la API bajo el mismo dominio. `POSTGRES_URL` pertenece al backend y no se incorpora al JavaScript del navegador. La guía de esta instalación está en `docs/despliegue-supabase/`; el funcionamiento remoto debe verificarse después del despliegue.

## Funcionalidades

- Bienvenida, preferencias, inicio personalizado, detalle, preparación, identificación, lista preventiva, guía, pausa, evaluación y resultado.
- Perfil con alias, experiencia declarada, formato visual/texto, texto ampliado, contraste, reducción de movimiento, audio y control de personalización.
- Integración real con la API: sesión anónima, perfil persistente, ejecuciones, progreso, historial, resultados, reportes, exportación y borrado.
- Cámara mediante `getUserMedia`, lectura local del marcador QR y señal contextual. Alternativa de lectura de imagen y guía 2D equivalente.
- Confirmación manual del equipo, lista de cinco condiciones y secuencia de cinco pasos validada por el servidor.
- Pausa por pérdida de marcador y recuperación en 2D conservando el paso. Retomar una sesión exige nueva confirmación y lista.
- Evaluación de tres preguntas, puntaje calculado en el servidor y refuerzo por conceptos.
- Navegación con teclado, foco visible, controles semánticos, diálogos accesibles y estados de error/reintento.

## Cámara y marcador

La cámara necesita HTTPS o `localhost` y permiso explícito del navegador. El QR imprimible se abre en `/marcador.html`. El identificador esperado es `LABAR:DT830B:V1`. Se procesa localmente con el lector jsQR incluido en `vendor`; no se transmiten fotogramas al servidor.

La señal contextual se ancla al QR. La aplicación no identifica conexiones eléctricas, no lee el voltaje físico y no certifica seguridad. El esquema del multímetro es orientativo y se debe contrastar con el instrumento real. La práctica permanece limitada al laboratorio supervisado, el DT-830B revisado y una fuente didáctica DC de baja tensión autorizada.

## Organización

- `index.html`: estructura, cabecera, navegación, diálogos y recursos.
- `styles.css`: sistema visual responsive y accesibilidad.
- `app.js`: vistas, navegación protegida, integración con API y cámara.
- `camera.js`: adquisición local de video, lectura de QR y superposición contextual.
- `assets/`: identidad y marcador imprimible.
- `vendor/`: lector jsQR y licencia.

La versión v0.1 anterior se preservó en `docs/archivo/frontend_v0_1`.
