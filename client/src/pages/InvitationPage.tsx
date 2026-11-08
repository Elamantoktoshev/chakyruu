import { guestGreeting } from '@chakyruu/shared';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ApiError, api } from '../api/client';
import { takeEmbeddedInvitation } from '../api/embeddedInvitation';
import type { Invitation } from '../api/types';
import { useAsync } from '../api/useAsync';
import { InvitationView } from '../components/invitation/InvitationView';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { RsvpForm } from '../components/RsvpForm';
import { ErrorView, LoadingView } from '../components/StatusView';
import { NotFoundPage } from './NotFoundPage';
import { TilekSection } from '../components/tilek/TilekSection';
import { useI18n } from '../i18n/LanguageContext';
import { track } from '../lib/analytics';

export function InvitationPage() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const guestToken = searchParams.get('g');
  // First load of a published invitation: the data is already in the HTML.
  const [embedded] = useState(() => takeEmbeddedInvitation(slug));
  if (embedded) return <LiveInvitation invitation={embedded} guestToken={embedded.guest ? guestToken : null} />;
  return <FetchedInvitation slug={slug} guestToken={guestToken} />;
}

function FetchedInvitation({ slug, guestToken }: { slug: string; guestToken: string | null }) {
  const load = useCallback(() => api.getInvitation(slug, guestToken), [slug, guestToken]);
  const state = useAsync(load);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') {
    if (state.error instanceof ApiError && state.error.status === 404) return <NotFoundPage />;
    return <ErrorView error={state.error} onRetry={state.reload} />;
  }
  // A token that does not belong to this invitation is ignored: the page works like the shared link.
  return <LiveInvitation invitation={state.data} guestToken={state.data.guest ? guestToken : null} />;
}

function LiveInvitation({ invitation, guestToken }: { invitation: Invitation; guestToken: string | null }) {
  const { lang } = useI18n();
  const isGuestView = !invitation.isDraft;
  const isPersonal = Boolean(invitation.guest);
  useEffect(() => {
    // Owners previewing a draft are not guests.
    if (isGuestView) track('guest_opened', { personal: isPersonal });
  }, [isGuestView, isPersonal]);
  const greeting = invitation.guest && (
    <p className="mb-4 font-serif text-2xl italic">{guestGreeting(invitation.guest.name, lang)}</p>
  );
  return (
    <div className="min-h-dvh bg-cream-dark/40">
      {invitation.isDraft && <DraftBanner invitationId={invitation.id} />}
      <InvitationView
        invitation={invitation}
        lang={lang}
        mode="live"
        topBar={<LanguageSwitch />}
        greeting={greeting}
        opening={{ doorLabel: invitation.guest?.name ?? invitation.hostNames }}
        rsvp={
          invitation.isDraft ? undefined : (
            <RsvpForm slug={invitation.slug} guestToken={guestToken} guest={invitation.guest} />
          )
        }
      >
        {!invitation.isDraft && <TilekSection slug={invitation.slug} guestToken={guestToken} />}
      </InvitationView>
    </div>
  );
}

function DraftBanner({ invitationId }: { invitationId: string }) {
  const { t } = useI18n();
  return (
    <div className="sticky top-0 z-20 flex items-center justify-center gap-3 bg-amber-100 px-4 py-2.5 text-sm text-amber-900 shadow">
      <span>{t.draftBanner}</span>
      <Link to={`/create/${invitationId}`} className="font-semibold underline underline-offset-4">
        {t.draftBannerAction}
      </Link>
    </div>
  );
}
