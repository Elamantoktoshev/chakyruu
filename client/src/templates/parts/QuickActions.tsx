import type { ReactNode } from 'react';
import { CalendarIcon, CheckCircleIcon, HeartIcon, PinIcon } from '../../components/icons';
import type { InvitationContent } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { safeUrl } from '../../lib/format';
import type { InvitationViewMode } from '../types';

type Props = { invitation: InvitationContent; mode: InvitationViewMode; hasTilekter: boolean };

const chipClass =
  'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl border border-gold/40 bg-surface/70 px-2 py-2 text-[11px] font-medium leading-tight text-burgundy shadow-sm';

/** Four big thumb-size actions right under the hero: map, calendar, RSVP, tilek. */
export function QuickActions({ invitation, mode, hasTilekter }: Props) {
  const { t } = useI18n();
  const mapUrl = safeUrl(invitation.venueMapUrl);
  // The .ics is served for published invitations only.
  const isLive = mode === 'live' && !invitation.isDraft;
  const calendarUrl = `/api/public/invitations/${encodeURIComponent(invitation.slug)}/calendar.ics`;

  const actions: { key: string; icon: ReactNode; label: string; href?: string; external?: boolean }[] = [
    ...(mapUrl ? [{ key: 'map', icon: <PinIcon />, label: t.actionMap, href: mapUrl, external: true }] : []),
    ...(invitation.eventDate ? [{ key: 'calendar', icon: <CalendarIcon />, label: t.actionCalendar, href: isLive ? calendarUrl : undefined }] : []),
    { key: 'rsvp', icon: <CheckCircleIcon />, label: t.actionRsvp, href: '#rsvp' },
    ...(hasTilekter ? [{ key: 'tilek', icon: <HeartIcon />, label: t.actionTilek, href: '#tilekter' }] : []),
  ];

  return (
    <nav
      aria-label={t.actionsLabel}
      className="grid gap-2 px-4 py-5"
      style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
    >
      {actions.map((action) => {
        const content = (
          <>
            {action.icon}
            {action.label}
          </>
        );
        if (!action.href) return <span key={action.key} className={chipClass}>{content}</span>;
        return (
          <a
            key={action.key}
            href={action.href}
            className={chipClass}
            {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {content}
          </a>
        );
      })}
    </nav>
  );
}
