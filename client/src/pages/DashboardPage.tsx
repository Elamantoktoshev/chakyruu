import { useCallback } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client';
import type { DashboardInvitation } from '../api/types';
import { useAsync } from '../api/useAsync';
import { AppHeader } from '../components/AppHeader';
import { MyGiftsBanner } from '../components/dashboard/MyGiftsBanner';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { SummaryStats } from '../components/dashboard/SummaryStats';
import { ErrorView, LoadingView } from '../components/StatusView';
import { useI18n } from '../i18n/LanguageContext';
import { formatEventDate } from '../lib/format';

export function DashboardPage() {
  const { t } = useI18n();
  const load = useCallback(() => api.listMyInvitations(), []);
  const state = useAsync(load);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;

  return (
    <div className="min-h-dvh pb-24">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pt-8">
        <h1 className="font-display font-extrabold text-4xl text-night">{t.dashboardTitle}</h1>
        <div className="mt-4">
          <MyGiftsBanner />
        </div>
        {state.data.length === 0 ? (
          <p className="mt-10 text-center text-night/60">{t.dashboardEmpty}</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {state.data.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))}
          </ul>
        )}
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-page/95 p-3 backdrop-blur">
        <Link
          to="/create"
          className="mx-auto flex min-h-12 max-w-3xl items-center justify-center rounded-xl bg-brand font-semibold text-white shadow-lg shadow-brand/20"
        >
          + {t.navCreate}
        </Link>
      </div>
    </div>
  );
}

function InvitationCard({ invitation }: { invitation: DashboardInvitation }) {
  const { t, lang } = useI18n();
  const date = invitation.eventDate ? formatEventDate(invitation.eventDate, lang).date : t.noDateYet;
  return (
    <li className="rounded-3xl border border-line bg-white/70 p-4 shadow-sm">
      <Link to={`/dashboard/${invitation.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-brand">{t.eventTypes[invitation.eventType]}</p>
            <h2 className="truncate font-display font-extrabold text-2xl text-night">{invitation.hostNames || t.untitledInvitation}</h2>
            <p className="text-sm text-night/60">{date}</p>
          </div>
          <StatusBadge status={invitation.status} />
        </div>
        <div className="mt-4">
          <SummaryStats summary={invitation.summary} isCompact />
        </div>
      </Link>
    </li>
  );
}
