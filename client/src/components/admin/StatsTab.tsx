import { useCallback, useState } from 'react';
import { api } from '../../api/client';
import type { AdminStats } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { useI18n } from '../../i18n/LanguageContext';
import { ErrorView, LoadingView } from '../StatusView';

type Period = AdminStats['period'];
const PERIODS: readonly Period[] = ['day', 'week', 'month'];

/** Business numbers for the chosen period. */
export function StatsTab() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>('week');
  const load = useCallback(() => api.admin.stats(period), [period]);
  const state = useAsync(load);

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label={t.adminTabStats}>
        {PERIODS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={period === value}
            onClick={() => setPeriod(value)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${
              period === value ? 'border-brand bg-brand text-white' : 'border-line bg-white/70 text-brand'
            }`}
          >
            {t.statsPeriods[value]}
          </button>
        ))}
      </div>
      {state.status === 'loading' && <LoadingView />}
      {state.status === 'error' && <ErrorView error={state.error} onRetry={state.reload} />}
      {state.status === 'success' && <StatsGrid stats={state.data} />}
    </div>
  );
}

function StatsGrid({ stats }: { stats: AdminStats }) {
  const { t } = useI18n();
  const number = (value: number) => value.toLocaleString('ru-RU');
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Tile label={t.statsNewUsers} value={number(stats.newUsers)} />
      <Tile label={t.statsCreated} value={number(stats.invitationsCreated)} />
      <Tile label={t.statsPublished} value={number(stats.invitationsPublished)} />
      <Tile label={t.statsRevenue} value={`${number(stats.revenueSom)} сом`} note={t.statsPayments.replace('{n}', String(stats.paidPayments))} isAccent />
      <Tile label={t.statsConversion} value={`${stats.conversionPercent.toLocaleString('ru-RU')}%`} note={t.statsConversionHint} />
    </dl>
  );
}

function Tile({ label, value, note, isAccent = false }: { label: string; value: string; note?: string; isAccent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${isAccent ? 'border-brand bg-brand text-white' : 'border-line bg-white/70'}`}>
      <dt className={`text-xs ${isAccent ? 'text-white/80' : 'text-night/60'}`}>{label}</dt>
      <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums">{value}</dd>
      {note && <p className={`mt-1 text-xs ${isAccent ? 'text-white/70' : 'text-night/50'}`}>{note}</p>}
    </div>
  );
}
