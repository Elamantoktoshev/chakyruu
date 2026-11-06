import {
  EVENT_TYPES,
  HOST_NAMES_MAX,
  LANGUAGES,
  MESSAGE_MAX,
  MUSIC_TRACKS,
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
  onChange: (change: BuilderChange) => void;
};

const LANGUAGE_LABELS = { KY: 'Кыргызча', RU: 'Русский' } as const;

export function BuilderForm({ invitation, templates, onChange }: Props) {
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
    if (template) onChange({ patch: { templateId }, view: { templateId, template } });
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

      <Field label={t.fieldHostNames}>
        <input
          value={invitation.hostNames}
          maxLength={HOST_NAMES_MAX}
          placeholder={t.fieldHostNamesPlaceholder}
          onChange={(e) => setText('hostNames', e.target.value)}
          className={`${inputClass} font-serif text-lg`}
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

      <PhotoField
        invitationId={invitation.id}
        photoUrl={invitation.photoUrl}
        onUploaded={(photoUrl) => onChange({ view: { photoUrl } })}
      />

      <ChoiceChips
        label={t.fieldMusic}
        options={[{ value: '', label: t.musicNone }, ...MUSIC_TRACKS.map((track) => ({ value: track.id, label: track.title }))]}
        value={invitation.musicTrackId ?? ''}
        onChange={(id) => onChange({ patch: { musicTrackId: id || null }, view: { musicTrackId: id || null } })}
      />

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

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-gold/40 bg-white/60 p-4">
        <input
          type="checkbox"
          checked={invitation.adultsOnly}
          onChange={(e) => onChange({ patch: { adultsOnly: e.target.checked }, view: { adultsOnly: e.target.checked } })}
          className="mt-0.5 h-5 w-5 accent-burgundy"
        />
        <span>
          <span className="block font-medium text-ink">{t.fieldAdultsOnly}</span>
          <span className="block text-xs text-ink/60">{t.fieldAdultsOnlyHint}</span>
        </span>
      </label>
    </div>
  );
}
