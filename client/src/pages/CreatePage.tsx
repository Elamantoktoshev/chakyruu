import { EVENT_TYPES, type EventType } from '@chakyruu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from '../api/client';
import type { Template } from '../api/types';
import { useAsync } from '../api/useAsync';
import { AppHeader } from '../components/AppHeader';
import { ErrorView, LoadingView } from '../components/StatusView';
import { CatalogGrid, type CatalogFilter } from '../components/templateCatalog/CatalogGrid';
import { CatalogHeading } from '../components/templateCatalog/CatalogHeading';
import { useI18n } from '../i18n/LanguageContext';
import { track } from '../lib/analytics';

function parseFilter(value: string | null): CatalogFilter {
  return value && (EVENT_TYPES as readonly string[]).includes(value) ? (value as EventType) : 'ALL';
}

/**
 * /create: the same design catalog as /templates. "Customize" links back here with ?template=…,
 * which creates the draft (with a partner gift code, if one came from the cabinet) and opens the builder.
 */
export function CreatePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const giftCode = params.get('gift') ?? undefined;
  const chosenId = params.get('template');
  const filter = parseFilter(params.get('type'));
  const handledId = useRef<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api.listTemplates(), []);
  const state = useAsync(load);

  /** Links keep the gift code and the filter, and add the chosen design. */
  const templateHref = (templateId: string) => {
    const next = new URLSearchParams(params);
    next.set('template', templateId);
    return `/create?${next.toString()}`;
  };

  const changeFilter = (next: CatalogFilter) => {
    const updated = new URLSearchParams(params);
    if (next === 'ALL') updated.delete('type');
    else updated.set('type', next);
    updated.delete('template');
    setParams(updated, { replace: true });
  };

  async function createFrom(template: Template) {
    setIsCreating(true);
    setError(null);
    try {
      const draft = await api.createInvitation(template.id, giftCode);
      track('create_started', { template: template.componentKey, isGift: Boolean(giftCode) });
      navigate(`/create/${draft.id}`);
    } catch {
      setError(t.errorGeneric);
      setIsCreating(false);
      // Let the same design be tried again.
      handledId.current = null;
    }
  }

  useEffect(() => {
    if (!chosenId || handledId.current === chosenId || state.status !== 'success') return;
    const template = state.data.find((candidate) => candidate.id === chosenId);
    if (!template) return;
    handledId.current = chosenId;
    void createFrom(template);
  }, [chosenId, state]); // eslint-disable-line react-hooks/exhaustive-deps -- reacts to a newly chosen design only

  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;

  return (
    <div className="min-h-dvh bg-page">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 lg:pt-14">
        <CatalogHeading title={t.createTitle} subtitle={t.createSubtitle} isPageTitle />
        {error && (
          <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <div className="mt-8">
          {state.status === 'loading' ? (
            <LoadingView />
          ) : (
            <CatalogGrid templates={state.data} filter={filter} onFilterChange={changeFilter} templateHref={templateHref} />
          )}
        </div>
      </main>
      {isCreating && (
        <div role="status" className="fixed inset-0 z-40 flex items-center justify-center bg-page/80 backdrop-blur-sm">
          <p className="rounded-2xl bg-white px-6 py-4 font-display text-lg font-bold text-night shadow-xl">{t.creating}</p>
        </div>
      )}
    </div>
  );
}
