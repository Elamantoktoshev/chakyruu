import { useState, type ReactNode } from 'react';
import type { InvitationContent, Language } from '../../api/types';
import { FixedLanguage, useI18n } from '../../i18n/LanguageContext';
import { formatEventDate, formatEventTime, safeUrl } from '../../lib/format';
import { templateThemeStyle } from '../../lib/theme';
import { Countdown } from '../Countdown';
import { OrnamentBand, OrnamentDivider } from '../Ornament';
import { MusicButton } from './MusicButton';
import { TamadaBrandBlock, VenueBrandBlock } from './PartnerBlocks';

export type InvitationViewMode = 'live' | 'preview';

type Props = {
  invitation: InvitationContent;
  /** Language the invitation is rendered in (guest's choice on the live page, the form value in preview). */
  lang: Language;
  mode: InvitationViewMode;
  /** Top-right controls (language switch) — live page only. */
  topBar?: ReactNode;
  /** Personal greeting shown above the names (guest links). */
  greeting?: ReactNode;
  /** RSVP block; the preview passes a placeholder. */
  rsvp?: ReactNode;
  /** Extra sections after RSVP (tilekter). */
  children?: ReactNode;
};

type SectionProps = { children: ReactNode; className?: string };

function Section({ children, className = '' }: SectionProps) {
  return <section className={`animate-fade-up px-6 py-10 text-center ${className}`}>{children}</section>;
}

/** The invitation itself. Pure presentation: data in, markup out. */
export function InvitationView(props: Props) {
  return (
    <FixedLanguage lang={props.lang}>
      <InvitationBody {...props} />
    </FixedLanguage>
  );
}

function InvitationBody({ invitation, mode, topBar, greeting, rsvp, children }: Props) {
  const { t, lang, locale } = useI18n();
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const photoUrl = invitation.photoUrl === failedPhotoUrl ? undefined : safeUrl(invitation.photoUrl);
  const mapUrl = safeUrl(invitation.venueMapUrl);
  const eventDate = invitation.eventDate ? formatEventDate(invitation.eventDate, lang) : null;
  const isPreview = mode === 'preview';
  const heroHeight = isPreview ? 'h-[26rem]' : 'h-[62dvh] max-h-[40rem] min-h-96';
  const emptyHeroHeight = isPreview ? 'h-80' : 'h-[46dvh] max-h-[32rem] min-h-80';

  return (
    <main
      style={templateThemeStyle(invitation.template.config)}
      className="relative mx-auto w-full max-w-md overflow-hidden bg-cream text-ink shadow-2xl shadow-burgundy/10"
    >
      <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3">
        <MusicButton trackId={invitation.musicTrackId} />
        <div className="ml-auto">{topBar}</div>
      </div>

      <header className="relative">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={invitation.hostNames}
            onError={() => setFailedPhotoUrl(invitation.photoUrl)}
            className={`${heroHeight} w-full object-cover`}
          />
        ) : (
          <div className={`${emptyHeroHeight} w-full bg-burgundy`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-burgundy/30 via-burgundy/20 to-burgundy/90" />
        <div className="absolute inset-x-0 bottom-0 animate-fade-up px-6 pb-10 text-center text-cream">
          {greeting}
          <p className="text-xs uppercase tracking-[0.35em] text-gold-light">{t.eventTypes[invitation.eventType]}</p>
          <h1 className="mt-3 break-words font-serif text-5xl font-bold leading-tight drop-shadow-sm">
            {invitation.hostNames || '…'}
          </h1>
          <p className="mt-3 font-serif text-lg italic text-cream/90">{t.inviteSubtitle[invitation.eventType]}</p>
          {invitation.adultsOnly && (
            <p className="mt-4 inline-block rounded-full border border-gold-light/70 px-3 py-1 text-xs font-semibold tracking-wide text-gold-light">
              {t.adultsOnly}
            </p>
          )}
        </div>
      </header>
      <div className="bg-burgundy py-1">
        <OrnamentBand />
      </div>

      {invitation.message && (
        <Section>
          <OrnamentDivider className="mb-6" />
          <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-ink/85">{invitation.message}</p>
        </Section>
      )}

      <Section className="bg-white/50">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">{t.dateLabel}</p>
        {eventDate && invitation.eventDate ? (
          <>
            <p className="mt-3 font-serif text-3xl text-burgundy">{eventDate.date}</p>
            <p className="mt-1 font-serif text-lg italic text-burgundy/80">{eventDate.weekday}</p>
            <p className="mt-1 text-ink/70">
              {t.timeLabel}: <span className="font-semibold">{formatEventTime(invitation.eventDate, locale)}</span>
            </p>
            <p className="mb-4 mt-8 text-sm text-ink/60">{t.untilEvent}</p>
            <Countdown date={invitation.eventDate} />
          </>
        ) : (
          <p className="mt-3 font-serif text-2xl text-burgundy/70">{t.dateTbd}</p>
        )}
      </Section>

      {(invitation.venueName || mapUrl) && (
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
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-burgundy px-6 py-3 font-medium text-burgundy transition hover:bg-burgundy hover:text-cream"
            >
              <PinIcon /> {t.openIn2gis}
            </a>
          )}
        </Section>
      )}

      {invitation.venue && <VenueBrandBlock venue={invitation.venue} />}
      {invitation.tamada && (
        <TamadaBrandBlock tamada={invitation.tamada} invitationSlug={isPreview ? undefined : invitation.slug} />
      )}

      <Section className="bg-white/50">
        <h2 className="font-serif text-3xl text-burgundy">{t.rsvpTitle}</h2>
        <p className="mb-6 mt-2 text-sm text-ink/60">{t.rsvpSubtitle}</p>
        {rsvp ?? <p className="rounded-2xl border border-dashed border-gold/60 p-4 text-sm text-ink/60">{t.previewRsvpHint}</p>}
      </Section>

      {children}

      <footer className="bg-burgundy pb-8 pt-1 text-center">
        <OrnamentBand />
        <p className="mt-6 font-serif text-2xl text-cream">{invitation.hostNames}</p>
        <p className="mt-3 text-xs text-cream/60">{t.footer}</p>
      </footer>
    </main>
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
