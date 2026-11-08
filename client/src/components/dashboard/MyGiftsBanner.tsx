import { useCallback } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { useAsync } from '../../api/useAsync';
import { useI18n } from '../../i18n/LanguageContext';
import { formatEventDate } from '../../lib/format';

/** Unused partner gifts addressed to my phone, each with a "use" button. */
export function MyGiftsBanner() {
  const { t, lang } = useI18n();
  const load = useCallback(() => api.listMyGifts(), []);
  const state = useAsync(load);
  if (state.status !== 'success' || state.data.length === 0) return null;

  return (
    <section className="space-y-3 rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-4">
      <h2 className="font-display font-extrabold text-2xl text-emerald-900">🎁 {t.myGiftsTitle}</h2>
      <ul className="space-y-2">
        {state.data.map((gift) => (
          <li key={gift.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 p-3">
            <div className="min-w-0">
              <p className="font-medium text-night">{t.myGiftFrom.replace('{org}', gift.organization.name)}</p>
              <p className="text-xs text-night/60">
                {formatEventDate(gift.eventDate, lang).date}
                {gift.hall ? ` · ${gift.hall.name}` : ''}
              </p>
            </div>
            <Link
              to={`/create?gift=${encodeURIComponent(gift.code)}`}
              className="flex min-h-11 shrink-0 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"
            >
              {t.useGift}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
