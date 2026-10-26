/**
 * Espectro de magnitud con ventana de Hann. Uso una FFT radix-2 iterativa, O(n log n); solo si la
 * ventana no es potencia de 2 (el último trozo corto) caigo a la DFT directa, con la misma salida.
 */
export class SpectrumAnalyzer {
  private readonly windows = new Map<number, Float64Array>();

  magnitudes(samples: Float32Array, fftSize: number): Float32Array {
    const n = Math.min(samples.length, fftSize);
    const half = Math.floor(n / 2);
    const window = this.hannWindow(n);
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let t = 0; t < n; t++) re[t] = samples[t] * window[t];

    if (SpectrumAnalyzer.isPowerOfTwo(n)) SpectrumAnalyzer.fftInPlace(re, im);
    else SpectrumAnalyzer.dftInPlace(re, im);

    const magnitudes = new Float32Array(half);
    for (let k = 0; k < half; k++) magnitudes[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / n;
    return magnitudes;
  }

  // La ventana solo depende del tamaño: la calculo una vez por tamaño.
  private hannWindow(n: number): Float64Array {
    let window = this.windows.get(n);
    if (!window) {
      window = new Float64Array(n);
      for (let t = 0; t < n; t++) window[t] = 0.5 * (1 - Math.cos((2 * Math.PI * t) / (n - 1)));
      this.windows.set(n, window);
    }
    return window;
  }

  private static isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  private static fftInPlace(re: Float64Array, im: Float64Array): void {
    const n = re.length;
    // Reordeno por inversión de bits para hacer las mariposas en su lugar.
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const halfSize = size >> 1;
      const angle = (-2 * Math.PI) / size;
      for (let start = 0; start < n; start += size) {
        for (let k = 0; k < halfSize; k++) {
          const wRe = Math.cos(angle * k);
          const wIm = Math.sin(angle * k);
          const even = start + k;
          const odd = even + halfSize;
          const oddRe = re[odd] * wRe - im[odd] * wIm;
          const oddIm = re[odd] * wIm + im[odd] * wRe;
          re[odd] = re[even] - oddRe;
          im[odd] = im[even] - oddIm;
          re[even] += oddRe;
          im[even] += oddIm;
        }
      }
    }
  }

  private static dftInPlace(re: Float64Array, im: Float64Array): void {
    const n = re.length;
    const input = Float64Array.from(re);
    for (let k = 0; k < n; k++) {
      let sumRe = 0;
      let sumIm = 0;
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        sumRe += input[t] * Math.cos(angle);
        sumIm -= input[t] * Math.sin(angle);
      }
      re[k] = sumRe;
      im[k] = sumIm;
    }
  }
}
