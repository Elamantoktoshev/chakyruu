import { EVENT_TYPES, type EventType } from '@chakyruu/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from '../api/client';
import type { Template } from '../api/types';
import { useAsync } from '../api/useAsync';
import { AppHeader } from '../components/AppHeader';
import { ErrorView, LoadingView } from '../components/StatusView';
import { TemplateCard } from '../components/TemplateCard';
import { useI18n } from '../i18n/LanguageContext';

type Filter = EventType | 'ALL';

export function CreatePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Code of a partner gift chosen in the dashboard: the new invitation is created from it.
  const giftCode = searchParams.get('gift') ?? undefined;
  // "Ушуну колдонуу" on the landing page links here with the chosen template.
  const preselectedId = searchParams.get('template');
  const autoCreated = useRef(false);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api.listTemplates(), []);
  const state = useAsync(load);

  async function handleSelect(template: Template) {
    setCreatingId(template.id);
    setError(null);
    try {
      const draft = await api.createInvitation(template.id, giftCode);
      navigate(`/create/${draft.id}`);
    } catch {
      setError(t.errorGeneric);
      setCreatingId(null);
    }
  }

  useEffect(() => {
    if (autoCreated.current || !preselectedId || state.status !== 'success') return;
    const template = state.data.find((candidate) => candidate.id === preselectedId);
    if (!template) return;
    autoCreated.current = true;
    void handleSelect(template);
  }, [preselectedId, state]); // eslint-disable-line react-hooks/exhaustive-deps -- runs once when templates arrive

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  // Universal templates (Шырдак) fit every kind of toi.
  const templates = filter === 'ALL' ? state.data : state.data.filter((template) => template.type === filter || template.isUniversal);

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <h1 className="font-serif text-4xl text-burgundy">{t.createTitle}</h1>
        <p className="mt-2 text-ink/70">{t.createSubtitle}</p>

        <div role="tablist" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {(['ALL', ...EVENT_TYPES] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition ${
                filter === value
                  ? 'border-burgundy bg-burgundy text-cream'
                  : 'border-gold/50 bg-white/70 text-burgundy hover:border-burgundy/60'
              }`}
            >
              {value === 'ALL' ? t.filterAll : t.eventTypes[value]}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              actionLabel={creatingId === template.id ? t.creating : t.chooseTemplate}
              isBusy={creatingId !== null}
              onSelect={(selected) => void handleSelect(selected)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
