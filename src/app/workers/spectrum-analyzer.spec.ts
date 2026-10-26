import { SpectrumAnalyzer } from './spectrum-analyzer';

/** La DFT O(n²) que tenía el worker, tal cual: es la referencia para que el espectrograma no cambie. */
function referenceDft(samples: Float32Array, fftSize: number): Float32Array {
  const n = Math.min(samples.length, fftSize);
  const half = Math.floor(n / 2);
  const magnitudes = new Float32Array(half);
  const hann = (t: number) => 0.5 * (1 - Math.cos((2 * Math.PI * t) / (n - 1)));
  for (let k = 0; k < half; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      const windowed = samples[t] * hann(t);
      re += windowed * Math.cos(angle);
      im -= windowed * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(re * re + im * im) / n;
  }
  return magnitudes;
}

/** Canto sintético conocido: dos tonos (3 y 5,5 kHz) más un poco de ruido determinista. */
function birdLikeSignal(length: number, sampleRate = 48000): Float32Array {
  const samples = new Float32Array(length);
  let seed = 7;
  for (let t = 0; t < length; t++) {
    seed = (seed * 16807) % 2147483647;
    const noise = (seed / 2147483647 - 0.5) * 0.05;
    samples[t] = 0.6 * Math.sin((2 * Math.PI * 3000 * t) / sampleRate) + 0.3 * Math.sin((2 * Math.PI * 5500 * t) / sampleRate) + noise;
  }
  return samples;
}

function expectSameSpectrum(actual: Float32Array, expected: Float32Array): void {
  expect(actual.length).toBe(expected.length);
  const peak = Math.max(...expected);
  for (let k = 0; k < expected.length; k++) {
    expect(Math.abs(actual[k] - expected[k])).withContext(`bin ${k}`).toBeLessThan(peak * 1e-5);
  }
}

describe('SpectrumAnalyzer', () => {
  const analyzer = new SpectrumAnalyzer();

  for (const fftSize of [256, 512, 1024, 2048]) {
    it(`matches the old DFT bin by bin with fftSize ${fftSize}`, () => {
      const samples = birdLikeSignal(fftSize);
      expectSameSpectrum(analyzer.magnitudes(samples, fftSize), referenceDft(samples, fftSize));
    });
  }

  it('matches it too on a short last chunk that is not a power of two', () => {
    const samples = birdLikeSignal(300);
    expectSameSpectrum(analyzer.magnitudes(samples, 1024), referenceDft(samples, 1024));
  });

  it('puts the peak on the strongest tone', () => {
    const magnitudes = analyzer.magnitudes(birdLikeSignal(1024), 1024);
    const peakBin = magnitudes.indexOf(Math.max(...magnitudes));
    expect(Math.round((peakBin * 48000) / 1024 / 100) * 100).toBe(3000);
  });

  it('returns an empty spectrum for an empty chunk', () => {
    expect(analyzer.magnitudes(new Float32Array(0), 1024).length).toBe(0);
  });
});
