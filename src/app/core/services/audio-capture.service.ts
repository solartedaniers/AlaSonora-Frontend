import { Injectable, NgZone, signal } from '@angular/core';
import { AudioProcessingResponse, AudioWorkerOutboundMessage } from '../../workers/messages';
import { FrameHistory } from './frame-history';

// Espectros que guardo de la grabación: alcanza para la vista más ancha (plana, 120 columnas).
const HISTORY_FRAMES = 240;

/** El navegador no soporta Web Workers o no pudo crear el de audio: sin él no hay espectro ni WAV. */
export class AudioWorkerUnavailableError extends Error {
  constructor() {
    super('The audio processing worker is unavailable');
  }
}

export interface SpectrogramFrame {
  magnitudes: Float32Array;
  peakFrequencyHz: number;
  rmsDb: number;
}

/**
 * Capturo el micrófono y paso cada buffer al worker (una task por mensaje), que calcula la FFT; aquí solo actualizo latestFrame.
 * stop() resuelve en una microtask y el pintado va en el requestAnimationFrame de SpectrogramViewComponent, así la UI no se congela.
 */
@Injectable({ providedIn: 'root' })
export class AudioCaptureService {
  // Cutoff bajo el rango típico de canto de aves (2-8 kHz); filtra rumble de
  // viento/tráfico sin recortar la señal de interés.
  private static readonly HIGH_PASS_CUTOFF_HZ = 300;

  readonly isRecording = signal(false);
  readonly latestFrame = signal<SpectrogramFrame | null>(null);
  readonly elapsedSeconds = signal(0);
  // Arranco en 0 dB: con +12 dB se recortaba ~67% de las muestras con un nivel de micrófono normal.
  readonly gainDb = signal(0);
  readonly highPassEnabled = signal(true);
  /** Espectros de la grabación actual; lo comparten la vista plana y la 3D. */
  readonly history = new FrameHistory(HISTORY_FRAMES);

  private worker?: Worker;
  private audioContext?: AudioContext;
  private mediaStream?: MediaStream;
  private gainNode?: GainNode;
  private filterNode?: BiquadFilterNode;
  private limiterNode?: DynamicsCompressorNode;
  private processorNode?: ScriptProcessorNode;
  private chunkCounter = 0;
  private startedAt = 0;
  private elapsedIntervalId?: ReturnType<typeof setInterval>;

  constructor(private readonly zone: NgZone) {}

  /** Web Audio y micrófono disponibles. Se consulta antes de crear cualquier AudioContext. */
  static isSupported(): boolean {
    return typeof AudioContext !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
  }

  /** Aplicado de inmediato al GainNode en vivo si hay una grabación en curso. */
  setGainDb(db: number): void {
    this.gainDb.set(db);
    if (this.gainNode) this.gainNode.gain.value = AudioCaptureService.dbToLinear(db);
  }

  /** Aplicado de inmediato al BiquadFilterNode en vivo si hay una grabación en curso. */
  setHighPassEnabled(enabled: boolean): void {
    this.highPassEnabled.set(enabled);
    if (this.filterNode) {
      this.filterNode.frequency.value = enabled ? AudioCaptureService.HIGH_PASS_CUTOFF_HZ : 0;
    }
  }

  async start(): Promise<void> {
    if (this.isRecording()) return;

    // Creo el worker antes de pedir el micrófono: si falla, no dejo el micrófono abierto.
    const worker = AudioCaptureService.createWorker();
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      worker.terminate();
      throw error;
    }
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Corro el audio fuera de Angular para no disparar detección de cambios en cada buffer; solo actualizo el signal.
    this.zone.runOutsideAngular(() => {
      this.worker = worker;
      this.worker.onmessage = ({ data }: MessageEvent<AudioWorkerOutboundMessage>) =>
        this.onWorkerMessage(data);

      this.gainNode = this.audioContext!.createGain();
      this.gainNode.gain.value = AudioCaptureService.dbToLinear(this.gainDb());

      this.filterNode = this.audioContext!.createBiquadFilter();
      this.filterNode.type = 'highpass';
      this.filterNode.frequency.value = this.highPassEnabled() ? AudioCaptureService.HIGH_PASS_CUTOFF_HZ : 0;

      // Limitador: encodeWav recorta duro a [-1,1], así que este compresor evita que la ganancia sature la señal.
      this.limiterNode = this.audioContext!.createDynamicsCompressor();
      this.limiterNode.threshold.value = -3;
      this.limiterNode.knee.value = 0;
      this.limiterNode.ratio.value = 20;
      this.limiterNode.attack.value = 0.003;
      this.limiterNode.release.value = 0.25;

      this.processorNode = this.audioContext!.createScriptProcessor(2048, 1, 1);
      this.processorNode.onaudioprocess = (event) => this.onAudioProcess(event);

      // source -> gain -> highpass -> limiter -> processor: el worker mide el nivel ya afectado por estos nodos.
      source.connect(this.gainNode);
      this.gainNode.connect(this.filterNode);
      this.filterNode.connect(this.limiterNode);
      this.limiterNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext!.destination);
    });

    this.history.clear();
    this.isRecording.set(true);
    this.startedAt = performance.now();
    this.elapsedIntervalId = setInterval(() => {
      this.elapsedSeconds.set((performance.now() - this.startedAt) / 1000);
    }, 100);
  }

  private static createWorker(): Worker {
    if (typeof Worker === 'undefined') throw new AudioWorkerUnavailableError();
    try {
      return new Worker(new URL('../../workers/audio-processing.worker', import.meta.url), { type: 'module' });
    } catch {
      throw new AudioWorkerUnavailableError();
    }
  }

  private static dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  /** Detengo la captura y pido al worker el WAV de todo lo grabado, sin codificarlo en el hilo principal. */
  async stop(): Promise<Blob> {
    this.gainNode?.disconnect();
    this.filterNode?.disconnect();
    this.limiterNode?.disconnect();
    this.processorNode?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    if (this.elapsedIntervalId) clearInterval(this.elapsedIntervalId);

    const worker = this.worker;
    const wavBlob = await new Promise<Blob>((resolve, reject) => {
      if (!worker) {
        reject(new Error('No active recording worker.'));
        return;
      }
      worker.onmessage = ({ data }: MessageEvent<AudioWorkerOutboundMessage>) => {
        if (data.type !== 'recording-encoded') return;
        resolve(new Blob([data.wavBuffer], { type: 'audio/wav' }));
      };
      // Si el script del worker no cargó o falló, rechazo en vez de esperar para siempre.
      worker.onerror = () => reject(new AudioWorkerUnavailableError());
      worker.postMessage({ type: 'finalize-recording' });
    }).finally(() => this.release(worker));
    return wavBlob;
  }

  private release(worker: Worker | undefined): void {
    worker?.terminate();
    this.isRecording.set(false);
    this.gainNode = undefined;
    this.filterNode = undefined;
    this.limiterNode = undefined;
    this.processorNode = undefined;
    this.audioContext = undefined;
    this.mediaStream = undefined;
    this.worker = undefined;
  }

  private onAudioProcess(event: AudioProcessingEvent): void {
    if (!this.worker) return;
    const samples = event.inputBuffer.getChannelData(0).slice();
    this.chunkCounter += 1;

    this.worker.postMessage(
      {
        type: 'process-audio-chunk',
        chunkId: this.chunkCounter,
        samples,
        sampleRate: this.audioContext?.sampleRate ?? 44100,
        fftSize: 1024,
      },
      [samples.buffer]
    );
  }

  private onWorkerMessage(data: AudioWorkerOutboundMessage): void {
    if (data.type !== 'spectrogram-frame') return;
    const frame: SpectrogramFrame = {
      magnitudes: (data as AudioProcessingResponse).magnitudes,
      peakFrequencyHz: data.peakFrequencyHz,
      rmsDb: data.rmsDb,
    };
    // Guardar en el historial es parte de recibir el dato (esta task); pintarlo queda para el rAF de cada vista.
    this.history.push(frame.magnitudes);
    // Reentramos a la zona de Angular solo para la actualización del signal
    // que la UI observa; el resto del pipeline permanece fuera de la zona.
    this.zone.run(() => this.latestFrame.set(frame));
  }
}
