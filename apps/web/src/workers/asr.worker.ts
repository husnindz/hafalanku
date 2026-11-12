import type {
  AsrDownloadProgress,
  AsrInferenceResult,
} from '@hafalanku/asr';
import { DEFAULT_LOCAL_ASR_MODEL } from '@hafalanku/asr';

const MODEL_CACHE_NAME = 'hafalanku-asr-models-v1';

type WorkerRequest =
  | { type: 'init'; modelUrl?: string }
  | { type: 'transcribe'; pcm16k: Float32Array };

type WorkerResponse =
  | { type: 'progress'; progress: AsrDownloadProgress }
  | { type: 'ready'; cached: boolean }
  | { type: 'unavailable'; reason: string }
  | { type: 'result'; result: AsrInferenceResult }
  | { type: 'error'; message: string };

let ortSession: unknown = null;

async function fetchModelWithCache(modelUrl: string): Promise<ArrayBuffer> {
  const cache =
    typeof caches !== 'undefined' ? await caches.open(MODEL_CACHE_NAME) : null;

  if (cache) {
    const cachedRes = await cache.match(modelUrl);
    if (cachedRes && cachedRes.ok) {
      const contentType = cachedRes.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) {
        return cachedRes.arrayBuffer();
      }
    }
  }

  const response = await fetch(modelUrl);
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || contentType.includes('text/html')) {
    throw new Error('MODEL_NOT_HOSTED');
  }

  const totalBytes = Number(
    response.headers.get('content-length') ??
      DEFAULT_LOCAL_ASR_MODEL.estimatedSizeBytes
  );
  const reader = response.body?.getReader();

  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (cache) {
      await cache.put(modelUrl, new Response(buffer));
    }
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loadedBytes += value.byteLength;
      const percent = Math.min(
        100,
        Math.round((loadedBytes / Math.max(1, totalBytes)) * 100)
      );
      self.postMessage({
        type: 'progress',
        progress: { loadedBytes, totalBytes, percent },
      } satisfies WorkerResponse);
    }
  }

  const merged = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  if (cache) {
    await cache.put(
      modelUrl,
      new Response(merged.buffer, {
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    );
  }

  return merged.buffer;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  if (msg.type === 'init') {
    const modelUrl = msg.modelUrl ?? DEFAULT_LOCAL_ASR_MODEL.modelUrl;
    try {
      const modelBytes = await fetchModelWithCache(modelUrl);
      const ort = await import('onnxruntime-web');
      ortSession = await ort.InferenceSession.create(modelBytes, {
        executionProviders: ['wasm'],
      });
      self.postMessage({
        type: 'ready',
        cached: true,
      } satisfies WorkerResponse);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      if (text === 'MODEL_NOT_HOSTED') {
        self.postMessage({
          type: 'unavailable',
          reason:
            'File model ONNX lokal (/models/fastconformer-ar-int8.onnx) belum tersedia di paket hosting. Anda dapat mengetik atau menempelkan transkripsi uji lokal untuk menguji matcher.',
        } satisfies WorkerResponse);
      } else {
        self.postMessage({
          type: 'error',
          message: `Gagal memuat runtime ASR lokal: ${text}`,
        } satisfies WorkerResponse);
      }
    }
    return;
  }

  if (msg.type === 'transcribe') {
    const started = performance.now();
    if (!ortSession) {
      self.postMessage({
        type: 'unavailable',
        reason:
          'Model ASR lokal belum dimuat. Muat model terlebih dahulu atau gunakan input transkripsi uji lokal.',
      } satisfies WorkerResponse);
      return;
    }

    try {
      // Placeholder struktur inferensi FastConformer saat model ONNX tersedia
      const durationMs = Math.round(performance.now() - started);
      self.postMessage({
        type: 'result',
        result: {
          transcript: '',
          confidence: 0,
          durationMs,
          engine: 'onnx-fastconformer',
          warning:
            'Sesi ONNX siap, namun decoder tokenizer spesifik model belum dikonfigurasi untuk artefak ini.',
        },
      } satisfies WorkerResponse);
    } catch (err) {
      self.postMessage({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat inferensi ASR lokal.',
      } satisfies WorkerResponse);
    }
  }
};

