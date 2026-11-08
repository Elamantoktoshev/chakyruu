import { useCallback, useState } from 'react';
import { api } from '../../api/client';
import type { AdminPrice } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { inputClass } from '../../builder/fields';
import { useI18n } from '../../i18n/LanguageContext';
import { ErrorView, LoadingView } from '../StatusView';

export function PricesTab() {
  const { t } = useI18n();
  const load = useCallback(() => api.admin.prices(), []);
  const state = useAsync(load);
  const [saved, setSaved] = useState<Readonly<Record<string, AdminPrice>>>({});

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  const prices = state.data.map((price) => saved[price.code] ?? price);

  async function update(price: AdminPrice, patch: { amountSom?: number; active?: boolean }) {
    try {
      const next = await api.admin.updatePrice(price.code, patch);
      setSaved((prev) => ({ ...prev, [price.code]: next }));
    } catch {
      window.alert(t.errorGeneric);
    }
  }

  return (
    <ul className="space-y-3">
      {prices.map((price) => (
        <li key={price.code} className={`rounded-2xl border border-line p-4 ${price.active ? 'bg-white/70' : 'bg-stone-100'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-semibold text-brand">{price.code}</p>
              <p className="text-xs text-night/60">
                {price.audience}
                {price.credits ? ` · ${t.adminPriceCredits.replace('{n}', String(price.credits))}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void update(price, { active: !price.active })}
              className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium ${price.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'}`}
            >
              {price.active ? t.adminPriceActive : t.adminPriceInactive}
            </button>
          </div>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const amount = Number(new FormData(event.currentTarget).get('amountSom'));
              if (Number.isInteger(amount) && amount >= 0) void update(price, { amountSom: amount });
            }}
          >
            <input name="amountSom" type="number" min={0} inputMode="numeric" defaultValue={price.amountSom} key={price.amountSom} className={inputClass} />
            <span className="text-sm text-night/60">сом</span>
            <button type="submit" className="min-h-12 shrink-0 rounded-xl bg-brand px-5 text-sm font-semibold text-white">
              {t.save}
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
