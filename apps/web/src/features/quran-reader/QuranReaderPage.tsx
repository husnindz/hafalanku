import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Minus,
  Moon,
  Plus,
  Settings2,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Ayah, PageBundle, TilawahBookmark } from '@hafalanku/quran-types';
import { useAppContext } from '../../app/AppContext';
import {
  getAvailablePagesMsi,
  getPageBundleData,
  getSurahAyahsData,
  getSurahMap,
} from '../../data/quran/datasetAdapter';
import { loadLastRead, saveLastRead } from '../../lib/storage/preferences';
import {
  createTilawahBookmark,
  listTilawahBookmarks,
  updateTilawahBookmarkPosition,
} from '../../lib/storage/tilawahBookmarks';
import { StatusBanner } from '../../components/StatusBanner';

export function QuranReaderPage() {
  const { dataset, isLoadingDataset, preferences, updatePreferences } =
    useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const lastRead = useMemo(() => loadLastRead(), []);
  const modeParam = searchParams.get('mode');
  const mode: 'page' | 'ayah' =
    modeParam === 'page' || modeParam === 'ayah'
      ? modeParam
      : lastRead?.mode ?? 'ayah';

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
    if (!searchParams.get('surah') && lastRead && surahMap.has(lastRead.surah)) {
      return lastRead.surah;
    }
    return dataset?.surahs[0]?.surahNumber ?? 1;
  }, [dataset, lastRead, searchParams, surahMap]);

  const selectedPage = useMemo(() => {
    const param = Number(searchParams.get('page'));
    if (availablePages.includes(param)) return param;
    if (
      !searchParams.get('page') &&
      lastRead &&
      availablePages.includes(lastRead.page)
    ) {
      return lastRead.page;
    }
    return availablePages[0] ?? 1;
  }, [availablePages, lastRead, searchParams]);

  const highlightedAyah = Number(searchParams.get('ayah')) || null;

  const [pageBundle, setPageBundle] = useState<PageBundle | null>(null);
  const [ayahsInSurah, setAyahsInSurah] = useState<Ayah[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [pageImageError, setPageImageError] = useState(false);
  const [pageAudioError, setPageAudioError] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBookmarkOpen, setIsBookmarkOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<TilawahBookmark[]>(() =>
    listTilawahBookmarks()
  );
  const [newBookmarkLabel, setNewBookmarkLabel] = useState('');
  const [bookmarkFeedback, setBookmarkFeedback] = useState<string | null>(null);
  const [visibilityHint, setVisibilityHint] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);

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
        const firstAyah = bundle.ayahs[0];
        if (firstAyah) {
          saveLastRead({
            mode: 'page',
            page: selectedPage,
            surah: firstAyah.surahNumber,
            ayah: firstAyah.ayahNumber,
            surahName: surahMap.get(firstAyah.surahNumber)?.nameLatin,
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        const ayahs = await getSurahAyahsData(dataset, selectedSurah);
        setAyahsInSurah(ayahs);
        const targetAyah =
          (highlightedAyah
            ? ayahs.find((a) => a.ayahNumber === highlightedAyah)
            : undefined) ?? ayahs[0];
        if (targetAyah) {
          saveLastRead({
            mode: 'ayah',
            page: targetAyah.pageNumberMsi,
            surah: selectedSurah,
            ayah: targetAyah.ayahNumber,
            surahName: surahMap.get(selectedSurah)?.nameLatin,
            updatedAt: new Date().toISOString(),
          });
        }
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

  useEffect(() => {
    if (mode !== 'ayah' || isLoadingContent || !highlightedAyah) return;
    const el = document.getElementById(
      `ayah-${selectedSurah}-${highlightedAyah}`
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [ayahsInSurah, highlightedAyah, isLoadingContent, mode, selectedSurah]);

  useEffect(() => {
    if (!isSettingsOpen && !isBookmarkOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(e.target as Node)
      ) {
        setIsSettingsOpen(false);
        setIsBookmarkOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isBookmarkOpen, isSettingsOpen]);

  const setMode = (nextMode: 'page' | 'ayah') => {
    const next = new URLSearchParams(searchParams);
    next.set('mode', nextMode);
    if (nextMode === 'page') {
      const targetAyah =
        (highlightedAyah
          ? ayahsInSurah.find((a) => a.ayahNumber === highlightedAyah)
          : undefined) ?? ayahsInSurah[0];
      const targetPage =
        targetAyah?.pageNumberMsi ??
        (Number(next.get('page')) || availablePages[0]);
      if (targetPage) {
        next.set('page', String(targetPage));
      }
    } else if (nextMode === 'ayah') {
      const firstOnPage = pageBundle?.ayahs[0];
      if (firstOnPage) {
        next.set('surah', String(firstOnPage.surahNumber));
        next.set('ayah', String(firstOnPage.ayahNumber));
      }
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

  const handleSurahStep = (delta: number) => {
    if (!dataset) return;
    const idx = dataset.surahs.findIndex(
      (s) => s.surahNumber === selectedSurah
    );
    if (idx === -1) return;
    const nextSurah = dataset.surahs[idx + delta];
    if (!nextSurah) return;
    setSearchParams({ mode: 'ayah', surah: String(nextSurah.surahNumber) });
  };

  const handleSurahSelect = (surahNum: number) => {
    setSearchParams({ mode: 'ayah', surah: String(surahNum) });
  };

  const handleTogglePageImage = (checked: boolean) => {
    if (!checked && !preferences.showPageText) {
      setVisibilityHint(
        'Minimal salah satu antara Gambar Mushaf atau Teks Ayat harus tetap tampil.'
      );
      return;
    }
    setVisibilityHint(null);
    updatePreferences({ showPageImage: checked });
  };

  const handleTogglePageText = (checked: boolean) => {
    if (!checked && !preferences.showPageImage) {
      setVisibilityHint(
        'Minimal salah satu antara Gambar Mushaf atau Teks Ayat harus tetap tampil.'
      );
      return;
    }
    setVisibilityHint(null);
    updatePreferences({ showPageText: checked });
  };

  const getCurrentPosition = () => {
    const firstOnPage = pageBundle?.ayahs[0];
    const targetAyah =
      mode === 'page'
        ? firstOnPage
        : (highlightedAyah
            ? ayahsInSurah.find((a) => a.ayahNumber === highlightedAyah)
            : undefined) ?? ayahsInSurah[0];

    const surahNum = targetAyah?.surahNumber ?? selectedSurah;
    const pageNum =
      mode === 'page' ? selectedPage : targetAyah?.pageNumberMsi ?? selectedPage;

    return {
      mode,
      page: pageNum,
      surah: surahNum,
      ayah: targetAyah?.ayahNumber,
      surahName: surahMap.get(surahNum)?.nameLatin,
    };
  };

  const handleSaveToExistingBookmark = (id: string, label: string) => {
    const updated = updateTilawahBookmarkPosition(id, getCurrentPosition());
    setBookmarks(updated);
    setBookmarkFeedback(`Posisi disimpan ke "${label}".`);
  };

  const handleCreateBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    const pos = getCurrentPosition();
    const label = newBookmarkLabel.trim() || `Tilawah Hal. ${pos.page}`;
    const updated = createTilawahBookmark(label, pos);
    setBookmarks(updated);
    setNewBookmarkLabel('');
    setBookmarkFeedback(`Penanda "${label}" tersimpan.`);
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
  const surahIdx = dataset.surahs.findIndex(
    (s) => s.surahNumber === selectedSurah
  );
  const currentSurahObj = surahMap.get(selectedSurah);
  const ayahsInPage = pageBundle?.ayahs ?? [];
  const firstSurahOnPage = ayahsInPage[0]
    ? surahMap.get(ayahsInPage[0].surahNumber)
    : undefined;

  return (
    <div className="space-y-4">
      {/* Lock bar mengambang ringkas (kiri: geser, tengah: keterangan/dropdown, kanan: geser + mode malam + pengaturan) */}
      <div
        ref={settingsPanelRef}
        className="sticky top-16 z-10 -mx-4 border-y border-[var(--border-default)] bg-[var(--bg-surface)]/95 px-2.5 py-2 backdrop-blur-xs sm:mx-0 sm:rounded-[12px] sm:border sm:px-3"
      >
        <div className="flex items-center justify-between gap-1.5">
          {/* Al-Qur'an dibaca dari kanan ke kiri: tombol kiri (<) menuju halaman/surah berikutnya (+1) */}
          <button
            type="button"
            disabled={
              mode === 'page'
                ? pageIdx === -1 || pageIdx >= availablePages.length - 1
                : surahIdx === -1 || surahIdx >= dataset.surahs.length - 1
            }
            onClick={() =>
              mode === 'page' ? handlePageStep(1) : handleSurahStep(1)
            }
            aria-label={
              mode === 'page' ? 'Halaman berikutnya' : 'Surah berikutnya'
            }
            title={mode === 'page' ? 'Halaman Berikutnya' : 'Surah Berikutnya'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)] disabled:opacity-35 hover:bg-[var(--bg-subtle)]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 flex justify-center">
            {mode === 'page' ? (
              <div className="flex min-w-0 items-center gap-1">
                <label htmlFor="msi-page-select" className="sr-only">
                  Pilih Halaman
                </label>
                <select
                  id="msi-page-select"
                  value={selectedPage}
                  onChange={(e) =>
                    setSearchParams({ mode: 'page', page: e.target.value })
                  }
                  className="tabular-nums min-h-[38px] max-w-full truncate rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-2.5 py-1 text-center text-xs font-semibold text-[var(--text-primary)] sm:text-sm"
                >
                  {availablePages.map((p) => (
                    <option key={p} value={p}>
                      Hal. {p}
                      {p === selectedPage && firstSurahOnPage
                        ? ` • ${firstSurahOnPage.nameLatin}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <label htmlFor="reader-surah-select" className="sr-only">
                  Pilih Surah
                </label>
                <select
                  id="reader-surah-select"
                  value={selectedSurah}
                  onChange={(e) => handleSurahSelect(Number(e.target.value))}
                  className="min-h-[38px] max-w-full truncate rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-2.5 py-1 text-center text-xs font-semibold text-[var(--text-primary)] sm:text-sm"
                >
                  {dataset.surahs.map((s) => (
                    <option key={s.surahNumber} value={s.surahNumber}>
                      {s.surahNumber}. {s.nameLatin}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* Tombol kanan (>) kembali ke halaman/surah sebelumnya (-1) */}
            <button
              type="button"
              disabled={mode === 'page' ? pageIdx <= 0 : surahIdx <= 0}
              onClick={() =>
                mode === 'page' ? handlePageStep(-1) : handleSurahStep(-1)
              }
              aria-label={
                mode === 'page' ? 'Halaman sebelumnya' : 'Surah sebelumnya'
              }
              title={
                mode === 'page' ? 'Halaman Sebelumnya' : 'Surah Sebelumnya'
              }
              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)] disabled:opacity-35 hover:bg-[var(--bg-subtle)]"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() =>
                updatePreferences({ darkMode: !preferences.darkMode })
              }
              aria-label={
                preferences.darkMode
                  ? 'Aktifkan mode terang'
                  : 'Aktifkan mode malam'
              }
              title={preferences.darkMode ? 'Mode Terang' : 'Mode Malam'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              {preferences.darkMode ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              aria-expanded={isSettingsOpen}
              aria-label="Pengaturan tampilan baca"
              title="Pengaturan Tampilan"
              onClick={() => {
                setVisibilityHint(null);
                setIsBookmarkOpen(false);
                setIsSettingsOpen((v) => !v);
              }}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-[8px] border transition-colors ${
                isSettingsOpen
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              aria-expanded={isBookmarkOpen}
              aria-label="Simpan penanda tilawah"
              title="Simpan Penanda Tilawah"
              onClick={() => {
                setBookmarkFeedback(null);
                setBookmarks(listTilawahBookmarks());
                setIsSettingsOpen(false);
                setIsBookmarkOpen((v) => !v);
              }}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-[8px] border transition-colors ${
                isBookmarkOpen
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Bookmark className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Dropdown Simpan Penanda Tilawah (ala YouTube "Simpan ke...") */}
        {isBookmarkOpen && (
          <div className="mt-2 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Simpan penanda tilawah...
              </h2>
              <button
                type="button"
                aria-label="Tutup penanda"
                onClick={() => setIsBookmarkOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {bookmarks.length > 0 ? (
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {bookmarks.map((bm) => (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() => handleSaveToExistingBookmark(bm.id, bm.label)}
                    className="flex w-full items-center justify-between rounded-[8px] bg-[var(--bg-canvas)] px-3 py-2 text-left hover:bg-[var(--bg-subtle)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                        {bm.label}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                        Hal. {bm.page}
                        {bm.surahName ? ` • ${bm.surahName}` : ''}
                        {bm.ayah ? `:${bm.ayah}` : ''}
                      </p>
                    </div>
                    <Bookmark
                      className="h-4 w-4 shrink-0 text-[var(--accent-primary)]"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Belum ada daftar penanda. Buat penanda baru di bawah untuk
                menyimpan posisi bacaan ini.
              </p>
            )}

            <form
              onSubmit={handleCreateBookmark}
              className="flex items-center gap-2 border-t border-[var(--border-default)] pt-3"
            >
              <label htmlFor="new-bookmark-label" className="sr-only">
                Nama penanda tilawah baru
              </label>
              <input
                id="new-bookmark-label"
                type="text"
                value={newBookmarkLabel}
                onChange={(e) => setNewBookmarkLabel(e.target.value)}
                placeholder="Nama penanda baru (mis. Tilawah Subuh)..."
                className="min-w-0 flex-1 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
              <button
                type="submit"
                className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-[8px] bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Simpan</span>
              </button>
            </form>

            {bookmarkFeedback && (
              <p className="text-xs font-medium text-[var(--status-match)]">
                {bookmarkFeedback}
              </p>
            )}
          </div>
        )}

        {/* Dropdown Pengaturan Baca */}
        {isSettingsOpen && (
          <div className="mt-2 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Pengaturan Tampilan Baca
              </h2>
              <button
                type="button"
                aria-label="Tutup pengaturan"
                onClick={() => setIsSettingsOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Tampilan Al-Qur’an
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('page')}
                  className={`min-h-[38px] rounded-[8px] border px-3 py-1.5 text-xs font-semibold ${
                    mode === 'page'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                  }`}
                >
                  Per Halaman
                </button>
                <button
                  type="button"
                  onClick={() => setMode('ayah')}
                  className={`min-h-[38px] rounded-[8px] border px-3 py-1.5 text-xs font-semibold ${
                    mode === 'ayah'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                  }`}
                >
                  Per Ayat
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Ukuran Teks Arab
              </span>
              <div className="flex items-center gap-1 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-1.5 py-0.5">
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

            {mode === 'page' ? (
              <div className="space-y-2 border-t border-[var(--border-default)] pt-3">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  Konten Mode Halaman
                </p>
                <label className="flex min-h-[36px] cursor-pointer items-center justify-between rounded-[8px] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium">
                  <span>Tampilkan Gambar Mushaf</span>
                  <input
                    type="checkbox"
                    checked={preferences.showPageImage}
                    onChange={(e) => handleTogglePageImage(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                </label>
                <label className="flex min-h-[36px] cursor-pointer items-center justify-between rounded-[8px] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium">
                  <span>Tampilkan Teks Ayat</span>
                  <input
                    type="checkbox"
                    checked={preferences.showPageText}
                    onChange={(e) => handleTogglePageText(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                </label>
                <label className="flex min-h-[36px] cursor-pointer items-center justify-between rounded-[8px] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium">
                  <span>Tampilkan Audio Halaman</span>
                  <input
                    type="checkbox"
                    checked={preferences.showPageAudio}
                    onChange={(e) =>
                      updatePreferences({ showPageAudio: e.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                </label>
                {visibilityHint && (
                  <p className="text-[11px] font-medium text-[var(--status-uncertain)]">
                    {visibilityHint}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2 border-t border-[var(--border-default)] pt-3">
                <label className="flex min-h-[36px] cursor-pointer items-center justify-between rounded-[8px] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium">
                  <span>Tampilkan Terjemahan</span>
                  <input
                    type="checkbox"
                    checked={preferences.showTranslation}
                    onChange={(e) =>
                      updatePreferences({ showTranslation: e.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                </label>
              </div>
            )}
          </div>
        )}
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
          {isLoadingContent ? (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
              Memuat halaman {selectedPage}...
            </div>
          ) : (
            <article className="mx-auto max-w-[820px] rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-4 sm:px-6 sm:py-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5 text-xs text-[var(--text-muted)]">
                <span className="tabular-nums font-medium">
                  Halaman {selectedPage}
                  {firstSurahOnPage ? ` • ${firstSurahOnPage.nameLatin}` : ''}
                </span>
                {ayahsInPage[0] && (
                  <span className="tabular-nums">
                    Juz {ayahsInPage[0].juzNumber}
                  </span>
                )}
              </div>

              {preferences.showPageAudio &&
                pageBundle?.audioUrl &&
                !pageAudioError && (
                  <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] p-2.5 space-y-1">
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

              {preferences.showPageAudio && pageAudioError && (
                <StatusBanner tone="warning">
                  <p>
                    Audio halaman dari CDN sedang tidak dapat diputar.
                  </p>
                </StatusBanner>
              )}

              {preferences.showPageImage &&
                pageBundle?.imageUrl &&
                !pageImageError && (
                  <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[#FFFDF8] p-1 sm:p-2">
                    <img
                      src={pageBundle.imageUrl}
                      alt={`Gambar mushaf halaman ${selectedPage}`}
                      loading="lazy"
                      onError={() => setPageImageError(true)}
                      className="mx-auto h-auto w-full max-w-[760px]"
                    />
                  </div>
                )}

              {(pageImageError || !pageBundle?.imageUrl) &&
                !preferences.showPageText && (
                  <StatusBanner tone="warning">
                    <p>
                      Gambar mushaf tidak tersedia dari CDN. Aktifkan Teks Ayat
                      di pengaturan untuk membaca halaman ini.
                    </p>
                  </StatusBanner>
                )}

              {preferences.showPageText && (
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
                          style={{
                            fontSize: `${preferences.arabicFontSizePx}px`,
                          }}
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
              )}
            </article>
          )}
        </section>
      ) : (
        <section className="space-y-4">
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
                    id={`ayah-${ayah.surahNumber}-${ayah.ayahNumber}`}
                    key={`${ayah.surahNumber}:${ayah.ayahNumber}`}
                    className={`scroll-mt-36 rounded-[12px] border bg-[var(--bg-surface)] p-5 ${
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
