export type AsrModelState =
  | 'unloaded'
  | 'downloading'
  | 'ready'
  | 'processing'
  | 'error'
  | 'unsupported';

export interface AsrModelDescriptor {
  id: string;
  name: string;
  version: string;
  license: string;
  sourceRepo: string;
  modelUrl: string;
  estimatedSizeBytes: number;
  sampleRateHz: 16000;
}

export interface AsrDownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface AsrInferenceResult {
  transcript: string;
  confidence: number;
  durationMs: number;
  engine: 'onnx-fastconformer' | 'local-fallback';
  warning?: string;
}

/**
 * Kandidat model ASR lokal yang dievaluasi pada PRD (Tilawa FastConformer).
 * Menggunakan aset FastConformer (MIT / NVIDIA CC-BY-4.0), bukan Zipformer (NPL-1.2).
 */
export const DEFAULT_LOCAL_ASR_MODEL: AsrModelDescriptor = {
  id: 'tilawa-fastconformer-ar-v1',
  name: 'Tilawa FastConformer (ONNX Web)',
  version: '0.1.0-candidate',
  license: 'MIT / NVIDIA CC-BY-4.0',
  sourceRepo: 'https://github.com/yazinsai/tilawa',
  modelUrl: '/models/fastconformer-ar-int8.onnx',
  estimatedSizeBytes: 38_000_000,
  sampleRateHz: 16000,
};

/**
 * Konversi Float32Array PCM dari sample rate perangkat ke mono 16 kHz
 * menggunakan interpolasi linear sederhana.
 */
export function resampleTo16kHzMono(
  input: Float32Array,
  inputSampleRate: number
): Float32Array {
  const targetRate = 16000;
  if (inputSampleRate === targetRate) {
    return input;
  }
  if (input.length === 0 || inputSampleRate <= 0) {
    return new Float32Array(0);
  }

  const ratio = inputSampleRate / targetRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const lower = Math.floor(srcIndex);
    const upper = Math.min(input.length - 1, lower + 1);
    const weight = srcIndex - lower;
    const s0 = input[lower] ?? 0;
    const s1 = input[upper] ?? s0;
    output[i] = s0 + (s1 - s0) * weight;
  }

  return output;
}

/**
 * Menghitung RMS energi audio untuk membantu mendeteksi rekaman kosong/terlalu pelan.
 */
export function computeAudioRms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i] ?? 0;
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / samples.length);
}

