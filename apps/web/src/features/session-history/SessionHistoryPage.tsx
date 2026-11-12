import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { PracticeSessionLocal } from '@hafalanku/quran-types';
import {
  clearPracticeSessions,
  deletePracticeSession,
  listPracticeSessions,
} from '../../lib/storage/sessionHistory';
import { useAppContext } from '../../app/AppContext';
import { getSurahMap } from '../../data/quran/datasetAdapter';
import { StatusBanner } from '../../components/StatusBanner';

export function SessionHistoryPage() {
  const { dataset } = useAppContext();
  const [sessions, setSessions] = useState<PracticeSessionLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const surahMap = dataset ? getSurahMap(dataset) : new Map();

  const load = useCallback(() => {
    setLoading(true);
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

  const handleDelete = async (id: string) => {
    await deletePracticeSession(id);
    setSessions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = async () => {
    await clearPracticeSessions();
    setSessions([]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Riwayat Latihan Lokal
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Tersimpan secara lokal di IndexedDB browser perangkat ini.
          </p>
        </div>
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-[#FECACA] bg-[var(--status-miss-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--status-miss)] hover:bg-[#FEE2E2]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hapus Semua Riwayat</span>
          </button>
        )}
      </div>

      {error && (
        <StatusBanner tone="error" title="Penyimpanan Lokal Bermasalah">
          <p>{error}</p>
        </StatusBanner>
      )}

      {loading ? (
        <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
          Memuat riwayat lokal...
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
                    Pemantik: {surah ? surah.nameLatin : `Surah ${session.promptSurah}`}{' '}
                    ({session.promptSurah}:{session.promptAyah})
                  </p>
                  <p className="text-xs text-[var(--text-muted)] tabular-nums">
                    Juz {session.selectedJuzStart}–{session.selectedJuzEnd} •{' '}
                    {new Date(session.createdAt).toLocaleString('id-ID')}
                    {session.evaluationSummary &&
                      ` • Status bacaan: ${session.evaluationSummary.status}`}
                    {session.metadataResult &&
                      ` • Kuis metadata: ${session.metadataResult.totalCorrect}/${session.metadataResult.totalAnswered}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(session.id)}
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
    </div>
  );
}

