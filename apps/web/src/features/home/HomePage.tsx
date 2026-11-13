import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Mic, Search } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { getAvailableJuzNumbers } from '../../data/quran/datasetAdapter';
import { getPinnedTilawahBookmark } from '../../lib/storage/tilawahBookmarks';
import { StatusBanner } from '../../components/StatusBanner';
import { loadGlobalAsrModel } from '../../lib/asr-client/useLocalAsr';

export function HomePage() {
  const { dataset, isLoadingDataset, datasetError, reloadDataset } =
    useAppContext();
  const [query, setQuery] = useState('');
  const [browseTab, setBrowseTab] = useState<'surah' | 'juz'>('surah');
  const navigate = useNavigate();
  const pinnedTilawah = useMemo(() => getPinnedTilawahBookmark(), []);

  const availableJuz = useMemo(
    () => (dataset ? getAvailableJuzNumbers(dataset) : []),
    [dataset]
  );

  const filteredSurahs = useMemo(() => {
    if (!dataset) return [];
    const q = query.trim().toLowerCase();
    if (!q) return dataset.surahs;
    return dataset.surahs.filter(
      (s) =>
        s.nameLatin.toLowerCase().includes(q) ||
        s.nameArabic.includes(q) ||
        String(s.surahNumber) === q
    );
  }, [dataset, query]);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = query.trim();
    if (!raw || !dataset) return;

    // Mendukung format "112:2" atau "Al-Ikhlas"
    const colonMatch = raw.match(/^(\d{1,3})\s*:\s*(\d{1,3})$/);
    if (colonMatch) {
      const surahNum = Number(colonMatch[1]);
      const ayahNum = Number(colonMatch[2]);
      navigate(`/baca?mode=ayah&surah=${surahNum}&ayah=${ayahNum}`);
      return;
    }

    const firstMatch = filteredSurahs[0];
    if (firstMatch) {
      navigate(`/baca?mode=ayah&surah=${firstMatch.surahNumber}`);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Uji sambung ayat dan murojaah dengan tenang
        </h1>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          Pilih cakupan juz atau surah, dengarkan ayat pemantik, sambung bacaan secara lisan melalui
          mikrofon yang diproses lokal di browser Anda, lalu periksa
          kecocokan urutan ayat dan metadata Mushaf Standar Indonesia (MSI).
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/tes"
            onClick={() => void loadGlobalAsrModel()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
            <span>Mulai Tes Hafalan</span>
          </Link>
          <Link
            to="/baca"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Baca Al-Qur’an</span>
          </Link>

          <Link
            to={
              pinnedTilawah
                ? pinnedTilawah.mode === 'page'
                  ? `/baca?mode=page&page=${pinnedTilawah.page}`
                  : `/baca?mode=ayah&surah=${pinnedTilawah.surah}${pinnedTilawah.ayah ? `&ayah=${pinnedTilawah.ayah}` : ''}&page=${pinnedTilawah.page}`
                : '/riwayat?tab=tilawah'
            }
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>
              {pinnedTilawah
                ? `${pinnedTilawah.label} (Hal. ${pinnedTilawah.page})`
                : 'Belum ada riwayat yang dipilih'}
            </span>
          </Link>
        </div>
      </section>

      {dataset?.manifest.isFixture && (
        <StatusBanner
          tone="warning"
          title="Mode Cadangan Lokal (MyQuran API Tidak Terjangkau)"
        >
          <p>
            Koneksi ke MyQuran API v3 gagal dan cache belum tersedia. Aplikasi
            memakai dataset sampel terbatas (Juz 1 &amp; Juz 30) sementara.
          </p>
        </StatusBanner>
      )}

      {datasetError && (
        <StatusBanner
          tone="error"
          title="Gagal Memuat Dataset"
          action={
            <button
              type="button"
              onClick={reloadDataset}
              className="rounded-[8px] border border-[#FCA5A5] bg-white px-3 py-1.5 text-xs font-semibold text-[#7F1D1D] hover:bg-[#FEF2F2]"
            >
              Coba Lagi
            </button>
          }
        >
          <p>{datasetError}</p>
        </StatusBanner>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Jelajah Al-Qur’an
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Mode jelajah"
            className="inline-flex rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-1 self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={browseTab === 'surah'}
              onClick={() => setBrowseTab('surah')}
              className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                browseTab === 'surah'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Surah
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={browseTab === 'juz'}
              onClick={() => setBrowseTab('juz')}
              className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                browseTab === 'juz'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Juz
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickSearchSubmit} className="relative">
          <label htmlFor="home-quick-search" className="sr-only">
            Cari surah atau ketik format surah:ayat
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <input
            id="home-quick-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama surah, nomor surah, atau ketik 112:1 lalu Enter..."
            className="w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] py-2.5 pr-4 pl-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </form>

        {isLoadingDataset ? (
          <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
            Memuat daftar surah dan juz...
          </div>
        ) : browseTab === 'surah' ? (
          filteredSurahs.length === 0 ? (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
              Tidak ada surah yang cocok dengan pencarian &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSurahs.map((surah) => (
                <Link
                  key={surah.surahNumber}
                  to={`/baca?mode=ayah&surah=${surah.surahNumber}`}
                  className="group flex items-center justify-between rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5 transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--accent-soft)]/35"
                >
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-secondary)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent-primary)]">
                      {surah.surahNumber}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {surah.nameLatin}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {surah.totalAyahs} ayat
                        {surah.revelationPlace
                          ? ` • ${surah.revelationPlace}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className="font-quran text-lg text-[var(--text-primary)]"
                    lang="ar"
                  >
                    {surah.nameArabic}
                  </span>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {availableJuz.map((juzNum) => {
              return (
                <div
                  key={juzNum}
                  className="flex items-center justify-between rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                      Juz {juzNum}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Cakupan Juz {juzNum}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/tes?juzStart=${juzNum}&juzEnd=${juzNum}`}
                      className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--accent-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white"
                    >
                      <span>Tes</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

