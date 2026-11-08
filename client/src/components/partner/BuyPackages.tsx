import { PAYMENT_PROVIDERS, packageAudience, type PaymentProviderId } from '@chakyruu/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiError } from '../../api/client';
import type { CheckoutView, OrgType } from '../../api/types';
import { usePrices } from '../../api/usePrices';
import { useI18n } from '../../i18n/LanguageContext';
import { PAYMENT_LABELS } from '../PaymentBadges';
import { CheckoutPanel } from '../payments/CheckoutPanel';

/** Invitation packages for this partner type, bought through the configured payment gateway. */
export function BuyPackages({ type }: { type: OrgType }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { prices } = usePrices();
  const [method, setMethod] = useState<PaymentProviderId>('MBANK');
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [pending, setPending] = useState<{ paymentId: string; checkout: CheckoutView } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const packages = prices.filter((price) => price.audience === packageAudience(type) && price.credits);

  async function buy(code: string) {
    setBusyCode(code);
    setError(null);
    try {
      const outcome = await api.partner.purchaseCredits(code, method);
      if (outcome.status === 'SUCCEEDED' || !outcome.checkout) navigate(`/pay/result/${outcome.paymentId}`);
      else setPending({ paymentId: outcome.paymentId, checkout: outcome.checkout });
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.status === 503 ? err.message : t.errorGeneric);
    } finally {
      setBusyCode(null);
    }
  }

  if (pending) return <CheckoutPanel checkout={pending.checkout} paymentId={pending.paymentId} />;

  return (
    <section className="space-y-3">
      <h3 className="font-display font-extrabold text-xl text-night">{t.buyPackageTitle}</h3>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_PROVIDERS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={method === value}
            onClick={() => setMethod(value)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${method === value ? 'border-brand bg-brand text-white' : 'border-line bg-white/70 text-brand'}`}
          >
            {PAYMENT_LABELS[value]}
          </button>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {packages.map((price) => (
          <li key={price.code} className="rounded-2xl border border-line bg-white/70 p-4 text-center">
            <p className="font-display font-extrabold text-2xl text-night">{t.buyPackageItem.replace('{n}', String(price.credits))}</p>
            <p className="mt-1 text-lg font-semibold">{price.amountSom.toLocaleString('ru-RU')} сом</p>
            <button
              type="button"
              disabled={busyCode !== null}
              onClick={() => void buy(price.code)}
              className="mt-3 min-h-11 w-full rounded-xl bg-brand font-semibold text-white disabled:opacity-60"
            >
              {busyCode === price.code ? t.paying : t.buyPackageButton}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}
