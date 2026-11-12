import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Minus,
  Plus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Ayah, PageBundle } from '@hafalanku/quran-types';
import { useAppContext } from '../../app/AppContext';
import {
  getAvailablePagesMsi,
  getPageBundleData,
  getSurahAyahsData,
  getSurahMap,
} from '../../data/quran/datasetAdapter';
import { StatusBanner } from '../../components/StatusBanner';

export function QuranReaderPage() {
  const { dataset, isLoadingDataset, preferences, updatePreferences } =
    useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = searchParams.get('mode') === 'page' ? 'page' : 'ayah';

  const availablePages = useMemo(
    () => (dataset ? getAvailablePagesMsi(dataset) : []),
    [dataset]
  );
  const surahMap = useMemo(
    () => (dataset ? getSurahMap(dataset) : new Map()),
    [dataset]
  );

  const selectedSurah = useMemo(() => {
    const param = Number(searchParams.get('surah'));
    if (dataset && surahMap.has(param)) return param;
    return dataset?.surahs[0]?.surahNumber ?? 1;
  }, [dataset, searchParams, surahMap]);

  const selectedPage = useMemo(() => {
    const param = Number(searchParams.get('page'));
    if (availablePages.includes(param)) return param;
    return availablePages[0] ?? 1;
  }, [availablePages, searchParams]);

  const highlightedAyah = Number(searchParams.get('ayah')) || null;

  const [pageBundle, setPageBundle] = useState<PageBundle | null>(null);
  const [ayahsInSurah, setAyahsInSurah] = useState<Ayah[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [showPageImage, setShowPageImage] = useState(true);
  const [pageImageError, setPageImageError] = useState(false);
  const [pageAudioError, setPageAudioError] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const loadContent = useCallback(async () => {
    if (!dataset) return;
    setIsLoadingContent(true);
    setContentError(null);
    setAudioNotice(null);

    try {
      if (mode === 'page') {
        setPageImageError(false);
        setPageAudioError(false);
        const bundle = await getPageBundleData(dataset, selectedPage);
        setPageBundle(bundle);
      } else {
        const ayahs = await getSurahAyahsData(dataset, selectedSurah);
        setAyahsInSurah(ayahs);
      }
    } catch (err) {
      setContentError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data Al-Qur’an dari MyQuran API.'
      );
    } finally {
      setIsLoadingContent(false);
    }
  }, [dataset, mode, selectedPage, selectedSurah]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    return () => {
      activeAudioRef.current?.pause();
    };
  }, []);

  const setMode = (nextMode: 'page' | 'ayah') => {
    const next = new URLSearchParams(searchParams);
    next.set('mode', nextMode);
    if (nextMode === 'page' && !next.get('page') && availablePages[0]) {
      next.set('page', String(availablePages[0]));
    }
    setSearchParams(next, { replace: true });
  };

  const handlePageStep = (delta: number) => {
    const idx = availablePages.indexOf(selectedPage);
    if (idx === -1) return;
    const nextPage = availablePages[idx + delta];
    if (nextPage === undefined) return;
    setSearchParams({ mode: 'page', page: String(nextPage) });
  };

  const handleSurahSelect = (surahNum: number) => {
    setSearchParams({ mode: 'ayah', surah: String(surahNum) });
  };

  const handlePlayAyahAudio = (ayah: Ayah) => {
    if (!ayah.audioUrl) {
      setAudioNotice(
        `Audio untuk Surah ${ayah.surahNumber} ayat ${ayah.ayahNumber} tidak tersedia dari API.`
      );
      return;
    }

    activeAudioRef.current?.pause();
    const audio = new Audio(ayah.audioUrl);
    activeAudioRef.current = audio;
    audio.play().catch(() => {
      setAudioNotice(
        `Gagal memutar audio Surah ${ayah.surahNumber} ayat ${ayah.ayahNumber} dari CDN.`
      );
    });
  };

  if (isLoadingDataset || !dataset) {
    return (
      <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
        Memuat daftar surah...
      </div>
    );
  }

  const pageIdx = availablePages.indexOf(selectedPage);
  const currentSurahObj = surahMap.get(selectedSurah);
  const ayahsInPage = pageBundle?.ayahs ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Baca Al-Qur’an
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Sumber: MyQuran API v3 • Acuan evaluasi: Mushaf Standar Indonesia
            (MSI)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Mode pembaca"
            className="inline-flex rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'ayah'}
              onClick={() => setMode('ayah')}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                mode === 'ayah'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Mode Ayat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'page'}
              onClick={() => setMode('page')}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                mode === 'page'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Mode Halaman
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-2 py-1">
            <span className="px-1 text-xs text-[var(--text-secondary)]">
              Ukuran Arab
            </span>
            <button
              type="button"
              aria-label="Perkecil teks Arab"
              onClick={() =>
                updatePreferences({
                  arabicFontSizePx: Math.max(
                    22,
                    preferences.arabicFontSizePx - 2
                  ),
                })
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] hover:bg-[var(--bg-subtle)]"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="tabular-nums min-w-[2.5rem] text-center text-xs font-semibold">
              {preferences.arabicFontSizePx}px
            </span>
            <button
              type="button"
              aria-label="Perbesar teks Arab"
              onClick={() =>
                updatePreferences({
                  arabicFontSizePx: Math.min(
                    44,
                    preferences.arabicFontSizePx + 2
                  ),
                })
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] hover:bg-[var(--bg-subtle)]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {audioNotice && (
        <StatusBanner tone="warning" title="Audio Tidak Tersedia">
          <div className="flex items-center gap-2">
            <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{audioNotice}</span>
          </div>
        </StatusBanner>
      )}

      {contentError && (
        <StatusBanner
          tone="error"
          title="Gagal Memuat Halaman / Surah"
          action={
            <button
              type="button"
              onClick={loadContent}
              className="rounded-[8px] border border-[#FCA5A5] bg-white px-3 py-1.5 text-xs font-semibold text-[#7F1D1D]"
            >
              Coba Lagi
            </button>
          }
        >
          <p>{contentError}</p>
        </StatusBanner>
      )}

      {mode === 'page' ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
            <button
              type="button"
              disabled={pageIdx <= 0}
              onClick={() => handlePageStep(-1)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Halaman Sebelumnya</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="msi-page-select"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                Halaman
              </label>
              <select
                id="msi-page-select"
                value={selectedPage}
                onChange={(e) =>
                  setSearchParams({ mode: 'page', page: e.target.value })
                }
                className="tabular-nums rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-sm font-semibold"
              >
                {availablePages.map((p) => (
                  <option key={p} value={p}>
                    Hal. {p}
                  </option>
                ))}
              </select>

              {pageBundle?.imageUrl && (
                <button
                  type="button"
                  onClick={() => setShowPageImage((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {showPageImage ? 'Sembunyikan Gambar' : 'Gambar Mushaf'}
                  </span>
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={pageIdx === -1 || pageIdx >= availablePages.length - 1}
              onClick={() => handlePageStep(1)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-[var(--bg-subtle)]"
            >
              <span>Halaman Berikutnya</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {isLoadingContent ? (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
              Memuat halaman {selectedPage}...
            </div>
          ) : (
            <article className="mx-auto max-w-[740px] rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-7 sm:px-9 sm:py-9 space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3 text-xs text-[var(--text-muted)]">
                <span className="tabular-nums font-medium">
                  Halaman {selectedPage}
                </span>
                {ayahsInPage[0] && (
                  <span className="tabular-nums">
                    Juz {ayahsInPage[0].juzNumber}
                  </span>
                )}
              </div>

              {pageBundle?.audioUrl && !pageAudioError && (
                <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-3 space-y-1.5">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">
                    Audio Halaman {selectedPage}
                  </p>
                  <audio
                    controls
                    preload="none"
                    src={pageBundle.audioUrl}
                    onError={() => setPageAudioError(true)}
                    className="w-full"
                  />
                </div>
              )}

              {pageAudioError && (
                <StatusBanner tone="warning">
                  <p>
                    Audio halaman dari CDN sedang tidak dapat diputar. Teks ayat
                    tetap tersedia di bawah.
                  </p>
                </StatusBanner>
              )}

              {showPageImage && pageBundle?.imageUrl && !pageImageError && (
                <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[#FFFDF8] p-2">
                  <img
                    src={pageBundle.imageUrl}
                    alt={`Gambar mushaf halaman ${selectedPage}`}
                    loading="lazy"
                    onError={() => setPageImageError(true)}
                    className="mx-auto h-auto max-w-full"
                  />
                </div>
              )}

              {pageImageError && (
                <StatusBanner tone="warning">
                  <p>
                    Gambar mushaf halaman {selectedPage} gagal dimuat dari CDN.
                    Menampilkan teks ayat di bawah.
                  </p>
                </StatusBanner>
              )}

              <div className="space-y-4">
                {ayahsInPage.map((ayah, idx) => {
                  const prev = ayahsInPage[idx - 1];
                  const isNewSurah =
                    !prev || prev.surahNumber !== ayah.surahNumber;
                  const surah = surahMap.get(ayah.surahNumber);

                  return (
                    <div key={`${ayah.surahNumber}:${ayah.ayahNumber}`}>
                      {isNewSurah && surah && (
                        <div className="my-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-2 text-center">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            Surah {surah.nameLatin} ({surah.surahNumber})
                          </p>
                        </div>
                      )}
                      <p
                        className="font-quran text-right text-[var(--text-primary)]"
                        lang="ar"
                        style={{ fontSize: `${preferences.arabicFontSizePx}px` }}
                      >
                        {ayah.textUthmaniMsi}{' '}
                        <span className="tabular-nums inline-block rounded-full border border-[var(--border-strong)] px-2 py-0.5 font-sans text-xs font-semibold text-[var(--accent-primary)]">
                          {ayah.ayahNumber}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>

              <p className="border-t border-[var(--border-default)] pt-3 text-xs text-[var(--text-muted)]">
                Halaman, teks, dan gambar diambil dari MyQuran API v3. Pastikan
                kesesuaian pemetaan halaman dan tata letak dengan cetakan Mushaf
                Standar Indonesia (MSI) sebelum dijadikan acuan resmi.
              </p>
            </article>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="reader-surah-select"
                className="text-xs font-medium text-[var(--text-secondary)]"
              >
                Surah
              </label>
              <select
                id="reader-surah-select"
                value={selectedSurah}
                onChange={(e) => handleSurahSelect(Number(e.target.value))}
                className="rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-1.5 text-sm font-semibold"
              >
                {dataset.surahs.map((s) => (
                  <option key={s.surahNumber} value={s.surahNumber}>
                    {s.surahNumber}. {s.nameLatin}
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={preferences.showTranslation}
                onChange={(e) =>
                  updatePreferences({ showTranslation: e.target.checked })
                }
                className="h-4 w-4 accent-[var(--accent-primary)]"
              />
              <span>Tampilkan terjemahan</span>
            </label>
          </div>

          {currentSurahObj && (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Surah {currentSurahObj.nameLatin}
                </h2>
                <p className="text-xs text-[var(--text-muted)] tabular-nums">
                  Surah ke-{currentSurahObj.surahNumber} •{' '}
                  {currentSurahObj.totalAyahs} ayat
                  {currentSurahObj.revelationPlace
                    ? ` • ${currentSurahObj.revelationPlace}`
                    : ''}
                </p>
              </div>
              {currentSurahObj.nameArabic && (
                <span className="font-quran text-2xl" lang="ar">
                  {currentSurahObj.nameArabic}
                </span>
              )}
            </div>
          )}

          {isLoadingContent ? (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
              Memuat ayat-ayat Surah {currentSurahObj?.nameLatin ?? selectedSurah}
              ...
            </div>
          ) : (
            <div className="space-y-3">
              {ayahsInSurah.map((ayah) => {
                const isHighlighted = highlightedAyah === ayah.ayahNumber;
                return (
                  <article
                    key={`${ayah.surahNumber}:${ayah.ayahNumber}`}
                    className={`rounded-[12px] border bg-[var(--bg-surface)] p-5 ${
                      isHighlighted
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]/30'
                        : 'border-[var(--border-default)]'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span className="tabular-nums font-semibold text-[var(--accent-primary)]">
                        {ayah.surahNumber}:{ayah.ayahNumber} • Hal.{' '}
                        {ayah.pageNumberMsi} • Juz {ayah.juzNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePlayAyahAudio(ayah)}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-default)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Putar</span>
                      </button>
                    </div>

                    <p
                      className="font-quran text-right text-[var(--text-primary)]"
                      lang="ar"
                      style={{ fontSize: `${preferences.arabicFontSizePx}px` }}
                    >
                      {ayah.textUthmaniMsi}
                    </p>

                    {preferences.showTranslation && ayah.translationId && (
                      <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[var(--text-secondary)]">
                        {ayah.translationId}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
