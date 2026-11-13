import { NavLink, Outlet } from 'react-router-dom';
import {
  BookOpen,
  History,
  Home,
  Mic,
  Settings,
  WifiOff,
} from 'lucide-react';
import { useAppContext } from '../app/AppContext';
import { StatusBanner } from './StatusBanner';
import { loadGlobalAsrModel } from '../lib/asr-client/useLocalAsr';

const NAV_ITEMS = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/tes', label: 'Tes Hafalan', icon: Mic },
  { to: '/baca', label: 'Al-Qur’an', icon: BookOpen },
  { to: '/riwayat', label: 'Riwayat', icon: History },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
];

export function AppShell() {
  const { dataset, isOnline } = useAppContext();

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-4 sm:px-6">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[var(--text-primary)]"
          >
            <img
              src="/icon-192.png"
              alt=""
              className="h-8 w-8 rounded-[8px] object-cover"
              aria-hidden="true"
            />
            <span>Hafalanku</span>
          </NavLink>

          <nav
            aria-label="Navigasi utama"
            className="hidden md:flex items-center gap-1"
          >
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => {
                  if (to === '/tes') {
                    void loadGlobalAsrModel();
                  }
                }}
                className={({ isActive }) =>
                  `rounded-[8px] px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {dataset?.manifest.isFixture && (
            <span className="rounded-[6px] border border-[#FDE68A] bg-[var(--status-uncertain-bg)] px-2.5 py-1 text-xs font-medium text-[#92400E]">
              Data Sampel
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 pt-5 pb-24 sm:px-6 md:pb-12">
        {!isOnline && (
          <div className="mb-4">
            <StatusBanner tone="warning" title="Mode Offline">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Koneksi internet terputus. Pembaca Al-Qur’an, riwayat lokal,
                  dan model ASR yang sudah dicache tetap dapat digunakan.
                </span>
              </div>
            </StatusBanner>
          </div>
        )}

        <Outlet />
      </main>

      <footer className="hidden md:block border-t border-[var(--border-default)] bg-[var(--bg-surface)] py-5 text-xs text-[var(--text-muted)]">
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-2 px-6">
          <p>
            Hafalanku — Acuan Mushaf Standar Indonesia (MSI). Audio dan ASR
            diproses secara lokal di perangkat Anda.
          </p>
          <p>Hasil ASR adalah bantuan murojaah, bukan pengganti tashih guru.</p>
        </div>
      </footer>

      <nav
        aria-label="Navigasi bawah mobile"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border-default)] bg-[var(--bg-surface)] md:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => {
                if (to === '/tes') {
                  void loadGlobalAsrModel();
                }
              }}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

