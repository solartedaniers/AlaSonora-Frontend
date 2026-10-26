/// <reference lib="webworker" />

import { AudioWorkerInboundMessage, AudioWorkerOutboundMessage } from './messages';
import { SpectrumAnalyzer } from './spectrum-analyzer';

/**
 * Web Worker dedicado (no comparte hilo con la UI, sin acceso al DOM).
 * Recibe fragmentos de audio PCM capturados en `AudioCaptureService` y
 * calcula su espectro (FFT radix-2 en SpectrumAnalyzer) para no bloquear jamás el hilo principal del navegador
 * mientras se graba o sube un audio largo.
 */
// Muestras PCM acumuladas de la grabación en curso, en el orden en que
// llegaron los chunks, para poder empaquetarlas como WAV al finalizar sin
// que el hilo principal tenga que tocar el audio crudo.
let recordedChunks: Float32Array[] = [];
let recordedSampleRate = 0;
const spectrumAnalyzer = new SpectrumAnalyzer();

addEventListener('message', ({ data }: MessageEvent<AudioWorkerInboundMessage>) => {
  if (data.type === 'finalize-recording') {
    const wavBuffer = encodeWav(recordedChunks, recordedSampleRate);
    recordedChunks = [];

    const response: AudioWorkerOutboundMessage = { type: 'recording-encoded', wavBuffer };
    (postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, [wavBuffer]);
    return;
  }

  if (data.type === 'compute-recording-spectrogram') {
    const columns = computeRecordingSpectrogram(data.samples, data.fftSize, data.columnCount);
    const response: AudioWorkerOutboundMessage = { type: 'recording-spectrogram', columns };
    (postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, columns.map((c) => c.buffer));
    return;
  }

  if (data.type !== 'process-audio-chunk') return;

  const { chunkId, samples, sampleRate, fftSize } = data;
  recordedSampleRate = sampleRate;
  recordedChunks.push(samples.slice());

  const magnitudes = spectrumAnalyzer.magnitudes(samples, fftSize);
  const peakFrequencyHz = findPeakFrequency(magnitudes, sampleRate, fftSize);
  const rmsDb = computeRmsDb(samples);

  const response: AudioWorkerOutboundMessage = {
    type: 'spectrogram-frame',
    chunkId,
    magnitudes,
    peakFrequencyHz,
    rmsDb,
  };

  // Transferimos el buffer subyacente en vez de copiarlo: más barato para
  // fragmentos grandes y evita retener memoria duplicada en el worker.
  (postMessage as (msg: unknown, transfer: Transferable[]) => void)(response, [
    magnitudes.buffer,
  ]);
});

/** Empaqueta PCM float32 [-1,1] concatenado como WAV mono PCM 16-bit (formato universalmente soportado). */
function encodeWav(chunks: Float32Array[], sampleRate: number): ArrayBuffer {
  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const dataSize = totalSamples * 2; // 16-bit = 2 bytes/muestra
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // tamaño del subchunk fmt
  view.setUint16(20, 1, true); // PCM lineal
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits por muestra
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const clamped = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

/** Ventanas FFT repartidas por toda la grabación, una por columna de salida. */
function computeRecordingSpectrogram(samples: Float32Array, fftSize: number, columnCount: number): Float32Array[] {
  const lastStart = Math.max(0, samples.length - fftSize);
  const columns = Math.max(1, Math.min(columnCount, Math.floor(samples.length / fftSize) || 1));
  return Array.from({ length: columns }, (_, i) => {
    const start = columns === 1 ? 0 : Math.round((i * lastStart) / (columns - 1));
    return spectrumAnalyzer.magnitudes(samples.subarray(start, start + fftSize), fftSize);
  });
}

function findPeakFrequency(magnitudes: Float32Array, sampleRate: number, fftSize: number): number {
  let peakBin = 0;
  let peakValue = -Infinity;
  for (let i = 0; i < magnitudes.length; i++) {
    if (magnitudes[i] > peakValue) {
      peakValue = magnitudes[i];
      peakBin = i;
    }
  }
  return (peakBin * sampleRate) / fftSize;
}

function computeRmsDb(samples: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) sumSquares += samples[i] * samples[i];
  const rms = Math.sqrt(sumSquares / samples.length);
  return 20 * Math.log10(Math.max(rms, 1e-8));
}
