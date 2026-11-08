import { EVENT_TYPES, type EventType } from '@chakyruu/shared';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../api/client';
import { useAsync } from '../api/useAsync';
import { useAuth } from '../auth/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { SiteFooter } from '../components/landing/SiteFooter';
import { ErrorView, LoadingView } from '../components/StatusView';
import { CatalogGrid, type CatalogFilter } from '../components/templateCatalog/CatalogGrid';
import { CatalogHeading } from '../components/templateCatalog/CatalogHeading';
import { useI18n } from '../i18n/LanguageContext';

function parseFilter(value: string | null): CatalogFilter {
  return value && (EVENT_TYPES as readonly string[]).includes(value) ? (value as EventType) : 'ALL';
}

/** /templates: every design, filterable by toi type (the filter lives in the URL, so it can be shared). */
export function TemplatesPage() {
  const { t } = useI18n();
  const { state: auth } = useAuth();
  const [params, setParams] = useSearchParams();
  const load = useCallback(() => api.listTemplates(), []);
  const templates = useAsync(load);
  const filter = parseFilter(params.get('type'));
  const isLoggedIn = auth.status === 'authenticated';
  const templateHref = (templateId: string) => {
    const target = `/create?template=${encodeURIComponent(templateId)}`;
    return isLoggedIn ? target : `/login?next=${encodeURIComponent(target)}`;
  };
  const changeFilter = (next: CatalogFilter) => setParams(next === 'ALL' ? {} : { type: next }, { replace: true });

  return (
    <div className="min-h-dvh bg-page">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 lg:pt-14">
        <CatalogHeading title={t.tplCatalogTitle} subtitle={t.tplCatalogSubtitle} isPageTitle />
        <div className="mt-8">
          {templates.status === 'loading' && <LoadingView />}
          {templates.status === 'error' && <ErrorView error={templates.error} onRetry={templates.reload} />}
          {templates.status === 'success' && (
            <CatalogGrid templates={templates.data} filter={filter} onFilterChange={changeFilter} templateHref={templateHref} />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
