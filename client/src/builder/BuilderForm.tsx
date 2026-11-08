import {
  EVENT_TYPES,
  HOST_NAMES_MAX,
  ILLUSTRATED_TEMPLATE_KEY,
  LANGUAGES,
  MESSAGE_MAX,
  VENUE_ADDRESS_MAX,
  VENUE_NAME_MAX,
  invitationDraftSchema,
  type InvitationDraftInput,
} from '@chakyruu/shared';
import { useState } from 'react';
import type { OwnerInvitation, Template } from '../api/types';
import { useI18n } from '../i18n/LanguageContext';
import { fromEventIso, toEventIso, type LocalDateTime } from '../lib/datetime';
import { ChoiceChips, Field, inputClass } from './fields';
import { GalleryField } from './GalleryField';
import { MusicPicker } from './MusicPicker';
import { OpeningPicker } from './OpeningPicker';
import { PalettePicker } from './PalettePicker';
import { ProgramEditor } from './ProgramEditor';
import { PartnerPicker, type PartnerOptions } from './PartnerPicker';
import { PhotoField } from './PhotoField';

export type BuilderChange = {
  /** What to send to the server (omitted when the value is invalid). */
  patch?: InvitationDraftInput;
  /** What to show in the form and preview right away. */
  view: Partial<OwnerInvitation>;
};

type Props = {
  invitation: OwnerInvitation;
  templates: readonly Template[];
  partners: PartnerOptions;
  onChange: (change: BuilderChange) => void;
  /** Flushes pending autosave changes before a file upload. */
  beforeUpload: () => Promise<void>;
};

const LANGUAGE_LABELS = { KY: 'Кыргызча', RU: 'Русский' } as const;

export function BuilderForm({ invitation, templates, partners, onChange, beforeUpload }: Props) {
  const { t } = useI18n();
  const [dateTime, setDateTime] = useState<LocalDateTime>(() => fromEventIso(invitation.eventDate));
  const [mapUrlError, setMapUrlError] = useState<string | null>(null);

  const setText = (key: 'hostNames' | 'venueName' | 'venueAddress' | 'message', value: string) =>
    onChange({ patch: { [key]: value }, view: { [key]: value } });

  function setDateTimePart(part: Partial<LocalDateTime>) {
    const next = { ...dateTime, ...part };
    setDateTime(next);
    const iso = toEventIso(next);
    const isCleared = next.date === '' && next.time === '';
    if (iso || isCleared) onChange({ patch: { eventDate: iso }, view: { eventDate: iso } });
  }

  function setMapUrl(value: string) {
    const isValid = invitationDraftSchema.safeParse({ venueMapUrl: value }).success;
    setMapUrlError(isValid || value.trim() === '' ? null : t.fieldVenueMapUrlError);
    onChange({ patch: isValid ? { venueMapUrl: value } : undefined, view: { venueMapUrl: value.trim() || null } });
  }

  function setTemplate(templateId: string) {
    const template = templates.find((candidate) => candidate.id === templateId);
    // The server resets the palette to the new template's first one; mirror that in the preview.
    if (template) onChange({ patch: { templateId }, view: { templateId, template, paletteId: null } });
  }

  return (
    <div className="space-y-6">
      <ChoiceChips
        label={t.fieldEventType}
        options={EVENT_TYPES.map((value) => ({ value, label: t.eventTypes[value] }))}
        value={invitation.eventType}
        onChange={(eventType) => onChange({ patch: { eventType }, view: { eventType } })}
      />

      <Field label={t.changeTemplate}>
        <select value={invitation.templateId} onChange={(e) => setTemplate(e.target.value)} className={inputClass}>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </Field>

      <PalettePicker
        componentKey={invitation.template.componentKey}
        paletteId={invitation.paletteId}
        onChange={(paletteId) => onChange({ patch: { paletteId }, view: { paletteId } })}
      />

      <OpeningPicker
        value={invitation.openingAnimation}
        onChange={(openingAnimation) => onChange({ patch: { openingAnimation }, view: { openingAnimation } })}
        hasTemplateOpening={invitation.template.componentKey === ILLUSTRATED_TEMPLATE_KEY}
      />

      {invitation.template.componentKey === 'yubiley' && (
        <Field label={t.fieldHeroNumber}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={150}
            value={invitation.heroNumber ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : Number(e.target.value);
              const isValid = value === null || (Number.isInteger(value) && value >= 1 && value <= 150);
              onChange({ patch: isValid ? { heroNumber: value } : undefined, view: { heroNumber: value } });
            }}
            className={inputClass}
          />
        </Field>
      )}

      <Field label={t.fieldHostNames}>
        <input
          value={invitation.hostNames}
          maxLength={HOST_NAMES_MAX}
          placeholder={t.fieldHostNamesPlaceholder}
          onChange={(e) => setText('hostNames', e.target.value)}
          className={`${inputClass} font-display text-lg`}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.fieldDate}>
          <input type="date" value={dateTime.date} onChange={(e) => setDateTimePart({ date: e.target.value })} className={inputClass} />
        </Field>
        <Field label={t.fieldTime}>
          <input type="time" value={dateTime.time} onChange={(e) => setDateTimePart({ time: e.target.value })} className={inputClass} />
        </Field>
      </div>

      <Field label={t.fieldVenueName}>
        <input
          value={invitation.venueName}
          maxLength={VENUE_NAME_MAX}
          placeholder={t.fieldVenueNamePlaceholder}
          onChange={(e) => setText('venueName', e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label={t.fieldVenueAddress}>
        <input
          value={invitation.venueAddress ?? ''}
          maxLength={VENUE_ADDRESS_MAX}
          onChange={(e) => setText('venueAddress', e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label={t.fieldVenueMapUrl} hint={t.fieldVenueMapUrlHint} error={mapUrlError}>
        <input
          type="url"
          inputMode="url"
          placeholder="https://2gis.kg/…"
          value={invitation.venueMapUrl ?? ''}
          aria-invalid={mapUrlError !== null}
          onChange={(e) => setMapUrl(e.target.value)}
          className={inputClass}
        />
      </Field>

      <PartnerPicker invitation={invitation} options={partners} onChange={onChange} />

      <PhotoField
        invitationId={invitation.id}
        photoUrl={invitation.photoUrl}
        onUploaded={(photoUrl) => onChange({ view: { photoUrl } })}
      />

      <GalleryField invitationId={invitation.id} photos={invitation.gallery} onChanged={(gallery) => onChange({ view: { gallery } })} />

      <MusicPicker invitation={invitation} onChange={onChange} beforeUpload={beforeUpload} />

      <ProgramEditor value={invitation.program} onChange={(program) => onChange({ patch: { program }, view: { program } })} />

      <Field label={t.fieldMessage}>
        <textarea
          rows={5}
          maxLength={MESSAGE_MAX}
          value={invitation.message ?? ''}
          placeholder={t.fieldMessagePlaceholder}
          onChange={(e) => setText('message', e.target.value)}
          className={`${inputClass} resize-y`}
        />
      </Field>

      <ChoiceChips
        label={t.fieldLanguage}
        options={LANGUAGES.map((value) => ({ value, label: LANGUAGE_LABELS[value] }))}
        value={invitation.language}
        onChange={(language) => onChange({ patch: { language }, view: { language } })}
      />

      {invitation.isGift && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-white/60 p-4">
          <input
            type="checkbox"
            checked={invitation.hideBranding}
            onChange={(e) => onChange({ patch: { hideBranding: e.target.checked }, view: { hideBranding: e.target.checked } })}
            className="h-5 w-5 accent-brand"
          />
          <span className="font-medium text-night">{t.fieldHideBranding}</span>
        </label>
      )}

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white/60 p-4">
        <input
          type="checkbox"
          checked={invitation.adultsOnly}
          onChange={(e) => onChange({ patch: { adultsOnly: e.target.checked }, view: { adultsOnly: e.target.checked } })}
          className="mt-0.5 h-5 w-5 accent-brand"
        />
        <span>
          <span className="block font-medium text-night">{t.fieldAdultsOnly}</span>
          <span className="block text-xs text-night/60">{t.fieldAdultsOnlyHint}</span>
        </span>
      </label>
    </div>
  );
}
