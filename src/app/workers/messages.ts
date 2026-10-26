/** Contratos tipados de los mensajes con los dos workers: TypeScript verifica que ambos lados usen la misma forma. */

// 1. Web Worker: audio-processing.worker.ts (FFT y espectrograma)

export interface AudioProcessingRequest {
  type: 'process-audio-chunk';
  chunkId: number;
  /** Buffer de audio PCM mono, transferido (no copiado) al worker. */
  samples: Float32Array;
  sampleRate: number;
  fftSize: 256 | 512 | 1024 | 2048;
}

export interface AudioProcessingResponse {
  type: 'spectrogram-frame';
  chunkId: number;
  /** Magnitudes por bin de frecuencia, listas para pintar en el canvas. */
  magnitudes: Float32Array;
  peakFrequencyHz: number;
  rmsDb: number;
}

/** Pido al worker cerrar la grabación y empaquetar todo el PCM acumulado como WAV, fuera del hilo principal. */
export interface FinalizeRecordingRequest {
  type: 'finalize-recording';
}

export interface RecordingEncodedResponse {
  type: 'recording-encoded';
  /** Buffer WAV completo (PCM 16-bit), transferido al hilo principal. */
  wavBuffer: ArrayBuffer;
}

/** Espectrograma de una grabación completa (pantalla de resultado), independiente de la captura en vivo. */
export interface RecordingSpectrogramRequest {
  type: 'compute-recording-spectrogram';
  samples: Float32Array;
  sampleRate: number;
  fftSize: 256 | 512 | 1024 | 2048;
  columnCount: number;
}

export interface RecordingSpectrogramResponse {
  type: 'recording-spectrogram';
  /** Un espectro de magnitud por columna de tiempo, el más antiguo primero. */
  columns: Float32Array[];
}

export type AudioWorkerInboundMessage = AudioProcessingRequest | FinalizeRecordingRequest | RecordingSpectrogramRequest;
export type AudioWorkerOutboundMessage = AudioProcessingResponse | RecordingEncodedResponse | RecordingSpectrogramResponse;

// 2. Shared Worker: sync.worker.ts (estado compartido entre pestañas)

export interface SharedWorkerHello {
  type: 'hello';
  tabId: string;
}

/** La pestaña se va (destruye el servicio o la página se oculta): el worker la quita del conteo. */
export interface SharedWorkerGoodbye {
  type: 'goodbye';
  tabId: string;
}

export interface SharedWorkerDetectionBroadcast {
  type: 'detection-broadcast';
  detectionId: string;
  speciesCommonName: string;
  latitude: number;
  longitude: number;
  confidence: number;
  originTabId: string;
}

export interface SharedWorkerTabCount {
  type: 'tab-count';
  count: number;
}

export type SharedWorkerInboundMessage = SharedWorkerHello | SharedWorkerGoodbye | SharedWorkerDetectionBroadcast;
export type SharedWorkerOutboundMessage = SharedWorkerDetectionBroadcast | SharedWorkerTabCount;
