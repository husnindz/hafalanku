import { useState } from 'react';
import { DEFAULT_LOCAL_ASR_MODEL } from '@hafalanku/asr';
import { useAppContext } from '../../app/AppContext';
import { StatusBanner } from '../../components/StatusBanner';
import { clearQuranApiCache } from '../../lib/storage/quranApiCache';
import { resetCachedDatasetInMemory } from '../../data/quran/datasetAdapter';

export function SettingsPage() {
  const { dataset, preferences, updatePreferences, reloadDataset } =
    useAppContext();
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  const handleClearApiCache = async () => {
    await clearQuranApiCache();
    resetCachedDatasetInMemory();
    reloadDataset();
    setCacheMessage(
      'Cache data MyQuran API v3 di IndexedDB berhasil dibersihkan dan dimuat ulang.'
    );
  };

  const handleClearModelCache = async () => {
    if (typeof caches === 'undefined') {
      setCacheMessage('Cache Storage tidak tersedia di browser ini.');
      return;
    }
    const deleted = await caches.delete('hafalanku-asr-models-v1');
    setCacheMessage(
      deleted
        ? 'Cache model ASR lokal berhasil dihapus.'
        : 'Tidak ada cache model ASR yang tersimpan.'
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Pengaturan
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          Preferensi tampilan baca dan parameter evaluasi ASR lokal.
        </p>
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
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Cache Data Al-Qur’an (IndexedDB)
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Menyimpan respons MyQuran API v3 agar tidak memuat ulang data yang
              sama.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearApiCache}
            className="rounded-[8px] border border-[var(--border-default)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            Bersihkan Cache API
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-default)] pt-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Cache Model ASR Lokal
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Kandidat: {DEFAULT_LOCAL_ASR_MODEL.name} (
              {DEFAULT_LOCAL_ASR_MODEL.license})
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearModelCache}
            className="rounded-[8px] border border-[var(--border-default)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            Bersihkan Cache Model
          </button>
        </div>

        {cacheMessage && (
          <StatusBanner tone="info">
            <p>{cacheMessage}</p>
          </StatusBanner>
        )}
      </section>

      {dataset && (
        <section className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-2 text-xs text-[var(--text-secondary)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Informasi Dataset &amp; Privasi
          </h2>
          <p>
            <strong>Versi dataset:</strong> {dataset.manifest.version} (
            {dataset.manifest.mushafStandard})
          </p>
          <p>
            <strong>Sumber:</strong> {dataset.manifest.sourceName}
          </p>
          <p>
            <strong>Catatan:</strong> {dataset.manifest.notes}
          </p>
          <p>
            <strong>Privasi:</strong> Tidak ada audio rekaman atau riwayat
            latihan yang dikirim ke server pada MVP.
          </p>
        </section>
      )}
    </div>
  );
}

