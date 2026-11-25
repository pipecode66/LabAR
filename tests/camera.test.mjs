import test from 'node:test';
import assert from 'node:assert/strict';
import { MarkerCamera, MARKER_VALUE } from '../frontend/camera.js';

function fakeEnvironment() {
  const context = { clearRect() {}, drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(16) }),
    beginPath() {}, lineTo() {}, moveTo() {}, closePath() {}, fill() {}, stroke() {}, fillRect() {}, fillText() {}, measureText: () => ({ width: 100 }) };
  const canvas = { width: 100, height: 100, getContext: () => context };
  const events = new Map();
  globalThis.document = { hidden: false, createElement: () => ({ ...canvas }),
    addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) };
  Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true, writable: true });
  const track = { stopped: false, stop() { this.stopped = true; }, addEventListener() {} };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => stream } } });
  const video = { srcObject: null, readyState: 0, videoWidth: 640, videoHeight: 480, play: async () => {} };
  globalThis.jsQR = () => null;
  return { context, canvas, events, track, stream, video };
}

test('la cámara rechaza un origen no seguro con alternativa 2D', async () => {
  const env = fakeEnvironment();
  globalThis.isSecureContext = false;
  const camera = new MarkerCamera(env);
  await assert.rejects(camera.start(), /HTTPS o localhost/);
  assert.equal(camera.running, false);
});

test('permiso denegado se convierte en un mensaje útil y no deja stream', async () => {
  const env = fakeEnvironment();
  navigator.mediaDevices.getUserMedia = async () => { const e = new Error(); e.name = 'NotAllowedError'; throw e; };
  const camera = new MarkerCamera(env);
  await assert.rejects(camera.start(), /Permiso de cámara denegado/);
  assert.equal(camera.stream, null);
});

test('detener libera todos los tracks y retira listeners', async () => {
  const env = fakeEnvironment();
  const camera = new MarkerCamera(env);
  await camera.start();
  assert.equal(camera.running, true);
  camera.stop();
  assert.equal(env.track.stopped, true);
  assert.equal(env.video.srcObject, null);
  assert.equal(camera.timer, null);
  assert.equal(env.events.size, 0);
});

test('una cámara concedida después de cancelar libera su stream tardío', async () => {
  const env = fakeEnvironment();
  let release;
  navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { release = resolve; });
  const camera = new MarkerCamera(env);
  const pending = camera.start();
  camera.stop();
  release(env.stream);
  await pending;
  assert.equal(env.track.stopped, true);
  assert.equal(camera.running, false);
});

test('ocultar pestaña libera cámara y notifica pérdida', async () => {
  const env = fakeEnvironment();
  let lost = 0;
  const camera = new MarkerCamera({ ...env, onLost: () => lost++ });
  await camera.start();
  document.hidden = true;
  env.events.get('visibilitychange')();
  assert.equal(lost, 1);
  assert.equal(camera.running, false);
  assert.equal(env.track.stopped, true);
});

test('rechaza archivos inválidos y mayores de 10MB antes de procesar', async () => {
  const camera = new MarkerCamera(fakeEnvironment());
  await assert.rejects(camera.detectImage({ type: 'text/html', size: 1 }), /imagen PNG/);
  await assert.rejects(camera.detectImage({ type: 'image/png', size: 11 * 1024 * 1024 }), /10 MB/);
});

test('la pérdida real del marcador invoca una sola pausa por evento', async () => {
  const env = fakeEnvironment();
  env.video.readyState = 2;
  let lost = 0;
  const camera = new MarkerCamera({ ...env, onLost: () => lost++ });
  camera.running = true;
  camera.hadMarker = true;
  camera.lastSeen = performance.now() - 2000;
  camera.tick(camera.generation);
  clearTimeout(camera.timer);
  camera.tick(camera.generation);
  camera.stop();
  assert.equal(lost, 1);
  assert.equal(MARKER_VALUE, 'LABAR:DT830B:V1');
});
