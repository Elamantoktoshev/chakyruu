import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { LanguageProvider } from './i18n/LanguageContext';
import { GuestsPage } from './pages/GuestsPage';
import { InvitationPage } from './pages/InvitationPage';

const DEMO_SLUG = 'aibek-aizada';

export function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/${DEMO_SLUG}`} replace />} />
          <Route path="/:slug" element={<InvitationPage />} />
          <Route path="/:slug/guests" element={<GuestsPage />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
