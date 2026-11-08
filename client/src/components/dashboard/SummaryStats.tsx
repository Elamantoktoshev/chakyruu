import type { GuestSummary } from '@chakyruu/shared';
import { useI18n } from '../../i18n/LanguageContext';

type Props = { summary: GuestSummary; isCompact?: boolean };

/** People coming is the number the hosts plan the toi around, so it is the highlighted one. */
export function SummaryStats({ summary, isCompact = false }: Props) {
  const { t } = useI18n();
  const stats = [
    { value: summary.totalPeople, label: t.statPeople, isHighlight: true },
    { value: summary.attending, label: t.statComing, isHighlight: false },
    { value: summary.declined, label: t.statDeclined, isHighlight: false },
    { value: summary.noAnswer, label: t.statNoAnswer, isHighlight: false },
  ];
  return (
    <dl className={`grid grid-cols-4 ${isCompact ? 'gap-2' : 'gap-3'}`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-2xl border text-center ${isCompact ? 'p-2' : 'p-4'} ${
            stat.isHighlight ? 'border-brand bg-brand text-white' : 'border-line bg-white/70 text-brand'
          }`}
        >
          <dd className={`font-display font-bold tabular-nums ${isCompact ? 'text-xl' : 'text-3xl'}`}>{stat.value}</dd>
          <dt className={`mt-0.5 text-[11px] leading-tight ${stat.isHighlight ? 'text-white/80' : 'text-night/60'}`}>{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
}
