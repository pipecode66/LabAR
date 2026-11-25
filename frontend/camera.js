/** Camera + local QR tracking. Pixels never leave this browser. */
export const MARKER_VALUE = 'LABAR:DT830B:V1';

export class MarkerCamera {
  constructor({ video, canvas, onDetect = () => {}, onLost = () => {}, onError = () => {}, onFrame = () => {} }) {
    this.video = video;
    this.canvas = canvas;
    this.onDetect = onDetect;
    this.onLost = onLost;
    this.onError = onError;
    this.onFrame = onFrame;
    this.processing = document.createElement('canvas');
    this.context = this.processing.getContext('2d', { willReadFrequently: true });
    this.stream = null;
    this.timer = null;
    this.running = false;
    this.generation = 0;
    this.lastSeen = 0;
    this.hadMarker = false;
    this.lostNotified = false;
    this.label = 'Marcador DT-830B';
    this.visibilityHandler = () => {
      if (document.hidden && this.running) {
        this.stop();
        this.onLost();
      }
    };
  }

  setLabel(text) { this.label = String(text).slice(0, 100); }

  async start() {
    this.stop();
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('La cámara requiere HTTPS o localhost. Puedes continuar en modo 2D.');
    }
    if (typeof globalThis.jsQR !== 'function') throw new Error('No se pudo cargar el lector de marcadores. Recarga o usa la guía 2D.');
    const generation = ++this.generation;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this.stream = stream;
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.srcObject = stream;
      await this.video.play();
      if (generation !== this.generation) return;
      this.running = true;
      this.hadMarker = false;
      this.lostNotified = false;
      this.lastSeen = 0;
      document.addEventListener('visibilitychange', this.visibilityHandler);
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (this.running) {
          this.stop();
          this.onError(new Error('La cámara se desconectó. Puedes reintentar o usar la guía 2D.'));
        }
      }, { once: true });
      this.tick(generation);
    } catch (error) {
      this.stop();
      const messages = {
        NotAllowedError: 'Permiso de cámara denegado. Habilítalo en el navegador o continúa en 2D.',
        NotFoundError: 'No se encontró una cámara. Puedes usar la guía 2D o cargar una imagen del marcador.',
        NotReadableError: 'La cámara está ocupada o no puede abrirse. Cierra otras aplicaciones o usa 2D.',
        OverconstrainedError: 'La cámara no admite esta configuración. Puedes continuar con la guía 2D.',
      };
      throw new Error(messages[error.name] || error.message || 'No fue posible abrir la cámara.');
    }
  }

  tick(generation) {
    if (!this.running || generation !== this.generation) return;
    try {
      if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
        const width = Math.min(640, this.video.videoWidth);
        const height = Math.round(width * this.video.videoHeight / this.video.videoWidth);
        this.processing.width = width;
        this.processing.height = height;
        this.context.drawImage(this.video, 0, 0, width, height);
        const image = this.context.getImageData(0, 0, width, height);
        const result = globalThis.jsQR(image.data, width, height, { inversionAttempts: 'dontInvert' });
        const valid = result?.data === MARKER_VALUE;
        this.paint(valid ? result : null, width, height);
        if (result) {
          this.onDetect({ data: result.data, location: result.location, width, height });
        }
        if (valid) {
          this.hadMarker = true;
          this.lastSeen = performance.now();
          this.lostNotified = false;
        } else if (this.hadMarker && !this.lostNotified && performance.now() - this.lastSeen > 1500) {
          this.lostNotified = true;
          this.onLost();
        }
        this.onFrame({ detected: valid, width, height });
      }
    } catch (error) {
      this.stop();
      this.onError(new Error('No se pudo procesar el marcador. Usa la alternativa 2D.'));
      return;
    }
    this.timer = setTimeout(() => this.tick(generation), 180);
  }

  paint(result, width, height) {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    if (!result) return;
    const loc = result.location;
    const corners = [loc.topLeftCorner, loc.topRightCorner, loc.bottomRightCorner, loc.bottomLeftCorner];
    ctx.strokeStyle = '#89f5e7';
    ctx.lineWidth = 4;
    ctx.fillStyle = 'rgba(0,104,95,.16)';
    ctx.beginPath();
    corners.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const center = corners.reduce((acc, point) => ({ x: acc.x + point.x / 4, y: acc.y + point.y / 4 }), { x: 0, y: 0 });
    ctx.font = 'bold 15px system-ui';
    const text = this.label;
    const boxWidth = Math.min(width - 16, ctx.measureText(text).width + 24);
    const x = Math.max(8, Math.min(width - boxWidth - 8, center.x - boxWidth / 2));
    const y = Math.max(8, Math.min(height - 42, loc.bottomLeftCorner.y + 12));
    ctx.fillStyle = '#00685f';
    ctx.fillRect(x, y, boxWidth, 34);
    ctx.fillStyle = 'white';
    ctx.fillText(text, x + 12, y + 23, boxWidth - 24);
  }

  async detectImage(file) {
    if (!file || !file.type?.startsWith('image/')) throw new Error('Selecciona una imagen PNG, JPG o WebP del marcador.');
    if (file.size > 10 * 1024 * 1024) throw new Error('La imagen debe ocupar menos de 10 MB.');
    if (typeof globalThis.jsQR !== 'function') throw new Error('El lector QR no está disponible. Recarga la página.');
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const factor = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * factor));
      const height = Math.max(1, Math.round(bitmap.height * factor));
      const buffer = document.createElement('canvas');
      buffer.width = width;
      buffer.height = height;
      const ctx = buffer.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0, width, height);
      const frame = ctx.getImageData(0, 0, width, height);
      const result = globalThis.jsQR(frame.data, width, height, { inversionAttempts: 'attemptBoth' });
      return result ? { data: result.data, location: result.location, width, height } : null;
    } catch (error) {
      throw new Error(error.message || 'La imagen no se pudo leer. Prueba otra imagen del marcador.');
    } finally {
      bitmap?.close();
    }
  }

  stop() {
    this.running = false;
    this.generation++;
    clearTimeout(this.timer);
    this.timer = null;
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    if (this.canvas) this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
