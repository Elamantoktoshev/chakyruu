import { Suspense, lazy } from 'react';
import { DEFAULT_SITE_LOCALE, PUBLIC_PAGES, SITE_LOCALES, localizedPath, type PublicPage, type SiteLocale } from '@chakyruu/shared';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { LanguageProvider } from './i18n/LanguageContext';
import { InitialDataProvider, type InitialData } from './ssr/initialData';
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

/** Old unprefixed public URLs → the Kyrgyz page (the server answers 301; this covers in-app links). */
function LegacyRedirect({ page }: { page: PublicPage }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${localizedPath(DEFAULT_SITE_LOCALE, page)}${search}${hash}`} replace />;
}

/** Each public page under /ky/… and /ru/…: its own indexable address per language. */
function publicRoutes(locale: SiteLocale) {
  const at = (page: string) => localizedPath(locale, page);
  return [
    <Route key={`${locale}-home`} path={at('')} element={<LandingPage />} />,
    <Route key={`${locale}-templates`} path={at('templates')} element={<TemplatesPage />} />,
    <Route key={`${locale}-tamadalar`} path={at('tamadalar')} element={<TamadaCatalogPage />} />,
    <Route key={`${locale}-oferta`} path={at('oferta')} element={<LegalPage kind="offer" />} />,
    <Route key={`${locale}-privacy`} path={at('privacy')} element={<LegalPage kind="privacy" />} />,
    <Route key={`${locale}-contacts`} path={at('contacts')} element={<LegalPage kind="contacts" />} />,
  ];
}

/** Providers and pages; the router around it differs: BrowserRouter in the browser, StaticRouter on the server. */
export function AppShell({ initialData = {} }: { initialData?: InitialData }) {
  return (
    <InitialDataProvider value={initialData}>
      <LanguageProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingView />}>
            <Routes>
              {SITE_LOCALES.flatMap(publicRoutes)}
              {PUBLIC_PAGES.map((page) => (
                <Route key={`legacy-${page}`} path={`/${page}`} element={<LegacyRedirect page={page} />} />
              ))}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/create" element={<RequireAuth><CreatePage /></RequireAuth>} />
              <Route path="/create/:id" element={<RequireAuth><BuilderPage /></RequireAuth>} />
              <Route path="/pay/:id" element={<RequireAuth><PayPage /></RequireAuth>} />
              <Route path="/pay/result/:paymentId" element={<RequireAuth><PayResultPage /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
              <Route path="/dashboard/:id" element={<RequireAuth><DashboardInvitationPage /></RequireAuth>} />
              <Route path="/partner" element={<RequireAuth><PartnerPage /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth><AdminPage paymentsTab={<PaymentsTab />} /></RequireAuth>} />
              <Route path="/admin/templates" element={<RequireAuth><AdminPage paymentsTab={<PaymentsTab />} initialTab="templates" /></RequireAuth>} />
              <Route path="/:slug" element={<InvitationPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </LanguageProvider>
    </InitialDataProvider>
  );
}

export function App({ initialData }: { initialData?: InitialData }) {
  return (
    <BrowserRouter>
      <AppShell initialData={initialData} />
    </BrowserRouter>
  );
}
