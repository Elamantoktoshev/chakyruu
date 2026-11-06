import { guestLink, inviteMessage, summarizeGuests } from '@chakyruu/shared';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api/client';
import type { Guest, OwnerInvitation, OwnerTilek } from '../api/types';
import { useAsync } from '../api/useAsync';
import { AppHeader } from '../components/AppHeader';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { SummaryStats } from '../components/dashboard/SummaryStats';
import { GuestsPanel } from '../components/guests/GuestsPanel';
import { ErrorView, LoadingView } from '../components/StatusView';
import { TilekModeration } from '../components/tilek/TilekModeration';
import { useI18n } from '../i18n/LanguageContext';
import { formatEventDate } from '../lib/format';
import { shareLink } from '../lib/share';

interface PageData {
  invitation: OwnerInvitation;
  guests: Guest[];
  tilekter: OwnerTilek[];
}

export function DashboardInvitationPage() {
  const { id = '' } = useParams();
  const load = useCallback(async (): Promise<PageData> => {
    const [invitation, guests, tilekter] = await Promise.all([
      api.getMyInvitation(id),
      api.listGuests(id),
      api.listMyTilekter(id),
    ]);
    return { invitation, guests, tilekter };
  }, [id]);
  const state = useAsync(load);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  return <Manage key={id} data={state.data} />;
}

function Manage({ data }: { data: PageData }) {
  const { t, lang } = useI18n();
  const { invitation } = data;
  const [guests, setGuests] = useState(data.guests);
  const [tilekter, setTilekter] = useState(data.tilekter);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const isPublished = invitation.status === 'PUBLISHED';
  const sharedUrl = guestLink(window.location.origin, invitation.slug, null);
  const date = invitation.eventDate ? formatEventDate(invitation.eventDate, lang).date : t.noDateYet;

  async function handleShare() {
    const text = inviteMessage({ lang: invitation.language, guestName: null, hostNames: invitation.hostNames, url: sharedUrl });
    const outcome = await shareLink({ title: invitation.hostNames, text });
    setShareNotice(outcome === 'copied' ? t.copied : null);
  }

  const actionClass = 'flex min-h-12 flex-1 items-center justify-center rounded-full border-2 border-burgundy px-3 text-sm font-semibold text-burgundy';

  return (
    <div className="min-h-dvh pb-16">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-4 pt-6">
        <div>
          <Link to="/dashboard" className="text-sm text-burgundy hover:underline">
            {t.backToDashboard}
          </Link>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-gold">{t.eventTypes[invitation.eventType]}</p>
              <h1 className="break-words font-serif text-3xl text-burgundy">{invitation.hostNames || t.untitledInvitation}</h1>
              <p className="text-sm text-ink/60">{date}</p>
            </div>
            <StatusBadge status={invitation.status} />
          </div>
        </div>

        <SummaryStats summary={summarizeGuests(guests)} />

        <div className="flex gap-2">
          <Link to={`/create/${invitation.id}`} className={actionClass}>
            {t.edit}
          </Link>
          <Link to={`/${invitation.slug}`} className={actionClass}>
            {t.open}
          </Link>
          {isPublished ? (
            <button type="button" onClick={() => void handleShare()} className={`${actionClass} bg-burgundy text-cream`}>
              {shareNotice ?? t.share}
            </button>
          ) : (
            <Link to={`/pay/${invitation.id}`} className={`${actionClass} bg-burgundy text-cream`}>
              {t.publish}
            </Link>
          )}
        </div>

        {isPublished ? (
          <div className="rounded-2xl border border-gold/40 bg-white/70 p-4">
            <p className="text-sm font-semibold text-ink">{t.sharedLinkTitle}</p>
            <p className="mt-1 break-all text-burgundy">{sharedUrl}</p>
            <p className="mt-1 text-xs text-ink/55">{t.sharedLinkHint}</p>
          </div>
        ) : (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t.publishFirst}</p>
        )}

        <GuestsPanel
          invitationId={invitation.id}
          share={{ slug: invitation.slug, hostNames: invitation.hostNames, language: invitation.language }}
          guests={guests}
          onGuestsChange={setGuests}
        />

        <TilekModeration invitationId={invitation.id} tilekter={tilekter} onChange={setTilekter} />
      </main>
    </div>
  );
}
