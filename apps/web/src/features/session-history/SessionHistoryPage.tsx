import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Pin, PinOff, Trash2 } from 'lucide-react';
import type {
  PracticeSessionLocal,
  TilawahBookmark,
} from '@hafalanku/quran-types';
import {
  clearPracticeSessions,
  deletePracticeSession,
  listPracticeSessions,
} from '../../lib/storage/sessionHistory';
import {
  deleteTilawahBookmark,
  listTilawahBookmarks,
  togglePinTilawahBookmark,
} from '../../lib/storage/tilawahBookmarks';
import { useAppContext } from '../../app/AppContext';
import { getSurahMap } from '../../data/quran/datasetAdapter';
import { StatusBanner } from '../../components/StatusBanner';

export function SessionHistoryPage() {
  const { dataset } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'tilawah' ? 'tilawah' : 'tes';

  const [sessions, setSessions] = useState<PracticeSessionLocal[]>([]);
  const [bookmarks, setBookmarks] = useState<TilawahBookmark[]>(() =>
    listTilawahBookmarks()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const surahMap = dataset ? getSurahMap(dataset) : new Map();

  const load = useCallback(() => {
    setLoading(true);
    setBookmarks(listTilawahBookmarks());
    listPracticeSessions()
      .then((items) => {
        setSessions(items);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Gagal memuat riwayat lokal.'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteSession = async (id: string) => {
    await deletePracticeSession(id);
    setSessions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllSessions = async () => {
    await clearPracticeSessions();
    setSessions([]);
  };

  const handleTogglePin = (id: string) => {
    setBookmarks(togglePinTilawahBookmark(id));
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks(deleteTilawahBookmark(id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Riwayat
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Daftar riwayat tes hafalan dan penanda tilawah tersimpan lokal di
            perangkat ini.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Jenis riwayat"
          className="inline-flex rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tes'}
            onClick={() => setSearchParams({ tab: 'tes' })}
            className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'tes'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Riwayat Tes Hafalan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tilawah'}
            onClick={() => setSearchParams({ tab: 'tilawah' })}
            className={`rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'tilawah'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Riwayat Tilawah
          </button>
        </div>
      </div>

      {activeTab === 'tes' ? (
        <section className="space-y-4">
          {sessions.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClearAllSessions}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[8px] border border-[#FECACA] bg-[var(--status-miss-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--status-miss)]"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Hapus Semua Riwayat Tes</span>
              </button>
            </div>
          )}

          {error && (
            <StatusBanner tone="error" title="Penyimpanan Lokal Bermasalah">
              <p>{error}</p>
            </StatusBanner>
          )}

          {loading ? (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
              Memuat riwayat tes...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
              Belum ada riwayat tes hafalan yang tersimpan di perangkat ini.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const surah = surahMap.get(session.promptSurah);
                return (
                  <article
                    key={session.id}
                    className="flex flex-col gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Pemantik:{' '}
                        {surah
                          ? surah.nameLatin
                          : `Surah ${session.promptSurah}`}{' '}
                        ({session.promptSurah}:{session.promptAyah})
                      </p>
                      <p className="text-xs text-[var(--text-muted)] tabular-nums">
                        Juz {session.selectedJuzStart}–{session.selectedJuzEnd}{' '}
                        • {new Date(session.createdAt).toLocaleString('id-ID')}
                        {session.evaluationSummary &&
                          ` • Status bacaan: ${session.evaluationSummary.status}`}
                        {session.metadataResult &&
                          ` • Kuis: ${session.metadataResult.totalCorrect}/${session.metadataResult.totalAnswered}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session.id)}
                      aria-label="Hapus item riwayat"
                      className="inline-flex min-h-[36px] items-center gap-1 self-start rounded-[8px] border border-[var(--border-default)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] sm:self-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Hapus</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {bookmarks.length === 0 ? (
            <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-3 text-sm text-[var(--text-secondary)]">
              <p>
                Belum ada penanda tilawah yang disimpan. Buka halaman Baca
                Al-Qur’an lalu tekan ikon penanda di bar atas untuk menyimpan
                halaman terakhir.
              </p>
              <Link
                to="/baca"
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Buka Pembaca Al-Qur’an</span>
              </Link>
            </div>
          ) : (
            bookmarks.map((bm) => {
              const targetUrl =
                bm.mode === 'page'
                  ? `/baca?mode=page&page=${bm.page}`
                  : `/baca?mode=ayah&surah=${bm.surah}${bm.ayah ? `&ayah=${bm.ayah}` : ''}&page=${bm.page}`;
              return (
                <article
                  key={bm.id}
                  className={`flex flex-col gap-3 rounded-[12px] border bg-[var(--bg-surface)] p-4 sm:flex-row sm:items-center sm:justify-between ${
                    bm.isPinned
                      ? 'border-[var(--accent-primary)]'
                      : 'border-[var(--border-default)]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {bm.label}
                      </p>
                      {bm.isPinned && (
                        <span className="rounded-[6px] bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-primary)]">
                          Disematkan di Beranda
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] tabular-nums">
                      Hal. {bm.page}
                      {bm.surahName ? ` • ${bm.surahName}` : ''}
                      {bm.ayah ? `:${bm.ayah}` : ''} •{' '}
                      {new Date(bm.updatedAt).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(bm.id)}
                      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-[8px] border px-3 py-1 text-xs font-semibold ${
                        bm.isPinned
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      {bm.isPinned ? (
                        <>
                          <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Lepas PIN</span>
                        </>
                      ) : (
                        <>
                          <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>PIN ke Beranda</span>
                        </>
                      )}
                    </button>

                    <Link
                      to={targetUrl}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[8px] bg-[var(--accent-primary)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Buka</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bm.id)}
                      aria-label="Hapus penanda tilawah"
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-[8px] border border-[var(--border-default)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}
