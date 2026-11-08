import { PAYMENT_PROVIDERS, type PaymentProviderId } from '@chakyruu/shared';

/** Bank names as text only — no logos. */
export const PAYMENT_LABELS: Readonly<Record<PaymentProviderId, string>> = {
  MBANK: 'MBank',
  SIMBANK: 'Симбанк',
};

/** Accepted ways to pay (landing page): "MBank · Симбанк". */
export function PaymentBadges() {
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {PAYMENT_PROVIDERS.map((provider) => (
        <li key={provider} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-night/80 ring-1 ring-line">
          {PAYMENT_LABELS[provider]}
        </li>
      ))}
    </ul>
  );
}
