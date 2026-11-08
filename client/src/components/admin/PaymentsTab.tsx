import { useCallback, useState } from 'react';
import { api } from '../../api/client';
import { useAsync } from '../../api/useAsync';
import { useI18n } from '../../i18n/LanguageContext';
import { formatDateTime } from '../../lib/format';
import { ErrorView, LoadingView } from '../StatusView';

/** Pending manual transfers: the admin checks MBank and confirms by reference code. */
export function PaymentsTab() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<'PENDING' | 'SUCCEEDED'>('PENDING');
  const load = useCallback(() => api.admin.payments(status), [status]);
  const state = useAsync(load);
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set());

  async function confirm(id: string) {
    if (!window.confirm(t.adminConfirmPaymentPrompt)) return;
    try {
      await api.admin.confirmPayment(id);
      setConfirmed((prev) => new Set([...prev, id]));
    } catch {
      window.alert(t.errorGeneric);
    }
  }

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  const payments = state.data.filter((payment) => status !== 'PENDING' || !confirmed.has(payment.id));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['PENDING', 'SUCCEEDED'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${status === value ? 'border-brand bg-brand text-white' : 'border-line bg-white/70 text-brand'}`}
          >
            {value === 'PENDING' ? t.adminPaymentsPending : t.adminPaymentsPaid}
          </button>
        ))}
      </div>
      {payments.length === 0 && <p className="text-center text-night/60">{t.adminPaymentsEmpty}</p>}
      <ul className="space-y-3">
        {payments.map((payment) => (
          <li key={payment.id} className="rounded-2xl border border-line bg-white/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xl font-bold tracking-wider text-brand">{payment.reference ?? '—'}</p>
                <p className="text-sm text-night/70">
                  {payment.purpose === 'INVITATION'
                    ? `${t.adminPaymentInvitation}: ${payment.invitation?.hostNames ?? ''} · ${payment.invitation?.owner.phone ?? payment.invitation?.owner.email ?? ''}`
                    : `${t.adminPaymentPackage} ${payment.credits ?? ''}: ${payment.organization?.name ?? ''}`}
                </p>
                <p className="text-xs text-night/50">
                  {payment.provider} · {payment.gateway} · {formatDateTime(payment.createdAt, locale)}
                </p>
              </div>
              <span className="shrink-0 font-display text-xl font-bold tabular-nums text-night">{(payment.amount / 100).toLocaleString('ru-RU')} сом</span>
            </div>
            {payment.status === 'PENDING' && (
              <button type="button" onClick={() => void confirm(payment.id)} className="mt-3 min-h-11 w-full rounded-xl bg-emerald-600 font-semibold text-white">
                ✓ {t.adminConfirmPayment}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
