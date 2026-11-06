import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { LanguageProvider } from './i18n/LanguageContext';
import { BuilderPage } from './pages/BuilderPage';
import { CreatePage } from './pages/CreatePage';
import { DashboardInvitationPage } from './pages/DashboardInvitationPage';
import { DashboardPage } from './pages/DashboardPage';
import { InvitationPage } from './pages/InvitationPage';
import { LandingPage } from './pages/LandingPage';
import { PayPage } from './pages/PayPage';
import { LoginPage } from './pages/LoginPage';

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/create" element={<RequireAuth><CreatePage /></RequireAuth>} />
            <Route path="/create/:id" element={<RequireAuth><BuilderPage /></RequireAuth>} />
            <Route path="/pay/:id" element={<RequireAuth><PayPage /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/dashboard/:id" element={<RequireAuth><DashboardInvitationPage /></RequireAuth>} />
            <Route path="/:slug" element={<InvitationPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
