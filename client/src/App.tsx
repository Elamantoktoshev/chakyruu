import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { LanguageProvider } from './i18n/LanguageContext';
import { InvitationPage } from './pages/InvitationPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { LoadingView } from './components/StatusView';

/**
 * Only the invitation page (what guests open) and login are in the main bundle;
 * every other page is its own chunk.
 */
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const BuilderPage = lazy(() => import('./pages/BuilderPage').then((m) => ({ default: m.BuilderPage })));
const CreatePage = lazy(() => import('./pages/CreatePage').then((m) => ({ default: m.CreatePage })));
const DashboardInvitationPage = lazy(() => import('./pages/DashboardInvitationPage').then((m) => ({ default: m.DashboardInvitationPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const PartnerPage = lazy(() => import('./pages/PartnerPage').then((m) => ({ default: m.PartnerPage })));
const PayPage = lazy(() => import('./pages/PayPage').then((m) => ({ default: m.PayPage })));
const PayResultPage = lazy(() => import('./pages/PayResultPage').then((m) => ({ default: m.PayResultPage })));
const TamadaCatalogPage = lazy(() => import('./pages/TamadaCatalogPage').then((m) => ({ default: m.TamadaCatalogPage })));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })));
const PaymentsTab = lazy(() => import('./components/admin/PaymentsTab').then((m) => ({ default: m.PaymentsTab })));

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingView />}>
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
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/oferta" element={<LegalPage kind="offer" />} />
            <Route path="/privacy" element={<LegalPage kind="privacy" />} />
            <Route path="/contacts" element={<LegalPage kind="contacts" />} />
            <Route path="/admin" element={<RequireAuth><AdminPage paymentsTab={<PaymentsTab />} /></RequireAuth>} />
            <Route path="/admin/templates" element={<RequireAuth><AdminPage paymentsTab={<PaymentsTab />} initialTab="templates" /></RequireAuth>} />
            <Route path="/:slug" element={<InvitationPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
