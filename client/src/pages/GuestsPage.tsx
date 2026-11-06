import { useCallback } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api/client';
import type { RsvpList } from '../api/types';
import { useAsync } from '../api/useAsync';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { OrnamentDivider } from '../components/Ornament';
import { ErrorView, LoadingView } from '../components/StatusView';
import { useI18n } from '../i18n/LanguageContext';
import { formatDateTime } from '../lib/format';

export function GuestsPage() {
  const { slug = '' } = useParams();
  const load = useCallback(() => api.listRsvps(slug), [slug]);
  const state = useAsync(load);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  return <GuestsView slug={slug} data={state.data} />;
}

function StatCard({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 text-center ${
        highlight ? 'border-burgundy bg-burgundy text-cream' : 'border-gold/50 bg-white/70 text-burgundy'
      }`}
    >
      <div className="font-serif text-3xl font-bold tabular-nums">{value}</div>
      <div className={`mt-1 text-xs ${highlight ? 'text-cream/80' : 'text-ink/60'}`}>{label}</div>
    </div>
  );
}

function GuestsView({ slug, data }: { slug: string; data: RsvpList }) {
  const { t, locale } = useI18n();
  const { summary, rsvps } = data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <Link to={`/${slug}`} className="text-sm text-burgundy hover:underline">
          {t.backToInvitation}
        </Link>
        <LanguageSwitch />
      </div>

      <h1 className="mt-6 text-center font-serif text-4xl text-burgundy">{t.guestsTitle}</h1>
      <OrnamentDivider className="mx-auto mt-4 max-w-xs" />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={summary.totalGuests} label={t.guestsComing} highlight />
        <StatCard value={summary.totalResponses} label={t.responses} />
        <StatCard value={summary.attendingResponses} label={t.attendingCount} />
        <StatCard value={summary.declinedResponses} label={t.declinedCount} />
      </div>

      {rsvps.length === 0 ? (
        <p className="mt-12 text-center text-ink/60">{t.noResponses}</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-gold/40 bg-white/70 shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-burgundy text-cream">
              <tr>
                <th className="px-4 py-3 font-medium">{t.colName}</th>
                <th className="px-4 py-3 font-medium">{t.colStatus}</th>
                <th className="px-4 py-3 text-center font-medium">{t.colGuests}</th>
                <th className="px-4 py-3 font-medium">{t.colComment}</th>
                <th className="px-4 py-3 font-medium">{t.colDate}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/20">
              {rsvps.map((rsvp) => (
                <tr key={rsvp.id} className="align-top">
                  <td className="px-4 py-3 font-medium">{rsvp.guestName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        rsvp.attending ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {rsvp.attending ? t.attendYes : t.attendNo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{rsvp.attending ? rsvp.guestsCount : '—'}</td>
                  <td className="max-w-xs px-4 py-3 text-ink/70">{rsvp.comment ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/60">{formatDateTime(rsvp.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
