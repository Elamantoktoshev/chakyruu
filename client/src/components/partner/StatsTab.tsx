import { useCallback } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import type { OrgType, PartnerStats } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { useI18n } from '../../i18n/LanguageContext';
import { formatEventDate } from '../../lib/format';
import { ErrorView, LoadingView } from '../StatusView';

export function StatsTab({ type }: { type: OrgType }) {
  const { t } = useI18n();
  const load = useCallback(() => api.partner.stats(), []);
  const state = useAsync(load);
  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  const stats = state.data;

  const cards = [
    { label: t.statGifts, value: stats.gifts.issued },
    { label: t.statGiftsUsed, value: stats.gifts.USED },
    { label: t.statInvitations, value: stats.invitations },
    { label: t.statPartnerPeople, value: stats.peopleComing },
    ...(type === 'TAMADA' ? [{ label: `${t.statClicks} (${t.statClicksRecent}: ${stats.tamadaClicks.last30Days})`, value: stats.tamadaClicks.total }] : []),
  ];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gold/40 bg-white/70 p-4 text-center">
            <dd className="font-serif text-3xl font-bold tabular-nums text-burgundy">{card.value}</dd>
            <dt className="mt-1 text-xs text-ink/60">{card.label}</dt>
          </div>
        ))}
      </dl>
      <Calendar stats={stats} groupByHall={type === 'VENUE'} />
    </div>
  );
}

function Calendar({ stats, groupByHall }: { stats: PartnerStats; groupByHall: boolean }) {
  const { t, lang } = useI18n();
  const groups = groupByHall
    ? [...new Set(stats.calendar.map((entry) => entry.hall?.name ?? t.calendarNoHall))].map((name) => ({
        name,
        entries: stats.calendar.filter((entry) => (entry.hall?.name ?? t.calendarNoHall) === name),
      }))
    : [{ name: null, entries: stats.calendar }];

  return (
    <section className="space-y-3">
      <h3 className="font-serif text-xl text-burgundy">{t.calendarTitle}</h3>
      {stats.calendar.length === 0 && <p className="text-ink/60">{t.calendarEmpty}</p>}
      {groups.map((group) => (
        <div key={group.name ?? 'all'} className="space-y-2">
          {group.name && <h4 className="text-sm font-semibold text-ink/70">{group.name}</h4>}
          <ul className="space-y-2">
            {group.entries.map((entry) => (
              <li key={entry.slug}>
                <Link to={`/${entry.slug}`} className="flex items-center justify-between rounded-2xl border border-gold/30 bg-white/70 px-4 py-3">
                  <span className="font-medium">{entry.hostNames}</span>
                  <span className="text-sm text-ink/60">{formatEventDate(entry.eventDate, lang).date}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
