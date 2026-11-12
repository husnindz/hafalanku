import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './app/AppContext';
import { AppShell } from './components/AppShell';
import { HomePage } from './features/home/HomePage';
import { MemorizationTestPage } from './features/memorization-test/MemorizationTestPage';
import { QuranReaderPage } from './features/quran-reader/QuranReaderPage';
import { SessionHistoryPage } from './features/session-history/SessionHistoryPage';
import { SettingsPage } from './features/settings/SettingsPage';

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tes" element={<MemorizationTestPage />} />
            <Route path="/baca" element={<QuranReaderPage />} />
            <Route path="/riwayat" element={<SessionHistoryPage />} />
            <Route path="/pengaturan" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

