import { PAYMENT_PROVIDERS, type PaymentProviderId } from '@chakyruu/shared';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, ApiError } from '../api/client';
import type { CheckoutView, OwnerInvitation, PromoPreview } from '../api/types';
import { useAsync } from '../api/useAsync';
import { AppHeader } from '../components/AppHeader';
import { PAYMENT_LABELS } from '../components/PaymentBadges';
import { CheckoutPanel } from '../components/payments/CheckoutPanel';
import { PromoCodeField, promoErrorText } from '../components/payments/PromoCodeField';
import { ErrorView, LoadingView } from '../components/StatusView';
import type { Dict } from '../i18n/dict';
import { useI18n } from '../i18n/LanguageContext';
import { copyText } from '../lib/share';
import { track } from '../lib/analytics';

const FIELD_LABEL_KEYS = { hostNames: 'fieldHostNames', eventDate: 'fieldDate', venueName: 'fieldVenueName' } as const;

/** 409 from publish: really paid already, or a parallel tap is still setting the payment up. */
function conflictText(error: unknown, t: Dict): string | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const reason = (error.details as { reason?: unknown } | undefined)?.reason;
  return reason === 'in_progress' ? t.payInProgress : t.alreadyPublished;
}

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
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  const finalSom = invitation.isGift ? 0 : promo ? promo.finalPriceSom : invitation.priceSom;
  const priceLabel = finalSom === null ? '…' : finalSom.toLocaleString('ru-RU');
  const isFree = finalSom === 0;

  async function handlePay() {
    setIsPaying(true);
    setError(null);
    setMissing(null);
    try {
      const result = await api.publishInvitation(invitation.id, provider, promo?.code);
      if (result.status === 'PENDING') {
        setPending({ paymentId: result.paymentId, checkout: result.checkout });
        return;
      }
      track('published', { isGift: invitation.isGift });
      setPublishedSlug(result.slug);
    } catch (err: unknown) {
      const labels = missingFieldLabels(err, t);
      const promoProblem = promoErrorText(err, t);
      // The code stopped working between "Колдонуу" and "Төлөө" (used up, switched off).
      if (promoProblem) setPromo(null);
      if (labels) setMissing(labels);
      else setError(promoProblem ?? conflictText(err, t) ?? t.errorGeneric);
      setIsPaying(false);
    }
  }

  if (publishedSlug) return <Published slug={publishedSlug} />;
  if (pending) return <CheckoutPanel checkout={pending.checkout} paymentId={pending.paymentId} />;

  return (
    <div className="space-y-6">
      <h1 className="font-display font-extrabold text-3xl text-night">{t.payTitle}</h1>
      <div className="rounded-3xl border border-line bg-white/70 p-6 text-center">
        <p className="text-sm text-night/60">{t.payPrice}</p>
        {promo && <p className="mt-1 text-lg text-night/40 line-through">{promo.priceSom.toLocaleString('ru-RU')} сом</p>}
        <p className="mt-1 font-display text-5xl font-bold text-night">{priceLabel} сом</p>
        <p className="mt-2 text-sm text-night/70">{invitation.hostNames}</p>
      </div>

      {!invitation.isGift && (
        <PromoCodeField invitationId={invitation.id} applied={promo} onApply={setPromo} onRemove={() => setPromo(null)} />
      )}

      <fieldset hidden={isFree}>
        <legend className="mb-2 text-sm font-medium text-night/80">{t.payChoose}</legend>
        <div className="grid gap-3">
          {PAYMENT_PROVIDERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={provider === value}
              onClick={() => setProvider(value)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 text-left font-medium transition ${
                provider === value ? 'border-brand bg-white' : 'border-line bg-white/60'
              }`}
            >
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
        className="min-h-14 w-full rounded-xl bg-brand font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-brand-dark disabled:opacity-60"
      >
        {isPaying ? t.paying : isFree ? t.publishFree : `${t.payButton} · ${priceLabel} сом`}
      </button>
      <p className="text-center text-xs text-night/50">{t.payFakeNote}</p>
      <Link to={`/create/${invitation.id}`} className="block text-center text-sm text-brand underline underline-offset-4">
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
      <h1 className="font-display font-extrabold text-3xl text-night">{t.publishedTitle}</h1>
      <p className="text-night/70">{t.publishedText}</p>
      <p className="break-all rounded-2xl border border-line bg-white/70 p-4 font-medium text-brand">{url}</p>
      <button type="button" onClick={() => void handleCopy()} className="min-h-12 w-full rounded-xl bg-brand font-semibold text-white">
        {isCopied ? t.copied : t.copyLink}
      </button>
      <div className="flex justify-center gap-4 text-sm">
        <Link to={`/${slug}`} className="text-brand underline underline-offset-4">
          {t.openInvitation}
        </Link>
        <Link to="/dashboard" className="text-brand underline underline-offset-4">
          {t.goToDashboard}
        </Link>
      </div>
    </div>
  );
}
