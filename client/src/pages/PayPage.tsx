import { PAYMENT_PROVIDERS, type PaymentProviderId } from '@chakyruu/shared';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, ApiError } from '../api/client';
import type { CheckoutView, OwnerInvitation } from '../api/types';
import { usePrices } from '../api/usePrices';
import { useAsync } from '../api/useAsync';
import { AppHeader } from '../components/AppHeader';
import { PAYMENT_LABELS, PaymentBadge } from '../components/PaymentBadges';
import { CheckoutPanel } from '../components/payments/CheckoutPanel';
import { ErrorView, LoadingView } from '../components/StatusView';
import type { Dict } from '../i18n/dict';
import { useI18n } from '../i18n/LanguageContext';
import { copyText } from '../lib/share';
import { track } from '../lib/analytics';

const FIELD_LABEL_KEYS = { hostNames: 'fieldHostNames', eventDate: 'fieldDate', venueName: 'fieldVenueName' } as const;

function missingFieldLabels(error: unknown, t: Dict): string[] | null {
  if (!(error instanceof ApiError) || error.status !== 400 || !Array.isArray(error.details)) return null;
  return error.details
    .filter((field): field is keyof typeof FIELD_LABEL_KEYS => field in FIELD_LABEL_KEYS)
    .map((field) => t[FIELD_LABEL_KEYS[field]]);
}

export function PayPage() {
  const { id = '' } = useParams();
  const load = useCallback(() => api.getMyInvitation(id), [id]);
  const state = useAsync(load);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        {state.data.status === 'PUBLISHED' ? <Published slug={state.data.slug} /> : <Checkout invitation={state.data} />}
      </main>
    </div>
  );
}

function Checkout({ invitation }: { invitation: OwnerInvitation }) {
  const { t } = useI18n();
  const [provider, setProvider] = useState<PaymentProviderId>('MBANK');
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [pending, setPending] = useState<{ paymentId: string; checkout: CheckoutView } | null>(null);
  const { publishPriceSom } = usePrices();
  const priceLabel = invitation.isGift ? '0' : publishPriceSom === null ? '…' : publishPriceSom.toLocaleString('ru-RU');

  async function handlePay() {
    setIsPaying(true);
    setError(null);
    setMissing(null);
    try {
      const result = await api.publishInvitation(invitation.id, provider);
      if (result.status === 'PENDING') {
        setPending({ paymentId: result.paymentId, checkout: result.checkout });
        return;
      }
      track('published', { isGift: invitation.isGift });
      setPublishedSlug(result.slug);
    } catch (err: unknown) {
      const labels = missingFieldLabels(err, t);
      if (labels) setMissing(labels);
      else setError(err instanceof ApiError && err.status === 409 ? t.alreadyPublished : t.errorGeneric);
      setIsPaying(false);
    }
  }

  if (publishedSlug) return <Published slug={publishedSlug} />;
  if (pending) return <CheckoutPanel checkout={pending.checkout} paymentId={pending.paymentId} />;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-burgundy">{t.payTitle}</h1>
      <div className="rounded-3xl border border-gold/40 bg-white/70 p-6 text-center">
        <p className="text-sm text-ink/60">{t.payPrice}</p>
        <p className="mt-1 font-serif text-5xl font-bold text-burgundy">{priceLabel} сом</p>
        <p className="mt-2 text-sm text-ink/70">{invitation.hostNames}</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink/80">{t.payChoose}</legend>
        <div className="grid gap-3">
          {PAYMENT_PROVIDERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={provider === value}
              onClick={() => setProvider(value)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 text-left font-medium transition ${
                provider === value ? 'border-burgundy bg-white' : 'border-gold/40 bg-white/60'
              }`}
            >
              <PaymentBadge provider={value} />
              <span>{PAYMENT_LABELS[value]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {missing && (
        <div role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{t.payMissing}</p>
          <ul className="mt-1 list-inside list-disc">
            {missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="text-center text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={isPaying}
        onClick={() => void handlePay()}
        className="min-h-14 w-full rounded-full bg-burgundy font-semibold text-cream shadow-lg shadow-burgundy/20 transition hover:bg-burgundy-dark disabled:opacity-60"
      >
        {isPaying ? t.paying : invitation.isGift ? t.publishFree : `${t.payButton} · ${priceLabel} сом`}
      </button>
      <p className="text-center text-xs text-ink/50">{t.payFakeNote}</p>
      <Link to={`/create/${invitation.id}`} className="block text-center text-sm text-burgundy underline underline-offset-4">
        {t.backToBuilder}
      </Link>
    </div>
  );
}

function Published({ slug }: { slug: string }) {
  const { t } = useI18n();
  const [isCopied, setIsCopied] = useState(false);
  const url = `${window.location.origin}/${slug}`;

  async function handleCopy() {
    setIsCopied(await copyText(url));
  }

  return (
    <div className="space-y-5 text-center">
      <h1 className="font-serif text-3xl text-burgundy">{t.publishedTitle}</h1>
      <p className="text-ink/70">{t.publishedText}</p>
      <p className="break-all rounded-2xl border border-gold/40 bg-white/70 p-4 font-medium text-burgundy">{url}</p>
      <button type="button" onClick={() => void handleCopy()} className="min-h-12 w-full rounded-full bg-burgundy font-semibold text-cream">
        {isCopied ? t.copied : t.copyLink}
      </button>
      <div className="flex justify-center gap-4 text-sm">
        <Link to={`/${slug}`} className="text-burgundy underline underline-offset-4">
          {t.openInvitation}
        </Link>
        <Link to="/dashboard" className="text-burgundy underline underline-offset-4">
          {t.goToDashboard}
        </Link>
      </div>
    </div>
  );
}
