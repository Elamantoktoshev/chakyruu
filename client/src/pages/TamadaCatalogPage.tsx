import { PARTNER_LANGUAGES } from '@chakyruu/shared';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../api/client';
import type { TamadaCard } from '../api/types';
import { useAsync } from '../api/useAsync';
import { AppHeader } from '../components/AppHeader';
import { inputClass } from '../builder/fields';
import { useI18n } from '../i18n/LanguageContext';
import { safeUrl } from '../lib/format';

const FILTERS = ['city', 'lang', 'priceMax', 'date'] as const;

type Filters = Record<(typeof FILTERS)[number], string>;

function readFilters(params: URLSearchParams): Filters {
  return Object.fromEntries(FILTERS.map((key) => [key, params.get(key) ?? ''])) as Filters;
}

/** Filters live in the URL, so a filtered catalogue can be shared as a link. */
export function TamadaCatalogPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const query = readFilters(params);
  // The query string is the stable dependency: the catalogue reloads only when a filter changes.
  const queryString = params.toString();
  const load = useCallback(() => api.listTamadas(readFilters(new URLSearchParams(queryString))), [queryString]);
  const state = useAsync(load);

  const setFilter = (key: (typeof FILTERS)[number], value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 pt-8">
        <h1 className="font-serif text-4xl text-burgundy">{t.catalogTitle}</h1>
        <p className="mt-2 text-ink/70">{t.catalogSubtitle}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input aria-label={t.filterCity} placeholder={t.filterCity} value={query.city} onChange={(e) => setFilter('city', e.target.value)} className={inputClass} />
          <select aria-label={t.filterLanguage} value={query.lang} onChange={(e) => setFilter('lang', e.target.value)} className={inputClass}>
            <option value="">{t.filterAnyLanguage}</option>
            {PARTNER_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {t.languageNames[lang]}
              </option>
            ))}
          </select>
          <input
            aria-label={t.filterPriceMax}
            placeholder={t.filterPriceMax}
            type="number"
            min={0}
            inputMode="numeric"
            value={query.priceMax}
            onChange={(e) => setFilter('priceMax', e.target.value)}
            className={inputClass}
          />
          <input aria-label={t.filterDate} type="date" value={query.date} onChange={(e) => setFilter('date', e.target.value)} className={inputClass} />
        </div>

        {state.status === 'success' && state.data.length === 0 && <p className="mt-10 text-center text-ink/60">{t.catalogEmpty}</p>}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.status === 'success' && state.data.map((tamada) => <TamadaCardView key={tamada.id} tamada={tamada} />)}
        </ul>
      </main>
    </div>
  );
}

function TamadaCardView({ tamada }: { tamada: TamadaCard }) {
  const { t } = useI18n();
  const photo = safeUrl(tamada.photoUrl);
  return (
    <li className="flex flex-col rounded-3xl border border-gold/40 bg-white/70 p-4 shadow-sm">
      <div className="flex items-center gap-4">
        {photo ? (
          <img src={photo} alt={tamada.displayName} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-burgundy font-serif text-3xl text-cream">
            {tamada.displayName.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-serif text-2xl text-burgundy">{tamada.displayName}</h2>
          <p className="text-sm text-ink/60">
            {tamada.city}
            {tamada.priceFromSom !== null && ` · ${t.priceFrom.replace('{price}', tamada.priceFromSom.toLocaleString('ru-RU'))}`}
          </p>
          <p className="text-xs text-ink/55">{tamada.languages.map((lang) => t.languageNames[lang]).join(', ')}</p>
        </div>
      </div>
      {tamada.bio && <p className="mt-3 line-clamp-3 text-sm text-ink/75">{tamada.bio}</p>}
      {tamada.videoUrls.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {tamada.videoUrls.map((url, index) => (
            <li key={url}>
              <a href={safeUrl(url)} target="_blank" rel="noopener noreferrer" className="text-burgundy underline">
                ▶ {index + 1}
              </a>
            </li>
          ))}
        </ul>
      )}
      <a
        href={`/api/public/tamadas/${encodeURIComponent(tamada.id)}/contact`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-[#25D366] font-semibold text-white"
      >
        {t.write}
      </a>
    </li>
  );
}
