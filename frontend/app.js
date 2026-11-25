import { MarkerCamera } from './camera.js';

const $ = (selector, root = document) => root.querySelector(selector);
const app = $('#app');
const MARKER = 'LABAR:DT830B:V1';
const defaults = { displayName: 'Estudiante', experience: 'beginner', format: 'visual', largeText: false, highContrast: false, reducedMotion: false, audio: false, personalization: true };
const state = { data: null, page: 'welcome', busy: false, camera: null, markerDetected: false, markerSource: '', matching: null, resumeRequired: false, toastTimer: null, returnFromProfile: 'dashboard', pauseReason: '' };

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
const iconPaths = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>', back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  cube: '<path d="m12 3 8 4v10l-8 4-8-4V7l8-4Zm-8 4 8 5 8-5m-8 5v9"/>',
  shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>',
  warning: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.1"/>',
  bulb: '<path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7M8 18h8m-7 3h6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  camera: '<rect x="2" y="6" width="15" height="14" rx="2"/><path d="m17 10 5-3v12l-5-3"/>',
  book: '<path d="M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15"/>',
  tune: '<path d="M5 3v18M12 3v18M19 3v18M2 8h6m1 8h6m1-7h6"/>',
  meter: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 5h8v4H8z"/><circle cx="12" cy="14" r="3"/><path d="m12 14 1-2M8 19h.1m4 0h.1m4 0h.1"/>',
  history: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  sound: '<path d="m3 9 5 0 5-5v16l-5-5H3V9Zm13-2c3 3 3 7 0 10m3-13c5 5 5 11 0 16"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  delete: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 4-7 5 8"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  message: '<path d="M3 3h18v14H8l-5 4V3Z"/><path d="M7 8h10M7 12h7"/>',
};
function icon(name, extra = '') { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${extra}">${iconPaths[name] || iconPaths.cube}</svg>`; }
function button(id, text, action, kind = 'primary', disabled = false, symbol = '') { return `<button type="button" id="${id}" data-action="${action}" class="button button-${kind}"${disabled ? ' disabled' : ''}>${symbol ? icon(symbol) : ''}<span>${text}</span></button>`; }
function notice(title, text, kind = '', symbol = 'shield') { return `<div class="notice ${kind ? `notice-${kind}` : ''}">${icon(symbol)}<div><strong>${title}</strong><p>${text}</p></div></div>`; }
function pageHeader(eyebrow, title, description = '') { return `<div class="page-header"><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1>${description ? `<p class="muted">${description}</p>` : ''}</div>`; }
function back(page = 'dashboard', text = 'Volver al inicio') { return `<a class="back-link" href="#${page}">${icon('back')}${text}</a>`; }
function meter(position = '', welcome = false) {
  const highlight = { dial: [120, 152, 51], ports: [120, 250, 51], screen: [120, 66, 55], source: [222, 205, 29] }[position];
  return `<svg viewBox="0 0 300 315" role="img" aria-label="Esquema orientativo de un multímetro: pantalla, selector y puertos COM y VΩmA"><defs><linearGradient id="meterBody" x2="1" y2="1"><stop stop-color="#334344"/><stop offset="1" stop-color="#121f20"/></linearGradient></defs><rect x="54" y="15" width="134" height="277" rx="20" fill="#000" opacity=".14"/><rect x="48" y="10" width="134" height="277" rx="18" fill="#cbd9d6"/><rect x="54" y="16" width="122" height="265" rx="13" fill="url(#meterBody)"/><text x="115" y="34" fill="#c4ded7" font-family="Consolas,monospace" font-size="8" text-anchor="middle">MULTÍMETRO · ESQUEMA</text><rect x="65" y="43" width="99" height="49" rx="5" fill="#c7d7ca"/><text x="151" y="77" fill="#23382d" font-family="Consolas,monospace" font-size="29" text-anchor="end">0.00</text><text x="71" y="57" fill="#344b3a" font-family="Consolas,monospace" font-size="8">DCV</text><circle cx="115" cy="151" r="48" fill="#0e181b" stroke="#7f9991" stroke-width="1"/><circle cx="115" cy="151" r="33" fill="#334446"/><path d="m115 127 7 31-14 0 7-31" fill="#89f5e7"/><text x="68" y="107" fill="#a9e6d8" font-family="Consolas,monospace" font-size="10">DCV</text><text x="148" y="116" fill="#cdd6d2" font-family="Consolas,monospace" font-size="8">20</text><text x="74" y="202" fill="#b2c8c0" font-family="Consolas,monospace" font-size="7">Escala según protocolo</text><circle cx="78" cy="243" r="10" fill="#8d2427" stroke="#e8a49d"/><circle cx="115" cy="243" r="10" fill="#050c10" stroke="#b8c9c4"/><circle cx="152" cy="243" r="10" fill="#8d2427" stroke="#e8a49d"/><text x="78" y="266" fill="#fff" font-family="Consolas,monospace" font-size="8" text-anchor="middle">10A</text><text x="115" y="266" fill="#fff" font-family="Consolas,monospace" font-size="8" text-anchor="middle">COM</text><text x="152" y="266" fill="#fff" font-family="Consolas,monospace" font-size="8" text-anchor="middle">VΩmA</text><path d="M115 243c0 60 119 72 113-4" fill="none" stroke="#0c171b" stroke-width="4"/><path d="M152 243c0 48 118 36 112-28" fill="none" stroke="#d74c4c" stroke-width="4"/><rect x="219" y="173" width="50" height="61" rx="6" fill="#d7e9df"/><path d="M230 173v-5h8v5m11 0v-5h8v5" fill="#a8c2b6"/><text x="244" y="199" fill="#1c5443" font-family="Consolas,monospace" font-size="9" text-anchor="middle">FUENTE</text><text x="244" y="215" fill="#1c5443" font-family="Consolas,monospace" font-size="8" text-anchor="middle">DIDÁCTICA</text>${highlight ? `<circle cx="${highlight[0] - (position === 'source' ? 0 : 5)}" cy="${highlight[1]}" r="${highlight[2]}" fill="#89f5e715" stroke="#89f5e7" stroke-width="3" stroke-dasharray="6 4"/>` : ''}${welcome ? '<g transform="translate(180 14) rotate(7)"><rect width="87" height="151" rx="14" fill="#1e3435"/><rect x="5" y="6" width="77" height="139" rx="10" fill="#e7f5f1"/><path d="M21 55V42h14m29 13V42H50M21 79v13h14m29-13v13H50" stroke="#00685f" stroke-width="2" fill="none"/><rect x="15" y="62" width="57" height="15" rx="4" fill="#00685f"/><text x="43" y="72" font-size="6" fill="#fff" text-anchor="middle" font-family="Consolas">GUÍA CONTEXTUAL</text></g>' : ''}</svg>`;
}

async function api(path, method = 'GET', body) {
  const options = { method, credentials: 'same-origin', cache: 'no-store', headers: { 'X-LabAR-Client': 'web' } };
  if (body !== undefined) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
  let response;
  try { response = await fetch(`/api${path}`, options); } catch { throw new Error('No se pudo conectar con el servidor. Revisa que LabAR Seguro esté ejecutándose y vuelve a intentarlo.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || data.message || `La solicitud no se completó (${response.status}).`);
  $('#app-error').hidden = true;
  return data;
}
function showError(error) { const banner = $('#app-error'); banner.textContent = error.message || String(error); banner.hidden = false; toast(error.message || 'No fue posible completar la acción.', true); }
function toast(message, error = false) { clearTimeout(state.toastTimer); const node = $('#toast'); node.textContent = message; node.classList.toggle('toast-error', error); node.hidden = false; state.toastTimer = setTimeout(() => { node.hidden = true; }, 5500); }
function stopCamera() { state.camera?.stop(); state.camera = null; }
function applyPreferences(profile) { document.documentElement.classList.toggle('large-text', !!profile.largeText); document.documentElement.classList.toggle('high-contrast', !!profile.highContrast); document.documentElement.classList.toggle('reduced-motion', !!profile.reducedMotion); }
function attempt() { return state.data?.attempt; }
function safePage(requested) {
  const allowed = ['welcome', 'profile', 'dashboard', 'practice', 'prepare', 'scan', 'checklist', 'guide', 'pause', 'quiz', 'history', 'privacy'];
  let target = allowed.includes(requested) ? requested : 'dashboard';
  const current = attempt();
  if (['scan', 'checklist', 'guide', 'pause', 'quiz'].includes(target)) {
    if (!current || state.resumeRequired) return 'dashboard';
    if (target === 'quiz' && current.status === 'completed') return target;
    if (current.status === 'completed') return 'history';
    if (target === 'scan') return target;
    if (!current.equipmentConfirmed) return 'scan';
    if (target === 'checklist') return target;
    if (current.checklist.length !== state.data.practice.checklist.length) return 'checklist';
    if (target === 'quiz' && current.completedSteps < 5) return 'guide';
    if (['guide', 'quiz'].includes(target) && current.status === 'paused') return 'pause';
  }
  return target;
}
function go(page, replace = false) {
  const target = safePage(page);
  const method = replace ? 'replaceState' : 'pushState';
  if (location.hash !== `#${target}`) history[method]({ page: target }, '', `#${target}`);
  render(target);
}
async function refreshData() { state.data = await api('/bootstrap'); applyPreferences(state.data.profile); return state.data; }
function profileSwitch(name, title, description = '') { const checked = state.data.profile[name] ? ' checked' : ''; return `<label class="quick-row" for="pref-${name}"><span><strong>${title}</strong>${description ? `<small>${description}</small>` : ''}</span><span class="switch"><input type="checkbox" id="pref-${name}" name="${name}"${checked} aria-label="${title}"/></span></label>`; }

function welcomePage() {
  return `<section class="page welcome-page" data-page="welcome"><div class="welcome-hero"><div class="hero-copy"><span class="intro-chip">${icon('shield')}Práctica universitaria supervisada</span><div class="page-header"><h1 tabindex="-1">Aprende a reconocer los controles antes de medir</h1><p class="muted">Una guía visual que acerca la explicación a tu multímetro. Avanza a tu ritmo, comprende cada paso y consulta cuando lo necesites.</p></div><div class="badges"><span class="badge badge-primary">DT-830B</span><span class="badge">Voltaje DC</span><span class="badge badge-blue">Cámara / guía 2D</span></div></div><div class="hero-blueprint"><span class="badge badge-primary">${icon('cube')}Orientación contextual</span>${meter('', true)}</div></div><div class="card"><div class="card-heading"><h2>${icon('shield', 'card-icon')}Práctica supervisada obligatoria</h2></div><p class="small muted">Usa exclusivamente una fuente didáctica de baja tensión autorizada. La aplicación orienta el aprendizaje y no comprueba conexiones ni reemplaza al docente.</p><div class="button-stack">${button('welcome-configure', 'Configurar mi experiencia', 'configure', 'primary', false, 'arrow')}${button('welcome-standard', 'Continuar con guía estándar', 'standard', 'secondary')}</div></div><p class="welcome-footer">Sin registro obligatorio · Preferencias y progreso bajo tu control<br/><a href="#privacy">Conoce cómo se utilizan tus datos</a></p></section>`;
}
function profilePage() {
  const profile = state.data.profile;
  return `<section class="page" data-page="profile">${back(state.returnFromProfile)}${pageHeader('Experiencia personalizada', 'Configura tu guía', 'Elige el acompañamiento que te resulte más útil. Puedes modificarlo en cualquier momento.')}<form id="profile-form" class="button-stack"><div class="card"><div class="field"><label for="display-name">¿Cómo quieres que te llamemos?</label><input class="input" id="display-name" name="displayName" maxlength="60" value="${esc(profile.displayName)}" autocomplete="nickname" required/><p class="micro muted">Puedes usar un alias; no necesitamos tu nombre completo.</p></div></div><div class="card"><fieldset><legend>Tu experiencia con el multímetro</legend><div class="choice-grid"><label class="choice-card">${icon('bulb')}<input type="radio" name="experience" value="beginner"${profile.experience === 'beginner' ? ' checked' : ''}/><strong>Primera práctica</strong><small>Explicaciones completas y apoyo paso a paso.</small></label><label class="choice-card">${icon('meter')}<input type="radio" name="experience" value="returning"${profile.experience === 'returning' ? ' checked' : ''}/><strong>Ya he practicado</strong><small>El apoyo se ajustará también según tu progreso.</small></label></div></fieldset><fieldset><legend>¿Cómo prefieres las instrucciones?</legend><div class="choice-grid"><label class="choice-horizontal"><input type="radio" name="format" value="visual"${profile.format === 'visual' ? ' checked' : ''}/>Visual y esquemático</label><label class="choice-horizontal"><input type="radio" name="format" value="text"${profile.format === 'text' ? ' checked' : ''}/>Texto paso a paso</label></div></fieldset></div><div class="card"><h2>${icon('tune', 'card-icon')} Accesibilidad y presentación</h2><div>${profileSwitch('largeText', 'Texto ampliado', 'Aumenta el tamaño de lectura en toda la aplicación.')}${profileSwitch('highContrast', 'Alto contraste', 'Refuerza textos y límites de los componentes.')}${profileSwitch('reducedMotion', 'Reducir movimiento', 'Desactiva transiciones y animaciones.')}${profileSwitch('audio', 'Apoyo auditivo', 'Lee las instrucciones con la voz de tu navegador.')}${profileSwitch('personalization', 'Personalización activa', 'Adapta ayudas y recomendaciones según preferencias y resultados.')}</div><div class="preview${profile.largeText ? ' large-text' : ''}${profile.highContrast ? ' high-contrast' : ''}" id="profile-preview"><span class="eyebrow">Vista previa</span><strong>Ubica los puertos correctos</strong><p>Comprueba COM y VΩmA con el docente antes de continuar.</p></div></div>${notice('Privacidad y autonomía', 'Se guardan tu alias, preferencias, progreso y resultados para esta experiencia. La cámara se procesa en tu dispositivo; sus imágenes no se envían al servidor.', 'info')}<button type="submit" id="profile-save" class="button button-primary">Guardar y continuar ${icon('arrow')}</button>${button('profile-defaults', 'Restablecer valores en este formulario', 'profile-defaults', 'secondary')}<a class="text-button" href="#privacy">Gestionar mis datos y privacidad</a></form></section>`;
}
function dashboardPage() {
  const { profile, practice, history: sessions, recommendation } = state.data;
  const active = attempt() && attempt().status !== 'completed';
  const completed = active ? attempt().completedSteps : 0;
  const previous = sessions.filter(item => item.status === 'completed');
  const review = recommendation.reviewTopics?.length ? `<p><strong>Repaso sugerido:</strong> ${recommendation.reviewTopics.map(esc).join(', ')}.</p>` : '';
  return `<section class="page dashboard-page" data-page="dashboard"><div class="greeting"><div><h1 tabindex="-1">¡Hola, ${esc(profile.displayName)}! <span class="greeting-icon" aria-hidden="true">⚡</span></h1><p class="small muted">Tu espacio de aprendizaje · LAB-01</p></div><span class="badge badge-secondary">ELECTRÓNICA I</span></div><div class="recommendation"><span class="icon-box">${icon('bulb')}</span><div><span class="label">${profile.personalization ? 'Acompañamiento personalizado' : 'Guía estándar'}</span><p>${esc(recommendation.reason)}</p>${review}<a class="text-link" href="#profile">Modificar preferencias →</a></div></div><div class="dashboard-grid"><div class="dashboard-column"><section class="card card-accent"><div class="card-heading"><div><div class="badges"><span class="badge badge-primary">MÓDULO 01</span><span class="badge">Baja tensión</span></div><h2>Práctica 1: ${esc(practice.title)}</h2></div><span class="icon-box">${icon('meter')}</span></div><div class="equipment-strip">${meter()}<div><strong>Multímetro digital DT-830B</strong><small>Un equipo, una práctica supervisada</small><span class="badge">${icon('cube')}Marcador QR + alternativa 2D</span></div></div><div><div class="progress-copy"><span>${completed} de 5 pasos completados</span><span>${completed * 20}%</span></div><div class="progress-track" role="progressbar" aria-label="Progreso de la práctica actual" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${completed}"><span style="width:${completed * 20}%"></span></div></div><div class="sub-card"><span class="label">Condiciones del puesto</span><p>• Fuente didáctica autorizada<br/>• Supervisión docente requerida<br/>• ${esc(practice.duration)}</p></div>${active ? button('resume-attempt', 'Continuar práctica guardada', 'resume-attempt', 'primary', false, 'arrow') : button('start-practice', 'Preparar mi práctica', 'view-practice', 'primary', false, 'arrow')}${active ? '<p class="micro muted">Al retomar, confirmarás de nuevo el equipo y las condiciones preventivas.</p>' : ''}</section></div><div class="dashboard-column"><section class="card"><div class="card-heading"><h2>${icon('history', 'card-icon')}Tu progreso</h2><span class="badge badge-primary">EN ESTE DISPOSITIVO</span></div><div class="stats-grid"><div class="stat"><strong>${previous.length}</strong><small>Prácticas completadas</small></div><div class="stat"><strong>${previous[0]?.score ?? '—'}${previous[0]?.score != null ? '/3' : ''}</strong><small>Última evaluación</small></div><div class="stat"><strong>5</strong><small>Verificaciones</small></div></div><a href="#history" class="text-link">Ver historial y recomendaciones →</a></section><section class="card"><h2>${icon('tune', 'card-icon')}Configuración rápida</h2><a class="quick-row text-link" href="#profile"><span>Preferencias y accesibilidad</span><span aria-hidden="true">→</span></a><a class="quick-row text-link" href="#privacy"><span>Mis datos y privacidad</span><span aria-hidden="true">→</span></a>${button('dashboard-reset', 'Borrar progreso de prácticas', 'delete-progress', 'outline', false, 'delete')}</section></div></div>${notice('Protocolo obligatorio', 'Mantén la fuente en el estado indicado por el docente mientras prepara y revisa la práctica. Ante una discrepancia, detente y consulta.', 'error', 'warning')}</section>`;
}
function practicePage() {
  const practice = state.data.practice;
  return `<section class="page" data-page="practice">${back()}${pageHeader('Módulo 01 · Instrumentación básica', esc(practice.title), esc(practice.description))}<div class="card card-accent"><div class="badges"><span class="badge badge-primary">${esc(practice.model)}</span><span class="badge">Nivel inicial</span><span class="badge badge-blue">5 pasos guiados</span></div><div class="hero-blueprint">${meter('dial')}</div><div class="detail-grid"><div class="detail-stat"><small>Duración orientativa</small><strong>${esc(practice.duration)}</strong></div><div class="detail-stat"><small>Modalidad</small><strong>Cámara / 2D</strong></div><div class="detail-stat"><small>Acompañamiento</small><strong>Docente</strong></div></div></div><div class="card"><h2>¿Qué vas a aprender?</h2><ol class="numbered-list">${practice.steps.map((step, index) => `<li><span class="number">${index + 1}</span><div><strong>${esc(step.title)}</strong><p>${esc(step.instruction)}</p></div></li>`).join('')}</ol></div><div class="card"><h2>Materiales del puesto</h2><ul class="material-list"><li>Multímetro DT-830B y puntas revisadas.</li><li>Fuente didáctica DC de baja tensión autorizada.</li><li>Teléfono con navegador y marcador impreso, o guía 2D.</li><li>Protocolo institucional y acompañamiento docente.</li></ul></div>${notice('Límites de la práctica', 'La guía se limita al equipo indicado y a baja tensión DC autorizada. No utilices red eléctrica ni circuitos fuera del protocolo del laboratorio.', 'warning', 'warning')}${button('practice-prepare', 'Preparar práctica', 'prepare', 'primary', false, 'arrow')}</section>`;
}
function preparePage() {
  return `<section class="page" data-page="prepare">${back('practice', 'Detalle de la práctica')}${pageHeader('Antes de comenzar', 'Prepara tu espacio', 'Elige cómo seguir la guía. Ambas modalidades conservan las mismas verificaciones y objetivos.')}<div class="card"><ol class="numbered-list"><li><span class="number">1</span><div><strong>Prepara el marcador</strong><p>Coloca el QR de LabAR junto al multímetro, sobre una superficie plana.</p></div></li><li><span class="number">2</span><div><strong>Mejora la visibilidad</strong><p>Ilumina el puesto, evita reflejos y deja el marcador completo dentro de la cámara.</p></div></li><li><span class="number">3</span><div><strong>Apoya el teléfono</strong><p>Utiliza un soporte. Conserva las manos libres para seguir las indicaciones del docente.</p></div></li></ol><div class="marker-preview"><img src="/assets/marcador-labar.png" alt="Marcador QR de LabAR Seguro para DT-830B"/><div><strong>Marcador LAB-01</strong><p>El QR identifica la guía. La coincidencia del instrumento se confirma manualmente.</p><a class="text-link" href="/marcador.html" target="_blank" rel="noopener">Abrir marcador para imprimir ↗</a></div></div></div>${notice('Permiso de cámara', 'Solo solicitaremos video al pulsar Activar cámara. El procesamiento es local; no grabamos ni enviamos imágenes al servidor.', 'info', 'camera')}<div class="button-stack">${button('prepare-camera', 'Continuar con cámara y marcador', 'prepare-camera', 'primary', false, 'camera')}${button('prepare-2d', 'Usar guía 2D', 'prepare-2d', 'secondary', false, 'book')}</div><p class="micro muted">La cámara necesita un origen seguro (HTTPS o localhost). La guía 2D está disponible sin cámara.</p></section>`;
}
function cameraStage(guide = false) {
  return `<div class="camera-stage" id="camera-stage"><div class="camera-grid"></div><video id="camera-video" autoplay muted playsinline aria-label="Video local del puesto de laboratorio"></video><canvas id="camera-overlay" aria-label="Señal contextual anclada al marcador QR"></canvas><div class="camera-placeholder" id="camera-placeholder">${icon('camera')}<strong>${guide ? 'Enfoca el marcador para continuar' : 'Cámara preparada para activarse'}</strong><p>${guide ? 'La guía se pausará si se pierde la referencia del marcador.' : 'Activa la cámara o carga una imagen del marcador para identificar la guía.'}</p></div><div class="camera-hud"><span class="badge" id="camera-mode-label">${guide ? 'Guía con marcador QR' : 'Identificación del puesto'}</span></div><p class="camera-caption" id="camera-status" aria-live="polite">${state.markerDetected ? 'Marcador LAB-01 identificado' : 'Esperando el marcador de LabAR'}</p></div>`;
}
function scanPage() {
  const current = attempt();
  const manual = current.mode === '2d';
  const eligible = manual || state.markerDetected;
  return `<section class="page" data-page="scan">${back('prepare', 'Preparación del puesto')}${pageHeader('Identificación y confirmación', manual ? 'Confirma el equipo de tu guía' : 'Enfoca el marcador del puesto', 'Compara siempre el nombre y la distribución de controles del instrumento con la guía DT-830B.')}<div class="card">${manual ? `<div class="equipment-strip">${meter()}<div><strong>Multímetro digital DT-830B</strong><small>Guía 2D · Confirmación manual</small><span class="badge badge-primary">Voltaje DC · versión ${esc(state.data.practice.version || '1.0')}</span></div></div>` : cameraStage()}${manual ? '' : `<div class="scan-actions">${button('camera-start', 'Activar cámara', 'camera-start', 'primary', false, 'camera')}<label class="button button-secondary file-label">${icon('image')}<span>Cargar imagen del marcador</span><input id="marker-file" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Cargar imagen del marcador QR"/></label>${button('scan-use-2d', 'Continuar con confirmación manual en 2D', 'scan-2d', 'outline')}</div>`}<div class="notice notice-primary" id="marker-found"${state.markerDetected ? '' : ' hidden'}>${icon('check')}<div><strong>Guía del puesto LAB-01 identificada</strong><p id="marker-source">${state.markerSource === 'image' ? 'Reconocimiento desde una imagen. La práctica continuará con la guía 2D.' : 'El marcador coincide. Confirma ahora el modelo del instrumento.'}</p></div></div><div class="equipment-confirm"><h2>¿Coincide con tu equipo?</h2><p class="small muted">El marcador identifica contenido, no verifica conexiones ni condiciones eléctricas. Confirma el equipo con el docente.</p><div class="segmented-buttons">${button('confirm-yes', 'Sí, coincide', 'confirm-yes', 'outline', !eligible, 'check')}${button('confirm-no', 'No coincide', 'confirm-no', 'outline', !eligible, 'warning')}</div>${state.matching === false ? notice('Detente y consulta', 'Esta guía no debe usarse con un equipo diferente. Revisa el puesto y solicita apoyo del docente.', 'error', 'warning') : ''}${button('confirm-continue', 'Continuar a la lista preventiva', 'confirm-continue', 'primary', !current.equipmentConfirmed, 'arrow')}</div></div><p class="micro muted">La ilustración es orientativa: pueden existir variantes de puertos y controles. La revisión del modelo es responsabilidad de la persona y del docente.</p></section>`;
}
function checklistPage() {
  const checks = attempt().checklist;
  const total = state.data.practice.checklist.length;
  return `<section class="page" data-page="checklist">${back('scan', 'Confirmación del equipo')}${pageHeader('Verificación preventiva', 'Revisa antes de comenzar', 'Marca una condición solo después de comprobarla físicamente con el docente.')}<div class="card"><div class="check-summary" aria-live="polite"><strong id="check-count">${checks.length} de ${total} verificaciones</strong><span id="check-message">${checks.length === total ? 'Lista completa. Sigue la autorización docente.' : 'Completa todos los puntos para continuar.'}</span></div><fieldset class="checklist" id="safety-checklist"><legend class="sr-only">Condiciones previas de la práctica</legend>${state.data.practice.checklist.map(check => `<label class="check-item"><input type="checkbox" name="check" value="${esc(check.id)}"${checks.includes(check.id) ? ' checked' : ''}/><span>${esc(check.text)}</span></label>`).join('')}</fieldset>${notice('Supervisión obligatoria', 'Las casillas registran tu confirmación. No sustituyen la inspección del equipo ni la autorización del docente.', 'warning', 'warning')}${button('checklist-continue', 'Iniciar guía visual', 'checklist-continue', 'primary', checks.length !== total, 'arrow')}</div>${button('checklist-help', '¿Por qué es necesaria esta revisión?', 'help', 'outline')}</section>`;
}
function guidePage() {
  const current = attempt();
  const step = state.data.practice.steps[current.step];
  const detailed = state.data.recommendation.detail !== 'compact';
  const visual = state.data.profile.format === 'visual';
  return `<section class="page guide-page" data-page="guide"><div class="guide-top"><div><p class="eyebrow">LAB-01 · Guía ${current.mode === 'ar' ? 'con marcador' : '2D'}</p><h1 class="sr-only" tabindex="-1">${esc(step.title)}</h1><span class="small muted">Avanza con supervisión docente</span></div>${button('guide-stop', 'Detener', 'pause', 'danger', false, 'pause')}</div><div class="guide-workspace"><div class="guide-view">${current.mode === 'ar' ? cameraStage(true) : `<div class="guide-illustration"><span class="badge">${icon('book')}Guía 2D</span>${meter(visual ? step.position : '')}<span class="instrument-tag">${esc(step.label)}</span><span class="diagram-note">Representación orientativa · Lectura ilustrativa</span></div>`}</div><div class="guide-console"><p class="step-label" id="guide-counter"><span class="step-number">${current.step + 1}</span>PASO ${current.step + 1} DE 5 · GUÍA CONTEXTUAL</p><div class="progress-track" role="progressbar" aria-label="Pasos completados" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${current.completedSteps}"><span style="width:${current.completedSteps * 20}%"></span></div><div class="instruction-box"><span class="icon-box">${icon(step.position === 'ports' ? 'tune' : 'meter')}</span><div><h2 id="guide-title">${esc(step.title)}</h2><p id="guide-instruction">${esc(step.instruction)}</p></div></div><details class="why-box"${detailed ? ' open' : ''}><summary>¿POR QUÉ HACEMOS ESTO?</summary><p id="guide-why">${esc(step.why)}</p></details>${detailed ? `<div class="sub-card small">${icon('book', 'card-icon')}<strong>Glosario Lab:</strong> ${step.position === 'ports' ? 'COM es la referencia de medida del multímetro; no implica una conexión a tierra física. VΩmA identifica el puerto que debe revisarse para esta práctica.' : 'DCV indica voltaje continuo. La escala se selecciona según la fuente y el protocolo aprobado del laboratorio.'}</div>` : ''}<div class="button-row guide-nav">${button('guide-prev', 'Anterior', 'guide-prev', 'secondary', current.step === 0, 'back')}${button('guide-next', current.step === 4 ? 'Completar y evaluar' : 'Siguiente', 'guide-next', 'primary', current.mode === 'ar', 'arrow')}</div>${button('guide-audio', 'Escuchar instrucción', 'audio', 'outline', false, 'sound')}<div class="button-stack">${current.mode === 'ar' ? button('guide-mode-2d', 'Cambiar a guía 2D', 'guide-2d', 'secondary') : button('guide-mode-ar', 'Usar cámara y marcador', 'guide-ar', 'secondary')}${button('guide-report', 'Reportar una inconsistencia', 'report', 'outline', false, 'message')}</div></div></div><p class="guide-footer">La aplicación no determina si una conexión es segura. Detente y consulta ante cualquier diferencia con el equipo o el protocolo.</p></section>`;
}
function pausePage() {
  const markerLost = state.pauseReason === 'marker-lost';
  return `<section class="page pause-page" data-page="pause"><div class="pause-symbol">${icon(markerLost ? 'cube' : 'pause')}</div>${pageHeader('Guía pausada', markerLost ? 'Perdimos el marcador' : 'Tu práctica está en pausa', 'El progreso queda guardado. Detén las acciones sobre el circuito y sigue las indicaciones del docente.')}<div class="card">${notice('Mantén la práctica detenida', 'La guía no debe continuar con una referencia visual perdida ni ante una discrepancia. Puedes usar la alternativa 2D o volver a preparar el puesto.', 'error', 'warning')}<div class="button-stack">${button('pause-2d', 'Continuar el mismo paso en 2D', 'guide-2d', 'primary', false, 'book')}${button('pause-retry', 'Revisar el puesto y reintentar', 'resume-attempt', 'secondary', false, 'camera')}${button('pause-teacher', 'Cómo consultar al docente', 'teacher', 'outline', false, 'message')}</div><a class="text-button" href="#dashboard">Volver al inicio</a></div></section>`;
}
function quizPage() {
  const current = attempt();
  if (current.status === 'completed') {
    const result = current.result || { score: current.score, total: 3, feedback: [], reviewTopics: [] };
    return `<section class="page" data-page="quiz">${pageHeader('Evaluación formativa', 'Tu recorrido, paso a paso')}<div class="card"><div class="result-summary"><span class="result-symbol">${icon('check')}</span><span class="badge badge-primary">PRÁCTICA COMPLETADA</span><h2 id="result-title">${result.score === 3 ? '¡Buen trabajo!' : 'Cada intento es una oportunidad para aprender'}</h2><p class="result-score" id="result-score">${result.score} / ${result.total}</p><p class="small muted">${result.score === 3 ? 'Reconociste los conceptos evaluados. La práctica física debe ser revisada por tu docente.' : 'Revisa los conceptos señalados antes de realizar una nueva práctica.'}</p></div><div class="feedback-list">${(result.feedback || []).map((feedback, index) => `<div class="feedback-item${feedback.correct ? '' : ' incorrect'}">${icon(feedback.correct ? 'check' : 'warning')}<div><strong>Pregunta ${index + 1} · ${feedback.correct ? 'Correcta' : 'Para repasar'}</strong><p>${esc(feedback.explanation)}</p></div></div>`).join('')}</div>${result.reviewTopics?.length ? notice('Repaso recomendado', result.reviewTopics.map(esc).join(' · '), 'info', 'book') : ''}<div class="button-stack">${button('new-attempt', 'Realizar otra práctica', 'new-attempt', 'primary', false, 'arrow')}<a class="button button-secondary" href="#history">Ver mi progreso</a><a class="text-button" href="#dashboard">Volver al inicio</a></div></div><p class="micro muted">La evaluación es formativa. No certifica una competencia ni autoriza operar equipos sin supervisión.</p></section>`;
  }
  return `<section class="page" data-page="quiz">${pageHeader('Comprueba lo aprendido', 'Una última revisión', 'Responde las tres preguntas. El resultado se calcula en el servidor y permite recomendar un repaso específico.')}<div class="card"><form id="quiz-form" class="quiz-form" novalidate>${state.data.practice.quiz.map((question, index) => `<fieldset class="question"><legend>${index + 1}. ${esc(question.question)}</legend>${question.options.map(option => `<label class="choice-horizontal"><input type="radio" name="${esc(question.id)}" value="${esc(option.id)}"/>${esc(option.text)}</label>`).join('')}</fieldset>`).join('')}<p id="quiz-error" class="form-error" role="alert" hidden>Responde las tres preguntas antes de enviar.</p><button type="submit" id="quiz-submit" class="button button-primary">Enviar respuestas ${icon('arrow')}</button></form></div>${notice('Retroalimentación para aprender', 'El resultado no es una calificación institucional. Puedes repetir la práctica y revisar tus avances.', 'info', 'book')}</section>`;
}
function formatDate(value) { if (!value) return 'Fecha no disponible'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }); }
function historyPage() {
  const current = attempt();
  const sessions = current && current.status !== 'completed' ? [current, ...(state.data.history || [])] : (state.data.history || []);
  const completed = sessions.filter(item => item.status === 'completed');
  return `<section class="page" data-page="history">${pageHeader('Aprendizaje continuo', 'Tu progreso', 'Revisa las ejecuciones de esta práctica y los conceptos que conviene reforzar.')}<div class="stats-grid"><div class="stat"><strong>${completed.length}</strong><small>Completadas</small></div><div class="stat"><strong>${completed.length ? Math.max(...completed.map(item => item.score || 0)) : '—'}</strong><small>Mejor resultado / 3</small></div><div class="stat"><strong>${sessions.length}</strong><small>Ejecuciones</small></div></div><div class="history-list">${sessions.length ? sessions.map(item => `<article class="history-item"><div><strong>${item.status === 'completed' ? 'Práctica completada' : item.status === 'paused' ? 'Práctica en pausa' : 'Práctica en curso'}</strong><p>${esc(formatDate(item.completedAt || item.updatedAt || item.createdAt))}</p><p>${item.completedSteps || 0}/5 pasos · ${item.mode === 'ar' ? 'Cámara y marcador' : 'Guía 2D'}</p>${item.result?.reviewTopics?.length ? `<p>Repasar: ${item.result.reviewTopics.map(esc).join(', ')}</p>` : ''}</div><span class="history-score">${item.score != null ? `${item.score}/3` : 'En curso'}</span></article>`).join('') : `<div class="card empty-state">${icon('history')}<h2>Tu primera práctica te espera</h2><p>Aquí aparecerán tu progreso y los resultados cuando comiences.</p><a class="button button-primary" href="#practice">Conocer la práctica</a></div>`}</div><div class="button-stack"><a class="button button-secondary" href="#dashboard">Volver al inicio</a>${button('history-report', 'Reportar una inconsistencia', 'report', 'outline', false, 'message')}${button('delete-progress', 'Eliminar progreso de prácticas', 'delete-progress', 'outline', !sessions.length, 'delete')}</div><p class="micro muted">El historial está asociado a la sesión de este navegador. Usa Exportar mis datos para conservar una copia.</p></section>`;
}
function privacyPage() {
  const issues = state.data.issues || [];
  return `<section class="page" data-page="privacy">${back()}${pageHeader('Privacidad y autonomía', 'Tus datos, bajo tu control', 'La experiencia utiliza una sesión anónima de este navegador; puedes consultar, exportar o eliminar la información.')}<div class="card"><h2>¿Qué se guarda?</h2><ul class="material-list"><li>El alias y las preferencias que eliges.</li><li>Las ejecuciones de la práctica, pasos y verificaciones declaradas.</li><li>Respuestas y resultados de la evaluación formativa.</li><li>Los reportes de inconsistencias que envías.</li></ul>${notice('Procesamiento local de cámara', 'Los fotogramas se analizan en tu navegador para localizar el marcador. No se graban ni se transmiten al servidor.', 'primary', 'camera')}<p class="small muted">La información de progreso se conserva en la base de datos local del servidor y se vincula a una cookie de sesión de este navegador. Si borras la cookie, pierdes el acceso a esos datos desde el navegador. Evita usar datos identificables en un dispositivo compartido.</p></div><div class="card"><h2>Controles de datos</h2><div class="button-stack">${button('view-data', 'Ver mis datos', 'view-data', 'secondary', false, 'history')}${button('export-data', 'Exportar mis datos (JSON)', 'export-data', 'primary', false, 'download')}${button('privacy-delete-progress', 'Borrar solo progreso y reportes', 'delete-progress', 'outline', false, 'delete')}${button('delete-data', 'Eliminar todos mis datos', 'delete-data', 'danger', false, 'delete')}</div><p class="micro muted">Eliminar progreso conserva tus preferencias. Eliminar todos los datos también elimina el perfil y reinicia la sesión.</p></div><div class="card"><h2>Reportes enviados (${issues.length})</h2>${issues.length ? issues.map(issue => `<div class="sub-card"><p>${esc(issue.message)}</p><p class="micro muted">${esc(formatDate(issue.createdAt))} · Guardado en el proyecto</p></div>`).join('') : '<p class="small muted">Aún no has enviado reportes. Puedes hacerlo desde la guía o el historial.</p>'}</div><a class="text-button" href="#profile">Cambiar o desactivar la personalización</a></section>`;
}

const views = { welcome: welcomePage, profile: profilePage, dashboard: dashboardPage, practice: practicePage, prepare: preparePage, scan: scanPage, checklist: checklistPage, guide: guidePage, pause: pausePage, quiz: quizPage, history: historyPage, privacy: privacyPage };
function render(requested) {
  if (!state.data) return;
  const target = safePage(requested);
  stopCamera();
  if (globalThis.speechSynthesis) speechSynthesis.cancel();
  state.page = target;
  if (location.hash !== `#${target}`) history.replaceState({ page: target }, '', `#${target}`);
  app.innerHTML = views[target]();
  if (target === 'history') $('[data-page="history"]', app).insertAdjacentHTML('beforeend', '<a href="#privacy" class="text-button" data-route="privacy">Mis datos y privacidad →</a>');
  document.querySelectorAll('a[href^="#"]').forEach(link => { link.dataset.route = link.getAttribute('href').slice(1); });
  app.setAttribute('aria-busy', 'false');
  applyPreferences(state.data.profile);
  $('#bottom-nav').hidden = target === 'welcome';
  document.querySelectorAll('[data-nav]').forEach(link => {
    const match = link.dataset.nav === target || (link.dataset.nav === 'practice' && ['prepare', 'scan', 'checklist'].includes(target)) || (link.dataset.nav === 'guide' && ['pause', 'quiz'].includes(target));
    if (match) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.title = `${({ welcome: 'Bienvenida', profile: 'Preferencias', dashboard: 'Inicio', practice: 'Práctica', prepare: 'Preparación', scan: 'Confirmación', checklist: 'Lista preventiva', guide: 'Guía visual', pause: 'Práctica pausada', quiz: 'Evaluación', history: 'Progreso', privacy: 'Privacidad' })[target]} · LabAR Seguro`;
  window.scrollTo({ top: 0, behavior: 'auto' });
  const heading = $('h1', app); if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  if (target === 'guide') {
    state.markerDetected = false;
    if (attempt().mode === 'ar') startCamera(true).catch(showError);
    if (state.data.profile.audio) speakInstruction();
  }
}

async function ensureAttempt(mode) {
  let current = attempt();
  if (!current || current.status === 'completed') current = await api('/attempts', 'POST', { mode });
  else {
    if (current.status !== 'preparing' || state.resumeRequired) current = await api(`/attempts/${current.id}/resume`, 'POST', {});
    if (current.mode !== mode) current = await api(`/attempts/${current.id}/mode`, 'POST', { mode });
  }
  state.data.attempt = current;
  state.resumeRequired = false;
  state.matching = current.equipmentConfirmed ? true : null;
  state.markerDetected = false;
  state.markerSource = '';
  return current;
}
async function updateAttempt(action, body) { state.data.attempt = await api(`/attempts/${attempt().id}/${action}`, 'POST', body); return attempt(); }
function updateMarkerUI(result, source) {
  const correct = result?.data === MARKER;
  if (!correct) {
    const status = $('#camera-status'); if (status) status.textContent = 'Ese QR no corresponde a LabAR Seguro. Usa el marcador del DT-830B.';
    return false;
  }
  state.markerDetected = true;
  state.markerSource = source;
  $('#camera-placeholder')?.setAttribute('hidden', '');
  const status = $('#camera-status'); if (status) status.textContent = source === 'image' ? 'QR identificado desde una imagen · modalidad 2D' : 'Marcador LAB-01 localizado · guía contextual activa';
  const found = $('#marker-found'); if (found) found.hidden = false;
  const sourceText = $('#marker-source'); if (sourceText) sourceText.textContent = source === 'image' ? 'Reconocimiento desde una imagen. La práctica continuará en guía 2D.' : 'El marcador coincide. Confirma ahora el modelo del instrumento.';
  ['confirm-yes', 'confirm-no', 'guide-next'].forEach(id => { const control = $(`#${id}`); if (control) control.disabled = false; });
  return true;
}
async function startCamera(guide = false) {
  stopCamera();
  const video = $('#camera-video'); const canvas = $('#camera-overlay');
  if (!video || !canvas) return;
  const camera = new MarkerCamera({ video, canvas,
    onDetect: result => { if (state.camera !== camera) return; updateMarkerUI(result, 'camera'); },
    onLost: () => { if (state.camera !== camera) return; state.markerDetected = false; const next = $('#guide-next'); if (next) next.disabled = true; if (state.page === 'guide') pausePractice('marker-lost').catch(showError); else { const status = $('#camera-status'); if (status) status.textContent = 'Marcador perdido. Vuelve a enfocarlo antes de confirmar.'; if (!attempt()?.equipmentConfirmed) ['confirm-yes', 'confirm-no'].forEach(id => { const control = $(`#${id}`); if (control) control.disabled = true; }); } },
    onError: error => { if (state.camera !== camera) return; showError(error); if (state.page === 'guide') pausePractice('camera-error').catch(showError); },
  });
  state.camera = camera;
  camera.setLabel(guide ? state.data.practice.steps[attempt().step].label : 'LAB-01 · Guía DT-830B');
  const control = $('#camera-start'); if (control) control.disabled = true;
  const status = $('#camera-status'); if (status) status.textContent = 'Solicitando permiso de cámara…';
  try {
    await camera.start();
    if (state.camera !== camera) return;
    $('#camera-placeholder')?.setAttribute('hidden', '');
    if (status && !state.markerDetected) status.textContent = 'Cámara activa. Enfoca el marcador completo.';
    if (control) { control.disabled = false; control.querySelector('span').textContent = 'Reiniciar cámara'; }
  } catch (error) {
    if (control) control.disabled = false;
    if (status) status.textContent = error.message;
    if (guide) { state.pauseReason = 'camera-error'; await updateAttempt('pause', { reason: 'camera-error' }); go('pause'); }
    throw error;
  }
}
async function pausePractice(reason = 'user') {
  if (!attempt() || attempt().status === 'completed' || attempt().status === 'paused') return;
  stopCamera();
  state.pauseReason = reason;
  await updateAttempt('pause', { reason });
  go('pause');
}
function speakInstruction() {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) { toast('Tu navegador no ofrece lectura de voz. Las instrucciones completas están disponibles en texto.'); return; }
  const step = state.data.practice.steps[attempt().step];
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(`${step.title}. ${step.instruction}. ${step.why}`); utterance.lang = 'es-CO'; utterance.rate = .95; speechSynthesis.speak(utterance);
}
function openDetail(title, body) { $('#detail-title').textContent = title; $('#detail-body').innerHTML = body; $('#detail-dialog').showModal(); }
function help() { openDetail('Ayuda del laboratorio', `<ul class="help-list"><li><strong>Práctica:</strong> usa el equipo DT-830B indicado, una fuente didáctica de baja tensión y supervisión docente.</li><li><strong>Marcador:</strong> el QR vincula el puesto con la guía. No reconoce las conexiones ni certifica seguridad.</li><li><strong>Guía 2D:</strong> ofrece el mismo contenido sin necesitar cámara.</li><li><strong>Retomar:</strong> se conserva el paso, pero vuelves a confirmar el equipo y la lista preventiva.</li><li><strong>COM:</strong> es la referencia de medida; no significa necesariamente tierra física.</li><li><strong>DCV:</strong> indica la función de voltaje continuo. La escala depende de la fuente y el protocolo.</li><li><strong>Datos:</strong> tu alias, preferencias y progreso se guardan para esta sesión. Puedes exportarlos o borrarlos en Privacidad.</li></ul><p class="small muted">Ante una diferencia en los puertos, la escala, el instrumento o el procedimiento, detén la práctica y llama al docente.</p>`); }
function confirmAction(title, description, action) { $('#confirm-title').textContent = title; $('#confirm-description').textContent = description; const dialog = $('#confirm-dialog'); dialog.returnValue = 'cancel'; const listener = async () => { dialog.removeEventListener('close', listener); if (dialog.returnValue === 'confirm') { try { await action(); } catch (error) { showError(error); } } }; dialog.addEventListener('close', listener); dialog.showModal(); }
function report() { openDetail('Reportar una inconsistencia', `<form id="issue-form" class="button-stack"><p class="small muted">Describe una diferencia del contenido o un problema de la aplicación. Evita incluir datos personales. El reporte se guarda en este proyecto; no envía un mensaje al docente.</p><div class="field"><label for="issue-message">Descripción (10–1000 caracteres)</label><textarea class="input" id="issue-message" name="message" minlength="10" maxlength="1000" required placeholder="Por ejemplo: el texto del paso no coincide con…"></textarea></div><button type="submit" class="button button-primary" id="issue-submit">Guardar reporte ${icon('message')}</button></form>`); }

async function runAction(action) {
  if (action === 'configure') { state.returnFromProfile = 'welcome'; go('profile'); }
  else if (action === 'standard') { await api('/profile', 'PUT', { personalization: false }); await refreshData(); go('dashboard'); }
  else if (action === 'view-practice') go('practice');
  else if (action === 'prepare') go('prepare');
  else if (action === 'prepare-camera' || action === 'prepare-2d') { await ensureAttempt(action === 'prepare-camera' ? 'ar' : '2d'); go('scan'); }
  else if (action === 'camera-start') await startCamera();
  else if (action === 'scan-2d') { stopCamera(); await updateAttempt('mode', { mode: '2d' }); state.markerDetected = false; state.matching = null; go('scan'); }
  else if (action === 'confirm-yes' || action === 'confirm-no') {
    if (attempt().mode === 'ar' && !state.markerDetected) throw new Error('Identifica primero el marcador o elige la guía 2D.');
    const matches = action === 'confirm-yes'; await updateAttempt('confirm', { matches, model: 'DT-830B' }); state.matching = matches; render('scan');
  }
  else if (action === 'confirm-continue') go('checklist');
  else if (action === 'checklist-continue') {
    const checks = [...document.querySelectorAll('input[name="check"]:checked')].map(input => input.value);
    if (checks.length !== state.data.practice.checklist.length) throw new Error('Completa las cinco verificaciones antes de continuar.');
    await updateAttempt('checklist', { checks }); go('guide');
  }
  else if (action === 'guide-next') {
    if (attempt().mode === 'ar' && !state.markerDetected) throw new Error('Enfoca el marcador o cambia a la guía 2D.');
    await updateAttempt('progress', { step: attempt().step, complete: true });
    if (attempt().completedSteps === 5) go('quiz'); else render('guide');
  }
  else if (action === 'guide-prev') { await updateAttempt('progress', { step: Math.max(0, attempt().step - 1), complete: false }); render('guide'); }
  else if (action === 'pause') await pausePractice();
  else if (action === 'guide-2d') { stopCamera(); await updateAttempt('mode', { mode: '2d' }); go('guide'); }
  else if (action === 'guide-ar') { await updateAttempt('mode', { mode: 'ar' }); render('guide'); }
  else if (action === 'resume-attempt') { await updateAttempt('resume', {}); state.resumeRequired = false; state.markerDetected = false; state.matching = null; go('prepare'); }
  else if (action === 'new-attempt') go('practice');
  else if (action === 'audio') speakInstruction();
  else if (action === 'help') help();
  else if (action === 'teacher') openDetail('Consulta al docente', '<p>Detén la práctica y solicita al docente o monitor que revise el puesto, el equipo y la guía antes de continuar.</p><p class="small muted">Esta aplicación no contacta automáticamente a una persona. Sigue el mecanismo de asistencia definido por tu laboratorio.</p>');
  else if (action === 'report') report();
  else if (action === 'view-data') { const data = await api('/export'); openDetail('Mis datos guardados', `<pre class="privacy-data">${esc(JSON.stringify(data, null, 2))}</pre>`); }
  else if (action === 'export-data') {
    const data = await api('/export'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'labar-seguro-mis-datos.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Se descargó una copia de tus datos.');
  }
  else if (action === 'delete-progress') confirmAction('¿Eliminar tu progreso?', 'Se borrarán las ejecuciones, evaluaciones y reportes. Tus preferencias se conservarán. Esta acción no se puede deshacer.', async () => { stopCamera(); await api('/progress', 'DELETE', {}); state.resumeRequired = false; await refreshData(); go('dashboard'); toast('Se eliminó el progreso. Tus preferencias se conservaron.'); });
  else if (action === 'delete-data') confirmAction('¿Eliminar todos tus datos?', 'Se eliminarán el perfil, las preferencias, el progreso y los reportes de esta sesión. Esta acción no se puede deshacer.', async () => { stopCamera(); await api('/data', 'DELETE', {}); state.resumeRequired = false; await refreshData(); go('welcome'); toast('Tus datos se eliminaron y se inició una sesión nueva.'); });
  else if (action === 'profile-defaults') {
    const form = $('#profile-form');
    Object.entries(defaults).forEach(([name, value]) => { const controls = [...form.querySelectorAll(`[name="${name}"]`)]; controls.forEach(control => { if (control.type === 'checkbox') control.checked = value; else if (control.type === 'radio') control.checked = control.value === value; else control.value = value; }); });
    updateProfilePreview(); toast('Valores restaurados en el formulario. Pulsa Guardar para aplicarlos.');
  }
}
function updateProfilePreview() { const form = $('#profile-form'); if (!form) return; const preview = $('#profile-preview'); preview.classList.toggle('large-text', form.elements.largeText.checked); preview.classList.toggle('high-contrast', form.elements.highContrast.checked); }

app.addEventListener('click', async event => {
  const control = event.target.closest('[data-action]'); if (!control || control.disabled || state.busy) return;
  state.busy = true; control.disabled = true; control.setAttribute('aria-busy', 'true');
  try { await runAction(control.dataset.action); } catch (error) { showError(error); }
  finally { state.busy = false; if (control.isConnected) { control.disabled = false; control.removeAttribute('aria-busy'); } }
});
app.addEventListener('change', async event => {
  if (event.target.matches('#profile-form input')) updateProfilePreview();
  if (event.target.matches('input[name="check"]')) {
    const count = document.querySelectorAll('input[name="check"]:checked').length;
    $('#check-count').textContent = `${count} de ${state.data.practice.checklist.length} verificaciones`;
    $('#check-message').textContent = count === 5 ? 'Lista completa. Sigue la autorización docente.' : 'Completa todos los puntos para continuar.';
    $('#checklist-continue').disabled = count !== state.data.practice.checklist.length;
  }
  if (event.target.matches('#marker-file') && event.target.files?.[0]) {
    const file = event.target.files[0]; const input = event.target; input.disabled = true;
    try {
      stopCamera();
      const reader = new MarkerCamera({ video: $('#camera-video'), canvas: $('#camera-overlay') });
      const result = await reader.detectImage(file);
      if (!result) throw new Error('No encontramos un QR legible en esa imagen. Usa el marcador del proyecto con buena iluminación.');
      if (result.data !== MARKER) throw new Error('Ese QR no corresponde al marcador de LabAR Seguro.');
      await updateAttempt('mode', { mode: '2d' });
      updateMarkerUI(result, 'image');
      state.markerSource = 'image';
      toast('Marcador reconocido desde la imagen. Confirma el DT-830B y continúa en 2D.');
    } catch (error) { showError(error); }
    finally { input.disabled = false; input.value = ''; }
  }
});
app.addEventListener('input', event => { if (event.target.closest('#profile-form')) updateProfilePreview(); });
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!['profile-form', 'quiz-form', 'issue-form'].includes(form.id)) return;
  event.preventDefault(); if (state.busy) return;
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const control = form.querySelector('[type="submit"]');
  state.busy = true; control.disabled = true;
  try {
    if (form.id === 'profile-form') {
      const data = new FormData(form); const profile = { displayName: data.get('displayName').trim(), experience: data.get('experience'), format: data.get('format') };
      ['largeText', 'highContrast', 'reducedMotion', 'audio', 'personalization'].forEach(key => { profile[key] = form.elements[key].checked; });
      await api('/profile', 'PUT', profile); await refreshData(); go('dashboard'); toast('Preferencias guardadas.');
    } else if (form.id === 'quiz-form') {
      const data = new FormData(form); const answers = {};
      state.data.practice.quiz.forEach(question => { answers[question.id] = data.get(question.id); });
      if (Object.values(answers).some(answer => answer === null)) { $('#quiz-error').hidden = false; return; }
      const completedAttempt = await updateAttempt('quiz', { answers });
      await refreshData();
      state.data.attempt = completedAttempt;
      go('quiz');
    } else {
      const message = form.elements.message.value.trim();
      if (message.length < 10) throw new Error('Describe el problema en al menos diez caracteres.');
      const payload = { message };
      if (attempt()) { payload.attemptId = attempt().id; payload.step = attempt().step; }
      await api('/issues', 'POST', payload); $('#detail-dialog').close(); await refreshData(); toast('Reporte guardado. Puedes consultarlo en Privacidad.');
    }
  } catch (error) { showError(error); }
  finally { state.busy = false; if (control.isConnected) control.disabled = false; }
});
$('#header-preferences').addEventListener('click', () => { if (!state.data) return; state.returnFromProfile = state.page === 'welcome' ? 'welcome' : 'dashboard'; go('profile'); });
$('.skip-link').addEventListener('click', event => { event.preventDefault(); $('#main-content').focus(); });
$('#header-help').addEventListener('click', help);
$('#detail-close').addEventListener('click', () => $('#detail-dialog').close());
window.addEventListener('popstate', () => { if (state.data) render(location.hash.slice(1)); });
window.addEventListener('hashchange', () => { if (state.data && location.hash.slice(1) !== state.page) render(location.hash.slice(1)); });
window.addEventListener('pagehide', () => { stopCamera(); if (globalThis.speechSynthesis) speechSynthesis.cancel(); });

async function initialize() {
  try {
    await refreshData();
    state.resumeRequired = Boolean(attempt() && attempt().status !== 'completed');
    const requested = location.hash.slice(1) || (state.data.history.length || state.data.profile.displayName !== 'Estudiante' ? 'dashboard' : 'welcome');
    go(requested, true);
  } catch (error) {
    app.innerHTML = `<section class="page" data-page="connection-error">${pageHeader('Conexión con el proyecto', 'No pudimos abrir el laboratorio', esc(error.message))}<div class="card"><p>Comprueba que el servidor está activo y abre la aplicación desde su dirección local.</p><button id="retry-connection" class="button button-primary">Volver a intentar</button></div></section>`;
    $('#retry-connection').addEventListener('click', initialize);
    app.setAttribute('aria-busy', 'false');
  }
}
initialize();
