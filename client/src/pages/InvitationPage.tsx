import { useCallback, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { api } from '../api/client';
import type { Invitation } from '../api/types';
import { useAsync } from '../api/useAsync';
import { Countdown } from '../components/Countdown';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { OrnamentBand, OrnamentDivider } from '../components/Ornament';
import { RsvpForm } from '../components/RsvpForm';
import { ErrorView, LoadingView } from '../components/StatusView';
import { useI18n } from '../i18n/LanguageContext';
import { formatEventDate, formatEventTime, safeUrl } from '../lib/format';

export function InvitationPage() {
  const { slug = '' } = useParams();
  const load = useCallback(() => api.getInvitation(slug), [slug]);
  const state = useAsync(load);

  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView error={state.error} onRetry={state.reload} />;
  return <InvitationView invitation={state.data} />;
}

type SectionProps = { children: ReactNode; className?: string };

function Section({ children, className = '' }: SectionProps) {
  return <section className={`animate-fade-up px-6 py-10 text-center ${className}`}>{children}</section>;
}

function InvitationView({ invitation }: { invitation: Invitation }) {
  const { t, lang, locale } = useI18n();
  const eventDate = formatEventDate(invitation.eventDate, lang);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUrl = photoFailed ? undefined : safeUrl(invitation.photoUrl);
  const mapUrl = safeUrl(invitation.venueMapUrl);

  return (
    <div className="min-h-dvh bg-cream-dark/40">
      <main className="relative mx-auto max-w-md overflow-hidden bg-cream shadow-2xl shadow-burgundy/10">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitch />
        </div>

        {/* Hero */}
        <header className="relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={invitation.hostNames}
              onError={() => setPhotoFailed(true)}
              className="h-[62dvh] max-h-[40rem] min-h-96 w-full object-cover"
            />
          ) : (
            <div className="h-[46dvh] max-h-[32rem] min-h-80 w-full bg-burgundy" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-burgundy/30 via-burgundy/20 to-burgundy/90" />
          <div className="absolute inset-x-0 bottom-0 animate-fade-up px-6 pb-10 text-center text-cream">
            <p className="text-xs uppercase tracking-[0.35em] text-gold-light">{t.invitationTitle}</p>
            <h1 className="mt-3 font-serif text-5xl font-bold leading-tight drop-shadow-sm">
              {invitation.hostNames}
            </h1>
            <p className="mt-3 font-serif text-lg italic text-cream/90">{t.weddingInvite}</p>
          </div>
        </header>
        <div className="bg-burgundy py-1">
          <OrnamentBand />
        </div>

        {/* Message */}
        {invitation.message && (
          <Section>
            <OrnamentDivider className="mb-6" />
            <p className="font-serif text-lg leading-relaxed text-ink/85">{invitation.message}</p>
          </Section>
        )}

        {/* Date + countdown */}
        <Section className="bg-white/50">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">{t.dateLabel}</p>
          <p className="mt-3 font-serif text-3xl text-burgundy">{eventDate.date}</p>
          <p className="mt-1 font-serif text-lg italic text-burgundy/80">{eventDate.weekday}</p>
          <p className="mt-1 text-ink/70">
            {t.timeLabel}: <span className="font-semibold">{formatEventTime(invitation.eventDate, locale)}</span>
          </p>
          <p className="mb-4 mt-8 text-sm text-ink/60">{t.untilEvent}</p>
          <Countdown date={invitation.eventDate} />
        </Section>

        {/* Venue */}
        <Section>
          <OrnamentDivider className="mb-6" />
          <p className="text-xs uppercase tracking-[0.3em] text-gold">{t.venueLabel}</p>
          <p className="mt-3 font-serif text-2xl text-burgundy">{invitation.venueName}</p>
          {invitation.venueAddress && <p className="mt-1 text-ink/70">{invitation.venueAddress}</p>}
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-burgundy px-6 py-3 font-medium text-burgundy transition hover:bg-burgundy hover:text-cream"
            >
              <PinIcon /> {t.openIn2gis}
            </a>
          )}
        </Section>

        {/* RSVP */}
        <Section className="bg-white/50">
          <h2 className="font-serif text-3xl text-burgundy">{t.rsvpTitle}</h2>
          <p className="mb-6 mt-2 text-sm text-ink/60">{t.rsvpSubtitle}</p>
          <RsvpForm slug={invitation.slug} />
        </Section>

        <footer className="bg-burgundy pb-8 pt-1 text-center">
          <OrnamentBand />
          <p className="mt-6 font-serif text-2xl text-cream">{invitation.hostNames}</p>
          <p className="mt-3 text-xs text-cream/60">{t.footer}</p>
        </footer>
      </main>
    </div>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
