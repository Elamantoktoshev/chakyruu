import type { OwnerInvitation, TamadaBlock, TamadaCard, VenueBlock, VenueOption } from '../api/types';
import { useI18n } from '../i18n/LanguageContext';
import type { BuilderChange } from './BuilderForm';
import { Field, inputClass } from './fields';

export interface PartnerOptions {
  venues: readonly VenueOption[];
  tamadas: readonly TamadaCard[];
}

/** Branding blocks for the live preview, derived from the selected ids. */
export function previewPartnerBlocks(invitation: OwnerInvitation, options: PartnerOptions) {
  const venueOption = options.venues.find((venue) => venue.id === invitation.venueOrgId);
  const hall = venueOption?.halls.find((candidate) => candidate.id === invitation.hallId);
  const tamadaCard = options.tamadas.find((tamada) => tamada.id === invitation.tamadaOrgId);
  const venue: VenueBlock | null = venueOption
    ? { name: venueOption.name, logoUrl: venueOption.logoUrl, address: venueOption.address, mapUrl: null, hallName: hall?.name ?? null }
    : null;
  const tamada: TamadaBlock | null = tamadaCard
    ? { id: tamadaCard.id, displayName: tamadaCard.displayName, photoUrl: tamadaCard.photoUrl }
    : null;
  return { venue, tamada };
}

type Props = {
  invitation: OwnerInvitation;
  options: PartnerOptions;
  onChange: (change: BuilderChange) => void;
};

/** Venue + hall + tamada from the partner catalogue. A gift's partner stays selectable even if hidden. */
export function PartnerPicker({ invitation, options, onChange }: Props) {
  const { t } = useI18n();
  const venue = options.venues.find((candidate) => candidate.id === invitation.venueOrgId);
  const giftLabel = invitation.giftFrom ? `${invitation.giftFrom.name} (${t.pickerFromGift})` : null;
  // The gifting partner is fixed on the invitation (the server enforces it too).
  const isVenueLocked = invitation.giftFrom?.type === 'VENUE';
  const isTamadaLocked = invitation.giftFrom?.type === 'TAMADA';
  const isGiftVenue = isVenueLocked && invitation.venueOrgId !== null && !venue;
  const isGiftTamada =
    invitation.giftFrom?.type === 'TAMADA' &&
    invitation.tamadaOrgId !== null &&
    !options.tamadas.some((tamada) => tamada.id === invitation.tamadaOrgId);

  function selectVenue(venueOrgId: string) {
    const id = venueOrgId || null;
    const picked = options.venues.find((candidate) => candidate.id === id);
    const venueFields = picked ? { venueName: picked.name, venueAddress: picked.address } : {};
    onChange({ patch: { venueOrgId: id, hallId: null, ...venueFields }, view: { venueOrgId: id, hallId: null, ...venueFields } });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gold/40 bg-white/50 p-4">
      <Field label={t.pickerVenue}>
        <select
          value={invitation.venueOrgId ?? ''}
          disabled={isVenueLocked}
          onChange={(e) => selectVenue(e.target.value)}
          className={`${inputClass} disabled:opacity-70`}
        >
          <option value="">{t.pickerVenueNone}</option>
          {isGiftVenue && giftLabel && <option value={invitation.venueOrgId ?? ''}>{giftLabel}</option>}
          {options.venues.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.city ? ` · ${option.city}` : ''}
            </option>
          ))}
        </select>
      </Field>

      {venue && venue.halls.length > 0 && (
        <Field label={t.pickerHall}>
          <select
            value={invitation.hallId ?? ''}
            onChange={(e) => onChange({ patch: { hallId: e.target.value || null }, view: { hallId: e.target.value || null } })}
            className={inputClass}
          >
            <option value="">{t.pickerHallNone}</option>
            {venue.halls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {hall.name} · {hall.capacity}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label={t.pickerTamada}>
        <select
          value={invitation.tamadaOrgId ?? ''}
          disabled={isTamadaLocked}
          onChange={(e) => onChange({ patch: { tamadaOrgId: e.target.value || null }, view: { tamadaOrgId: e.target.value || null } })}
          className={`${inputClass} disabled:opacity-70`}
        >
          <option value="">{t.pickerTamadaNone}</option>
          {isGiftTamada && giftLabel && <option value={invitation.tamadaOrgId ?? ''}>{giftLabel}</option>}
          {options.tamadas.map((tamada) => (
            <option key={tamada.id} value={tamada.id}>
              {tamada.displayName}
              {tamada.city ? ` · ${tamada.city}` : ''}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
