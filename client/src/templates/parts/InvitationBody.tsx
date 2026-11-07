import { readProgram } from '@chakyruu/shared';
import type { ReactNode } from 'react';
import type { InvitationContent } from '../../api/types';
import { Countdown } from '../../components/Countdown';
import { TamadaBrandBlock, VenueBrandBlock } from '../../components/invitation/PartnerBlocks';
import { PinIcon } from '../../components/icons';
import { OrnamentDivider } from '../../components/Ornament';
import { useReveal } from '../../hooks/useReveal';
import { useI18n } from '../../i18n/LanguageContext';
import { formatEventDate, formatEventTime, safeUrl } from '../../lib/format';
import type { InvitationViewMode, TemplateSlots } from '../types';
import { Gallery } from './Gallery';
import { QuickActions } from './QuickActions';

type SectionProps = { children: ReactNode; className?: string; id?: string };

/** A content block that fades in once while scrolling. */
export function Section({ children, className = '', id }: SectionProps) {
  const { ref, isVisible } = useReveal<HTMLElement>();
  return (
    <section id={id} ref={ref} className={`reveal scroll-mt-16 px-6 py-10 text-center ${isVisible ? 'is-visible' : ''} ${className}`}>
      {children}
    </section>
  );
}

type Props = {
  invitation: InvitationContent;
  mode: InvitationViewMode;
  slots: TemplateSlots;
  /** Separator between sections; templates bring their own ornament (or none). */
  divider?: ReactNode;
  /** Background of every second section. */
  altSectionClassName?: string;
  /** Small caps labels ("Той күнү"). */
  labelClassName?: string;
  /** Large values (date, venue name). */
  valueClassName?: string;
};

/** Everything below the hero, shared by all templates: actions, message, date, programme, venue, partners, RSVP, tilekter. */
export function InvitationBody({
  invitation,
  mode,
  slots,
  divider = <OrnamentDivider className="mb-6" />,
  altSectionClassName = 'bg-surface/50',
  labelClassName = 'text-xs uppercase tracking-[0.3em] text-gold',
  valueClassName = 'font-serif text-burgundy',
}: Props) {
  const { t, lang, locale } = useI18n();
  const mapUrl = safeUrl(invitation.venueMapUrl);
  const eventDate = invitation.eventDate ? formatEventDate(invitation.eventDate, lang) : null;
  const program = readProgram(invitation.program);

  // Template cards only show the hero; rendering the rest would be wasted work.
  if (mode === 'thumbnail') return null;

  return (
    <>
      <QuickActions invitation={invitation} mode={mode} hasTilekter={Boolean(slots.extra)} />

      {invitation.message && (
        <Section>
          {divider}
          <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-ink/85">{invitation.message}</p>
        </Section>
      )}

      <Gallery photos={invitation.gallery} labelClassName={labelClassName} />

      <Section className={altSectionClassName}>
        <p className={labelClassName}>{t.dateLabel}</p>
        {eventDate && invitation.eventDate ? (
          <>
            <p className={`mt-3 text-3xl ${valueClassName}`}>{eventDate.date}</p>
            <p className={`mt-1 text-lg italic opacity-80 ${valueClassName}`}>{eventDate.weekday}</p>
            <p className="mt-1 text-ink/70">
              {t.timeLabel}: <span className="font-semibold">{formatEventTime(invitation.eventDate, locale)}</span>
            </p>
            <p className="mb-4 mt-8 text-sm text-ink/60">{t.untilEvent}</p>
            <Countdown date={invitation.eventDate} isStatic={mode !== 'live'} />
          </>
        ) : (
          <p className={`mt-3 text-2xl opacity-70 ${valueClassName}`}>{t.dateTbd}</p>
        )}
      </Section>

      {program.length > 0 && (
        <Section>
          {divider}
          <p className={labelClassName}>{t.programTitle}</p>
          <ol className="mx-auto mt-6 max-w-xs space-y-0 text-left">
            {program.map((item, index) => (
              <li key={`${item.time}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                {index < program.length - 1 && <span className="absolute left-[3.35rem] top-6 h-full w-px bg-gold/50" aria-hidden="true" />}
                <span className="w-12 shrink-0 pt-0.5 text-right font-semibold tabular-nums text-burgundy">{item.time}</span>
                <span className="relative mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-gold ring-4 ring-gold/20" aria-hidden="true" />
                <span className="text-ink/85">{item.title}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {(invitation.venueName || mapUrl) && (
        <Section className={program.length > 0 ? altSectionClassName : ''}>
          {divider}
          <p className={labelClassName}>{t.venueLabel}</p>
          <p className={`mt-3 text-2xl ${valueClassName}`}>{invitation.venueName}</p>
          {invitation.venueAddress && <p className="mt-1 text-ink/70">{invitation.venueAddress}</p>}
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-burgundy px-6 py-3 font-medium text-burgundy transition hover:bg-burgundy hover:text-cream"
            >
              <PinIcon /> {t.openIn2gis}
            </a>
          )}
        </Section>
      )}

      {invitation.venue && <VenueBrandBlock venue={invitation.venue} />}
      {invitation.tamada && <TamadaBrandBlock tamada={invitation.tamada} invitationSlug={mode === 'live' ? invitation.slug : undefined} />}

      <Section id="rsvp" className={altSectionClassName}>
        <h2 className={`text-3xl ${valueClassName}`}>{t.rsvpTitle}</h2>
        <p className="mb-6 mt-2 text-sm text-ink/60">{t.rsvpSubtitle}</p>
        {slots.rsvp ?? <p className="rounded-2xl border border-dashed border-gold/60 p-4 text-sm text-ink/60">{t.previewRsvpHint}</p>}
      </Section>

      {slots.extra && <div id="tilekter" className="scroll-mt-16">{slots.extra}</div>}
    </>
  );
}
