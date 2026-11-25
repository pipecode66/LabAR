# Prompt para Google Stitch — LabAR Seguro

Pega el siguiente texto como solicitud inicial en Stitch. La intención es obtener un sistema visual coherente y un prototipo conectado; las iteraciones posteriores pueden hacerse pantalla por pantalla.

## Prompt

Diseña un prototipo visual mobile-first, de alta fidelidad y completamente en español para una aplicación web educativa llamada **LabAR Seguro**. Genera todas las pantallas en el mismo proyecto, utiliza componentes consistentes y conecta el flujo principal para poder reproducirlo como prototipo interactivo.

### Contexto y objetivo

LabAR Seguro acompaña a estudiantes universitarios principiantes durante una práctica presencial y supervisada de electrónica. Utiliza realidad aumentada móvil para colocar instrucciones visuales sobre un multímetro real. El primer caso de uso enseña una práctica autorizada de medición de voltaje continuo (DC) de baja tensión con un multímetro DT-830B.

La aplicación acerca la instrucción al instrumento mediante etiquetas, flechas y resaltados, pero **no reemplaza al docente, no certifica que una conexión sea segura y no debe utilizarse con red eléctrica, alto voltaje ni fuera del laboratorio supervisado**. En este prototipo, la cámara y la realidad aumentada deben representarse visualmente como una simulación del futuro MVP WebAR basado en marcador. Siempre debe existir una guía 2D equivalente.

### Perfil principal

La usuaria de referencia es **Valentina**, estudiante de 19 años de primer semestre de Ingeniería Electrónica. Usa diariamente un teléfono Android de gama media y comprende bien las aplicaciones habituales, pero tiene experiencia básica con instrumentación, nunca ha utilizado un multímetro de forma autónoma y teme seleccionar la escala o conectar las puntas de forma incorrecta. Aprende mejor mediante instrucciones visuales, cortas y progresivas, y necesita comprender por qué se realiza cada control preventivo.

### Personalización de la experiencia

Diseña una personalización transparente basada en reglas, no una caja negra. Debe existir una opción visible para revisar, modificar, desactivar o eliminar las preferencias y el progreso.

Usa estas variables:

1. **Nivel de experiencia:** primera práctica, principiante con experiencia previa o usuario recurrente.
2. **Preferencia de presentación:** guía AR, guía 2D, texto paso a paso o apoyo auditivo.
3. **Accesibilidad:** texto normal o ampliado, contraste reforzado y reducción de movimiento.
4. **Historial y rendimiento:** último paso, intentos, errores frecuentes, solicitudes de ayuda y resultado de la evaluación.
5. **Condición técnica:** permiso de cámara, compatibilidad WebAR, estabilidad del marcador y conexión.

Representa cambios observables:

- Primer acceso: tutorial completo, glosario, explicación ampliada y una instrucción por paso.
- Usuario recurrente con buen resultado: resumen inicial e instrucciones más compactas, sin eliminar controles de seguridad.
- Error repetido en selector o puertos: pausa, ampliación visual del componente y microexplicación antes de reintentar.
- Preferencia de accesibilidad: tipografía mayor, contraste reforzado, menos movimiento, audio opcional y modo 2D.
- Cámara denegada, dispositivo incompatible o marcador inestable: cambio claro al modo 2D conservando el paso actual.
- Práctica incompleta: opción de continuar, pero solo después de repetir la lista preventiva.

La personalización puede cambiar el detalle, formato, ritmo y recomendaciones. **Nunca puede ocultar, abreviar ni permitir saltar la confirmación del equipo, la lista preventiva, las advertencias, el botón Detener o la supervisión docente.**

### Pantallas solicitadas

Crea exactamente estas **10 pantallas móviles conectadas**, con nombres visibles y consistentes:

1. **Bienvenida y límites**
   - Logotipo LabAR Seguro.
   - Mensaje: “Aprende a ubicar controles antes de medir”.
   - Ilustración sencilla de un teléfono junto a un multímetro.
   - Aviso permanente de supervisión y de que es una simulación.
   - Botón principal: “Configurar mi experiencia”.

2. **Perfil y preferencias**
   - Selección de nivel de experiencia.
   - Elección entre apoyo visual, texto paso a paso y audio.
   - Controles de texto ampliado, alto contraste, reducción de movimiento y modo 2D.
   - Explicación: “Usaremos tus elecciones y tu progreso para adaptar las ayudas”.
   - Enlace “Continuar sin personalización”.

3. **Inicio personalizado**
   - Saludo a Valentina.
   - Tarjeta “Continúa tu práctica” si existe progreso.
   - Recomendación explicable: “Te sugerimos comenzar con la guía detallada porque es tu primera práctica”.
   - Tarjeta principal “Medición de voltaje DC · Multímetro DT-830B”.
   - Navegación inferior: Inicio, Prácticas, Progreso y Perfil.

4. **Detalle de la práctica**
   - Objetivo, nivel, duración aproximada, materiales y conocimientos previos.
   - Bloque preventivo: “Solo fuente didáctica o batería de 9 V autorizada y con supervisión docente”.
   - Equipo compatible y versión de la guía.
   - Botón “Preparar práctica”.

5. **Preparación de cámara y entorno**
   - Explicar cómo ubicar el marcador, apoyar el teléfono, mejorar la iluminación y despejar la mesa.
   - Solicitar permiso de cámara en contexto.
   - Aclarar: “El video se procesa durante la sesión y no se guarda”.
   - Botones “Activar cámara” y “Usar guía 2D”.

6. **Escaneo y confirmación**
   - Vista de cámara simulada con marco, marcador LAB-01 e indicador de iluminación.
   - Estado “Buscando marcador” y luego “Posible DT-830B identificado”.
   - Mostrar modelo y versión.
   - Confirmación manual: “Sí, coincide con mi equipo” o “No coincide / escanear de nuevo”.
   - Si no coincide, bloquear el avance y mostrar “Detente y consulta al docente”.

7. **Lista preventiva**
   - Casillas: equipo y puntas sin daño visible; negra en COM; roja en VΩmA; selector en DCV autorizado; fuente dentro del rango y autorización docente.
   - Contador “0 de 5 verificaciones”.
   - Botón “Iniciar guía” deshabilitado hasta completar todo.
   - Enlace “¿Por qué debo revisar esto?”.

8. **Guía AR personalizada**
   - Cámara simulada con un dibujo reconocible del DT-830B.
   - Una sola flecha y una sola etiqueta principal por paso, sin cubrir el control señalado.
   - Contador “Paso 2 de 5”, instrucción breve, sección “¿Por qué?” y controles Anterior/Siguiente.
   - Botones “Escuchar”, “Cambiar a modo 2D” y **“Detener” siempre visible**.
   - Secuencia: identificar DCV; confirmar COM y VΩmA; revisar pantalla; conectar a batería didáctica autorizada; interpretar y finalizar.
   - Mostrar una variante detallada para principiante y una variante compacta para usuario recurrente.

9. **Falla segura y alternativa 2D**
   - Diseñar estados del mismo sistema para marcador perdido, cámara denegada, WebAR incompatible e iluminación insuficiente.
   - Al perder el marcador, pausar la guía y mostrar: “No cambies conexiones”.
   - Acciones: “Reintentar”, “Continuar en modo 2D” y “Consultar al docente”.
   - La guía 2D conserva exactamente el mismo paso y contenido esencial.
   - Los mensajes deben ser tranquilos, específicos y accionables; nunca depender solo del color.

10. **Evaluación, recomendación y control de datos**
    - Evaluación formativa de tres preguntas sobre DCV, puertos y reacción ante un equipo incorrecto.
    - Resultado, conceptos dominados y tema que debe repasarse.
    - Si hay errores repetidos, recomendar “Repasar conexión de puntas”.
    - Si el resultado es alto, mostrar un resumen compacto para la próxima sesión, sin retirar controles preventivos.
    - Mostrar por qué se recomienda cada acción.
    - Accesos a historial, preferencias, “Desactivar personalización” y “Eliminar mis datos de progreso”.

### Flujo del prototipo

Bienvenida → perfil y preferencias → inicio personalizado → detalle → preparación → escaneo y confirmación → lista preventiva → guía AR → evaluación y recomendación.

Incluye rutas alternativas desde preparación o guía AR hacia el modo 2D, y desde cualquier discrepancia hacia una pausa segura. Conecta botones principales y estados para que el flujo pueda demostrarse en 60–90 segundos.

### Sistema visual

- Estética académica, tecnológica, limpia y cercana; evitar futurismo exagerado y gamificación infantil.
- Fondo blanco o gris muy claro.
- Azul noche `#142A4A` para estructura y títulos.
- Turquesa `#08766E` para acciones principales.
- Cian `#10A8B7` para indicadores AR.
- Verde para confirmaciones.
- Ámbar `#F3A42D` para precauciones.
- Rojo `#C84343` reservado para bloqueo o detención.
- Tipografía sans serif similar a Inter, Aptos o Roboto.
- Iconografía lineal con texto; esquinas moderadamente redondeadas y sombras discretas.
- El logotipo puede combinar un escudo simple, un marcador AR y una señal de baja tensión.

### Componentes consistentes

Barra superior, navegación inferior, tarjetas, chips de nivel, indicador de progreso, botones primario/secundario, checklist, alertas accesibles, confirmaciones, controles de preferencias, explicación de recomendaciones, HUD de cámara/AR, tarjeta de evaluación y estados vacíos.

### Accesibilidad y restricciones

- Contraste mínimo WCAG AA.
- Texto base legible y áreas táctiles de al menos 44 × 44 px.
- Jerarquía visual clara, foco visible e iconos acompañados de texto.
- No comunicar selección, éxito o peligro únicamente mediante color.
- Respetar áreas seguras del móvil y reducción de movimiento.
- No añadir chatbot, funciones sociales, comercio, tabla de posiciones, panel administrativo, reconocimiento infalible ni funciones de alto voltaje.
- No pedir nombre real, documento, ubicación exacta, diagnóstico médico ni acceso a contactos.

Entrega las 10 pantallas como un sistema visual consistente, con componentes reutilizables, estados principales y conexiones de prototipo. Prioriza el diseño y la experiencia; el backend, la cámara real y el seguimiento WebAR se implementarán después.

