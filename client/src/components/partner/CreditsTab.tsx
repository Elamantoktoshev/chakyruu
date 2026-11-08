import { useCallback } from 'react';
import { api } from '../../api/client';
import { useAsync } from '../../api/useAsync';
import { useI18n } from '../../i18n/LanguageContext';
import { formatDateTime } from '../../lib/format';
import type { ReactNode } from 'react';

type Props = { balance: number; children?: ReactNode };

/** Balance and ledger. `children` is the package purchase block (payments stage). */
export function CreditsTab({ balance, children }: Props) {
  const { t, locale } = useI18n();
  const load = useCallback(() => api.partner.credits(), []);
  const state = useAsync(load);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand p-6 text-center text-white">
        <p className="text-sm text-white/80">{t.creditsBalance}</p>
        <p className="font-display text-6xl font-bold tabular-nums">{balance}</p>
        <p className="mt-1 text-xs text-white/70">{t.creditsHint}</p>
      </div>
      {children}
      {state.status === 'success' && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white/70">
          {state.data.ledger.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {t.creditReason[entry.reason]}
                <span className="block text-xs text-night/55">{formatDateTime(entry.createdAt, locale)}</span>
              </span>
              <span className={`font-semibold tabular-nums ${entry.amount > 0 ? 'text-emerald-700' : 'text-night/70'}`}>
                {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
