import { guestGreeting } from '@chakyruu/shared';
import { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { api } from '../api/client';
import type { Invitation } from '../api/types';
import { useAsync } from '../api/useAsync';
import { InvitationView } from '../components/invitation/InvitationView';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { RsvpForm } from '../components/RsvpForm';
import { ErrorView, LoadingView } from '../components/StatusView';
import { TilekSection } from '../components/tilek/TilekSection';
import { useI18n } from '../i18n/LanguageContext';

export function InvitationPage() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const guestToken = searchParams.get('g');
  const load = useCallback(() => api.getInvitation(slug, guestToken), [slug, guestToken]);
  const state = useAsync(load);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  // A token that does not belong to this invitation is ignored: the page works like the shared link.
  return <LiveInvitation invitation={state.data} guestToken={state.data.guest ? guestToken : null} />;
}

function LiveInvitation({ invitation, guestToken }: { invitation: Invitation; guestToken: string | null }) {
  const { lang } = useI18n();
  const greeting = invitation.guest && (
    <p className="mb-4 font-serif text-2xl italic text-cream drop-shadow">{guestGreeting(invitation.guest.name, lang)}</p>
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
