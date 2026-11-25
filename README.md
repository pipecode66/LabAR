# LabAR Seguro

Aplicación académica para orientar una práctica supervisada de voltaje DC de baja tensión con un multímetro DT-830B. Incluye frontend móvil, personalización UX, API, persistencia y evaluación formativa. Conserva SQLite para ejecución local y utiliza PostgreSQL de Supabase en el despliegue de Vercel.

Repositorio: [pipecode66/LabAR](https://github.com/pipecode66/LabAR).

## Ejecución local y despliegue

La aplicación tiene dos modos de almacenamiento:

| Entorno | Entrada del servidor | Almacenamiento |
| --- | --- | --- |
| Local, sin conexión remota configurada | `backend/server.mjs` con `npm start` | SQLite en `data/labar.sqlite` o `DB_PATH`. |
| Vercel | Función `api/index.mjs` y recursos generados en `public/` | PostgreSQL de Supabase mediante `POSTGRES_URL`, solo en el servidor. |

El despliegue se configura en `vercel.json`: compila con `npm run build`, publica únicamente los recursos del frontend y envía las rutas `/api/*` a la función. La versión en producción se comprueba consultando `/api/health`; tener un build publicado no acredita por sí solo que la base responda.

La guía y el estado comprobado de esta adaptación están en [`docs/despliegue-supabase/`](docs/despliegue-supabase/). Los informes, el manual y las evidencias del corte anterior se conservan en [`docs/final/`](docs/final/). Los datos locales y las credenciales se excluyen del repositorio; los dos videos sintéticos de `tests/fixtures/` se incluyen porque las pruebas de navegador los necesitan.

## Ejecutar

Requisito: Node.js 24. Versión local comprobada: Node.js 24.13.0. Instalar las dependencias del archivo de bloqueo antes de iniciar. El acceso remoto utiliza el controlador `pg`; SQLite local utiliza `node:sqlite`, que muestra una advertencia ExperimentalWarning en esa versión del runtime.

```powershell
npm ci
npm start
```

Abrir **http://127.0.0.1:3000**. El mismo servidor entrega la interfaz y la API. Sin `POSTGRES_URL`, los datos locales se crean en `data/labar.sqlite`, carpeta excluida del control de versiones. No abrir `index.html` directamente ni usar un servidor estático independiente para la aplicación integrada.

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

## Vercel y Supabase

1. Conectar el recurso de Supabase al proyecto **LabAR** de Vercel.
2. Comprobar que `POSTGRES_URL` exista en **Production** y, si se usan previews, en **Preview**. Mantener su valor oculto y exclusivamente del lado del servidor.
3. Mantener **Root Directory** en la raíz del repositorio y **Framework Preset** en `Other`. El archivo `vercel.json` define **Build Command** `npm run build` y **Output Directory** `public`.
4. Desplegar el commit y comprobar `/`, `/api/health` y el recorrido completo. La API necesita PostgreSQL remoto; no se sustituye por un archivo SQLite temporal en Vercel.

La integración de Supabase con Vercel sincroniza variables de conexión. Para funciones serverless se utiliza la conexión del pooler de PostgreSQL. No es necesario copiar una clave `service_role` ni una clave secreta al frontend. Las credenciales permanecen en las variables del proyecto.

El esquema se entrega en [`database/schema.postgres.sql`](database/schema.postgres.sql). La inicialización es idempotente; también puede ejecutarse explícitamente con `node backend/migrate.mjs` desde un entorno que ya tenga configurada `POSTGRES_URL`. No pegar la cadena de conexión en comandos compartidos, capturas o documentos. El esquema SQLite local se conserva por separado en [`database/schema.sqlite.sql`](database/schema.sqlite.sql).

La instalación nueva de Supabase no importa automáticamente las ejecuciones de un archivo SQLite previo. En este proyecto se confirmó una base remota nueva y vacía. El plan gratuito puede pausar proyectos por baja actividad; comprobar que el recurso esté activo antes de una presentación.

## Estructura

- `frontend/`: interfaz integrada y recursos locales.
- `backend/`: API, reglas de negocio, contenido y adaptadores SQLite/PostgreSQL.
- `api/`: entrada serverless de Vercel.
- `database/`: scripts SQL de creación para PostgreSQL y SQLite.
- `public/`: salida regenerable del build del frontend; no editar directamente.
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

Las preferencias y el progreso se guardan en SQLite durante la ejecución local o en PostgreSQL cuando se configura la conexión remota. Las imágenes de cámara se procesan en el navegador y no se envían ni guardan en la API. La app ofrece exportación, borrado del progreso y eliminación completa del perfil y la sesión. El esquema remoto utiliza tablas propias con seguridad por filas activada y acceso mediante la API del servidor; las claves públicas de Supabase no conceden acceso directo a esos registros.

La base SQLite local no está cifrada en reposo: para compartir un equipo se deben controlar el acceso y las copias. La eliminación desde la aplicación borra registros lógicos de la base; no elimina archivos de respaldo externos. Un despliegue institucional requiere decisiones adicionales sobre autenticación, gestión de usuarios y política de retención.

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
