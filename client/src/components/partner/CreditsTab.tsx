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
      <div className="rounded-3xl bg-burgundy p-6 text-center text-cream">
        <p className="text-sm text-cream/80">{t.creditsBalance}</p>
        <p className="font-serif text-6xl font-bold tabular-nums">{balance}</p>
        <p className="mt-1 text-xs text-cream/70">{t.creditsHint}</p>
      </div>
      {children}
      {state.status === 'success' && (
        <ul className="divide-y divide-gold/20 rounded-2xl border border-gold/30 bg-white/70">
          {state.data.ledger.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {t.creditReason[entry.reason]}
                <span className="block text-xs text-ink/55">{formatDateTime(entry.createdAt, locale)}</span>
              </span>
              <span className={`font-semibold tabular-nums ${entry.amount > 0 ? 'text-emerald-700' : 'text-ink/70'}`}>
                {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
