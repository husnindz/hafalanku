import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Check,
  Eye,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  MetadataQuizAnswers,
  MetadataQuizConfig,
  MetadataQuizResult,
  PracticeSessionLocal,
  RecitationEvaluationSummary,
} from '@hafalanku/quran-types';
import { evaluateRecitation } from '@hafalanku/quran-matcher';
import { useAppContext } from '../../app/AppContext';
import {
  getAvailableJuzNumbers,
  getSurahMap,
  pickRandomPromptFromSurahAsync,
  pickRandomPromptWithContinuationAsync,
  type RandomPromptSelection,
} from '../../data/quran/datasetAdapter';
import { useAudioRecorder } from '../../lib/audio-recorder/useAudioRecorder';
import { useLocalAsr } from '../../lib/asr-client/useLocalAsr';
import { savePracticeSession } from '../../lib/storage/sessionHistory';
import { loadTestConfig, saveTestConfig } from '../../lib/storage/preferences';
import { StatusBanner } from '../../components/StatusBanner';

type TestStep = 'setup' | 'reciting' | 'quiz' | 'result';

export function MemorizationTestPage() {
  const { dataset, isLoadingDataset, preferences } = useAppContext();
  const [searchParams] = useSearchParams();

  const availableJuz = useMemo(
    () => (dataset ? getAvailableJuzNumbers(dataset) : []),
    [dataset]
  );
  const surahMap = useMemo(
    () => (dataset ? getSurahMap(dataset) : new Map()),
    [dataset]
  );

  const savedTestConfig = useMemo(() => loadTestConfig(), []);
  const [scopeMode, setScopeMode] = useState<'juz' | 'surah'>(
    savedTestConfig.scopeMode ?? 'juz'
  );
  const [selectedSurah, setSelectedSurah] = useState<number>(
    savedTestConfig.selectedSurah ?? 1
  );
  const [juzStart, setJuzStart] = useState<number>(savedTestConfig.juzStart);
  const [juzEnd, setJuzEnd] = useState<number>(savedTestConfig.juzEnd);
  const [targetAyahCount, setTargetAyahCount] = useState<number>(
    savedTestConfig.targetAyahCount
  );
  const [quizConfig, setQuizConfig] = useState<MetadataQuizConfig>(
    savedTestConfig.quizConfig
  );

  useEffect(() => {
    const paramStart = Number(searchParams.get('juzStart'));
    const paramEnd = Number(searchParams.get('juzEnd'));
    if (paramStart && availableJuz.includes(paramStart)) {
      setJuzStart(paramStart);
      saveTestConfig({ juzStart: paramStart });
    }
    if (paramEnd && availableJuz.includes(paramEnd)) {
      setJuzEnd(paramEnd);
      saveTestConfig({ juzEnd: paramEnd });
    }
  }, [availableJuz, searchParams]);

  const [step, setStep] = useState<TestStep>('setup');
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [selection, setSelection] = useState<RandomPromptSelection | null>(
    null
  );
  const [promptAudioError, setPromptAudioError] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showPromptTextFallback, setShowPromptTextFallback] = useState(false);
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null);
  const promptAudioRef = useRef<HTMLAudioElement | null>(null);

  // Metadata quiz inputs
  const [guessSurahInput, setGuessSurahInput] = useState<string>('');
  const [guessPageInput, setGuessPageInput] = useState<string>('');
  const [guessAyahInput, setGuessAyahInput] = useState<string>('');

  // Result state
  const [evaluation, setEvaluation] =
    useState<RecitationEvaluationSummary | null>(null);
  const [asrWarning, setAsrWarning] = useState<string | null>(null);
  const [metadataResult, setMetadataResult] =
    useState<MetadataQuizResult | null>(null);

  const recorder = useAudioRecorder();
  const asr = useLocalAsr();

  useEffect(() => {
    void asr.initModel();
  }, [asr.initModel]);

  const startTest = async () => {
    if (!dataset) return;
    setSetupError(null);

    if (scopeMode === 'juz' && juzStart > juzEnd) {
      setSetupError(
        'Juz awal tidak boleh lebih besar daripada Juz akhir.'
      );
      return;
    }

    setIsStartingTest(true);
    try {
      const picked =
        scopeMode === 'surah'
          ? await pickRandomPromptFromSurahAsync(
              dataset,
              selectedSurah,
              targetAyahCount
            )
          : await pickRandomPromptWithContinuationAsync(
              dataset,
              juzStart,
              juzEnd,
              targetAyahCount
            );

      if (!picked) {
        setSetupError(
          scopeMode === 'surah'
            ? `Tidak ditemukan ayat pemantik dengan lanjutan yang valid pada surah ${surahMap.get(selectedSurah)?.nameLatin ?? selectedSurah}. Coba kurangi target ayat lanjutan.`
            : 'Tidak ditemukan ayat pemantik dengan lanjutan yang valid pada rentang juz tersebut.'
        );
        return;
      }

      promptAudioRef.current?.pause();
      setSelection(picked);
      setPromptAudioError(null);
      setIsAudioPlaying(false);
      setShowPromptTextFallback(false);
      setGuessSurahInput('');
      setGuessPageInput('');
      setGuessAyahInput('');
      setEvaluation(null);
      setAsrWarning(null);
      setMetadataResult(null);
      setResultAudioUrl(null);
      recorder.resetRecording();
      setStep('reciting');
      // Mulai preload model ASR di latar belakang agar siap saat rekaman selesai
      void asr.initModel();
    } catch (err) {
      setSetupError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil ayat pemantik dari MyQuran API.'
      );
    } finally {
      setIsStartingTest(false);
    }
  };

  const playPromptAudio = () => {
    const audioUrl = selection?.promptAyah.audioUrl;
    if (!audioUrl) {
      setPromptAudioError('Audio pemantik tidak tersedia.');
      return;
    }
    setPromptAudioError(null);
    setIsAudioPlaying(true);
    promptAudioRef.current?.pause();
    const audio = new Audio(audioUrl);
    promptAudioRef.current = audio;
    audio.onended = () => setIsAudioPlaying(false);
    audio.onerror = () => {
      setIsAudioPlaying(false);
      setPromptAudioError('Gagal memutar audio.');
    };
    audio.play().catch(() => {
      setIsAudioPlaying(false);
      setPromptAudioError('Gagal memutar audio.');
    });
  };

  const finalizeAndSave = async (
    evalSummary: RecitationEvaluationSummary,
    answers: MetadataQuizAnswers,
    quizRes: MetadataQuizResult | null
  ) => {
    if (!selection || !dataset) return;
    setMetadataResult(quizRes);
    setStep('result');

    const session: PracticeSessionLocal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      selectedJuzStart:
        scopeMode === 'juz' ? juzStart : selection.promptAyah.juzNumber,
      selectedJuzEnd:
        scopeMode === 'juz' ? juzEnd : selection.promptAyah.juzNumber,
      promptSurah: selection.promptAyah.surahNumber,
      promptAyah: selection.promptAyah.ayahNumber,
      targetAyahCount,
      recognizedTranscript: evalSummary.recognizedTranscript,
      evaluationSummary: evalSummary,
      metadataAnswers: answers,
      metadataResult: quizRes ?? undefined,
      isFixtureData: dataset.manifest.isFixture,
    };

    try {
      await savePracticeSession(session);
    } catch {
      // Tetap tampilkan hasil walau IndexedDB tidak tersedia di mode privat
    }
  };

  const handleEvaluateAndSubmit = async () => {
    if (!selection) return;

    setAsrWarning(null);
    setIsEvaluating(true);

    try {
      // Tunggu minimal 600ms agar status teks tombol 'Mengirim Jawaban...' terlihat jelas
      await new Promise((resolve) => setTimeout(resolve, 600));

      let evalSummary: RecitationEvaluationSummary;

      if (recorder.recordedAudio) {
        const res = await asr.evaluateRecordedPcm(
          recorder.recordedAudio.pcm16k,
          selection.expectedContinuation,
          preferences.asrConfidenceThreshold
        );
        evalSummary = res.summary;
        if (res.warning) {
          setAsrWarning(res.warning);
        }
      } else {
        evalSummary = evaluateRecitation({
          recognizedTranscript: '',
          expectedAyahs: selection.expectedContinuation,
          confidence: 0,
          confidenceThreshold: preferences.asrConfidenceThreshold,
        });
      }

      setEvaluation(evalSummary);
      setResultAudioUrl(recorder.recordedAudio?.previewUrl ?? null);

      const prompt = selection.promptAyah;
      const firstContinuation =
        selection.expectedContinuation[0] ?? prompt;
      const lastContinuation =
        selection.expectedContinuation[
          selection.expectedContinuation.length - 1
        ] ?? prompt;
      const targetSurahNumber = firstContinuation.surahNumber;
      const expectedSurah = surahMap.get(targetSurahNumber);

      const result: MetadataQuizResult = {
        totalAnswered: 0,
        totalCorrect: 0,
      };

      const answers: MetadataQuizAnswers = {};

      if (scopeMode === 'juz') {
        if (quizConfig.guessSurah) {
          const actualSurah = guessSurahInput ? Number(guessSurahInput) : undefined;
          answers.surahNumber = actualSurah;
          const isCorrect = actualSurah === targetSurahNumber;
          result.totalAnswered++;
          if (isCorrect) result.totalCorrect++;
          result.guessSurah = {
            expected: targetSurahNumber,
            expectedLabel: expectedSurah
              ? `${expectedSurah.surahNumber}. ${expectedSurah.nameLatin}`
              : `Surah ${targetSurahNumber}`,
            actual: actualSurah,
            actualLabel: actualSurah
              ? `${actualSurah}. ${surahMap.get(actualSurah)?.nameLatin ?? ''}`
              : 'Tidak dijawab',
            isCorrect,
          };
        }

        if (quizConfig.guessPage) {
          // Halaman mushaf di mana ayat pertama setelah ayat pemantik dimulai
          const expectedPage = firstContinuation.pageNumberMsi;
          const expectedLabel = `Hal. ${expectedPage}`;

          const cleanedInput = guessPageInput.trim();
          const parsedPage = cleanedInput ? Number(cleanedInput) : undefined;
          const actualPage =
            parsedPage !== undefined && !isNaN(parsedPage) ? parsedPage : undefined;
          const isCorrect =
            actualPage !== undefined && actualPage === expectedPage;

          answers.pageNumberMsi = actualPage;
          result.totalAnswered++;
          if (isCorrect) result.totalCorrect++;
          result.guessPage = {
            expected: expectedPage,
            expectedLabel,
            actual: actualPage,
            actualLabel: cleanedInput || 'Tidak dijawab',
            isCorrect,
          };
        }

        if (quizConfig.guessAyahNumber) {
          // Nomor ayat pertama yang dibaca setelah ayat pemantik (harus tepat cocok)
          const firstContinuationAyah = firstContinuation.ayahNumber;
          const actualAyah = guessAyahInput ? Number(guessAyahInput) : undefined;
          answers.ayahNumber = actualAyah;
          const isCorrect =
            actualAyah !== undefined && actualAyah === firstContinuationAyah;
          result.totalAnswered++;
          if (isCorrect) result.totalCorrect++;
          result.guessAyahNumber = {
            expected: firstContinuationAyah,
            actual: actualAyah,
            isCorrect,
          };
        }
      } else {
        // scopeMode === 'surah': Tebak nomor ayat pertama yang dibaca setelah pemantik
        if (quizConfig.guessAyahNumber) {
          const firstContinuationAyah = firstContinuation.ayahNumber;
          const actualAyah = guessAyahInput ? Number(guessAyahInput) : undefined;
          answers.ayahNumber = actualAyah;
          const isCorrect =
            actualAyah !== undefined && actualAyah === firstContinuationAyah;
          result.totalAnswered++;
          if (isCorrect) result.totalCorrect++;
          result.guessAyahNumber = {
            expected: firstContinuationAyah,
            actual: actualAyah,
            isCorrect,
          };
        }
      }

      const anyQuizEnabled =
        scopeMode === 'juz'
          ? quizConfig.guessSurah || quizConfig.guessPage || quizConfig.guessAyahNumber
          : quizConfig.guessAyahNumber;

      await finalizeAndSave(
        evalSummary,
        anyQuizEnabled ? answers : { skipped: true },
        anyQuizEnabled && result.totalAnswered > 0 ? result : null
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoadingDataset || !dataset) {
    return (
      <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
        Mengunduh data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Tes Hafalan Sambung Ayat
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Dengarkan ayat pemantik, sambung bacaan secara lisan, dan evaluasi hasil secara lokal di browser Anda.
          </p>
        </div>
        {step === 'result' && (
          <button
            type="button"
            onClick={() => setStep('setup')}
            className="rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            Ubah Pengaturan Tes
          </button>
        )}
      </div>

      {asr.modelState === 'downloading' && (
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--accent-primary)]/30 bg-[var(--accent-soft)] px-4 py-3 text-xs text-[var(--text-primary)]">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)] shrink-0" />
            <span>
              {asr.statusMessage ?? 'Mengunduh data...'}
            </span>
          </div>
          <span className="font-semibold tabular-nums text-[var(--accent-primary)]">
            {asr.progress?.percent ?? 0}%
          </span>
        </div>
      )}

      {step === 'setup' && (
        <section className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-6">
          {setupError && (
            <StatusBanner tone="error" title="Pengaturan Tidak Valid">
              <p>{setupError}</p>
            </StatusBanner>
          )}

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[var(--text-secondary)]">
              Cakupan Pemilihan Ayat Pemantik
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setScopeMode('juz');
                  saveTestConfig({ scopeMode: 'juz' });
                }}
                className={`min-h-[42px] rounded-[10px] border px-4 py-2 text-xs font-semibold transition-colors ${
                  scopeMode === 'juz'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                Rentang Juz (1–30)
              </button>
              <button
                type="button"
                onClick={() => {
                  setScopeMode('surah');
                  saveTestConfig({ scopeMode: 'surah' });
                }}
                className={`min-h-[42px] rounded-[10px] border px-4 py-2 text-xs font-semibold transition-colors ${
                  scopeMode === 'surah'
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                Pilih Satu Surah Tertentu
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {scopeMode === 'juz'
                ? `Ayat pemantik akan dipilih secara acak dari rentang Juz ${juzStart} sampai Juz ${juzEnd}.`
                : `Ayat pemantik akan dipilih secara acak dari Surah ${surahMap.get(selectedSurah)?.nameLatin ?? selectedSurah}. Kelanjutan ayat dibatasi dalam surah yang sama.`}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {scopeMode === 'juz' ? (
              <>
                <div>
                  <label
                    htmlFor="juz-start"
                    className="block text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Dari Juz
                  </label>
                  <select
                    id="juz-start"
                    value={juzStart}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setJuzStart(val);
                      saveTestConfig({ juzStart: val });
                    }}
                    className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm font-medium tabular-nums"
                  >
                    {availableJuz.map((j) => (
                      <option key={j} value={j}>
                        Juz {j}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="juz-end"
                    className="block text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    Sampai Juz
                  </label>
                  <select
                    id="juz-end"
                    value={juzEnd}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setJuzEnd(val);
                      saveTestConfig({ juzEnd: val });
                    }}
                    className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm font-medium tabular-nums"
                  >
                    {availableJuz.map((j) => (
                      <option key={j} value={j}>
                        Juz {j}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label
                  htmlFor="test-surah-select"
                  className="block text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Pilih Surah
                </label>
                <select
                  id="test-surah-select"
                  value={selectedSurah}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelectedSurah(val);
                    saveTestConfig({ selectedSurah: val });
                  }}
                  className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm font-medium"
                >
                  {dataset.surahs.map((s) => (
                    <option key={s.surahNumber} value={s.surahNumber}>
                      {s.surahNumber}. {s.nameLatin} ({s.totalAyahs} ayat)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="target-ayah-count"
                className="block text-xs font-semibold text-[var(--text-secondary)]"
              >
                Jumlah Ayat Lanjutan
              </label>
              <select
                id="target-ayah-count"
                value={targetAyahCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTargetAyahCount(val);
                  saveTestConfig({ targetAyahCount: val });
                }}
                className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm font-medium tabular-nums"
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count} ayat
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Jumlah ayat lanjutan setelah pemantik (soal pemantik tidak dihitung).
              </p>
            </div>
          </div>

          <fieldset className="space-y-2 border-t border-[var(--border-default)] pt-5">
            <legend className="text-sm font-semibold text-[var(--text-primary)]">
              Kuis Tambahan (Opsional)
            </legend>
            <p className="text-xs text-[var(--text-muted)]">
              Pertanyaan opsional seputar kelanjutan ayat. Kuis ini terpisah dan tidak memengaruhi penilaian suara.
            </p>
            {scopeMode === 'juz' ? (
              <div className="grid gap-2.5 pt-1 sm:grid-cols-3">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={quizConfig.guessSurah}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setQuizConfig((prev) => {
                        const next = { ...prev, guessSurah: checked };
                        saveTestConfig({ quizConfig: next });
                        return next;
                      });
                    }}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                  <span>Tebak nama surah</span>
                </label>

                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={quizConfig.guessPage}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setQuizConfig((prev) => {
                        const next = { ...prev, guessPage: checked };
                        saveTestConfig({ quizConfig: next });
                        return next;
                      });
                    }}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                  <span>Tebak nomor halaman</span>
                </label>

                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={quizConfig.guessAyahNumber}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setQuizConfig((prev) => {
                        const next = { ...prev, guessAyahNumber: checked };
                        saveTestConfig({ quizConfig: next });
                        return next;
                      });
                    }}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                  <span>Tebak nomor ayat pertama</span>
                </label>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 pt-1">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm w-full sm:w-auto">
                  <input
                    type="checkbox"
                    checked={quizConfig.guessAyahNumber}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setQuizConfig((prev) => {
                        const next = { ...prev, guessAyahNumber: checked };
                        saveTestConfig({ quizConfig: next });
                        return next;
                      });
                    }}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                  <span>Tebak nomor ayat pertama</span>
                </label>
              </div>
            )}
          </fieldset>

          <div className="flex items-center justify-between gap-4 border-t border-[var(--border-default)] pt-5">
            <p className="text-xs text-[var(--text-muted)]">
              Izin mikrofon hanya diminta saat Anda menekan tombol rekam.
            </p>
            <button
              type="button"
              disabled={isStartingTest}
              onClick={startTest}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-[10px] bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isStartingTest ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{isStartingTest ? 'Memilih Ayat...' : 'Mulai Tes'}</span>
            </button>
          </div>
        </section>
      )}

      {step === 'reciting' && selection && (
        <section className="space-y-5">
          <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                1. Dengarkan Ayat Pemantik
              </h2>
              <span className="tabular-nums rounded-[6px] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {scopeMode === 'surah'
                  ? `Surah ${surahMap.get(selectedSurah)?.nameLatin ?? selectedSurah}`
                  : `Cakupan Juz ${juzStart}–${juzEnd}`}{' '}
                • Target {selection.expectedContinuation.length} ayat lanjutan
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={playPromptAudio}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white"
              >
                {promptAudioError ? (
                  <>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>Muat Ulang Audio</span>
                  </>
                ) : isAudioPlaying ? (
                  <>
                    <Volume2 className="h-4 w-4 animate-pulse text-[var(--accent-primary)]" aria-hidden="true" />
                    <span>Memutar Audio...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    <span>Putar Audio Pemantik</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPromptTextFallback((v) => !v)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {showPromptTextFallback
                    ? 'Sembunyikan Teks'
                    : 'Lihat Teks Pemantik'}
                </span>
              </button>
            </div>

            {showPromptTextFallback && (
              <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4">
                <p
                  className="font-quran text-right text-[var(--text-primary)]"
                  lang="ar"
                  style={{ fontSize: `${preferences.arabicFontSizePx}px` }}
                >
                  {selection.promptAyah.textUthmaniMsi}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                2. Rekam Bacaan Ayat Lanjutan
              </h2>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Status:{' '}
                <strong>
                  {recorder.status === 'idle' && (recorder.recordedAudio ? 'Rekaman siap' : 'Siap merekam')}
                  {recorder.status === 'recording' &&
                    `Merekam (${recorder.elapsedSec} dtk)`}
                  {recorder.status === 'processing' && 'Memproses audio lokal...'}
                  {recorder.status === 'ready' && 'Rekaman siap dievaluasi'}
                  {recorder.status === 'mic-denied' && 'Izin mikrofon ditolak'}
                  {recorder.status === 'unsupported-browser' &&
                    'Browser tidak didukung'}
                  {recorder.status === 'error' && 'Terjadi kendala'}
                </strong>
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              {recorder.status === 'idle' && !recorder.recordedAudio && 'Mulai membaca ayat lanjutan setelah ayat pemantik.'}
              {recorder.status === 'recording' && 'Sedang merekam. Bacalah ayat lanjutan dengan jelas.'}
              {recorder.status === 'processing' && 'Memproses rekaman audio lokal di browser...'}
              {recorder.status === 'ready' && 'Rekaman selesai. Dengarkan kembali sebelum mengirim jawaban.'}
              {recorder.status === 'mic-denied' && 'Izin mikrofon belum diberikan. Aktifkan izin mikrofon pada pengaturan browser.'}
              {recorder.status === 'unsupported-browser' && 'Browser belum mendukung perekaman mikrofon.'}
              {recorder.status === 'error' && (recorder.errorMessage ?? 'Suara belum berhasil direkam. Periksa mikrofon dan coba kembali.')}
            </p>

            {recorder.errorMessage && (
              <StatusBanner tone="error" title="Kendala Mikrofon">
                <p>{recorder.errorMessage}</p>
              </StatusBanner>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {recorder.status !== 'recording' ? (
                <button
                  type="button"
                  disabled={recorder.status === 'unsupported-browser'}
                  onClick={recorder.startRecording}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-[10px] bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {recorder.recordedAudio ? 'Rekam Ulang' : 'Mulai Rekam'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={recorder.stopRecording}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-[10px] bg-[#B91C1C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#991B1B]"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  <span>Selesai Merekam</span>
                </button>
              )}

            {recorder.recordedAudio && (
                <button
                  type="button"
                  onClick={recorder.resetRecording}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-[10px] border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Ulangi</span>
                </button>
              )}
            </div>

            {recorder.status === 'recording' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Level input mikrofon</span>
                  <span className="tabular-nums">{recorder.micLevel}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-full bg-[var(--accent-primary)] transition-all duration-75"
                    style={{ width: `${recorder.micLevel}%` }}
                  />
                </div>
              </div>
            )}

            {recorder.recordedAudio && (
              <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3 space-y-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                  Pratinjau rekaman lokal ({recorder.recordedAudio.durationSec.toFixed(1)}{' '}
                  detik — hanya tersimpan di memori browser):
                </p>
                <audio
                  controls
                  src={recorder.recordedAudio.previewUrl}
                  className="w-full"
                />
              </div>
            )}

            {/* Bagian 3: Kuis Tambahan (Jawaban Anda) */}
            {scopeMode === 'juz' ? (
              (quizConfig.guessSurah ||
                quizConfig.guessPage ||
                quizConfig.guessAyahNumber) && (
                <div className="border-t border-[var(--border-default)] pt-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      3. Kuis Tambahan (Opsional)
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      Jawab pertanyaan berikut mengenai bacaan lanjutan Anda (ayat pemantik tidak dihitung).
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {quizConfig.guessSurah && (
                      <div
                        className={
                          quizConfig.guessPage || quizConfig.guessAyahNumber
                            ? ''
                            : 'sm:col-span-3'
                        }
                      >
                        <label
                          htmlFor="quiz-surah"
                          className="block text-xs font-semibold text-[var(--text-secondary)]"
                        >
                          Nama Surah
                        </label>
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                          Pada surah apa jawaban Anda?
                        </p>
                        <select
                          id="quiz-surah"
                          value={guessSurahInput}
                          onChange={(e) => setGuessSurahInput(e.target.value)}
                          className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-sm font-medium"
                        >
                          <option value="">-- Pilih Surah --</option>
                          {dataset.surahs.map((s) => (
                            <option key={s.surahNumber} value={s.surahNumber}>
                              {s.surahNumber}. {s.nameLatin}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {quizConfig.guessPage && (
                      <div>
                        <label
                          htmlFor="quiz-page"
                          className="block text-xs font-semibold text-[var(--text-secondary)]"
                        >
                          Nomor Halaman Mushaf (1–604)
                        </label>
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                          Pada halaman berapa jawaban Anda?
                        </p>
                        <input
                          id="quiz-page"
                          type="number"
                          min={1}
                          max={604}
                          value={guessPageInput}
                          onChange={(e) => setGuessPageInput(e.target.value)}
                          placeholder="Contoh: 347"
                          className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-sm tabular-nums"
                        />
                      </div>
                    )}

                    {quizConfig.guessAyahNumber && (
                      <div>
                        <label
                          htmlFor="quiz-ayah"
                          className="block text-xs font-semibold text-[var(--text-secondary)]"
                        >
                          Nomor Ayat Pertama yang Dibaca
                        </label>
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                          Nomor ayat berapa jawaban Anda?
                        </p>
                        <input
                          id="quiz-ayah"
                          type="number"
                          min={1}
                          max={286}
                          value={guessAyahInput}
                          onChange={(e) => setGuessAyahInput(e.target.value)}
                          placeholder="Contoh: 75"
                          className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-sm tabular-nums"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              quizConfig.guessAyahNumber && (
                <div className="border-t border-[var(--border-default)] pt-5 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      3. Kuis Tambahan (Opsional)
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      Masukkan nomor ayat pertama yang Anda baca setelah ayat pemantik. Nomor ayat pemantik tidak dihitung.
                    </p>
                  </div>

                  <div className="max-w-xs">
                    <label
                      htmlFor="quiz-ayah"
                      className="block text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      Nomor Ayat Pertama yang Dibaca
                    </label>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      Nomor ayat berapa jawaban Anda?
                    </p>
                    <input
                      id="quiz-ayah"
                      type="number"
                      min={1}
                      max={286}
                      value={guessAyahInput}
                      onChange={(e) => setGuessAyahInput(e.target.value)}
                      placeholder="Contoh: 75"
                      className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                </div>
              )
            )}

            {/* Tombol Aksi Bawah */}
            <div className="flex justify-end border-t border-[var(--border-default)] pt-4">
              <button
                type="button"
                disabled={isEvaluating || recorder.status === 'recording'}
                onClick={handleEvaluateAndSubmit}
                className="w-full sm:w-auto inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[10px] bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {isEvaluating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isEvaluating ? 'Mengirim Jawaban...' : 'Kirim Jawaban & Evaluasi'}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'result' && selection && evaluation && (
        <section className="space-y-5">
          <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Hasil Evaluasi Bacaan
              </h2>
              <span
                className={`rounded-[6px] px-3 py-1 text-xs font-semibold ${
                  evaluation.status === 'matched'
                    ? 'bg-[var(--status-match-bg)] text-[var(--status-match)]'
                    : evaluation.status === 'partial'
                      ? 'bg-[var(--status-info-bg)] text-[var(--status-info)]'
                      : evaluation.status === 'unratable'
                        ? 'bg-[var(--status-uncertain-bg)] text-[var(--status-uncertain)]'
                        : 'bg-[var(--status-miss-bg)] text-[var(--status-miss)]'
                }`}
              >
                {evaluation.status === 'matched' && 'Cocok dengan target'}
                {evaluation.status === 'partial' && 'Cocok sebagian'}
                {evaluation.status === 'unratable' &&
                  'Belum dapat dinilai / Coba ulang'}
                {evaluation.status === 'mismatch' && 'Tidak sesuai target'}
              </span>
            </div>

            {evaluation.status === 'unratable' && asrWarning && (
              <StatusBanner
                tone="warning"
                title="Penilaian Suara Belum Tersedia"
              >
                <p>{asrWarning}</p>
              </StatusBanner>
            )}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)] tabular-nums">
                <span>Kata cocok: <strong>{evaluation.matchedWordCount}</strong> / {evaluation.expectedWordCount}</span>
                <span>• Terlewat: <strong>{evaluation.missedCount}</strong></span>
                <span>• Berbeda: <strong>{evaluation.substitutedCount}</strong></span>
                <span>• Tambahan: <strong>{evaluation.extraCount}</strong></span>
              </div>

              {/* Panduan Keterangan Warna Status Kata */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)] border-y border-[var(--border-default)] py-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-[3px] bg-[var(--status-match-bg)] border border-[var(--status-match)]" />
                  <strong>Cocok:</strong> Terdeteksi sesuai teks target.
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-[3px] bg-[var(--status-miss-bg)] border border-[var(--status-miss)]" />
                  <strong>Terlewat:</strong> Kata target tidak terdeteksi dalam bacaan.
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-[3px] bg-[var(--status-uncertain-bg)] border border-[var(--status-uncertain)]" />
                  <strong>Berbeda:</strong> Kata yang terdeteksi berbeda dari target.
                </span>
              </div>

              <div
                dir="rtl"
                lang="ar"
                className="flex flex-wrap gap-2 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4"
              >
                {evaluation.wordAlignments.map((item, idx) => {
                  const statusDesc =
                    item.status === 'matched'
                      ? 'Cocok'
                      : item.status === 'missed'
                        ? 'Terlewat'
                        : item.status === 'substituted'
                          ? 'Berbeda'
                          : item.status === 'extra'
                            ? 'Tambahan'
                            : 'Belum dinilai';
                  return (
                    <span
                      key={idx}
                      className={`font-quran rounded-[6px] px-2 py-0.5 text-xl ${
                        item.status === 'matched'
                          ? 'bg-[var(--status-match-bg)] text-[var(--status-match)]'
                          : item.status === 'missed'
                            ? 'bg-[var(--status-miss-bg)] text-[var(--status-miss)] underline decoration-dashed'
                            : item.status === 'substituted'
                              ? 'bg-[var(--status-uncertain-bg)] text-[var(--status-uncertain)]'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                      }`}
                      title={`Kata: ${item.expectedWord ?? item.recognizedWord} • Status: ${statusDesc}`}
                      aria-label={`${item.expectedWord ?? item.recognizedWord}: ${statusDesc}`}
                    >
                      {item.expectedWord ?? item.recognizedWord}
                    </span>
                  );
                })}
              </div>

              <p className="text-[11px] text-[var(--text-muted)] italic leading-relaxed">
                * {evaluation.disclaimer}
              </p>

              {resultAudioUrl && (
                <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                    <Volume2 className="h-4 w-4 text-[var(--accent-primary)]" />
                    <span>Dengarkan Rekaman Bacaan Anda:</span>
                  </div>
                  <audio
                    controls
                    src={resultAudioUrl}
                    className="w-full h-9 rounded-lg accent-[var(--accent-primary)]"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Referensi Ayat MSI
            </h3>

            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
                Ayat Pemantik (Soal): Surah{' '}
                {surahMap.get(selection.promptAyah.surahNumber)?.nameLatin} (
                {selection.promptAyah.surahNumber}:
                {selection.promptAyah.ayahNumber}) • Hal. MSI{' '}
                {selection.promptAyah.pageNumberMsi}
              </p>
              <p
                className="font-quran text-right text-[var(--text-primary)]"
                lang="ar"
                style={{ fontSize: `${preferences.arabicFontSizePx}px` }}
              >
                {selection.promptAyah.textUthmaniMsi}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Urutan Ayat Lanjutan yang Seharusnya Dibaca:
              </p>
              {selection.expectedContinuation.map((ayah) => (
                <div
                  key={`${ayah.surahNumber}:${ayah.ayahNumber}`}
                  className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4"
                >
                  <p className="mb-1 text-xs font-medium text-[var(--accent-primary)] tabular-nums">
                    {ayah.surahNumber}:{ayah.ayahNumber} • Hal. MSI{' '}
                    {ayah.pageNumberMsi}
                  </p>
                  <p
                    className="font-quran text-right text-[var(--text-primary)]"
                    lang="ar"
                    style={{ fontSize: `${preferences.arabicFontSizePx}px` }}
                  >
                    {ayah.textUthmaniMsi}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {metadataResult && metadataResult.totalAnswered > 0 && (
            <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {scopeMode === 'surah' ? 'Hasil Tebak Nomor Ayat Pertama' : 'Hasil Kuis Tambahan'}
                </h3>
                <span className="tabular-nums text-xs font-semibold text-[var(--accent-primary)]">
                  {scopeMode === 'surah' && metadataResult.guessAyahNumber
                    ? metadataResult.guessAyahNumber.isCorrect
                      ? 'Benar (1 / 1)'
                      : 'Salah (0 / 1)'
                    : `Skor: ${metadataResult.totalCorrect} / ${metadataResult.totalAnswered}`}
                </span>
              </div>

              <div className="space-y-2.5">
                {metadataResult.guessSurah && (
                  <div className="flex flex-wrap justify-between gap-2 rounded-[8px] bg-[var(--bg-canvas)] px-3 py-2 text-sm">
                    <span>Nama Surah (Ayat Pertama)</span>
                    <span
                      className={
                        metadataResult.guessSurah.isCorrect
                          ? 'font-semibold text-[var(--status-match)]'
                          : 'font-semibold text-[var(--status-miss)]'
                      }
                    >
                      {metadataResult.guessSurah.isCorrect
                        ? `Benar (${metadataResult.guessSurah.expectedLabel})`
                        : `Jawaban Anda: ${metadataResult.guessSurah.actualLabel} — Seharusnya: ${metadataResult.guessSurah.expectedLabel}`}
                    </span>
                  </div>
                )}

                {metadataResult.guessPage && (
                  <div className="flex flex-wrap justify-between gap-2 rounded-[8px] bg-[var(--bg-canvas)] px-3 py-2 text-sm">
                    <span>Halaman Mushaf (Ayat Pertama)</span>
                    <span
                      className={
                        metadataResult.guessPage.isCorrect
                          ? 'font-semibold text-[var(--status-match)]'
                          : 'font-semibold text-[var(--status-miss)]'
                      }
                    >
                      {metadataResult.guessPage.isCorrect
                        ? `Benar (${metadataResult.guessPage.expectedLabel})`
                        : `Jawaban Anda: ${metadataResult.guessPage.actualLabel} — Seharusnya: ${metadataResult.guessPage.expectedLabel}`}
                    </span>
                  </div>
                )}

                {metadataResult.guessAyahNumber && (
                  <div className="flex flex-wrap justify-between gap-2 rounded-[8px] bg-[var(--bg-canvas)] px-3 py-2 text-sm">
                    <span>Nomor Ayat Pertama yang Dibaca</span>
                    <span
                      className={
                        metadataResult.guessAyahNumber.isCorrect
                          ? 'font-semibold text-[var(--status-match)]'
                          : 'font-semibold text-[var(--status-miss)]'
                      }
                    >
                      {metadataResult.guessAyahNumber.isCorrect
                        ? `Benar (Ayat ${metadataResult.guessAyahNumber.expected})`
                        : `Jawaban Anda: ${metadataResult.guessAyahNumber.actual ?? 'Tidak dijawab'} — Seharusnya: Ayat ${metadataResult.guessAyahNumber.expected}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startTest}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Tes Berikutnya</span>
            </button>

            <button
              type="button"
              onClick={() => {
                recorder.resetRecording();
                setStep('reciting');
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Ulangi Ayat Ini</span>
            </button>

            {(() => {
              const preferredMode = preferences.defaultReaderMode ?? 'page';
              const targetUrl =
                preferredMode === 'page'
                  ? `/baca?mode=page&page=${selection.promptAyah.pageNumberMsi}`
                  : `/baca?mode=ayah&surah=${selection.promptAyah.surahNumber}&ayah=${selection.promptAyah.ayahNumber}`;
              return (
                <Link
                  to={targetUrl}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  <span>Lihat di Qur’an</span>
                </Link>
              );
            })()}
          </div>
        </section>
      )}
    </div>
  );
}

