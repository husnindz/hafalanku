import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AsrDownloadProgress,
  AsrModelState,
} from '@hafalanku/asr';
import type {
  Ayah,
  EvaluationStatus,
  RecitationEvaluationSummary,
  WordAlignmentItem,
} from '@hafalanku/quran-types';

type TilawaInstance = Awaited<
  ReturnType<typeof import('@tilawa/core/web').createTilawa>
>;

const TILAWA_DISCLAIMER =
  'Hasil ini adalah estimasi pencocokan suara lokal (Tilawa ONNX di browser), bukan penilaian tajwid, makhraj, atau pengganti tashih guru.';

function compareWordRef(
  a: { surah: number; ayah: number; word: number },
  b: { surah: number; ayah: number; word: number }
): number {
  if (a.surah !== b.surah) return a.surah - b.surah;
  if (a.ayah !== b.ayah) return a.ayah - b.ayah;
  return a.word - b.word;
}

export function useLocalAsr() {
  const [modelState, setModelState] = useState<AsrModelState>(() =>
    typeof WebAssembly === 'undefined' ? 'unsupported' : 'unloaded'
  );
  const [progress, setProgress] = useState<AsrDownloadProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const tilawaRef = useRef<TilawaInstance | null>(null);
  const initPromiseRef = useRef<Promise<TilawaInstance | null> | null>(null);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      tilawaRef.current?.dispose();
      tilawaRef.current = null;
    };
  }, []);

  const initModel = useCallback(async (): Promise<TilawaInstance | null> => {
    if (tilawaRef.current) return tilawaRef.current;
    if (initPromiseRef.current) return initPromiseRef.current;

    if (typeof WebAssembly === 'undefined') {
      setModelState('unsupported');
      setStatusMessage(
        'Browser Anda tidak mendukung WebAssembly untuk menjalankan model ASR lokal.'
      );
      return null;
    }

    setModelState('downloading');
    lastErrorRef.current = null;
    setProgress({ loadedBytes: 0, totalBytes: 100, percent: 0 });
    setStatusMessage('Mengunduh model ASR lokal (Tilawa ONNX, di-cache di browser)...');

    initPromiseRef.current = (async () => {
      try {
        const { createTilawa } = await import('@tilawa/core/web');
        const tilawa = await createTilawa({
          tier: 'auto',
          onProgress: (p) => {
            const percent = Math.min(100, Math.round(p.fraction * 100));
            setProgress({
              loadedBytes: p.loaded,
              totalBytes: p.total || 100,
              percent,
            });
            setStatusMessage(
              p.fromCache
                ? 'Memuat model ASR dari cache browser...'
                : `Mengunduh ${p.stage === 'model' ? 'model ASR' : 'referensi Al-Qur’an'} (${percent}%)...`
            );
          },
        });
        tilawaRef.current = tilawa;
        setModelState('ready');
        setProgress({ loadedBytes: 100, totalBytes: 100, percent: 100 });
        setStatusMessage(
          `Model ASR lokal siap (${tilawa.model.id}, ${tilawa.model.backend}).`
        );
        return tilawa;
      } catch (err) {
        const msg =
          err instanceof Error
            ? `Gagal memuat model ASR lokal: ${err.message}`
            : 'Gagal memuat model ASR lokal.';
        lastErrorRef.current = msg;
        setModelState('error');
        setStatusMessage(msg);
        return null;
      } finally {
        initPromiseRef.current = null;
      }
    })();

    return initPromiseRef.current;
  }, []);

  const evaluateRecordedPcm = useCallback(
    async (
      pcm16k: Float32Array,
      expectedAyahs: Ayah[],
      confidenceThreshold: number
    ): Promise<{ summary: RecitationEvaluationSummary; warning?: string }> => {
      const expectedSummary = expectedAyahs.map((a) => ({
        surahNumber: a.surahNumber,
        ayahNumber: a.ayahNumber,
        textUthmaniMsi: a.textUthmaniMsi,
      }));

      const tilawa = await initModel();
      if (!tilawa) {
        return {
          warning:
            lastErrorRef.current ??
            'Model ASR lokal gagal dimuat. Periksa koneksi internet untuk unduhan pertama atau gunakan Transkripsi Uji Lokal.',
          summary: {
            status: 'unratable',
            confidence: 0,
            confidenceThreshold,
            recognizedTranscript: '',
            normalizedTranscript: '',
            expectedAyahs: expectedSummary,
            wordAlignments: [],
            matchedWordCount: 0,
            expectedWordCount: 0,
            missedCount: 0,
            substitutedCount: 0,
            extraCount: 0,
            disclaimer: TILAWA_DISCLAIMER,
          },
        };
      }

      setModelState('processing');
      setStatusMessage('Menganalisis rekaman suara secara lokal...');

      try {
        const firstAyah = expectedAyahs[0];
        const lastAyah = expectedAyahs[expectedAyahs.length - 1];
        if (!firstAyah || !lastAyah) {
          return {
            summary: {
              status: 'unratable',
              confidence: 0,
              confidenceThreshold,
              recognizedTranscript: '',
              normalizedTranscript: '',
              expectedAyahs: expectedSummary,
              wordAlignments: [],
              matchedWordCount: 0,
              expectedWordCount: 0,
              missedCount: 0,
              substitutedCount: 0,
              extraCount: 0,
              disclaimer: TILAWA_DISCLAIMER,
            },
          };
        }
        const sameSurah =
          expectedAyahs.every((a) => a.surahNumber === firstAyah.surahNumber);

        const session = sameSurah
          ? tilawa.startMemorization(
              {
                surah: firstAyah.surahNumber,
                fromAyah: firstAyah.ayahNumber,
                toAyah: lastAyah.ayahNumber,
              },
              { minConfidence: confidenceThreshold }
            )
          : tilawa.startFreeRecitation({ minConfidence: confidenceThreshold });

        const collectedEvents: import('@tilawa/core/web').Tilawa extends never
          ? never
          : unknown[] = [];
        const unsubscribe = session.subscribe((ev) => {
          collectedEvents.push(ev);
        });

        // Push PCM dalam potongan 300ms (4800 sampel pada 16kHz)
        const chunkSize = 4800;
        for (let i = 0; i < pcm16k.length; i += chunkSize) {
          await session.pushAudio(
            pcm16k.subarray(i, Math.min(pcm16k.length, i + chunkSize)),
            16000
          );
        }
        const finalEvents = await session.end();
        unsubscribe();

        const allEvents = [...collectedEvents, ...finalEvents] as Array<{
          type: string;
          observed?: Array<{
            word: { surah: number; ayah: number; word: number };
            span: {
              start: { surah: number; ayah: number; word: number };
              end: { surah: number; ayah: number; word: number };
            };
            confidence: number;
          }>;
          state?: string;
          errorClass?: string;
          location?: { surah: number; ayah: number; word: number };
          confidence?: number;
        }>;

        const positionEvents = allEvents.filter((e) => e.type === 'position');
        const lockedPositionEvents = positionEvents.filter(
          (e) => e.state === 'locked'
        );
        const effectiveEvents =
          lockedPositionEvents.length > 0
            ? lockedPositionEvents
            : positionEvents.filter((e) => e.state !== 'lost');

        const mistakes = session.mistakes();

        const firstAyahRef = {
          surah: firstAyah.surahNumber,
          ayah: firstAyah.ayahNumber,
          word: 1,
        };
        const lastAyahWordsCount =
          lastAyah.textUthmaniMsi.trim().split(/\s+/).filter(Boolean).length;
        const lastAyahRef = {
          surah: lastAyah.surahNumber,
          ayah: lastAyah.ayahNumber,
          word: lastAyahWordsCount,
        };

        let maxConfidence = 0;
        let lastObservedWord: { surah: number; ayah: number; word: number } | null =
          null;
        let firstObservedWord: {
          surah: number;
          ayah: number;
          word: number;
        } | null = null;
        const observedWordKeys = new Set<string>();

        for (const ev of effectiveEvents) {
          const top = ev.observed?.[0];
          if (!top) continue;
          if (top.confidence > maxConfidence) {
            maxConfidence = top.confidence;
          }
          if (top.confidence >= confidenceThreshold) {
            if (
              compareWordRef(top.word, firstAyahRef) >= 0 &&
              compareWordRef(top.word, lastAyahRef) <= 0
            ) {
              const key = `${top.word.surah}:${top.word.ayah}:${top.word.word}`;
              observedWordKeys.add(key);
              if (!firstObservedWord || compareWordRef(top.word, firstObservedWord) < 0) {
                firstObservedWord = top.word;
              }
              if (!lastObservedWord || compareWordRef(top.word, lastObservedWord) > 0) {
                lastObservedWord = top.word;
              }
            }
          }
        }

        session.dispose();
        setModelState('ready');
        setStatusMessage(
          `Model ASR lokal siap (${tilawa.model.id}, ${tilawa.model.backend}).`
        );

        // Jika model tidak berhasil mengunci bacaan atau confidence di bawah ambang
        if (!lastObservedWord || maxConfidence < confidenceThreshold) {
          return {
            summary: {
              status: 'unratable',
              confidence: maxConfidence,
              confidenceThreshold,
              recognizedTranscript: '',
              normalizedTranscript: '',
              expectedAyahs: expectedSummary,
              wordAlignments: expectedAyahs.flatMap((ayah) =>
                ayah.textUthmaniMsi
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((w) => ({
                    expectedWord: w,
                    status: 'uncertain' as const,
                    surahNumber: ayah.surahNumber,
                    ayahNumber: ayah.ayahNumber,
                  }))
              ),
              matchedWordCount: 0,
              expectedWordCount: expectedAyahs.reduce(
                (acc, a) =>
                  acc + a.textUthmaniMsi.trim().split(/\s+/).filter(Boolean).length,
                0
              ),
              missedCount: 0,
              substitutedCount: 0,
              extraCount: 0,
              disclaimer: TILAWA_DISCLAIMER,
            },
          };
        }

        const mistakeMap = new Map<string, string>();
        let extraCount = 0;
        for (const m of mistakes) {
          if (m.errorClass === 'added_word') {
            extraCount++;
            continue;
          }
          const key = `${m.location.surah}:${m.location.ayah}:${m.location.word}`;
          mistakeMap.set(key, m.errorClass);
        }

        const wordAlignments: WordAlignmentItem[] = [];
        let matchedWordCount = 0;
        let missedCount = 0;
        let substitutedCount = 0;
        let expectedWordCount = 0;

        for (const ayah of expectedAyahs) {
          const words = ayah.textUthmaniMsi.trim().split(/\s+/).filter(Boolean);
          words.forEach((wordText, idx) => {
            expectedWordCount++;
            const ref = {
              surah: ayah.surahNumber,
              ayah: ayah.ayahNumber,
              word: idx + 1,
            };
            const key = `${ref.surah}:${ref.ayah}:${ref.word}`;
            const err = mistakeMap.get(key);

            if (err === 'omitted_word' || err === 'skipped_passage') {
              missedCount++;
              wordAlignments.push({
                expectedWord: wordText,
                status: 'missed',
                surahNumber: ref.surah,
                ayahNumber: ref.ayah,
              });
            } else if (err === 'wrong_word') {
              substitutedCount++;
              wordAlignments.push({
                expectedWord: wordText,
                status: 'substituted',
                surahNumber: ref.surah,
                ayahNumber: ref.ayah,
              });
            } else if (
              firstObservedWord &&
              lastObservedWord &&
              compareWordRef(ref, firstObservedWord) >= 0 &&
              compareWordRef(ref, lastObservedWord) <= 0
            ) {
              matchedWordCount++;
              wordAlignments.push({
                expectedWord: wordText,
                recognizedWord: wordText,
                status: 'matched',
                surahNumber: ref.surah,
                ayahNumber: ref.ayah,
              });
            } else {
              missedCount++;
              wordAlignments.push({
                expectedWord: wordText,
                status: 'missed',
                surahNumber: ref.surah,
                ayahNumber: ref.ayah,
              });
            }
          });
        }

        const matchRatio =
          expectedWordCount > 0 ? matchedWordCount / expectedWordCount : 0;
        let status: EvaluationStatus = 'mismatch';
        if (matchRatio >= 0.85 && missedCount <= 1 && substitutedCount <= 1) {
          status = 'matched';
        } else if (matchRatio >= 0.4) {
          status = 'partial';
        }

        return {
          summary: {
            status,
            confidence: maxConfidence,
            confidenceThreshold,
            recognizedTranscript: `Terdeteksi hingga ${lastObservedWord.surah}:${lastObservedWord.ayah} kata ke-${lastObservedWord.word}`,
            normalizedTranscript: '',
            expectedAyahs: expectedSummary,
            wordAlignments,
            matchedWordCount,
            expectedWordCount,
            missedCount,
            substitutedCount,
            extraCount,
            disclaimer: TILAWA_DISCLAIMER,
          },
        };
      } catch (err) {
        setModelState('error');
        const msg =
          err instanceof Error
            ? err.message
            : 'Gagal menjalankan inferensi ASR lokal.';
        setStatusMessage(msg);
        return {
          warning: msg,
          summary: {
            status: 'unratable',
            confidence: 0,
            confidenceThreshold,
            recognizedTranscript: '',
            normalizedTranscript: '',
            expectedAyahs: expectedSummary,
            wordAlignments: [],
            matchedWordCount: 0,
            expectedWordCount: 0,
            missedCount: 0,
            substitutedCount: 0,
            extraCount: 0,
            disclaimer: TILAWA_DISCLAIMER,
          },
        };
      }
    },
    [initModel, statusMessage]
  );

  return {
    modelState,
    progress,
    statusMessage,
    initModel,
    evaluateRecordedPcm,
  };
}
