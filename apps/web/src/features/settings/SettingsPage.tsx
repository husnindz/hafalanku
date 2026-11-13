import { useState } from 'react';
import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { StatusBanner } from '../../components/StatusBanner';
import { clearQuranApiCache } from '../../lib/storage/quranApiCache';
import { resetCachedDatasetInMemory } from '../../data/quran/datasetAdapter';
import { useLocalAsr } from '../../lib/asr-client/useLocalAsr';

export function SettingsPage() {
  const { preferences, updatePreferences, reloadDataset } = useAppContext();
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const asr = useLocalAsr();

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
          <div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Mode Gelap (Malam)
            </span>
            <p className="text-xs text-[var(--text-muted)]">
              Tampilan latar gelap yang lebih nyaman untuk membaca dan murojaah.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.darkMode}
            onClick={() =>
              updatePreferences({ darkMode: !preferences.darkMode })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              preferences.darkMode ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-strong)]'
            }`}
          >
            <span className="sr-only">Aktifkan mode gelap</span>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                preferences.darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Status & Unduh Model AI Lokal */}
        <div className="border-t border-[var(--border-default)] pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Model AI Pengenalan Suara (Tilawa ONNX)
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Model lokal di browser untuk evaluasi hafalan secara privat dan offline.
              </p>
            </div>
            <button
              type="button"
              disabled={asr.modelState === 'downloading'}
              onClick={() => void asr.initModel()}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-[8px] bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {asr.modelState === 'downloading' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Mengunduh ({asr.progress?.percent ?? 0}%)...</span>
                </>
              ) : asr.modelState === 'ready' ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Model Siap (Verifikasi)</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh &amp; Pasang Model</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-[8px] bg-[var(--bg-canvas)] p-3 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  asr.modelState === 'ready'
                    ? 'bg-[var(--status-match)]'
                    : asr.modelState === 'downloading'
                      ? 'bg-[var(--status-info)] animate-pulse'
                      : 'bg-[var(--text-muted)]'
                }`}
              />
              <span className="font-semibold text-[var(--text-primary)]">
                {asr.modelState === 'ready'
                  ? 'Model Terpasang & Siap'
                  : asr.modelState === 'downloading'
                    ? 'Sedang Mengunduh & Memasang...'
                    : 'Belum Terunduh / Standby'}
              </span>
            </div>
            <p className="text-[var(--text-muted)]">
              {asr.statusMessage ??
                'Format INT8 ringan (~24 MB) di-cache secara permanen di browser.'}
            </p>
          </div>
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
        <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>Hafalanku • Mushaf Standar Indonesia</span>
          <span className="font-mono font-medium">v1.0.0</span>
        </div>
      </section>
    </div>
  );
}
