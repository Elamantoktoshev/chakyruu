import type { TamadaBlock, VenueBlock } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { safeUrl } from '../../lib/format';
import { OrnamentDivider } from '../Ornament';

type VenueProps = { venue: VenueBlock };

/** "Той өтүүчү жай" — the venue that hosts the toi (gifted or picked by the client). */
export function VenueBrandBlock({ venue }: VenueProps) {
  const { t } = useI18n();
  const logo = safeUrl(venue.logoUrl);
  return (
    <section className="px-6 py-8 text-center">
      <OrnamentDivider className="mb-6" />
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{t.venueBlockTitle}</p>
      {logo && <img src={logo} alt="" className="mx-auto mt-4 h-16 w-16 rounded-2xl object-cover shadow" />}
      <p className="mt-3 font-serif text-2xl text-burgundy">{venue.name}</p>
      {venue.hallName && <p className="text-sm text-ink/70">{venue.hallName}</p>}
      {venue.address && <p className="mt-1 text-sm text-ink/60">{venue.address}</p>}
    </section>
  );
}

type TamadaProps = {
  tamada: TamadaBlock;
  /** Public slug — the click is counted for the tamada's statistics. Absent in the builder preview. */
  invitationSlug?: string;
};

/** "Тамада" with a WhatsApp button: free advertising for the tamada in front of every guest. */
export function TamadaBrandBlock({ tamada, invitationSlug }: TamadaProps) {
  const { t } = useI18n();
  const photo = safeUrl(tamada.photoUrl);
  const contactUrl = `/api/public/tamadas/${encodeURIComponent(tamada.id)}/contact${
    invitationSlug ? `?invitation=${encodeURIComponent(invitationSlug)}` : ''
  }`;
  const buttonClass =
    'mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-[#25D366] px-6 font-semibold text-white shadow';

  return (
    <section className="bg-surface/50 px-6 py-8 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{t.tamadaBlockTitle}</p>
      {photo ? (
        <img src={photo} alt={tamada.displayName} className="mx-auto mt-4 h-24 w-24 rounded-full object-cover shadow-md" />
      ) : (
        <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-burgundy font-serif text-3xl text-cream">
          {tamada.displayName.slice(0, 1)}
        </div>
      )}
      <p className="mt-3 font-serif text-2xl text-burgundy">{tamada.displayName}</p>
      {invitationSlug ? (
        <a href={contactUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          {t.writeTamada}
        </a>
      ) : (
        <span className={buttonClass}>{t.writeTamada}</span>
      )}
    </section>
  );
}
