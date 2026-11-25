# LabAR Seguro

## Documentación final consolidada

**Asignatura:** Tecnologías Emergentes  
**Estudiante:** Juan Felipe Jauregui Carrillo  
**Docente:** Jenny Esmeralda Zabaleta  
**Institución:** FESC – Fundación de Estudios Superiores Comfanorte  
**Fecha de corte:** 1 de noviembre de 2026  
**Entrega:** aplicación académica local, documentación técnica y manual de usuario.

La documentación consolida la propuesta inicial, el enfoque del proyecto, la actividad de personalización UX, el avance del 29 de octubre, el diseño exportado de Stitch y la implementación final verificada. Los documentos anteriores conservan su valor histórico: las capacidades que antes estaban previstas se describen aquí de acuerdo con el código y las pruebas del corte final.

El producto es una aplicación educativa para una sola práctica supervisada con el multímetro DT-830B. Su ejecución reúne frontend, API y base de datos local. La experiencia incorpora detección de un marcador QR, una guía visual con alternativa 2D, preferencias de accesibilidad, reglas de personalización y evaluación formativa. Las comprobaciones del software no validan físicamente conexiones, escalas ni condiciones eléctricas.

## 1. Introducción

El uso inicial de instrumentos de laboratorio exige interpretar conceptos, localizar controles físicos y seguir una secuencia operativa. Para un estudiante principiante, alternar entre una explicación, un manual y el equipo puede aumentar las dudas sobre puertos, selector y orden de actuación. LabAR Seguro sitúa una guía breve en el contexto de la práctica y mantiene visible la necesidad de supervisión docente.

La idea central se conserva desde la primera entrega: apoyar el aprendizaje mediante una interfaz web accesible desde un navegador, con información vinculada al instrumento y una secuencia preventiva. El alcance se delimitó a una práctica de voltaje continuo de baja tensión con un modelo de multímetro. Esta delimitación permitió construir un recorrido completo antes de contemplar otros equipos o una integración institucional.

La aplicación final toma como referencia las diez pantallas de Stitch y convierte sus controles en operaciones verificables: guardar preferencias, iniciar y recuperar una ejecución, confirmar el equipo, completar una lista, avanzar por la guía, responder la evaluación y revisar el historial. El servidor conserva los registros en SQLite y aplica las precondiciones de la práctica. La cámara se procesa en el navegador.

## 2. Planteamiento del problema

### 2.1 Necesidad atendida

El problema es la distancia entre la instrucción y el punto de uso. Una imagen genérica o un texto largo puede no resolver de inmediato dónde se ubica un control o cuál es la acción siguiente. Las explicaciones repetidas también demandan tiempo del docente cuando varios estudiantes comienzan a la vez.

Los beneficiarios directos son estudiantes universitarios de primeros semestres que aún no dominan la instrumentación. Los docentes y monitores son actores de apoyo: revisan el contenido, verifican el contexto y conservan la autoridad sobre la práctica. La aplicación aporta orientación formativa y trazabilidad del recorrido; no sustituye la observación del equipo ni la intervención del responsable del laboratorio.

### 2.2 Delimitación

El caso de uso comprende el DT-830B, una fuente didáctica DC de baja tensión autorizada y cinco pasos de orientación. El modelo real debe coincidir con la guía. Los valores y las representaciones de la pantalla son didácticos: la aplicación no lee el valor del multímetro ni controla una fuente de alimentación.

Las variantes comerciales del DT-830B pueden diferir. El nombre del modelo y el marcador no garantizan la coincidencia de su distribución física. Por ello se exige confirmación manual y se mantiene la regla de detenerse y consultar ante una discrepancia.

### 2.3 Objetivos

**Objetivo general.** Implementar y verificar una aplicación educativa web que acompañe la preparación y el recorrido formativo de una práctica inicial con multímetro mediante instrucciones contextuales, controles preventivos, personalización explicable y evaluación.

- Mantener un flujo coherente desde la configuración inicial hasta el resultado y el historial.
- Detectar un marcador de práctica desde la cámara o una imagen y mostrar una referencia visual asociada.
- Ofrecer una guía 2D que permita continuar cuando la cámara no está disponible.
- Aplicar en el servidor las condiciones necesarias para registrar el avance y calificar la evaluación.
- Conservar preferencias, ejecuciones y reportes de cada sesión anónima, con exportación y eliminación.
- Verificar el comportamiento con pruebas de API, persistencia y navegación, dejando registradas las limitaciones de la evidencia.

## 3. Solución propuesta e innovación

### 3.1 Recorrido funcional

La persona configura su experiencia o continúa con una variante estándar. El inicio presenta la práctica disponible y el progreso guardado. Después de leer el detalle, puede preparar la cámara, detectar el marcador o elegir directamente el modo 2D. La confirmación manual del equipo y la lista de cinco condiciones preceden al avance de la guía.

La guía presenta una instrucción a la vez, el motivo de la acción y controles para retroceder, completar o detener. Si se pierde el marcador durante una sesión de cámara, se muestra un estado de pausa y una alternativa de recuperación. Al recuperar una ejecución guardada se repiten la confirmación y la lista. La evaluación final consta de tres preguntas y el servidor calcula los aciertos y los conceptos para repasar.

### 3.2 Aporte innovador

La innovación se encuentra en la combinación de contexto visual, secuencia preventiva, adaptación educativa y continuidad entre sesiones. La detección del marcador aporta una referencia del entorno; la personalización ajusta la cantidad y el formato de ayuda; el backend evita que la puntuación o el avance dependan únicamente de cambios locales en la interfaz.

El sistema explica por qué ofrece una ayuda y permite modificar las preferencias. Un usuario recurrente puede consultar explicaciones compactas, mientras que un principiante recibe más contexto. Todos conservan la misma confirmación del equipo, lista preventiva, advertencias y posibilidades de detenerse.

### 3.3 Qué hace cada capa

| Capa | Responsabilidad | Límite |
| --- | --- | --- |
| Interfaz | Presentar el flujo, formularios, alertas y estados adaptados al perfil. | No determina si una conexión física es correcta. |
| Cámara y marcador | Obtener video con permiso, localizar el QR y dibujar una referencia contextual. | El QR identifica contenido; no reconoce eléctricamente el instrumento. |
| API | Validar solicitudes, aislar sesiones, aplicar precondiciones y calcular resultados. | No equivale a autenticación institucional ni a supervisión técnica. |
| SQLite | Conservar perfil, ejecuciones y reportes en el equipo que ejecuta el servidor. | La instalación local no cifra por sí misma el archivo de base de datos. |

## 4. Defensa como proyecto de tecnología emergente

La realidad aumentada web combina la captura del entorno con información digital presentada en el navegador. LabAR Seguro implementa una forma acotada de esta idea: localiza un marcador QR en fotogramas de video y dibuja una referencia asociada. El proyecto explora la relación entre una interfaz digital y un contexto físico sin exigir una aplicación móvil nativa o gafas especializadas.

La implementación final utiliza getUserMedia para acceder a la cámara y jsQR para decodificar el marcador y recuperar sus esquinas. La representación se ancla al marcador; no se afirma un seguimiento tridimensional del multímetro ni reconocimiento de sus componentes. El sistema funciona también como guía 2D para preservar el acceso en dispositivos o condiciones no compatibles.

La personalización basada en reglas es una técnica de apoyo, no un modelo de inteligencia artificial generativa. Se eligió porque permite explicar las decisiones, probarlas con pocos datos y mantener el control del usuario. La propuesta emergente descansa en la interfaz contextual y la integración física-digital; no en atribuir inteligencia a un temporizador o a reglas simples.

| Tecnología | Aporte real al proyecto | Evidencia prevista en la entrega |
| --- | --- | --- |
| Cámara web | Obtención de fotogramas con permiso de la persona. | Flujo de cámara, manejo de permisos y pruebas del entorno disponible. |
| Detección QR | Identificación de LABAR:DT830B:V1 y posición del marcador. | Marcador imprimible y pruebas de decodificación. |
| Canvas y referencia superpuesta | Señal visible sobre el contexto capturado. | Capturas del flujo y prueba del módulo de cámara. |
| Reglas de personalización | Detalle, formato, accesibilidad y repaso según preferencias y rendimiento. | Dos configuraciones observables y datos guardados por API. |
| API y SQLite | Integridad del flujo, persistencia e historial. | Pruebas de aislamiento, precondiciones y reinicio. |

Los mecanismos técnicos de cámara requieren un contexto seguro: localhost en el equipo de ejecución o HTTPS en una instalación remota. Abrir la dirección IP de otro equipo mediante HTTP puede impedir el acceso a cámara, aunque la guía 2D siga siendo utilizable.

## 5. Impacto y relevancia

El impacto esperado es educativo: facilitar la identificación de controles, reducir omisiones y ofrecer explicaciones oportunas sin retirar la supervisión. La guía repetible puede ayudar a preparar una práctica y a repasar conceptos después de una evaluación. Las preferencias de presentación y la alternativa 2D amplían las formas de acceso.

El aporte tecnológico consiste en una solución reproducible que integra detección local, frontend, API y persistencia. La separación de responsabilidades permite comprobar la navegación y las reglas del servidor de manera independiente. El proyecto también deja un caso académico para discutir privacidad, accesibilidad y límites de la automatización.

Los beneficios sobre aprendizaje, errores en laboratorio o tiempo del docente son hipótesis de evaluación. No se presentan como resultados medidos, porque la entrega no contiene un estudio con estudiantes ni una autorización de uso físico documentada. Un piloto posterior deberá observar comprensión, dudas, omisiones, usabilidad y necesidad de ayuda, sin utilizar la velocidad como único criterio de éxito.

## 6. Retos y limitaciones

| Reto o riesgo | Consecuencia | Tratamiento en la aplicación |
| --- | --- | --- |
| Cámara denegada o no compatible | No puede iniciarse el video. | Mensaje de error y guía 2D disponible. |
| Iluminación, enfoque o marcador fuera de vista | Detección inestable o pérdida de referencia. | Pausa y recuperación explícita; no continuar con una referencia desalineada. |
| Confusión entre marcador y validación física | Exceso de confianza en la interfaz. | Confirmación humana y avisos sobre el alcance. |
| Diferencia entre instrumentos | Una representación podría no corresponder al equipo real. | Modelo específico y detención ante discrepancias. |
| Borrado de cookies o cambio de navegador | Se pierde el vínculo con la sesión anónima. | Explicación en el manual y exportación de datos. |
| Caída del servidor local | No se guardan nuevas operaciones. | Errores visibles y reintento; no simular un guardado exitoso. |
| Acceso al equipo servidor | Exposición del archivo SQLite o de una copia de seguridad. | Control del sistema operativo, ubicación protegida y copias custodiadas. |
| Falta de validación pedagógica | No puede afirmarse una mejora de aprendizaje. | Piloto y revisión docente como actividades posteriores. |

La aplicación se entrega como proyecto académico local. La publicación para múltiples laboratorios requiere definir autenticación, roles, HTTPS, política de conservación, operación del servidor y soporte. No se incluyen certificación de competencias, diagnóstico eléctrico, medición de red ni control remoto de instrumentos.

## 7. Experiencia personalizada de usuario

### 7.1 Perfil específico

El perfil de referencia es Valentina, de 19 años, estudiante de primer semestre de Ingeniería Electrónica. Usa aplicaciones móviles diariamente y conoce interfaces habituales, pero tiene experiencia básica en instrumentación. Necesita instrucciones breves, señales visuales y explicaciones del orden de la práctica; puede omitir textos largos cuando cree haber entendido.

Se trata de una persona ficticia de diseño. La aplicación no necesita recolectar su edad, programa académico o identidad real. El nombre mostrado es opcional y la sesión funciona sin correo ni documento de identidad.

### 7.2 Variables y cambios observables

| Variable | Dato utilizado | Cambio funcional |
| --- | --- | --- |
| Experiencia | Principiante o recurrente, declarada por el usuario, e historial de resultados. | Apoyo detallado; variante compacta para recurrente con dos ejecuciones completas de 3/3, sin omitir controles preventivos. |
| Presentación | Preferencia visual o textual. | Jerarquía de las ayudas y presentación de las instrucciones. |
| Accesibilidad | Texto ampliado, contraste, movimiento y audio. | Tamaño, estilos, animación y lectura de instrucciones cuando el navegador lo permite. |
| Progreso | Ejecución actual, pasos y finalización. | Continuar, repetir o revisar historial. |
| Rendimiento | Respuestas y conceptos con errores. | Retroalimentación y temas de repaso calculados por el servidor. |
| Condición técnica | Cámara, marcador y modo elegido. | Experiencia de cámara o guía 2D con el mismo recorrido formativo. |

### 7.3 Esquema funcional

Perfil y preferencias → reglas explicables → variante de interfaz → interacción y evaluación → progreso guardado → recomendación de repaso.

La persona puede desactivar la personalización para usar una experiencia estándar. El cambio de perfil no retira la confirmación del equipo, la lista preventiva ni las advertencias. Los datos de rendimiento sirven para orientar el repaso, no para calificar oficialmente al estudiante o asignarle una etiqueta permanente.

### 7.4 Datos, almacenamiento y procesamiento

El navegador conserva una cookie de sesión anónima. El servidor utiliza un token opaco para vincular las solicitudes con un perfil y con los registros de la base de datos. La API almacena preferencias, ejecuciones, resultados y reportes. El archivo SQLite se ubica por defecto en data/labar.sqlite en el equipo servidor.

Los fotogramas se procesan en memoria dentro del navegador. No se envían a la API ni se guardan como video. La cámara se detiene al abandonar su uso. La función de audio utiliza la síntesis de voz disponible en el navegador; no requiere grabar voz del usuario.

Las reglas combinan el perfil y el historial para definir detalle y repaso. La evaluación se calcula en el servidor a partir de las respuestas, sin aceptar un puntaje enviado por el cliente. Los eventos de progreso comprueban las condiciones de la ejecución antes de guardar cambios.

### 7.5 Ética y privacidad

La minimización de datos evita cuentas institucionales o identificadores sensibles. El usuario puede consultar y exportar sus datos, borrar el progreso o eliminar el conjunto de registros asociados con su sesión. La eliminación tiene un efecto real en la base de datos de la instalación.

La cookie vincula un navegador, no demuestra la identidad de una persona. En equipos compartidos debe eliminarse la sesión al terminar si no se desea que el siguiente usuario vea el historial. Borrar cookies antes de borrar los datos del servidor puede dejar registros sin una vía de acceso desde ese navegador; la exportación previa facilita conservar una copia personal.

La instalación local no añade cifrado de disco. La custodia del equipo y de las copias de seguridad sigue siendo responsabilidad de quien administra la instalación. La conservación operativa y sus limitaciones se documentan según el código final en la sección de administración.

## 8. Evolución y consolidación de entregas

| Corte o entregable | Contenido comprobable | Relación con la versión final |
| --- | --- | --- |
| 3 de septiembre de 2026 | Propuesta, problema, objetivos, tecnología, impacto, riesgos y prototipo inicial. | Se conserva el enfoque educativo, preventivo y supervisado. |
| Actividad de UX | Perfil, variables, reglas, almacenamiento y riesgos de personalización. | Las preferencias y su persistencia se integran a la aplicación. |
| 29 de octubre de 2026 | Ocho vistas del frontend v0.1; 17 comprobaciones y doce capturas de ese corte. | Evidencia histórica; esas cifras no sustituyen las pruebas finales. |
| Exportación de Stitch | Diez pantallas y sistema visual LabAR Precision System. | Se recrean sus componentes con navegación y datos reales. |
| 1 de noviembre de 2026 | Integración del frontend, API, SQLite, cámara/marcador y pruebas finales. | Estado técnico descrito en este documento y en los registros de la entrega. |

Los archivos históricos no contienen un cronograma fechado por semanas o hitos. La evolución se presenta por entregables disponibles, sin reconstruir fechas de ejecución ni porcentajes. El trabajo final sigue un orden incremental: integrar interfaz, desarrollar persistencia, cerrar precondiciones y comprobar recorridos.

### 8.1 Decisiones visuales

La recreación utiliza la paleta verde azulado, superficies claras, tarjetas, estados de precaución y lenguaje visual del diseño exportado. La estructura se adapta a móvil y escritorio y conserva controles con nombre accesible, foco visible y áreas táctiles legibles. Las cifras de telemetría o mensajes de calibración del prototipo que no representaban mediciones reales se sustituyen por estados de la aplicación.

La existencia de medidas de accesibilidad no equivale a una auditoría completa de conformidad. El criterio de entrega es ofrecer controles utilizables y variantes de presentación, junto con las comprobaciones efectivamente realizadas.

## 9. Arquitectura y modelo de datos

### 9.1 Componentes

Navegador → frontend HTML/CSS/JavaScript → API HTTP del mismo origen → SQLite local.

La cámara forma una rama de procesamiento local: permiso → video → fotograma → jsQR → esquinas del marcador → referencia superpuesta. El contenido del video no forma parte de la solicitud de progreso ni de la base de datos.

El backend usa Node.js 24 con módulos nativos HTTP, criptografía y SQLite. La versión probada es 24.13.0: en ella node:sqlite emite una advertencia ExperimentalWarning que debe distinguirse de un error de la aplicación. El frontend se entrega como recursos estáticos locales, evitando una dependencia de un CDN para mostrar la interfaz. La librería jsQR 1.4.0 se incluye con su licencia Apache-2.0 y atribución.

### 9.2 Entidades lógicas

| Entidad | Datos principales | Relación |
| --- | --- | --- |
| Sesión | Token opaco y datos de vigencia de sesión. | Identifica el contexto anónimo del navegador. |
| Perfil | Nombre visible y preferencias de experiencia/accesibilidad. | Pertenece al contexto anónimo. |
| Ejecución | Modo, estado, confirmación, lista, paso, pasos completos y resultado. | Pertenece al contexto; referencia la práctica disponible. |
| Reporte | Mensaje y contexto opcional de ejecución/paso. | Pertenece al contexto y no se envía a un docente por un canal externo. |
| Práctica | DT-830B, cinco pasos, lista y preguntas. | Catálogo controlado por el código del servidor. |

Los nombres físicos de tablas y columnas deben consultarse en el esquema del backend. Esta tabla describe el modelo funcional, no una migración SQL independiente.

### 9.3 Integridad del recorrido

El servidor exige que el equipo esté confirmado y que la lista esté completa antes del avance. Controla los pasos y requiere la guía completa antes de evaluar. Al reanudar una ejecución, reinicia los controles preventivos y conserva el progreso pedagógico permitido.

La sesión limita el acceso a datos propios; no permite operar una ejecución de otro navegador solo con conocer su identificador. El servidor valida tipos, campos y tamaños de entrada. Los controles de origen y el encabezado del cliente acompañan las mutaciones; la cookie utiliza HttpOnly y SameSite. Estas medidas se comprueban en las pruebas correspondientes y no reemplazan una revisión de seguridad para publicación institucional.

## 10. API del proyecto

La API comparte origen con la aplicación. Las mutaciones utilizan JSON y el encabezado X-LabAR-Client: web. Los identificadores y resultados son emitidos por el servidor. El contrato operativo final se relaciona con las pruebas del backend.

| Método y ruta | Operación |
| --- | --- |
| GET /api/health | Comprobar el servicio. |
| GET /api/bootstrap | Obtener o iniciar sesión, perfil, práctica, ejecución e historial. |
| PUT /api/profile | Actualizar preferencias válidas. |
| POST /api/attempts | Iniciar o recuperar una ejecución según las reglas del servidor. |
| POST /api/attempts/:id/confirm | Guardar la confirmación manual del equipo. |
| POST /api/attempts/:id/checklist | Guardar las verificaciones de la lista. |
| POST /api/attempts/:id/progress | Registrar avance o retorno permitido. |
| POST /api/attempts/:id/pause | Pausar una ejecución. |
| POST /api/attempts/:id/resume | Preparar recuperación con nueva confirmación y lista. |
| POST /api/attempts/:id/mode | Cambiar entre cámara/RA y guía 2D. |
| POST /api/attempts/:id/quiz | Validar respuestas y calcular el resultado. |
| POST /api/issues | Guardar un reporte propio. |
| GET /api/history | Consultar las ejecuciones de la sesión. |
| GET /api/export | Descargar los datos asociados con la sesión. |
| DELETE /api/progress | Borrar progreso y registros de actividad, conservando preferencias. |
| DELETE /api/data | Eliminar los datos asociados con la sesión. |

La aplicación presenta errores cuando una operación no se puede completar. Un mensaje de éxito solo corresponde a una respuesta satisfactoria del servidor. La evaluación no acepta una nota calculada o elegida por el cliente.

## 11. Instalación, ejecución y mantenimiento

### 11.1 Requisitos

- Windows u otro sistema con Node.js 24 compatible con node:sqlite; versión comprobada 24.13.0.
- Navegador moderno con JavaScript; cámara opcional para el recorrido con marcador.
- Python y las dependencias de pruebas únicamente si se desea reproducir la verificación de navegador y los documentos.
- Permiso para crear la base de datos en la carpeta data.

### 11.2 Puesta en marcha

Desde la carpeta raíz del proyecto:

```powershell
node --version
npm start
```

Abrir http://localhost:3000. El proceso sirve tanto la interfaz como la API. La base se crea automáticamente al iniciar cuando no existe. La guía ya no debe ejecutarse abriendo index.html directamente o con un servidor estático independiente, porque sus operaciones requieren la API.

La configuración del servicio utiliza HOST, PORT y DB_PATH cuando se necesita una dirección, puerto o ruta distinta. El valor local predeterminado restringe el servicio al equipo. Si se desea acceder desde otro dispositivo, la configuración de red y HTTPS debe resolverse antes de utilizar su cámara. PUBLIC_ORIGIN declara el origen HTTPS de un proxy de publicación y permite validar ese origen; el servidor no confía automáticamente en encabezados reenviados. SECURE_COOKIE controla el atributo Secure según la instalación. Estas opciones no configuran certificados ni publican el proyecto por sí solas.

### 11.3 Copia de seguridad y restauración

Detener el servidor antes de copiar o sustituir SQLite. Guardar una copia del archivo configurado y, si existen después del cierre, sus archivos auxiliares del mismo nombre. La copia contiene información de las sesiones y debe custodiarse con el mismo cuidado que la base original.

Para restaurar: detener el servicio, conservar una copia de la base actual, colocar la copia de seguridad en la ruta DB_PATH configurada y volver a iniciar. No sobrescribir una base activa. Una restauración recupera los datos incluidos en la copia; operaciones posteriores al momento de la copia no estarán presentes.

Las cookies del navegador y la base forman parte del contexto de acceso anónimo. Restaurar SQLite no restaura cookies borradas. La exportación personal permite consultar los datos fuera de ese vínculo, pero no se presenta como una importación automática.

### 11.4 Privacidad operativa

{{RETENTION_NOTE}}

No deben exponerse públicamente la carpeta de datos ni los documentos de evidencias. El servidor sirve únicamente los recursos de aplicación previstos. Para una operación institucional se requieren decisiones adicionales sobre identidad, acceso, HTTPS, conservación, copias y responsabilidad administrativa.

## 12. Pruebas y resultados del corte final

{{TEST_SUMMARY}}

Para reproducir las comprobaciones, desde la raíz del proyecto:

```powershell
npm run check
npm test
python -m pip install -r tests/requirements.txt
python tests/e2e.py
```

Las pruebas utilizan bases y puertos temporales, sin operar sobre data/labar.sqlite. El guion tests/run_all.py ejecuta las suites y recopila los registros finales para la documentación. Las pruebas de navegador requieren Edge y las dependencias indicadas; los documentos se regeneran con docs/final/generar_documentacion.py después de disponer de evidencia_final.json.

### 12.1 Matriz de verificación

{{TEST_MATRIX}}

### 12.2 Evidencias visuales

Las capturas conservan el ancho de la vista comprobada. Para fotografiar la página completa se expandió temporalmente la altura del viewport, evitando que la navegación fija apareciera a mitad de la imagen; después se restauró la emulación de 390 × 844 px para continuar las comprobaciones. Este ajuste de captura no modifica el CSS ni el contenido de la interfaz.

Las capturas móviles largas se presentan en dos segmentos verticales consecutivos, rotulados como parte superior e inferior y con un pequeño solapamiento. Se trata de un recorte de presentación dentro del documento: los archivos PNG de evidencia permanecen íntegros.

{{REPORT_SCREENSHOTS}}

### 12.3 Alcance real de la cámara

{{CAMERA_SUMMARY}}

Las pruebas funcionales acreditan las condiciones que ejecutan y registran. No prueban por sí mismas seguridad eléctrica, mejora de aprendizaje, todos los modelos de teléfono o ausencia absoluta de defectos. La revisión pedagógica y el piloto en laboratorio permanecen como validaciones externas al software.

{{EXTRA_QA}}

## 13. Estado de entrega y continuidad

{{DELIVERY_STATUS}}

Las actividades posteriores se concentran en validación docente del contenido, prueba con dispositivos físicos y evaluación de usabilidad en el contexto autorizado. La ampliación a otros instrumentos requiere nuevos contenidos y pruebas; no puede aplicarse una guía existente a un equipo diferente sin revisión.

## 14. Inventario de fuentes y trazabilidad

La consolidación se construyó con los siguientes materiales locales. Los originales se conservan y se distinguen de la implementación actual.

| Fuente | Aporte a la consolidación |
| --- | --- |
| Informe_TECNOLOGIASEMERGENTES.pdf | Identidad académica y propuesta inicial. |
| docs/Proyecto_LabAR.pdf | Problema, solución, defensa emergente, impacto, riesgos y UX. |
| docs/Informe_Proyecto_LabAR_Seguro.docx y PDF | Primera formulación editable y especificación de ocho vistas. |
| docs/Informe_Proyecto_LabAR_Seguro_UX_Personalization.docx | Desarrollo de la actividad de personalización. |
| docs/Prompt_Stitch_LabAR_Seguro.md | Alcance visual esperado y variantes de personalización. |
| docs/Actividad_29-10-2026.pdf y carpeta de evidencias | Estado verificable del frontend v0.1 y pruebas históricas. |
| docs/archivo/frontend_v0_1/ y README histórico | Copia de los cuatro archivos originales de la maqueta, diferenciada de la versión integrada. |
| Exportación local de Stitch | Diez pantallas, código HTML de referencia y sistema visual. |
| Código final frontend y backend | Comportamiento y contrato actuales. |
| Registros de pruebas finales | Resultados y límites de la verificación de este corte. |

El archivo inventario_fuentes.json incluye rutas y huellas SHA-256 de los materiales revisados. La existencia de una huella ayuda a identificar la versión usada; no certifica autoría ni sustituye la revisión del contenido.

## 15. Referencias técnicas y antecedentes

Las referencias de la propuesta inicial se conservan como antecedentes. Los resultados numéricos de esos trabajos no se extrapolan al proyecto local.

- Azuma, R. T. (1997). A survey of augmented reality. Presence: Teleoperators and Virtual Environments, 6(4), 355–385. https://doi.org/10.1162/pres.1997.6.4.355
- Tuli, N., Singh, G., Mantri, A., y Sharma, S. (2022). Augmented reality learning environment to aid engineering students in performing practical laboratory experiments in electronics engineering. Smart Learning Environments, 9, 26. https://doi.org/10.1186/s40561-022-00207-9
- Singh, G., y Ahmad, F. (2024). An interactive augmented reality framework to enhance the user experience and operational skills in electronics laboratories. Smart Learning Environments, 11, 5. https://doi.org/10.1186/s40561-023-00287-1
- Node.js. Documentación de SQLite. https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- Node.js. Documentación correspondiente al runtime comprobado, v24.13.0. https://nodejs.org/download/release/v24.13.0/docs/api/sqlite.html
- MDN Web Docs. MediaDevices: getUserMedia(). https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- Cozmo. jsQR: documentación y licencia del proyecto. https://github.com/cozmo/jsQR
- World Wide Web Consortium. Web Content Accessibility Guidelines (WCAG) 2.2. https://www.w3.org/TR/WCAG22/

