import { useCallback, useEffect, useRef, useState } from 'react';
import { computeAudioRms, resampleTo16kHzMono } from '@hafalanku/asr';

export type RecorderStatus =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'ready'
  | 'mic-denied'
  | 'unsupported-browser'
  | 'error';

export interface RecordedAudioPayload {
  pcm16k: Float32Array;
  durationSec: number;
  rms: number;
  previewUrl: string;
}

function encodeWavFromPcm16k(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>(() => {
    if (
      typeof window === 'undefined' ||
      typeof navigator.mediaDevices?.getUserMedia !== 'function' ||
      typeof AudioContext === 'undefined'
    ) {
      return 'unsupported-browser';
    }
    return 'idle';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [recordedAudio, setRecordedAudio] =
    useState<RecordedAudioPayload | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(16000);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const previewUrlRef = useRef<string | null>(null);
  const lastLevelUpdateRef = useRef<number>(0);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const cleanupAudioGraph = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioGraph();
      revokePreviewUrl();
    };
  }, [cleanupAudioGraph, revokePreviewUrl]);

  const resetRecording = useCallback(() => {
    cleanupAudioGraph();
    revokePreviewUrl();
    pcmChunksRef.current = [];
    setRecordedAudio(null);
    setElapsedSec(0);
    setErrorMessage(null);
    setStatus(
      typeof window !== 'undefined' &&
        typeof navigator.mediaDevices?.getUserMedia === 'function' &&
        typeof AudioContext !== 'undefined'
        ? 'idle'
        : 'unsupported-browser'
    );
  }, [cleanupAudioGraph, revokePreviewUrl]);

  const startRecording = useCallback(async () => {
    if (
      typeof navigator.mediaDevices?.getUserMedia !== 'function' ||
      typeof AudioContext === 'undefined'
    ) {
      setStatus('unsupported-browser');
      setErrorMessage(
        'Browser Anda belum mendukung perekaman mikrofon (getUserMedia / AudioContext).'
      );
      return;
    }

    cleanupAudioGraph();
    revokePreviewUrl();
    setRecordedAudio(null);
    setErrorMessage(null);
    pcmChunksRef.current = [];

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      } catch (constraintErr) {
        if (
          constraintErr instanceof DOMException &&
          constraintErr.name === 'OverconstrainedError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw constraintErr;
        }
      }

      streamRef.current = stream;

      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;
      sampleRateRef.current = audioCtx.sampleRate;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Capture PCM langsung agar tidak bergantung pada codec MediaRecorder/decodeAudioData
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        pcmChunksRef.current.push(copy);

        // Throttle pembaruan UI level mikrofon (maksimal tiap 130ms) agar thread utama mobile tidak lag
        const now = performance.now();
        if (now - lastLevelUpdateRef.current > 130) {
          lastLevelUpdateRef.current = now;
          const rms = computeAudioRms(copy);
          setMicLevel(Math.min(100, Math.round(rms * 400)));
        }
      };

      // Hubungkan ke gain 0 agar tidak terjadi feedback speaker
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      startedAtRef.current = Date.now();
      setElapsedSec(0);
      timerRef.current = window.setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);

      setStatus('recording');
    } catch (err) {
      cleanupAudioGraph();
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setStatus('mic-denied');
        setErrorMessage(
          'Izin mikrofon belum diberikan. Aktifkan izin mikrofon pada pengaturan browser.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setStatus('error');
        setErrorMessage(
          'Perangkat mikrofon tidak ditemukan. Pastikan mikrofon atau headset terpasang dan coba kembali.'
        );
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setStatus('error');
        setErrorMessage(
          'Mikrofon sedang dipakai aplikasi lain atau tidak dapat dibaca oleh browser. Tutup aplikasi lain lalu coba kembali.'
        );
      } else {
        setStatus('error');
        setErrorMessage(
          'Suara belum berhasil direkam. Periksa mikrofon dan coba kembali.'
        );
      }
    }
  }, [cleanupAudioGraph, revokePreviewUrl]);

  const stopRecording = useCallback(() => {
    if (status !== 'recording') return;
    setStatus('processing');

    const chunks = pcmChunksRef.current;
    const rawRate = sampleRateRef.current;
    cleanupAudioGraph();

    const totalSamples = chunks.reduce((sum, c) => sum + c.length, 0);
    if (totalSamples === 0) {
      setStatus('error');
      setErrorMessage(
        'Suara belum berhasil direkam. Periksa mikrofon dan coba kembali.'
      );
      return;
    }

    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const pcm16k = resampleTo16kHzMono(merged, rawRate);
    const rms = computeAudioRms(pcm16k);
    const durationSec = pcm16k.length / 16000;
    const wavBlob = encodeWavFromPcm16k(pcm16k, 16000);
    const previewUrl = URL.createObjectURL(wavBlob);
    previewUrlRef.current = previewUrl;

    setRecordedAudio({
      pcm16k,
      durationSec,
      rms,
      previewUrl,
    });
    setStatus('ready');
  }, [cleanupAudioGraph, status]);

  return {
    status,
    errorMessage,
    elapsedSec,
    micLevel,
    recordedAudio,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
