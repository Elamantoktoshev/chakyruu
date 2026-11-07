import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { CheckoutView } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { copyText } from '../../lib/share';

type Props = { checkout: CheckoutView; paymentId: string };

/** Payment pages are followed only over https (plus same-site paths and http://localhost in development). */
function safePaymentUrl(url: string): string | undefined {
  if (/^\/(?![/\\])/.test(url)) return url;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' || (protocol === 'http:' && hostname === 'localhost') ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Next step of a pending payment: go to the provider, scan a QR, or transfer by hand. */
export function CheckoutPanel({ checkout, paymentId }: Props) {
  const { t } = useI18n();
  const resultHref = `/pay/result/${encodeURIComponent(paymentId)}`;

  useEffect(() => {
    if (checkout.kind !== 'redirect') return;
    const url = safePaymentUrl(checkout.url);
    if (url) window.location.assign(url);
  }, [checkout]);

  if (checkout.kind === 'redirect') return <p className="text-center text-ink/70">{t.payRedirecting}</p>;

  if (checkout.kind === 'qr') {
    const appUrl = checkout.url ? safePaymentUrl(checkout.url) : undefined;
    return (
      <div className="space-y-4 rounded-3xl border border-gold/40 bg-white/70 p-5 text-center">
        <p className="font-medium">{t.payQrTitle}</p>
        <p className="break-all rounded-xl bg-cream p-3 font-mono text-xs">{checkout.qrPayload}</p>
        {appUrl && (
          <a href={appUrl} className="flex min-h-12 items-center justify-center rounded-full bg-burgundy font-semibold text-cream">
            {t.payOpenApp}
          </a>
        )}
        <Link to={resultHref} className="block text-sm text-burgundy underline">
          {t.payIDidPay}
        </Link>
      </div>
    );
  }

  return <ManualTransfer instructions={checkout.instructions} resultHref={resultHref} />;
}

function ManualTransfer({ instructions, resultHref }: { instructions: Extract<CheckoutView, { kind: 'manual' }>['instructions']; resultHref: string }) {
  const { t } = useI18n();
  const [isCopied, setIsCopied] = useState(false);
  return (
    <div className="space-y-4 rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-5">
      <h2 className="font-serif text-2xl text-emerald-900">{t.payManualTitle}</h2>
      <ol className="list-inside list-decimal space-y-3 text-sm text-ink/80">
        <li>
          {t.payManualStep1}{' '}
          <span className="font-mono text-lg font-semibold text-ink">{instructions.receiver}</span>
          <span className="block">
            {t.payManualAmount} <b>{instructions.amountSom.toLocaleString('ru-RU')} сом</b>
          </span>
        </li>
        <li>
          {t.payManualStep2}
          <button
            type="button"
            onClick={() => void copyText(instructions.reference).then(setIsCopied)}
            className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-400 bg-white font-mono text-2xl font-bold tracking-widest text-emerald-900"
          >
            {instructions.reference}
            <span className="font-sans text-xs font-normal text-ink/60">{isCopied ? t.copied : t.copyCode}</span>
          </button>
        </li>
        <li>{t.payManualStep3}</li>
      </ol>
      <Link to={resultHref} className="flex min-h-12 items-center justify-center rounded-full bg-emerald-600 font-semibold text-white">
        {t.payIDidPay}
      </Link>
    </div>
  );
}
