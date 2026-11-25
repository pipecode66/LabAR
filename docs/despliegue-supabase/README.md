# Despliegue de LabAR Seguro en Vercel y Supabase

Actualización documental del 25 de noviembre de 2026. Los documentos de `docs/final/` conservan el corte anterior del proyecto y sus resultados históricos.

## Entregables de esta actualización

- `addendum_fuente.md`: explicación de la adaptación, operación, despliegue y alcance de las nuevas verificaciones.
- `modelo_fuente.md`: modelo físico y diccionario de datos de la persistencia remota, alineado con el script SQL.
- `generar_documentos.py`: genera versiones Word y PDF sin modificar los documentos históricos.
- `verificacion.json`, cuando exista: registro del estado realmente comprobado del despliegue y de las pruebas nuevas. Su ausencia se presenta como verificación pendiente, no como aprobación.

Los scripts de creación de la base están en `database/schema.postgres.sql` y `database/schema.sqlite.sql`. La URL pública del proyecto Supabase es `https://elzvijaeofempysspsvr.supabase.co`; la cadena privada de conexión se mantiene exclusivamente en `POSTGRES_URL` de Vercel.

## Configuración prevista en Vercel

| Ajuste | Valor |
| --- | --- |
| Root Directory | Raíz del repositorio. |
| Framework Preset | Other. |
| Build Command | npm run build. |
| Output Directory | public. |
| Entrada de API | api/index.mjs. |
| Variable privada | POSTGRES_URL en Production y Preview según corresponda. |

`vercel.json` conserva estos parámetros en el repositorio. La integración con Supabase puede generar variables adicionales; el navegador no necesita recibir la contraseña ni claves secretas para utilizar la API de LabAR.

## Verificar una publicación

1. Revisar el estado de compilación y la versión desplegada en Vercel.
2. Consultar `/api/health` y comprobar la respuesta de almacenamiento remoto antes de registrar datos.
3. Completar una práctica en la interfaz y comprobar que el resultado sigue disponible después de recargar.
4. Revisar exportación y eliminación con una sesión de prueba propia.
5. Mantener separadas las pruebas de software, la prueba con una cámara física y la validación del procedimiento eléctrico.

## Referencias oficiales

- Supabase Marketplace en Vercel: https://supabase.com/docs/guides/integrations/vercel-marketplace
- Conexiones serverless: https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers
- Seguridad por filas: https://supabase.com/docs/guides/database/postgres/row-level-security
- Pausa de proyectos gratuitos: https://supabase.com/docs/guides/platform/free-project-pausing
- Configuración Vercel: https://vercel.com/docs/project-configuration/vercel-json
- Funciones Node.js: https://vercel.com/docs/functions/runtimes/node-js
