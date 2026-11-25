const screens = [...document.querySelectorAll("[data-screen]")];
const progressWrap = document.querySelector("#progress-wrap");
const progressLabel = document.querySelector("#progress-label");
const progressTrack = document.querySelector(".progress-track");
const progressValue = document.querySelector("#progress-value");
const modeLabel = document.querySelector("#mode-label");

const flow = ["practice", "scan", "confirm", "checklist", "guide", "lost", "quiz"];

const initialState = () => ({
  screen: "home",
  selectedPractice: false,
  scanStatus: "idle",
  equipmentMatch: null,
  mode2d: false,
  guideStep: 0,
  score: null,
});

let state = initialState();

const guideSteps = [
  {
    title: "Identifica la escala DCV",
    instruction: "Ubica la zona DCV del selector y reconoce la escala indicada.",
    why: "La función debe corresponder a voltaje continuo antes de conectar el circuito.",
    label: "DCV · 20 V",
    position: "dial",
    equivalent: "La indicación señala la zona DCV y la escala de 20 voltios del selector.",
  },
  {
    title: "Ubica los puertos correctos",
    instruction: "Comprueba la punta negra en COM y la punta roja en VΩmA.",
    why: "Una punta en un puerto incorrecto cambia la función del instrumento y puede generar una condición insegura.",
    label: "COM + VΩmA",
    position: "ports",
    equivalent: "La indicación señala los puertos COM y V ohmios miliamperios.",
  },
  {
    title: "Confirma la lectura inicial",
    instruction: "Antes de medir, verifica que la pantalla esté activa y no muestre una advertencia.",
    why: "La revisión evita continuar con una batería agotada, una lectura inestable o un estado no previsto.",
    label: "Pantalla activa",
    position: "screen",
    equivalent: "La indicación señala la pantalla digital del multímetro.",
  },
  {
    title: "Conecta a la fuente didáctica",
    instruction: "Con autorización del docente, coloca las puntas respetando la polaridad indicada.",
    why: "La práctica está limitada a una fuente DC de baja tensión previamente verificada.",
    label: "Fuente autorizada",
    position: "source",
    equivalent: "La indicación representa la conexión a una fuente didáctica de baja tensión autorizada.",
  },
  {
    title: "Interpreta y finaliza",
    instruction: "Lee el valor, retira las puntas y deja el selector en la posición indicada por el docente.",
    why: "Cerrar la secuencia de forma ordenada reduce omisiones y deja el equipo preparado para revisión.",
    label: "Lectura y cierre",
    position: "screen",
    equivalent: "La indicación señala la lectura de pantalla y recuerda retirar las puntas al finalizar.",
  },
];

function updateProgress(screenName) {
  if (screenName === "home") {
    progressWrap.hidden = true;
    return;
  }

  progressWrap.hidden = false;
  const index = Math.max(0, flow.indexOf(screenName));
  const humanStep = index + 1;
  progressLabel.textContent = `Paso ${humanStep} de ${flow.length}`;
  progressTrack.setAttribute("aria-valuenow", String(humanStep));
  progressValue.style.width = `${(humanStep / flow.length) * 100}%`;
  modeLabel.textContent = state.mode2d ? "Modo guía 2D" : "Modo AR simulado";
}

function showScreen(name, { pushHistory = true } = {}) {
  const target = screens.find((screen) => screen.dataset.screen === name);
  if (!target) return;

  screens.forEach((screen) => {
    screen.hidden = screen !== target;
  });

  state.screen = name;
  updateProgress(name);

  if (name === "guide") renderGuideStep();

  if (pushHistory && window.location.hash !== `#${name}`) {
    window.history.pushState({ screen: name }, "", `#${name}`);
  }

  window.scrollTo({ top: 0, behavior: "auto" });
  const heading = target.querySelector("h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

function resetApp() {
  state = initialState();

  document.querySelector("#practice-card").setAttribute("aria-pressed", "false");
  document.querySelector("#practice-continue").disabled = true;
  document.querySelector("#scan-result").hidden = true;
  document.querySelector("#scan-continue").disabled = true;
  document.querySelector("#scan-status").textContent = "Listo para simular el escaneo";
  document.querySelector("#camera-stage").classList.remove("is-scanning");
  document.querySelectorAll("#safety-checklist input").forEach((input) => { input.checked = false; });
  updateChecklist();
  setEquipmentMatch(null);
  document.querySelector("#quiz-form").reset();
  resetQuizResult();
  document.body.classList.remove("mode-2d");
  showScreen("home");
}

document.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  if (goButton) showScreen(goButton.dataset.go);

  const restartButton = event.target.closest("[data-action='restart']");
  if (restartButton) {
    event.preventDefault();
    resetApp();
  }
});

const practiceCard = document.querySelector("#practice-card");
const practiceContinue = document.querySelector("#practice-continue");

practiceCard.addEventListener("click", () => {
  state.selectedPractice = !state.selectedPractice;
  practiceCard.setAttribute("aria-pressed", String(state.selectedPractice));
  practiceContinue.disabled = !state.selectedPractice;
});

practiceContinue.addEventListener("click", () => showScreen("scan"));

const scanButton = document.querySelector("#scan-button");
const scanContinue = document.querySelector("#scan-continue");
const scanStatus = document.querySelector("#scan-status");
const cameraStage = document.querySelector("#camera-stage");

scanButton.addEventListener("click", () => {
  if (state.scanStatus === "scanning") return;

  state.scanStatus = "scanning";
  scanButton.disabled = true;
  scanStatus.textContent = "Buscando marcador…";
  cameraStage.classList.add("is-scanning");

  window.setTimeout(() => {
    state.scanStatus = "found";
    scanStatus.textContent = "Marcador encontrado. Puesto LAB-01.";
    cameraStage.classList.remove("is-scanning");
    document.querySelector("#scan-result").hidden = false;
    scanContinue.disabled = false;
    scanButton.disabled = false;
    scanButton.textContent = "Escanear de nuevo";
  }, 850);
});

scanContinue.addEventListener("click", () => showScreen("confirm"));

document.querySelector("#scan-use-2d").addEventListener("click", () => {
  state.mode2d = true;
  document.body.classList.add("mode-2d");
  setEquipmentMatch(null);
  showScreen("confirm");
});

const matchYes = document.querySelector("#match-yes");
const matchNo = document.querySelector("#match-no");
const mismatchNotice = document.querySelector("#mismatch-notice");
const confirmContinue = document.querySelector("#confirm-continue");

function setEquipmentMatch(value) {
  state.equipmentMatch = value;
  matchYes.setAttribute("aria-pressed", String(value === true));
  matchNo.setAttribute("aria-pressed", String(value === false));
  mismatchNotice.hidden = value !== false;
  confirmContinue.disabled = value !== true;
}

matchYes.addEventListener("click", () => setEquipmentMatch(true));
matchNo.addEventListener("click", () => setEquipmentMatch(false));
confirmContinue.addEventListener("click", () => showScreen("checklist"));

const checks = [...document.querySelectorAll("#safety-checklist input")];
const checklistContinue = document.querySelector("#checklist-continue");

function updateChecklist() {
  const complete = checks.filter((input) => input.checked).length;
  document.querySelector("#check-count").textContent = `${complete} de ${checks.length} verificaciones`;
  document.querySelector("#check-message").textContent = complete === checks.length
    ? "Lista completa. Espera la autorización del docente."
    : "Completa todos los puntos para continuar.";
  checklistContinue.disabled = complete !== checks.length;
}

checks.forEach((input) => input.addEventListener("change", updateChecklist));
checklistContinue.addEventListener("click", () => showScreen("guide"));

const guidePrev = document.querySelector("#guide-prev");
const guideNext = document.querySelector("#guide-next");

function renderGuideStep() {
  const step = guideSteps[state.guideStep];
  document.querySelector("#guide-counter").textContent = `Paso ${state.guideStep + 1} de ${guideSteps.length} · Guía visual`;
  document.querySelector("#guide-title").textContent = step.title;
  document.querySelector("#guide-instruction").textContent = step.instruction;
  document.querySelector("#guide-why").textContent = step.why;
  document.querySelector("#ar-equivalent").textContent = step.equivalent;

  const pointer = document.querySelector("#ar-pointer");
  pointer.dataset.position = step.position;
  pointer.querySelector("span").textContent = step.label;

  document.querySelector("#simulation-label").textContent = state.mode2d ? "Guía 2D" : "AR simulada";
  guidePrev.disabled = state.guideStep === 0;
  guideNext.textContent = state.guideStep === guideSteps.length - 1 ? "Ir a evaluación" : "Siguiente";
  updateProgress("guide");
}

guidePrev.addEventListener("click", () => {
  state.guideStep = Math.max(0, state.guideStep - 1);
  renderGuideStep();
});

guideNext.addEventListener("click", () => {
  if (state.guideStep === guideSteps.length - 1) {
    showScreen("quiz");
    return;
  }
  state.guideStep += 1;
  renderGuideStep();
  document.querySelector("#guide-title").focus({ preventScroll: true });
});

document.querySelector("#simulate-loss").addEventListener("click", () => showScreen("lost"));

document.querySelector("#lost-use-2d").addEventListener("click", () => {
  state.mode2d = true;
  document.body.classList.add("mode-2d");
  showScreen("guide");
});

document.querySelector("#ask-teacher").addEventListener("click", () => {
  document.querySelector("#teacher-feedback").textContent =
    "En el producto real, esta acción indicará cómo solicitar apoyo. Por ahora, el recorrido queda pausado.";
});

const quizForm = document.querySelector("#quiz-form");
const quizResult = document.querySelector("#quiz-result");

function resetQuizResult() {
  quizResult.hidden = true;
  quizForm.hidden = false;
  document.querySelector("#quiz-error").hidden = true;
  document.querySelector("#report-feedback").textContent = "";
}

quizForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(quizForm);
  const answers = [formData.get("q1"), formData.get("q2"), formData.get("q3")];

  if (answers.some((answer) => answer === null)) {
    document.querySelector("#quiz-error").hidden = false;
    return;
  }

  document.querySelector("#quiz-error").hidden = true;
  const correct = ["b", "b", "b"];
  state.score = answers.reduce((total, answer, index) => total + Number(answer === correct[index]), 0);

  quizForm.hidden = true;
  quizResult.hidden = false;
  document.querySelector("#result-title").textContent = state.score === 3
    ? "Recorrido completado"
    : "Conviene repasar la guía";
  document.querySelector("#result-score").textContent = `Resultado: ${state.score} de 3 respuestas correctas.`;
  document.querySelector("#result-detail").textContent = state.score === 3
    ? "Reconociste los controles esenciales. El docente debe validar la práctica real."
    : "Revisa la función DCV, los puertos COM/VΩmA y la regla de detenerse ante una discrepancia.";
  document.querySelector("#result-title").focus({ preventScroll: true });
});

document.querySelector("#repeat-quiz").addEventListener("click", () => {
  quizForm.reset();
  resetQuizResult();
  document.querySelector("#quiz-form").scrollIntoView({ block: "start" });
});

document.querySelector("#report-problem").addEventListener("click", () => {
  document.querySelector("#report-feedback").textContent =
    "Función prevista para el MVP: registrar equipo, paso y descripción sin guardar imágenes de cámara.";
});

window.addEventListener("popstate", (event) => {
  const screen = event.state?.screen || window.location.hash.slice(1) || "home";
  showScreen(screen, { pushHistory: false });
});

window.history.replaceState({ screen: "home" }, "", "#home");
showScreen("home", { pushHistory: false });
