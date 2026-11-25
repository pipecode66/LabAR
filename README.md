# LabAR Seguro

Aplicación académica para orientar una práctica supervisada de voltaje DC de baja tensión con un multímetro DT-830B. Incluye frontend móvil, personalización UX, API local, persistencia SQLite y evaluación formativa.

Repositorio: [pipecode66/LabAR](https://github.com/pipecode66/LabAR).

## Estado del despliegue

Esta versión se ejecuta con un servidor Node.js y SQLite local. La integración con una base de datos remota y la adaptación para Vercel se realizarán cuando se seleccione el proveedor. Subir este repositorio a Vercel no garantiza por sí solo la persistencia de los datos ni el funcionamiento de la API actual.

Los informes, el manual y las evidencias están en [`docs/final/`](docs/final/). Los datos locales y las credenciales se excluyen del repositorio; los dos videos sintéticos de `tests/fixtures/` se incluyen porque las pruebas de navegador los necesitan.

## Ejecutar

Requisito: Node.js 24 o posterior. Versión probada: Node.js 24.13.0. El backend utiliza módulos nativos; no requiere instalar paquetes de servidor. En esa versión, `node:sqlite` muestra una advertencia ExperimentalWarning; es un aviso del runtime y no un fallo de la aplicación.

```powershell
npm start
```

Abrir **http://127.0.0.1:3000**. El mismo servidor entrega la interfaz y la API. Los datos se crean en `data/labar.sqlite`, carpeta excluida del control de versiones. No abrir `index.html` directamente ni usar el servidor estático antiguo para la aplicación integrada.

Configuración opcional en PowerShell:

```powershell
$env:PORT = '3001'
$env:DB_PATH = 'C:\ruta\a\labar.sqlite'
npm start
```

`HOST` es `127.0.0.1` por defecto. `SECURE_COOKIE=true` habilita el atributo Secure para un despliegue HTTPS. Al acceder desde otro dispositivo se necesita una configuración HTTPS válida para usar cámara; `localhost` solo se refiere al propio dispositivo.

Si un proxy HTTPS ya configurado entrega la aplicación y reenvía al servidor HTTP local, declarar su origen público exacto permite las mutaciones desde ese dominio:

```powershell
$env:PUBLIC_ORIGIN = 'https://labar.ejemplo.edu'
npm start
```

`PUBLIC_ORIGIN` admite únicamente protocolo, host y puerto, sin rutas ni parámetros. Un origen HTTPS activa la cookie Secure automáticamente; `SECURE_COOKIE=true|false` permite fijarla expresamente. El servidor no confía automáticamente en cabeceras `X-Forwarded-*`. El proxy debe entregar la interfaz y la API bajo ese mismo origen. Para exponer deliberadamente el servidor en la red local se puede definir `$env:HOST = '0.0.0.0'`; esa opción por sí sola no proporciona HTTPS ni habilita cámara desde el móvil.

## Estructura

- `frontend/`: interfaz integrada y recursos locales.
- `backend/`: servidor HTTP, reglas de negocio, contenido y SQLite.
- `tests/backend.test.mjs`: pruebas de API y persistencia con bases aisladas.
- `docs/`: informes previos, exportación original de Stitch, evidencias, documentación final y manual.
- `data/`: datos de ejecución local; no distribuir con información de usuarios.

## Pruebas

```powershell
npm test
npm run check
```

Las pruebas de backend usan puertos temporales y bases de datos aisladas; no modifican la base de uso de la aplicación.

Las pruebas de interfaz requieren Python y sus dependencias de desarrollo:

```powershell
python -m pip install -r tests/requirements.txt
python tests/e2e.py
```

La suite automatizada comprueba interacciones y flujos con cámara de prueba. La disponibilidad, enfoque y rendimiento de una cámara física dependen del dispositivo y requieren una comprobación manual del laboratorio.

## Datos y privacidad

Cada navegador recibe una sesión anónima mediante una cookie HttpOnly y SameSite=Strict. El servidor almacena solo el hash de su token. El perfil, las ejecuciones y las incidencias se asocian con esa sesión; no hay cuentas institucionales ni recuperación entre dispositivos. La sesión expira a los 30 días y los registros vencidos se purgan al iniciar el servidor. Borrar la cookie hace perder acceso a sus datos hasta la purga; conviene exportarlos o eliminarlos desde la aplicación antes de limpiar el navegador.

Las preferencias y el progreso se guardan en SQLite local. Las imágenes de cámara se procesan en el navegador y no se envían ni guardan en la API. La app ofrece exportación, borrado del progreso y eliminación completa del perfil y la sesión. La base local no está cifrada en reposo: para compartir un equipo se deben controlar el acceso y las copias. Un despliegue institucional requiere HTTPS, autenticación apropiada, gestión de usuarios y política de retención.

## API

Las respuestas son JSON. Las mutaciones requieren `Content-Type: application/json`, `X-LabAR-Client: web` y cabecera `Origin` del mismo origen. Los errores tienen la forma `{ "error": { "code": "...", "message": "..." } }`.

| Método y ruta | Función |
| --- | --- |
| `GET /api/health` | Estado del servidor. |
| `GET /api/bootstrap` | Perfil, práctica, ejecución actual, historial y recomendación. Crea sesión si falta. |
| `PUT /api/profile` | Actualiza preferencias validadas. |
| `POST /api/attempts` | Inicia una ejecución o devuelve la ya abierta. |
| `POST /api/attempts/:id/confirm` | Confirma manualmente equipo y modelo. |
| `POST /api/attempts/:id/checklist` | Guarda las cinco comprobaciones declaradas. |
| `POST /api/attempts/:id/progress` | Completa el paso activo o vuelve a uno alcanzado. |
| `POST /api/attempts/:id/pause` | Pausa por usuario, pérdida, cámara o página oculta. |
| `POST /api/attempts/:id/resume` | Retoma exigiendo reconfirmar equipo y lista. |
| `POST /api/attempts/:id/mode` | Cambia a AR o 2D conservando el avance. |
| `POST /api/attempts/:id/quiz` | Califica respuestas en el servidor y cierra ejecución. |
| `POST /api/issues` | Guarda una incidencia de la propia sesión. |
| `GET /api/history` | Lista ejecuciones de la sesión. |
| `GET /api/export` | Descarga los datos propios en JSON. |
| `DELETE /api/progress` | Borra ejecuciones e incidencias y conserva preferencias. |
| `DELETE /api/data` | Elimina todos los datos de la sesión y su cookie. |

El servidor comprueba la secuencia y las precondiciones, no la conexión eléctrica física. Completar casillas representa una confirmación del estudiante; el docente conserva la autoridad sobre la práctica. La herramienta no certifica competencias ni debe usarse para red eléctrica, alto voltaje o procedimientos sin supervisión.
