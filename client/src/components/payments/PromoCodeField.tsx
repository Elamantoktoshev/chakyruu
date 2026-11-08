import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../../api/client';
import type { PromoPreview } from '../../api/types';
import type { Dict } from '../../i18n/dict';
import { useI18n } from '../../i18n/LanguageContext';

/** Message for a promo code the server refused (400 with details.reason), or null for other errors. */
export function promoErrorText(error: unknown, t: Dict): string | null {
  if (!(error instanceof ApiError) || error.status !== 400) return null;
  const reason = (error.details as { reason?: unknown } | undefined)?.reason;
  if (reason === 'expired') return t.promoExpired;
  if (reason === 'used_up') return t.promoUsedUp;
  if (reason === 'not_found') return t.promoNotFound;
  return null;
}

type Props = {
  invitationId: string;
  applied: PromoPreview | null;
  onApply: (preview: PromoPreview) => void;
  onRemove: () => void;
};

/** "Промокод [____] [Колдонуу]" — checks the code with the server and shows the discount. */
export function PromoCodeField({ invitationId, applied, onApply, onRemove }: Props) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) return;
    setIsChecking(true);
    setError(null);
    try {
      onApply(await api.checkPromo(invitationId, code));
      setCode('');
    } catch (err: unknown) {
      setError(promoErrorText(err, t) ?? t.errorGeneric);
    } finally {
      setIsChecking(false);
    }
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
        <span className="font-semibold text-emerald-900">
          {t.promoApplied.replace('{code}', applied.code).replace('{p}', String(applied.discountPercent))}
        </span>
        <button type="button" onClick={onRemove} className="min-h-10 rounded-xl px-3 text-sm text-night/60 hover:text-red-700">
          {t.promoRemove}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <label htmlFor="promo-code" className="mb-1.5 block text-sm font-medium text-night/80">
        {t.promoLabel}
      </label>
      <div className="flex gap-2">
        <input
          id="promo-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder={t.promoPlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={32}
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-3 font-semibold uppercase tracking-wider outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={isChecking || !code.trim()}
          className="min-h-12 shrink-0 rounded-xl bg-night px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t.promoApply}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
