import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { LanguageProvider } from './i18n/LanguageContext';
import { PaymentsTab } from './components/admin/PaymentsTab';
import { AdminPage } from './pages/AdminPage';
import { BuilderPage } from './pages/BuilderPage';
import { CreatePage } from './pages/CreatePage';
import { DashboardInvitationPage } from './pages/DashboardInvitationPage';
import { DashboardPage } from './pages/DashboardPage';
import { InvitationPage } from './pages/InvitationPage';
import { LandingPage } from './pages/LandingPage';
import { PartnerPage } from './pages/PartnerPage';
import { PayPage } from './pages/PayPage';
import { PayResultPage } from './pages/PayResultPage';
import { TamadaCatalogPage } from './pages/TamadaCatalogPage';
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
            <Route path="/pay/result/:paymentId" element={<RequireAuth><PayResultPage /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/dashboard/:id" element={<RequireAuth><DashboardInvitationPage /></RequireAuth>} />
            <Route path="/partner" element={<RequireAuth><PartnerPage /></RequireAuth>} />
            <Route path="/tamadalar" element={<TamadaCatalogPage />} />
            <Route path="/admin" element={<RequireAuth><AdminPage paymentsTab={<PaymentsTab />} /></RequireAuth>} />
            <Route path="/:slug" element={<InvitationPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
