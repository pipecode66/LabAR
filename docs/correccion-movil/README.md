# Corrección del acceso móvil — 26/11/2026

Dirección actual: https://labarfesc.vercel.app.

El usuario informó que Safari mostraba «La solicitud debe proceder de la misma aplicación». Se reprodujo el error en WebKit con emulación iPhone 13 sobre el sitio publicado: una solicitud PUT a /api/profile llevaba el origen correcto https://labarfesc.vercel.app y recibía HTTP 403. El dominio anterior configurado era labar-theta.vercel.app y Node veía un socket HTTP interno detrás del proxy HTTPS de Vercel. No era un fallo de la base de datos ni de los datos del usuario.

La corrección configura el dominio actual, reconoce el origen HTTPS del host de acceso cuando el servidor usa cookies Secure y contempla la variable VERCEL_BRANCH_URL. Se mantiene el rechazo de orígenes nulos, ajenos y solicitudes sin la cabecera propia. No se confía en cabeceras de protocolo enviadas por el cliente.

También se cambia Referrer-Policy de no-referrer a same-origin y se explicitan mode y referrerPolicy en fetch para conservar el origen en solicitudes internas sin compartir referentes con otros sitios. La política anterior podía causar incompatibilidades adicionales, pero en la reproducción registrada Safari sí envió Origin correctamente.

## Evidencias y reproducción

- webkit_antes.json y webkit_antes.png: reproducción del rechazo previo en producción.
- webkit_despues.json, webkit_guia.png y webkit_despues.png: resultado del recorrido después de la corrección; revisar la URL del JSON para identificar el entorno probado.
- La prueba usa WebKit con emulación de iPhone; no representa una prueba en un dispositivo físico.

Instalar las dependencias opcionales y ejecutar:

```powershell
python -m pip install -r tests/requirements-webkit.txt
python -m playwright install webkit
python tests/mobile_webkit.py https://labarfesc.vercel.app
```

El recorrido verifica preferencias, creación de práctica 2D, confirmación, cinco verificaciones, cinco pasos, evaluación, persistencia al recargar y origen de todas las mutaciones. Al terminar solicita eliminar los datos de su propia sesión de prueba.

La ejecución final sobre https://labarfesc.vercel.app aprobó sus siete comprobaciones WebKit. Las diez comprobaciones adicionales de la API en producción también aprobaron, incluida la conexión a Supabase, el aislamiento de sesiones y el borrado. Los resultados están en webkit_despues.json y resultado_produccion.json. Las capturas muestran el antes y el después sobre ese mismo dominio.

La regresión de backend comprueba explícitamente que un origen HTTPS válido funciona tras el proxy y que se siguen rechazando Origin: null y los dominios externos. Las 58 pruebas Node pasaron sin fallos ni omisiones. Los documentos del 25/11 conservan la dirección y los resultados de aquel corte histórico; para acceder ahora se utiliza el dominio indicado al inicio de este documento.
