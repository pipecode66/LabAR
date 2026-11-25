/** Contenido educativo versionado. Requiere validación del responsable del laboratorio. */
export const DEFAULT_PROFILE = Object.freeze({
  displayName: 'Estudiante', experience: 'beginner', format: 'visual',
  largeText: false, highContrast: false, reducedMotion: false,
  audio: false, personalization: true,
});

export const PRACTICE = Object.freeze({
  id: 'dc-voltage', title: 'Medición de voltaje DC', model: 'DT-830B',
  version: '1.0', duration: '10–15 minutos',
  description: 'Práctica introductoria con una fuente didáctica DC de baja tensión autorizada y supervisión docente.',
  marker: 'LABAR:DT830B:V1',
  limits: 'Solo baja tensión DC autorizada. La aplicación no valida conexiones ni reemplaza al docente.',
  steps: [
    { id: 'scale', title: 'Identifica la escala DCV', position: 'dial', label: 'DCV · escala autorizada',
      instruction: 'Ubica la zona DCV y confirma con el docente la escala apropiada para la fuente didáctica.',
      why: 'La función debe corresponder a voltaje continuo. La escala y el límite se revisan antes de medir.' },
    { id: 'ports', title: 'Ubica los puertos correctos', position: 'ports', label: 'COM + VΩmA',
      instruction: 'Comprueba la punta negra en COM y la roja en VΩmA según el modelo y protocolo del laboratorio.',
      why: 'Los puertos de corriente no son intercambiables con los de voltaje. Detente si la distribución no coincide.' },
    { id: 'display', title: 'Revisa la pantalla inicial', position: 'screen', label: 'Pantalla y estado inicial',
      instruction: 'Comprueba que la pantalla esté activa y consulta al docente ante un indicador o lectura inesperados.',
      why: 'Una pantalla activa no demuestra que la conexión sea segura; permite detectar estados que requieren revisión.' },
    { id: 'source', title: 'Sigue la conexión supervisada', position: 'source', label: 'Fuente didáctica autorizada',
      instruction: 'Con autorización y revisión del docente, sigue la conexión de la fuente de baja tensión y la polaridad indicada.',
      why: 'La aplicación solo aporta orientación visual. El responsable del laboratorio verifica el equipo y la práctica física.' },
    { id: 'finish', title: 'Interpreta y finaliza', position: 'screen', label: 'Lectura y cierre',
      instruction: 'Revisa la lectura con el docente, retira las puntas y deja el equipo en el estado indicado por el protocolo.',
      why: 'El cierre ordenado ayuda a comprender el resultado y dejar el puesto preparado para revisión.' },
  ],
  checklist: [
    { id: 'equipment', text: 'El multímetro y las puntas no muestran daños visibles.' },
    { id: 'ports', text: 'La punta negra está en COM y la roja en VΩmA; la distribución coincide con el DT-830B disponible.' },
    { id: 'scale', text: 'La escala DCV fue revisada y autorizada por el docente.' },
    { id: 'source', text: 'La fuente didáctica DC está dentro del rango autorizado; no se utilizará red eléctrica.' },
    { id: 'supervision', text: 'El área está seca y ordenada, y el docente autorizó la práctica.' },
  ],
  quiz: [
    { id: 'q1', question: '¿Qué zona del selector corresponde a voltaje continuo?', options: [
      { id: 'a', text: 'ACA' }, { id: 'b', text: 'DCV' }, { id: 'c', text: 'Ω' },
    ] },
    { id: 'q2', question: '¿Dónde se conectan las puntas para esta práctica?', options: [
      { id: 'a', text: 'Negra en 10A y roja en COM' }, { id: 'b', text: 'Negra en COM y roja en VΩmA' }, { id: 'c', text: 'En cualquier puerto libre' },
    ] },
    { id: 'q3', question: '¿Qué debes hacer si el equipo o el procedimiento no coinciden con la guía?', options: [
      { id: 'a', text: 'Continuar con cuidado' }, { id: 'b', text: 'Detenerse y consultar al docente' }, { id: 'c', text: 'Probar otras escalas' },
    ] },
  ],
});

const QUIZ_RULES = [
  { id: 'q1', answer: 'b', topic: 'Escala DCV', explanation: 'DCV identifica la función de voltaje continuo; la escala concreta debe validarse con el docente.' },
  { id: 'q2', answer: 'b', topic: 'Puertos COM y VΩmA', explanation: 'Para el modelo indicado se revisan COM para la punta negra y VΩmA para la roja. Un puerto de corriente requiere otro procedimiento.' },
  { id: 'q3', answer: 'b', topic: 'Detener y consultar', explanation: 'Ante una discrepancia se detiene la práctica y se consulta al docente; no se improvisa otra configuración.' },
];

export function gradeQuiz(answers) {
  const feedback = QUIZ_RULES.map(rule => ({
    questionId: rule.id, correct: answers[rule.id] === rule.answer, explanation: rule.explanation,
  }));
  return {
    score: feedback.filter(item => item.correct).length, total: 3, feedback,
    reviewTopics: QUIZ_RULES.filter((_, index) => !feedback[index].correct).map(rule => rule.topic),
  };
}

export function recommendationFor(profile, history) {
  const completed = history.filter(attempt => attempt.status === 'completed');
  const last = completed[0];
  if (!profile.personalization) return {
    detail: 'detailed', reason: 'Usas la guía estándar detallada; puedes activar la personalización en Preferencias.', reviewTopics: [],
  };
  if (last?.result?.reviewTopics?.length) return {
    detail: 'detailed', reason: 'Ofrecemos refuerzo según las respuestas de tu última evaluación.', reviewTopics: last.result.reviewTopics,
  };
  if (profile.experience === 'returning' && completed.filter(item => item.score === 3).length >= 2) return {
    detail: 'compact', reason: 'Tus dos ejecuciones completas con 3/3 permiten mostrar introducciones compactas. Los controles preventivos siguen presentes.', reviewTopics: [],
  };
  return {
    detail: 'detailed', reason: profile.experience === 'beginner'
      ? 'Mostramos explicaciones ampliadas porque es tu primera práctica.'
      : 'Mostramos apoyo completo hasta contar con dos ejecuciones satisfactorias de esta práctica.', reviewTopics: [],
  };
}
