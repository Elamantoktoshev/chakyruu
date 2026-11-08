import { EVENT_TIME_ZONE } from '@chakyruu/shared';
import { useCallback, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { AdminPromoCode, AdminPromoInput } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { inputClass } from '../../builder/fields';
import { useI18n } from '../../i18n/LanguageContext';
import { ErrorView, LoadingView } from '../StatusView';
import { adminErrorText } from './adminErrorText';

/** The last valid day ends at midnight in Bishkek. */
const endOfDayBishkek = (day: string): string => `${day}T23:59:59+06:00`;

function readForm(form: HTMLFormElement): AdminPromoInput {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? '').trim();
  const maxUses = text('maxUses');
  const expires = text('expiresAt');
  return {
    code: text('code'),
    discountPercent: Number(text('discountPercent')),
    maxUses: maxUses ? Number(maxUses) : null,
    expiresAt: expires ? endOfDayBishkek(expires) : null,
    note: text('note') || null,
  };
}

/** /admin → Промокоддор: create codes (percent off publishing) and switch them on or off. */
export function PromoTab() {
  const { t } = useI18n();
  const load = useCallback(() => api.admin.promoCodes(), []);
  const state = useAsync(load);
  const [created, setCreated] = useState<readonly AdminPromoCode[]>([]);
  const [updated, setUpdated] = useState<Readonly<Record<string, AdminPromoCode>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  const promos = [...created, ...state.data.filter((promo) => !created.some((c) => c.id === promo.id))].map((promo) => updated[promo.id] ?? promo);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSaving(true);
    setError(null);
    try {
      const promo = await api.admin.createPromo(readForm(form));
      setCreated((prev) => [promo, ...prev]);
      form.reset();
    } catch (err: unknown) {
      setError(adminErrorText(err, t.errorGeneric));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggle(promo: AdminPromoCode) {
    try {
      const next = await api.admin.setPromoActive(promo.id, !promo.isActive);
      setUpdated((prev) => ({ ...prev, [promo.id]: next }));
    } catch {
      window.alert(t.errorGeneric);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => void handleCreate(event)} className="space-y-3 rounded-2xl border border-line bg-white/70 p-4">
        <h2 className="font-display text-lg font-bold text-night">{t.adminPromoCreate}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-night/70">
            {t.adminPromoCode}
            <input name="code" required minLength={3} maxLength={32} pattern="[A-Za-z0-9\-]+" placeholder="TOI2027" className={`${inputClass} mt-1 uppercase`} />
          </label>
          <label className="block text-sm text-night/70">
            {t.adminPromoPercent}
            <input name="discountPercent" type="number" required min={1} max={100} inputMode="numeric" placeholder="20" className={`${inputClass} mt-1`} />
          </label>
          <label className="block text-sm text-night/70">
            {t.adminPromoMaxUses}
            <input name="maxUses" type="number" min={1} inputMode="numeric" className={`${inputClass} mt-1`} />
          </label>
          <label className="block text-sm text-night/70">
            {t.adminPromoExpires}
            <input name="expiresAt" type="date" className={`${inputClass} mt-1`} />
          </label>
        </div>
        <label className="block text-sm text-night/70">
          {t.adminPromoNote}
          <input name="note" maxLength={200} className={`${inputClass} mt-1`} />
        </label>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={isSaving} className="min-h-12 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60">
          {t.adminPromoCreate}
        </button>
      </form>

      {promos.length === 0 ? (
        <p className="text-center text-night/60">{t.adminPromoEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {promos.map((promo) => (
            <PromoRow key={promo.id} promo={promo} onToggle={() => void toggle(promo)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PromoRow({ promo, onToggle }: { promo: AdminPromoCode; onToggle: () => void }) {
  const { t, locale } = useI18n();
  const isExpired = promo.expiresAt !== null && new Date(promo.expiresAt) <= new Date();
  const until = promo.expiresAt
    ? t.adminPromoUntil.replace('{date}', new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: EVENT_TIME_ZONE }).format(new Date(promo.expiresAt)))
    : null;
  const used = t.adminPromoUsed.replace('{used}', String(promo.usedCount)).replace('{max}', promo.maxUses === null ? t.adminPromoUnlimited : String(promo.maxUses));

  return (
    <li className={`flex items-center justify-between gap-3 rounded-2xl border border-line p-4 ${promo.isActive && !isExpired ? 'bg-white/70' : 'bg-stone-100'}`}>
      <div className="min-w-0">
        <p className="font-mono text-lg font-bold text-night">
          {promo.code} <span className="font-sans text-base text-brand">−{promo.discountPercent}%</span>
        </p>
        <p className="text-xs text-night/60">
          {used}
          {until && ` · ${until}`}
          {isExpired && ` · ${t.adminPromoExpiredBadge}`}
        </p>
        {promo.note && <p className="mt-1 truncate text-sm text-night/70">{promo.note}</p>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium ${promo.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'}`}
      >
        {promo.isActive ? t.adminPromoOn : t.adminPromoOff}
      </button>
    </li>
  );
}
