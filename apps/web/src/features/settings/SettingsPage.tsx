import { useState } from 'react';
import { useAppContext } from '../../app/AppContext';
import { StatusBanner } from '../../components/StatusBanner';
import { clearQuranApiCache } from '../../lib/storage/quranApiCache';
import { resetCachedDatasetInMemory } from '../../data/quran/datasetAdapter';

export function SettingsPage() {
  const { preferences, updatePreferences, reloadDataset } = useAppContext();
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  const handleClearAllCache = async () => {
    await clearQuranApiCache();
    resetCachedDatasetInMemory();
    reloadDataset();

    if (typeof caches !== 'undefined') {
      await caches.delete('hafalanku-asr-models-v1');
      await caches.delete('tilawa-models');
    }

    setCacheMessage('Cache lokal berhasil dibersihkan.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Pengaturan
        </h1>
      </div>

      <section className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <label
              htmlFor="pref-arabic-size"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Ukuran Teks Arab
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              Mengatur ukuran font Arab pada pembaca dan halaman hasil.
            </p>
          </div>
          <select
            id="pref-arabic-size"
            value={preferences.arabicFontSizePx}
            onChange={(e) =>
              updatePreferences({ arabicFontSizePx: Number(e.target.value) })
            }
            className="tabular-nums rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
          >
            {[26, 28, 30, 34, 38, 40].map((size) => (
              <option key={size} value={size}>
                {size} px
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-default)] pt-4">
          <div>
            <label
              htmlFor="pref-threshold"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Ambang Confidence ASR
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              Bacaan di bawah ambang ini ditandai sebagai &ldquo;Tidak dapat
              dinilai&rdquo; agar tidak langsung dinilai salah.
            </p>
          </div>
          <select
            id="pref-threshold"
            value={preferences.asrConfidenceThreshold}
            onChange={(e) =>
              updatePreferences({
                asrConfidenceThreshold: Number(e.target.value),
              })
            }
            className="tabular-nums rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 text-sm"
          >
            <option value={0.35}>35% (Longgar)</option>
            <option value={0.45}>45% (Standar)</option>
            <option value={0.6}>60% (Ketat)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-default)] pt-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Cache
          </p>
          <button
            type="button"
            onClick={handleClearAllCache}
            className="rounded-[8px] border border-[var(--border-default)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            Bersihkan Cache
          </button>
        </div>

        {cacheMessage && (
          <StatusBanner tone="info">
            <p>{cacheMessage}</p>
          </StatusBanner>
        )}
      </section>

      <section className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-2 text-xs text-[var(--text-secondary)]">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          Perlindungan Privasi
        </h2>
        <p>
          Seluruh rekaman suara, pemrosesan pengenalan bacaan (ASR), penanda
          tilawah, dan riwayat latihan diproses serta disimpan secara lokal di
          perangkat Anda. Tidak ada audio atau data bacaan pribadi yang dikirim
          atau disimpan di server.
        </p>
      </section>
    </div>
  );
}
