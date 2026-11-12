import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check,
  Download,
  Eye,
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
  pickRandomPromptWithContinuationAsync,
  type RandomPromptSelection,
} from '../../data/quran/datasetAdapter';
import { useAudioRecorder } from '../../lib/audio-recorder/useAudioRecorder';
import { useLocalAsr } from '../../lib/asr-client/useLocalAsr';
import { savePracticeSession } from '../../lib/storage/sessionHistory';
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

  const [juzStart, setJuzStart] = useState<number>(1);
  const [juzEnd, setJuzEnd] = useState<number>(30);
  const [targetAyahCount, setTargetAyahCount] = useState<number>(
    preferences.defaultTargetAyahCount
  );
  const [quizConfig, setQuizConfig] = useState<MetadataQuizConfig>({
    guessSurah: true,
    guessPage: true,
    guessAyahNumber: true,
  });

  useEffect(() => {
    const paramStart = Number(searchParams.get('juzStart'));
    const paramEnd = Number(searchParams.get('juzEnd'));
    if (availableJuz.length > 0) {
      setJuzStart(
        availableJuz.includes(paramStart) ? paramStart : availableJuz[0]!
      );
      setJuzEnd(
        availableJuz.includes(paramEnd)
          ? paramEnd
          : availableJuz[availableJuz.length - 1]!
      );
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
  const [showPromptTextFallback, setShowPromptTextFallback] = useState(false);
  const [manualTranscript, setManualTranscript] = useState('');
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

  const startTest = async () => {
    if (!dataset) return;
    setSetupError(null);

    if (juzStart > juzEnd) {
      setSetupError(
        'Juz awal tidak boleh lebih besar daripada Juz akhir.'
      );
      return;
    }

    setIsStartingTest(true);
    try {
      const picked = await pickRandomPromptWithContinuationAsync(
        dataset,
        juzStart,
        juzEnd,
        targetAyahCount
      );

      if (!picked) {
        setSetupError(
          'Tidak ditemukan ayat pemantik dengan lanjutan yang valid pada rentang juz tersebut.'
        );
        return;
      }

      promptAudioRef.current?.pause();
      setSelection(picked);
      setPromptAudioError(null);
      setShowPromptTextFallback(false);
      setManualTranscript('');
      setGuessSurahInput('');
      setGuessPageInput('');
      setGuessAyahInput('');
      setEvaluation(null);
      setAsrWarning(null);
      setMetadataResult(null);
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
    if (!audioUrl) return;
    setPromptAudioError(null);
    promptAudioRef.current?.pause();
    const audio = new Audio(audioUrl);
    promptAudioRef.current = audio;
    audio.play().catch(() => {
      setPromptAudioError(
        'Audio pemantik dari CDN gagal diputar. Anda dapat menampilkan teks pemantik sebagai bantuan.'
      );
    });
  };

  const finishRecitationAndProceed = async () => {
    if (!selection) return;

    const manual = manualTranscript.trim();
    setAsrWarning(null);
    setIsEvaluating(true);

    try {
      let evalSummary: RecitationEvaluationSummary;

      if (manual.length > 0) {
        evalSummary = evaluateRecitation({
          recognizedTranscript: manual,
          expectedAyahs: selection.expectedContinuation,
          confidence: 0.88,
          confidenceThreshold: preferences.asrConfidenceThreshold,
        });
      } else if (recorder.recordedAudio) {
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

      const anyQuizEnabled =
        quizConfig.guessSurah ||
        quizConfig.guessPage ||
        quizConfig.guessAyahNumber;

      if (anyQuizEnabled) {
        setStep('quiz');
      } else {
        await finalizeAndSave(evalSummary, { skipped: true }, null);
      }
    } finally {
      setIsEvaluating(false);
    }
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
      selectedJuzStart: juzStart,
      selectedJuzEnd: juzEnd,
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

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selection || !evaluation) return;

    const prompt = selection.promptAyah;
    const expectedSurah = surahMap.get(prompt.surahNumber);

    const result: MetadataQuizResult = {
      totalAnswered: 0,
      totalCorrect: 0,
    };

    const answers: MetadataQuizAnswers = {};

    if (quizConfig.guessSurah) {
      const actualSurah = guessSurahInput ? Number(guessSurahInput) : undefined;
      answers.surahNumber = actualSurah;
      const isCorrect = actualSurah === prompt.surahNumber;
      result.totalAnswered++;
      if (isCorrect) result.totalCorrect++;
      result.guessSurah = {
        expected: prompt.surahNumber,
        expectedLabel: expectedSurah
          ? `${expectedSurah.surahNumber}. ${expectedSurah.nameLatin}`
          : `Surah ${prompt.surahNumber}`,
        actual: actualSurah,
        actualLabel: actualSurah
          ? `${actualSurah}. ${surahMap.get(actualSurah)?.nameLatin ?? ''}`
          : 'Tidak dijawab',
        isCorrect,
      };
    }

    if (quizConfig.guessPage) {
      const actualPage = guessPageInput ? Number(guessPageInput) : undefined;
      answers.pageNumberMsi = actualPage;
      const isCorrect = actualPage === prompt.pageNumberMsi;
      result.totalAnswered++;
      if (isCorrect) result.totalCorrect++;
      result.guessPage = {
        expected: prompt.pageNumberMsi,
        actual: actualPage,
        isCorrect,
      };
    }

    if (quizConfig.guessAyahNumber) {
      const actualAyah = guessAyahInput ? Number(guessAyahInput) : undefined;
      answers.ayahNumber = actualAyah;
      const isCorrect = actualAyah === prompt.ayahNumber;
      result.totalAnswered++;
      if (isCorrect) result.totalCorrect++;
      result.guessAyahNumber = {
        expected: prompt.ayahNumber,
        actual: actualAyah,
        isCorrect,
      };
    }

    await finalizeAndSave(evaluation, answers, result);
  };

  const handleSkipQuiz = async () => {
    if (!evaluation) return;
    await finalizeAndSave(evaluation, { skipped: true }, null);
  };

  if (isLoadingDataset || !dataset) {
    return (
      <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
        Menyiapkan data tes hafalan...
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
            Rekaman suara dan pengenalan bacaan berjalan lokal di browser Anda.
          </p>
        </div>
        {step !== 'setup' && (
          <button
            type="button"
            onClick={() => setStep('setup')}
            className="rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            Ubah Pengaturan Tes
          </button>
        )}
      </div>

      {step === 'setup' && (
        <section className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-6">
          {setupError && (
            <StatusBanner tone="error" title="Pengaturan Tidak Valid">
              <p>{setupError}</p>
            </StatusBanner>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
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
                onChange={(e) => setJuzStart(Number(e.target.value))}
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
                onChange={(e) => setJuzEnd(Number(e.target.value))}
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
                htmlFor="target-ayah-count"
                className="block text-xs font-semibold text-[var(--text-secondary)]"
              >
                Target Ayat Lanjutan
              </label>
              <select
                id="target-ayah-count"
                value={targetAyahCount}
                onChange={(e) => setTargetAyahCount(Number(e.target.value))}
                className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm font-medium tabular-nums"
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count} ayat
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-3 border-t border-[var(--border-default)] pt-5">
            <legend className="text-sm font-semibold text-[var(--text-primary)]">
              Kuis Metadata Opsional (mengacu pada ayat pemantik)
            </legend>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={quizConfig.guessSurah}
                  onChange={(e) =>
                    setQuizConfig((prev) => ({
                      ...prev,
                      guessSurah: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--accent-primary)]"
                />
                <span>Tebak nama surah</span>
              </label>

              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={quizConfig.guessPage}
                  onChange={(e) =>
                    setQuizConfig((prev) => ({
                      ...prev,
                      guessPage: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--accent-primary)]"
                />
                <span>Tebak halaman</span>
              </label>

              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3.5 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={quizConfig.guessAyahNumber}
                  onChange={(e) =>
                    setQuizConfig((prev) => ({
                      ...prev,
                      guessAyahNumber: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--accent-primary)]"
                />
                <span>Tebak nomor ayat</span>
              </label>
            </div>
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
              <Play className="h-4 w-4" aria-hidden="true" />
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
                Cakupan Juz {juzStart}–{juzEnd} • Target{' '}
                {selection.expectedContinuation.length} ayat lanjutan
              </span>
            </div>

            {selection.promptAyah.audioUrl && !promptAudioError ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={playPromptAudio}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Putar Audio Pemantik</span>
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
            ) : (
              <StatusBanner tone="warning" title="Audio Pemantik Tidak Tersedia">
                <p>
                  {promptAudioError ??
                    'Audio untuk ayat pemantik ini tidak tersedia dari API. Anda dapat menampilkan teks ayat pemantik sebagai bantuan untuk melanjutkan sambung ayat.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPromptTextFallback((v) => !v)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] border border-[#F59E0B] bg-white px-3 py-1.5 text-xs font-semibold text-[#78350F]"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {showPromptTextFallback
                      ? 'Sembunyikan Teks Pemantik'
                      : 'Tampilkan Teks Pemantik'}
                  </span>
                </button>
              </StatusBanner>
            )}

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
                2. Rekam Bacaan Lanjutan
              </h2>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Status:{' '}
                <strong>
                  {recorder.status === 'idle' && 'Siap merekam'}
                  {recorder.status === 'recording' &&
                    `Merekam (${recorder.elapsedSec} dtk)`}
                  {recorder.status === 'processing' && 'Memproses audio lokal...'}
                  {recorder.status === 'ready' && 'Rekaman siap dievaluasi'}
                  {recorder.status === 'mic-denied' && 'Izin mikrofon ditolak'}
                  {recorder.status === 'unsupported-browser' &&
                    'Browser tidak didukung'}
                  {recorder.status === 'error' && 'Terjadi kesalahan'}
                </strong>
              </span>
            </div>

            {recorder.errorMessage && (
              <StatusBanner tone="error" title="Kendala Mikrofon">
                <p>{recorder.errorMessage}</p>
              </StatusBanner>
            )}

            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Model ASR Lokal (Web Worker ONNX):{' '}
                  <strong>
                    {asr.modelState === 'unloaded' && 'Belum dimuat (lazy)'}
                    {asr.modelState === 'downloading' && 'Mengunduh...'}
                    {asr.modelState === 'ready' && 'Siap di perangkat'}
                    {asr.modelState === 'processing' && 'Memproses...'}
                    {asr.modelState === 'error' && 'Belum tersedia'}
                    {asr.modelState === 'unsupported' && 'Tidak didukung'}
                  </strong>
                </span>

                {asr.modelState === 'unloaded' && (
                  <button
                    type="button"
                    onClick={asr.initModel}
                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border-strong)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Muat Model ASR Lokal</span>
                  </button>
                )}
              </div>

              {asr.modelState === 'downloading' && asr.progress && (
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-default)]">
                    <div
                      className="h-full bg-[var(--accent-primary)] transition-all"
                      style={{ width: `${asr.progress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] tabular-nums">
                    {asr.progress.percent}%
                  </p>
                </div>
              )}

              {asr.statusMessage && (
                <p className="text-xs text-[var(--text-muted)]">
                  {asr.statusMessage}
                </p>
              )}
            </div>

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

            <div className="border-t border-[var(--border-default)] pt-4 space-y-2">
              <label
                htmlFor="manual-transcript-input"
                className="block text-xs font-medium text-[var(--text-secondary)]"
              >
                Transkripsi Uji Lokal (opsional jika model ONNX belum terpasang)
              </label>
              <textarea
                id="manual-transcript-input"
                dir="rtl"
                lang="ar"
                rows={2}
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                placeholder="Tempel atau ketik bacaan Arab di sini untuk menguji pencocokan ayat..."
                className="font-quran w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3.5 py-2 text-lg"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={
                  isEvaluating ||
                  (!recorder.recordedAudio &&
                    manualTranscript.trim().length === 0)
                }
                onClick={finishRecitationAndProceed}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-[10px] bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>
                  {isEvaluating
                    ? 'Memproses Evaluasi Lokal...'
                    : 'Lanjut ke Evaluasi'}
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'quiz' && selection && (
        <section className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Kuis Metadata Ayat Pemantik
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Jawab berdasarkan ayat pemantik yang diperdengarkan sebelum
              membuka kunci jawaban.
            </p>
          </div>

          <form onSubmit={handleSubmitQuiz} className="space-y-4">
            {quizConfig.guessSurah && (
              <div>
                <label
                  htmlFor="quiz-surah"
                  className="block text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Nama Surah (ayat pemantik)
                </label>
                <select
                  id="quiz-surah"
                  value={guessSurahInput}
                  onChange={(e) => setGuessSurahInput(e.target.value)}
                  className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm"
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
                  Nomor Halaman Mushaf MSI (1–604)
                </label>
                <input
                  id="quiz-page"
                  type="number"
                  min={1}
                  max={604}
                  value={guessPageInput}
                  onChange={(e) => setGuessPageInput(e.target.value)}
                  placeholder="Contoh: 604"
                  className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm tabular-nums"
                />
              </div>
            )}

            {quizConfig.guessAyahNumber && (
              <div>
                <label
                  htmlFor="quiz-ayah"
                  className="block text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Nomor Ayat Pemantik
                </label>
                <input
                  id="quiz-ayah"
                  type="number"
                  min={1}
                  max={286}
                  value={guessAyahInput}
                  onChange={(e) => setGuessAyahInput(e.target.value)}
                  placeholder="Contoh: 1"
                  className="mt-1.5 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm tabular-nums"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSkipQuiz}
                className="min-h-[44px] rounded-[10px] border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                Lewati Kuis
              </button>
              <button
                type="submit"
                className="min-h-[44px] rounded-[10px] bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Kirim Jawaban &amp; Lihat Hasil
              </button>
            </div>
          </form>
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
                  'Tidak dapat dinilai / Coba ulang'}
                {evaluation.status === 'mismatch' && 'Banyak bagian berbeda'}
              </span>
            </div>

            {evaluation.status === 'unratable' ? (
              <StatusBanner
                tone="warning"
                title={
                  asrWarning
                    ? 'Transkripsi ASR Lokal Belum Tersedia'
                    : 'Confidence ASR Rendah / Kosong'
                }
              >
                <p>
                  {asrWarning
                    ? asrWarning
                    : `Sistem tidak cukup yakin menilai bacaan Anda (confidence ${(evaluation.confidence * 100).toFixed(0)}%). Hal ini tidak otomatis berarti bacaan salah — Anda dapat mengulang rekaman di tempat yang lebih tenang.`}
                </p>
              </StatusBanner>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                  Kata cocok: {evaluation.matchedWordCount} /{' '}
                  {evaluation.expectedWordCount} • Terlewat:{' '}
                  {evaluation.missedCount} • Berbeda:{' '}
                  {evaluation.substitutedCount} • Tambahan:{' '}
                  {evaluation.extraCount}
                </p>
                <div
                  dir="rtl"
                  lang="ar"
                  className="flex flex-wrap gap-2 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-4"
                >
                  {evaluation.wordAlignments.map((item, idx) => (
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
                      title={`Status: ${item.status}`}
                    >
                      {item.expectedWord ?? item.recognizedWord}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-[var(--text-muted)]">
              {evaluation.disclaimer}
            </p>
          </div>

          <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Referensi Ayat MSI
            </h3>

            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
                Ayat Pemantik: Surah{' '}
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
                Urutan Ayat Lanjutan yang Seharusnya:
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

          {metadataResult && (
            <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Hasil Kuis Metadata
                </h3>
                <span className="tabular-nums text-xs font-semibold text-[var(--accent-primary)]">
                  Skor: {metadataResult.totalCorrect} /{' '}
                  {metadataResult.totalAnswered}
                </span>
              </div>

              <ul className="space-y-2 text-sm">
                {metadataResult.guessSurah && (
                  <li className="flex flex-wrap justify-between gap-2 rounded-[8px] bg-[var(--bg-canvas)] px-3 py-2">
                    <span>Nama Surah</span>
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
                  </li>
                )}
                {metadataResult.guessPage && (
                  <li className="flex flex-wrap justify-between gap-2 rounded-[8px] bg-[var(--bg-canvas)] px-3 py-2">
                    <span>Halaman MSI</span>
                    <span
                      className={
                        metadataResult.guessPage.isCorrect
                          ? 'font-semibold text-[var(--status-match)]'
                          : 'font-semibold text-[var(--status-miss)]'
                      }
                    >
                      {metadataResult.guessPage.isCorrect
                        ? `Benar (Hal. ${metadataResult.guessPage.expected})`
                        : `Jawaban Anda: ${metadataResult.guessPage.actual ?? '-'} — Seharusnya: Hal. ${metadataResult.guessPage.expected}`}
                    </span>
                  </li>
                )}
                {metadataResult.guessAyahNumber && (
                  <li className="flex flex-wrap justify-between gap-2 rounded-[8px] bg-[var(--bg-canvas)] px-3 py-2">
                    <span>Nomor Ayat</span>
                    <span
                      className={
                        metadataResult.guessAyahNumber.isCorrect
                          ? 'font-semibold text-[var(--status-match)]'
                          : 'font-semibold text-[var(--status-miss)]'
                      }
                    >
                      {metadataResult.guessAyahNumber.isCorrect
                        ? `Benar (Ayat ${metadataResult.guessAyahNumber.expected})`
                        : `Jawaban Anda: ${metadataResult.guessAyahNumber.actual ?? '-'} — Seharusnya: Ayat ${metadataResult.guessAyahNumber.expected}`}
                    </span>
                  </li>
                )}
              </ul>
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

            <Link
              to={`/baca?mode=ayah&surah=${selection.promptAyah.surahNumber}&ayah=${selection.promptAyah.ayahNumber}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              <VolumeX className="hidden" aria-hidden="true" />
              <span>Lihat Ayat di Pembaca</span>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

