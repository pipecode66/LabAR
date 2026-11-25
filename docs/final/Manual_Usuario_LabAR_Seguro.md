# LabAR Seguro

## Manual de usuario

**Versión de entrega:** 1 de noviembre de 2026  
**Proyecto de aula:** Tecnologías Emergentes  
**Estudiante:** Juan Felipe Jauregui Carrillo  
**Institución:** FESC – Fundación de Estudios Superiores Comfanorte.

Este manual explica cómo abrir LabAR Seguro, configurar la experiencia, seguir una práctica, consultar resultados y administrar los datos. La aplicación es una guía educativa para el multímetro DT-830B en una práctica de voltaje DC de baja tensión supervisada.

La confirmación y las casillas son declaraciones del usuario. El software no comprueba el cableado, no lee la medición y no certifica que una conexión sea segura. Las decisiones sobre el equipo y la práctica corresponden al docente o responsable del laboratorio.

## 1. Preparar y abrir la aplicación

### 1.1 Lo que se necesita

- Un equipo que ejecute el servidor del proyecto con Node.js 24.
- Un navegador moderno con JavaScript.
- Cámara y permiso de acceso si se utilizará el marcador; la guía 2D no requiere cámara.
- El marcador de LabAR Seguro, impreso o mostrado en otra pantalla.
- La práctica y el equipo aprobados por el docente para cualquier uso presencial.

### 1.2 Iniciar el servidor

Abrir una terminal en la carpeta raíz del proyecto y ejecutar:

```powershell
npm start
```

Abrir http://127.0.0.1:3000 en el navegador del mismo equipo. Mantener la terminal abierta mientras se utiliza la aplicación. Para detener el servicio al terminar, pulsar Ctrl+C en esa terminal. Conservar la misma dirección y el mismo navegador para mantener el vínculo de la sesión; localhost y 127.0.0.1 son orígenes distintos a efectos de cookies.

La base de datos se crea automáticamente en la primera ejecución. Abrir frontend/index.html directamente no inicia el backend; los botones que guardan datos requieren el servidor del proyecto.

### 1.3 Cámara en otro dispositivo

Localhost se refiere al dispositivo desde el que se abre el navegador. Si se utiliza un teléfono, escribir localhost apunta al propio teléfono y no al computador. Una instalación compartida necesita la dirección correcta del servidor y HTTPS para la cámara.

Una dirección de red local abierta mediante HTTP puede mostrar la aplicación pero bloquear el permiso de cámara. En ese caso se puede usar la guía 2D. La configuración de red y certificados debe realizarla quien administra la instalación.

## 2. Conocer la navegación

La experiencia comienza con una bienvenida y acceso a la configuración. El inicio reúne la práctica, el progreso y las recomendaciones. Los accesos de navegación permiten consultar las secciones disponibles; los pasos de práctica conservan sus requisitos aunque se intente abrir una vista posterior.

| Elemento | Para qué sirve |
| --- | --- |
| Inicio | Revisar la práctica disponible y continuar o iniciar una ejecución. |
| Preferencias | Cambiar experiencia, presentación y accesibilidad. |
| Práctica | Consultar objetivo, materiales y condiciones antes de comenzar. |
| Guía | Consultar el paso activo cuando se cumplen los requisitos. |
| Progreso o historial | Revisar ejecuciones y resultados propios. |
| Privacidad | Exportar o eliminar datos del contexto de navegador. |

![Inicio personalizado con progreso e historial real de la sesión.](docs/final/evidencias/03_inicio.png)

## 3. Configurar la experiencia

En la configuración se puede elegir un nombre visible, indicar si es la primera práctica o una experiencia recurrente y seleccionar la preferencia visual o textual. También están disponibles opciones de texto ampliado, contraste, reducción de movimiento y audio.

Guardar aplica las preferencias y las conserva para ese navegador mediante la sesión del servidor. La opción de guía estándar permite utilizar el recorrido sin personalización. Las explicaciones de la interfaz indican el motivo de algunas adaptaciones.

Las preferencias modifican el acompañamiento, no el procedimiento obligatorio. La confirmación del instrumento, la lista, las advertencias y la opción de detenerse continúan disponibles para todos.

![Configuración de perfil, accesibilidad y personalización.](docs/final/evidencias/02_preferencias.png)

### 3.1 Uso de audio

Cuando la lectura está habilitada, la aplicación utiliza la voz que ofrece el navegador. El idioma, la voz y su disponibilidad dependen del sistema. Si no se escucha, comprobar el volumen y usar el botón de lectura; la instrucción permanece disponible por escrito. La aplicación no graba la voz del usuario.

## 4. Iniciar la práctica

Desde el inicio, abrir la práctica de medición de voltaje DC con DT-830B. Leer el objetivo, el equipo compatible, la secuencia y las condiciones de uso. Elegir la preparación de cámara o la alternativa 2D.

Una nueva ejecución crea un registro de progreso. Si existe una práctica incompleta, la aplicación ofrece recuperarla. La recuperación conserva el avance formativo y pide volver a confirmar el equipo y completar las condiciones antes de continuar.

### 4.1 Preparar el marcador

Abrir la opción de marcador imprimible de la aplicación. El contenido esperado es LABAR:DT830B:V1. Colocarlo en una superficie plana, con luz suficiente y sin tapar sus bordes. Evitar reflejos y mantener el teléfono apoyado cuando se manipule material autorizado.

El marcador identifica la guía. No demuestra que el instrumento junto a él corresponda al modelo ni que sus conexiones sean correctas.

### 4.2 Usar la cámara

Seleccionar la apertura de cámara y aceptar el permiso del navegador. Enfocar el marcador y esperar la confirmación de lectura. Si hay más de una cámara, la selección inicial depende del navegador y del dispositivo. La referencia visual permite comprobar que el QR sigue visible.

Los fotogramas se procesan en el navegador. No se guardan como video ni se envían a la API. Al salir del recorrido de cámara, la aplicación detiene la captura.

### 4.3 Cargar una imagen del marcador

La opción de cargar una imagen permite comprobar un QR desde un archivo del dispositivo. Seleccionar una imagen legible del marcador. Esta operación acredita lectura de la imagen, no una sesión de cámara en vivo. Después se conserva la confirmación manual del equipo.

### 4.4 Continuar sin cámara

Elegir Usar guía 2D cuando no se disponga de cámara, se deniegue el permiso o la imagen sea inestable. Se presenta la misma secuencia mediante un esquema del instrumento. El progreso sigue guardándose por la API.

![Cámara con fuente virtual de prueba y detección real del QR.](docs/final/evidencias/10_camara.png)

## 5. Confirmar el instrumento y la lista preventiva

### 5.1 Confirmación manual

Comparar el modelo y la distribución de controles del instrumento con la guía. Elegir la confirmación únicamente si corresponden. Si no coinciden, usar la opción de discrepancia y consultar al docente. La aplicación muestra una advertencia y no habilita el avance normal.

### 5.2 Cinco comprobaciones

Marcar cada condición después de revisarla con el responsable:

1. El multímetro y las puntas no muestran daños visibles.
2. Los puertos y las puntas corresponden a la práctica indicada.
3. La escala DCV es la autorizada por el docente.
4. La fuente didáctica está dentro del rango autorizado.
5. El área está seca y ordenada y existe autorización para comenzar.

El contador muestra cuántas verificaciones se han registrado. El botón de inicio permanece desactivado mientras falte alguna. Las casillas no sustituyen una inspección física ni la supervisión.

![Lista preventiva completa; controles de interacción habilitados.](docs/final/evidencias/05_lista.png)

## 6. Seguir la guía

La práctica tiene cinco pasos. Cada uno incluye título, instrucción y explicación del motivo. Las señales visuales son orientativas y deben interpretarse dentro de la práctica autorizada.

| Paso | Propósito educativo |
| --- | --- |
| 1. Escala DCV | Reconocer la función y el rango indicados. |
| 2. Puertos | Identificar COM y VΩmA en el modelo compatible. |
| 3. Pantalla inicial | Revisar el estado de la pantalla antes de la secuencia. |
| 4. Fuente didáctica | Seguir la indicación del docente para el contexto autorizado. |
| 5. Interpretación y cierre | Relacionar lectura y procedimiento y finalizar ordenadamente. |

Anterior vuelve a un paso ya visitado. El control de avance registra la finalización del paso permitido. La evaluación solo se habilita después de completar la secuencia. Las respuestas y el avance se guardan en el servidor; si aparece un error de conexión, debe reintentarse y confirmar el estado antes de continuar.

![Guía 2D equivalente, paso a paso y con ayuda contextual.](docs/final/evidencias/06_guia_2d.png)

### 6.1 Pausar o perder el marcador

Usar Detener para pausar cuando exista duda o discrepancia. Si se pierde el marcador, la cámara puede dejar de disponer de una referencia válida y la aplicación presenta el estado de recuperación. Volver a enfocar, elegir 2D o consultar al docente según corresponda.

La función de consulta muestra orientación dentro de la aplicación. Un reporte guardado no equivale a una notificación enviada por correo, chat o un sistema institucional al docente.

### 6.2 Cambiar a 2D

La alternativa 2D conserva el contexto de la guía y ofrece la secuencia sin depender de la imagen en vivo. Cambiar de modo no elimina los requisitos de equipo y lista. Al recuperar una ejecución después de salir o recargar, se repiten los controles preventivos.

## 7. Evaluación, resultado e historial

Contestar las tres preguntas y enviar. Si falta una respuesta, completar el formulario antes de volver a enviar. El servidor calcula el resultado y devuelve la explicación de cada concepto y los temas que conviene repasar.

El resultado sirve para retroalimentación formativa. No certifica competencia ni seguridad en un procedimiento real. Para practicar de nuevo se inicia otra ejecución conforme a las opciones disponibles; los resultados anteriores permanecen en el historial hasta que se borren.

El historial corresponde a la sesión de ese navegador. La aplicación no reúne automáticamente el progreso de distintos equipos ni ofrece una cuenta institucional para sincronizarlo.

![Evaluación y retroalimentación calculadas por el backend.](docs/final/evidencias/07_resultado.png)

## 8. Reportar una inconsistencia

Abrir el formulario de reporte y describir el problema con suficiente detalle: qué pantalla se utilizaba, qué mensaje apareció y qué se esperaba que ocurriera. La aplicación guarda el reporte junto con el contexto permitido de la sesión.

No incluir datos sensibles ni fotografías de personas. La aplicación no necesita imágenes del laboratorio para registrar un mensaje. El reporte queda en la instalación local; no activa automáticamente una solicitud externa de soporte ni un contacto con el docente.

## 9. Administrar los datos

### 9.1 Exportar

Desde Privacidad, solicitar la exportación. El navegador descarga un archivo JSON con los datos disponibles de la sesión. Guardarlo en una ubicación propia. Es una copia legible para consulta y respaldo personal; la aplicación no promete importarlo como una cuenta o restauración automática.

### 9.2 Borrar progreso

Esta operación elimina el historial de práctica y los registros de actividad asociados según la función indicada, conservando las preferencias del perfil. Revisar la confirmación antes de aceptar. Después se puede iniciar una práctica desde cero.

### 9.3 Eliminar todos los datos

La eliminación completa borra los datos asociados con la sesión y permite comenzar con un contexto nuevo. La acción no puede deshacerse desde la interfaz. Si se quiere conservar una copia personal, exportar antes de eliminar.

En equipos compartidos es recomendable terminar con la eliminación del contexto si se desea evitar que otra persona consulte los registros. La limpieza de cookies por sí sola no equivale a una solicitud de borrado de la base de datos.

![Controles para exportar datos y eliminar progreso o perfil.](docs/final/evidencias/09_privacidad.png)

## 10. Resolver problemas frecuentes

| Situación | Acción recomendada |
| --- | --- |
| La página no abre | Comprobar que npm start siga activo y que se use el puerto indicado por la terminal. |
| Se abrió index.html y no guarda | Abrir la dirección del servidor del proyecto, no el archivo directamente. |
| El puerto está ocupado | Cerrar el proceso propio que lo usa o configurar otro PORT al iniciar. |
| No aparece permiso de cámara | Verificar localhost/HTTPS y revisar permisos del sitio en el navegador. |
| Permiso denegado o cámara ocupada | Liberar la cámara, cambiar el permiso y reintentar; la guía 2D sigue disponible. |
| El QR no se reconoce | Mejorar luz y enfoque, mostrar el marcador correcto completo o usar carga de imagen/2D. |
| El equipo no coincide | Detener el recorrido y consultar al docente. |
| No se habilita Iniciar | Comprobar la confirmación y las cinco condiciones de la lista. |
| No se habilita la evaluación | Completar los cinco pasos mediante el recorrido permitido. |
| La conexión falla al guardar | Comprobar el servidor y reintentar. No asumir un guardado sin confirmación. |
| El progreso parece nuevo | Comprobar el navegador, cookies y dirección usados. Otra sesión no comparte automáticamente el historial. |
| El audio no se escucha | Revisar volumen y disponibilidad de voz; usar las instrucciones escritas. |

## 11. Administración de una instalación local

Esta sección corresponde a quien ejecuta el servidor. La base se guarda por defecto en data/labar.sqlite; DB_PATH permite configurar otra ruta. El archivo no debe compartirse como un recurso público.

Para crear una copia de seguridad, detener el servidor y copiar la base y los archivos auxiliares del mismo nombre que permanezcan después del cierre. Para restaurar, conservar primero la base actual, sustituirla por una copia válida en la ruta configurada y volver a iniciar. No copiar encima de una base abierta.

La sesión tiene una vigencia de 30 días. El servidor purga sesiones vencidas y sus registros relacionados al iniciar; también rechaza y sustituye una sesión vencida cuando se presenta su cookie. El vencimiento no implica una tarea de borrado que se ejecute continuamente sin reinicio. Las opciones de eliminación de la interfaz permiten solicitar el borrado antes de ese plazo. Las operaciones de eliminación son borrado lógico SQL; no constituyen un borrado forense del archivo o sus registros auxiliares. Las copias de seguridad externas no se modifican automáticamente al borrar datos de la base activa.

La sesión anónima depende de las cookies del navegador. Una copia del archivo SQLite no repone cookies que el usuario haya eliminado. La publicación para otros usuarios requiere una configuración de identidad, red, HTTPS y conservación apropiada para la institución.

## 12. Alcance de la verificación

En el corte final se registraron **31 pruebas aprobadas** en la suite de backend/módulos y **46 comprobaciones aprobadas** de navegador, con **0 fallos registrados**. Las cantidades pertenecen a sus respectivas suites y no acreditan una cobertura total de todos los dispositivos o escenarios.

Backend: `npm test`. Registro: docs/final/resultado_backend.txt. Navegador: `python tests/e2e.py`. Registro: docs/final/resultado_integracion.txt.

**Lectura desde imagen:** comprobada.

**Cámara virtual reproducible:** comprobada.

**Cámara o teléfono físico:** sin prueba física documentada en este corte.

El informe técnico final contiene la matriz completa y las rutas de evidencias. Ante cualquier discrepancia entre una instrucción de la aplicación y la indicación del docente sobre el equipo, detenerse y seguir al responsable de la práctica.

