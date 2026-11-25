# LabAR Seguro
## Modelo físico de base de datos

**Motor remoto:** PostgreSQL de Supabase
**Fecha:** 25 de noviembre de 2026
**Autor:** Juan Felipe Jauregui Carrillo
**Script de creación:** database/schema.postgres.sql

Este documento describe las tablas físicas del backend remoto. El modelo conserva una sesión anónima por navegador, con perfiles y contenidos variables en documentos JSONB. La práctica, sus cinco pasos y las preguntas permanecen versionadas en el código del servidor.

## 1. Entidades y relaciones

| Tabla padre | Clave padre | Tabla dependiente | Clave foránea | Cardinalidad y borrado |
| --- | --- | --- | --- | --- |
| public.labar_sessions | token_hash | public.labar_attempts | owner | Una sesión puede tener varias ejecuciones. ON DELETE CASCADE. |
| public.labar_sessions | token_hash | public.labar_issues | owner | Una sesión puede tener varios reportes. ON DELETE CASCADE. |

El perfil no es una tabla física independiente: pertenece a profile_json de labar_sessions. El contexto opcional de un reporte puede incluir una ejecución o paso dentro de data_json; esa referencia no constituye una clave foránea adicional del esquema.

## 2. Diccionario: labar_sessions

| Columna | Tipo | Restricción | Significado |
| --- | --- | --- | --- |
| token_hash | text | PRIMARY KEY y CHECK hexadecimal de 64 caracteres. | Hash SHA-256 del token de la cookie; no contiene el token original. |
| profile_json | jsonb | NOT NULL; CHECK de tipo objeto. | Alias, experiencia declarada y preferencias de presentación/accesibilidad. |
| created_at | timestamptz | NOT NULL. | Fecha de creación de la sesión. |
| expires_at | timestamptz | NOT NULL. | Fecha de vencimiento de la sesión. |

El perfil incluye displayName, experience, format, largeText, highContrast, reducedMotion, audio y personalization. La API valida los campos y sus valores permitidos antes de guardar el objeto.

## 3. Diccionario: labar_attempts

| Columna | Tipo | Restricción | Significado |
| --- | --- | --- | --- |
| id | uuid | PRIMARY KEY. | Identificador de una ejecución de la práctica. |
| owner | text | NOT NULL; REFERENCES labar_sessions(token_hash), ON DELETE CASCADE. | Propietario anónimo de la ejecución. |
| status | text | NOT NULL; preparing, active, paused o completed. | Estado del recorrido digital; no certifica una condición eléctrica. |
| updated_at | timestamptz | NOT NULL. | Última actualización del registro. |
| data_json | jsonb | NOT NULL; CHECK de tipo objeto. | Estado completo: práctica, modalidad, confirmación, lista, paso, resultado y fechas. |

data_json conserva la estructura utilizada por el contrato de la API: id, practiceId, practiceVersion, status, mode, equipmentConfirmed, checklist, step, completedSteps, score, result y fechas. Las respuestas de la evaluación se incorporan al completar una ejecución. El puntaje se calcula en el servidor.

## 4. Diccionario: labar_issues

| Columna | Tipo | Restricción | Significado |
| --- | --- | --- | --- |
| id | uuid | PRIMARY KEY. | Identificador del reporte. |
| owner | text | NOT NULL; REFERENCES labar_sessions(token_hash), ON DELETE CASCADE. | Sesión que guarda el reporte. |
| created_at | timestamptz | NOT NULL. | Fecha de registro. |
| data_json | jsonb | NOT NULL; CHECK de tipo objeto. | Mensaje, estado y contexto opcional de ejecución/paso. |

La API limita el mensaje a entre 10 y 1000 caracteres y comprueba que cualquier ejecución indicada pertenezca a la misma sesión. Guardar el reporte no envía automáticamente un mensaje a un docente.

## 5. Índices

| Índice | Columnas o condición | Propósito |
| --- | --- | --- |
| labar_attempts_owner | owner, updated_at DESC. | Consultar historial y ejecución de una sesión. |
| labar_attempts_one_open_per_owner | UNIQUE owner WHERE status <> 'completed'. | Impedir varias ejecuciones abiertas para la misma sesión. |
| labar_issues_owner | owner, created_at DESC. | Consultar reportes propios. |
| labar_sessions_expiry | expires_at. | Localizar sesiones vencidas para limpieza. |

Las claves primarias también crean sus índices propios. El esquema no añade una secuencia de identidad numérica: el backend genera los UUID y el hash de sesión.

## 6. Integridad y transacciones

Las claves foráneas evitan registros dependientes sin una sesión válida. El borrado de la sesión elimina las ejecuciones y los reportes asociados. Para borrar solo el progreso se conserva la sesión y su perfil, y se eliminan las dos colecciones dependientes dentro de una misma transacción.

La API aplica reglas adicionales que no se deducen únicamente de la estructura de las tablas: confirmar el DT-830B, completar las cinco verificaciones, avanzar en orden y terminar la guía antes de responder la evaluación. Las mutaciones de una sesión se serializan con un bloqueo de fila y una transacción PostgreSQL.

## 7. Acceso y privacidad

Row Level Security se activa en las tres tablas. No se crean políticas para acceder desde anon o authenticated y se revocan sus permisos directos si esos roles existen. Las operaciones previstas pasan por el backend y su conexión PostgreSQL privada. No se necesita entregar una clave de administración a JavaScript del navegador.

Los registros almacenan preferencias, acciones declaradas, respuestas y mensajes. No contienen video, fotografías ni audio crudo de la cámara. El proyecto mantiene las opciones de exportar datos, borrar progreso y eliminar la sesión completa. La eliminación es lógica en las tablas y no garantiza la destrucción de archivos de respaldo externos.

## 8. Correspondencia con SQLite local

| PostgreSQL remoto | SQLite local | Diferencia principal |
| --- | --- | --- |
| labar_sessions | sessions | profile_json usa JSONB remoto y texto JSON local; las fechas remotas son timestamptz. |
| labar_attempts | attempts | UUID y JSONB remoto frente a texto local; índice remoto único para una ejecución abierta. |
| labar_issues | issues | UUID y JSONB remoto frente a texto local. |

El script database/schema.sqlite.sql conserva la alternativa local. Los adaptadores entregan la misma estructura JSON a la API, por lo que las pantallas no necesitan acceder directamente a ningún motor. Inicializar PostgreSQL crea su esquema; no importa automáticamente un archivo SQLite.

## 9. Estado de comprobación

Al generar este documento no se había incorporado el registro final de las nuevas pruebas y de la conexión en producción. El estado de verificación permanece pendiente. La presencia del código, el esquema o las variables indicadas por el usuario no se presenta como una prueba de conexión remota.

El código del esquema es la fuente de verdad para nombres, tipos y restricciones. Cualquier cambio posterior del esquema debe acompañarse de una migración explícita y una actualización de este diccionario; CREATE TABLE IF NOT EXISTS no sustituye un historial de migraciones de versiones futuras.
