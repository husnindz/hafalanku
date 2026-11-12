import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { QuranDataset, UserPreferences } from '@hafalanku/quran-types';
import { loadQuranDataset } from '../data/quran/datasetAdapter';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
} from '../lib/storage/preferences';

interface AppContextValue {
  dataset: QuranDataset | null;
  datasetError: string | null;
  isLoadingDataset: boolean;
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  isOnline: boolean;
  reloadDataset: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<QuranDataset | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [isLoadingDataset, setIsLoadingDataset] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    typeof window !== 'undefined' ? loadPreferences() : DEFAULT_PREFERENCES
  );
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const fetchDataset = useCallback(() => {
    setIsLoadingDataset(true);
    setDatasetError(null);
    loadQuranDataset()
      .then((data) => {
        setDataset(data);
      })
      .catch((err: unknown) => {
        setDatasetError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat dataset Al-Qur’an lokal.'
        );
      })
      .finally(() => {
        setIsLoadingDataset(false);
      });
  }, []);

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        dataset,
        datasetError,
        isLoadingDataset,
        preferences,
        updatePreferences,
        isOnline,
        reloadDataset: fetchDataset,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext harus dipakai di dalam AppProvider.');
  }
  return ctx;
}

