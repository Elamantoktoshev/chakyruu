import { PAYMENT_PROVIDERS, type PaymentProviderId } from '@chakyruu/shared';

/** Brand names only — official logos need the providers' permission. */
export const PAYMENT_LABELS: Readonly<Record<PaymentProviderId, string>> = {
  MBANK: 'MBank',
  SIMBANK: 'Симбанк',
};

const BADGE_STYLE: Readonly<Record<PaymentProviderId, string>> = {
  MBANK: 'bg-emerald-600 text-white',
  SIMBANK: 'bg-sky-600 text-white',
};

export function PaymentBadge({ provider }: { provider: PaymentProviderId }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-bold ${BADGE_STYLE[provider]}`}
    >
      {PAYMENT_LABELS[provider].slice(0, 2)}
    </span>
  );
}

/** Row of accepted payment methods (landing page, checkout). */
export function PaymentBadges() {
  return (
    <ul className="flex flex-wrap items-center gap-3" aria-label={PAYMENT_PROVIDERS.map((provider) => PAYMENT_LABELS[provider]).join(', ')}>
      {PAYMENT_PROVIDERS.map((provider) => (
        <li key={provider} className="flex items-center gap-2 text-sm font-medium text-night/80">
          <PaymentBadge provider={provider} />
          {PAYMENT_LABELS[provider]}
        </li>
      ))}
    </ul>
  );
}
