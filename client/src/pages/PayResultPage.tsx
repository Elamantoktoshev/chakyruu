import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api/client';
import type { PaymentStatusView } from '../api/types';
import { AppHeader } from '../components/AppHeader';
import { CheckoutPanel } from '../components/payments/CheckoutPanel';
import { ErrorView, LoadingView } from '../components/StatusView';
import { useI18n } from '../i18n/LanguageContext';
import { trackOnce } from '../lib/analytics';

const POLL_INTERVAL_MS = 5000;

/** Return page from the provider / "I paid": polls until the payment is no longer pending. */
export function PayResultPage() {
  const { paymentId = '' } = useParams();
  const { t } = useI18n();
  const [payment, setPayment] = useState<PaymentStatusView | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const next = await api.paymentStatus(paymentId);
        if (cancelled) return;
        setPayment(next);
        if (next.status === 'SUCCEEDED' && next.purpose === 'INVITATION') trackOnce(`published:${next.id}`, 'published', { isGift: false });
        if (next.status === 'PENDING') timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
      } catch (err: unknown) {
        if (!cancelled) setError(err);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [paymentId, attempt]);

  if (error) return <ErrorView error={error} onRetry={() => { setError(null); setAttempt((n) => n + 1); }} />;
  if (!payment) return <LoadingView />;

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-md space-y-5 px-4 py-10 text-center">
        {payment.status === 'PENDING' && (
          <>
            <h1 className="font-serif text-3xl text-burgundy">{t.payResultPending}</h1>
            <p className="text-sm text-ink/60">{t.payResultPendingHint}</p>
            {payment.checkout && payment.checkout.kind !== 'redirect' && <CheckoutPanel checkout={payment.checkout} paymentId={payment.id} />}
          </>
        )}
        {payment.status === 'SUCCEEDED' && (
          <>
            <h1 className="font-serif text-3xl text-emerald-800">{t.payResultSuccess} 🎉</h1>
            {payment.purpose === 'CREDIT_PACKAGE' ? (
              <>
                <p>{t.payResultCredits.replace('{n}', String(payment.credits ?? 0))}</p>
                <Link to="/partner" className="flex min-h-12 items-center justify-center rounded-full bg-burgundy font-semibold text-cream">
                  {t.navPartner}
                </Link>
              </>
            ) : (
              payment.invitationSlug && (
                <Link to={`/${payment.invitationSlug}`} className="flex min-h-12 items-center justify-center rounded-full bg-burgundy font-semibold text-cream">
                  {t.openInvitation}
                </Link>
              )
            )}
          </>
        )}
        {(payment.status === 'FAILED' || payment.status === 'REFUNDED') && (
          <>
            <h1 className="font-serif text-3xl text-red-800">{t.payResultFailed}</h1>
            <Link to="/dashboard" className="flex min-h-12 items-center justify-center rounded-full border-2 border-burgundy font-semibold text-burgundy">
              {t.payResultRetry}
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
