import type { InvitationContent, Language, Template } from '../api/types';
import { useI18n } from '../i18n/LanguageContext';
import { InvitationView } from './invitation/InvitationView';

/** Sample content so a template card shows a real, rendered invitation instead of a static image. */
export function sampleInvitation(template: Template, lang: Language): InvitationContent {
  return {
    slug: 'sample',
    hostNames: 'Айбек & Айзада',
    eventType: template.type,
    eventDate: '2027-06-15T11:00:00.000Z',
    venueName: lang === 'KY' ? '«Ала-Тоо» тойканасы' : 'Тойкана «Ала-Тоо»',
    venueAddress: null,
    venueMapUrl: null,
    photoUrl: null,
    musicTrackId: null,
    message: null,
    language: lang,
    adultsOnly: false,
    template,
  };
}

/** Scale of the mini preview inside the card (the invitation is laid out at full phone width). */
const PREVIEW_SCALE = 0.42;

type Props = {
  template: Template;
  actionLabel?: string;
  isBusy?: boolean;
  onSelect?: (template: Template) => void;
};

export function TemplateCard({ template, actionLabel, isBusy = false, onSelect }: Props) {
  const { lang, t } = useI18n();
  return (
    <article className="group overflow-hidden rounded-3xl border border-gold/40 bg-white/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-72 overflow-hidden bg-cream-dark/40" aria-hidden="true">
        <div
          className="pointer-events-none absolute left-1/2 top-0 w-[28rem] origin-top"
          style={{ transform: `translateX(-50%) scale(${PREVIEW_SCALE})` }}
          inert
        >
          <InvitationView invitation={sampleInvitation(template, lang)} lang={lang} mode="preview" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-gold">{t.eventTypes[template.type]}</p>
          <h3 className="truncate font-serif text-lg text-burgundy">{template.name}</h3>
        </div>
        {onSelect && actionLabel && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onSelect(template)}
            className="min-h-11 shrink-0 rounded-full bg-burgundy px-5 text-sm font-semibold text-cream transition hover:bg-burgundy-dark disabled:opacity-60"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </article>
  );
}
