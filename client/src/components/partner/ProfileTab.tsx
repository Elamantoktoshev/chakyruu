import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { PartnerProfile } from '../../api/types';
import { Field, inputClass } from '../../builder/fields';
import { useI18n } from '../../i18n/LanguageContext';
import { ImageUploadField } from './ImageUploadField';
import { SaveButton } from './SaveButton';
import { isValidationError, useSaveState } from './useSaveState';

type Props = { profile: PartnerProfile; onChange: (profile: PartnerProfile) => void };

const text = (value: string | null) => value ?? '';

export function ProfileTab({ profile, onChange }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: profile.name,
    phone: text(profile.phone),
    whatsapp: text(profile.whatsapp),
    instagram: text(profile.instagram),
    city: text(profile.city),
    address: text(profile.address),
    mapUrl: text(profile.mapUrl),
  });
  const { state, run } = useSaveState((error) => (isValidationError(error) ? t.errorPhone : t.errorGeneric));
  const isVenue = profile.type === 'VENUE';
  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const common = { name: form.name, phone: form.phone, whatsapp: form.whatsapp, instagram: form.instagram, city: form.city };
    const updated = await run(() => api.partner.updateProfile(isVenue ? form : common));
    if (updated) onChange(updated);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className={`rounded-2xl p-3 text-sm ${profile.catalogStatus === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
        {profile.catalogStatus === 'PUBLISHED' ? t.catalogPublished : t.catalogHidden}
      </p>
      <ImageUploadField
        label={t.fieldLogo}
        imageUrl={profile.logoUrl}
        upload={async (file) => (await api.partner.uploadLogo(file)).logoUrl}
        onUploaded={(logoUrl) => onChange({ ...profile, logoUrl })}
      />
      <Field label={t.fieldOrgName}>
        <input value={form.name} onChange={(e) => set('name')(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.fieldPhone}>
          <input type="tel" placeholder="+996700123456" value={form.phone} onChange={(e) => set('phone')(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t.fieldWhatsapp}>
          <input type="tel" placeholder="+996700123456" value={form.whatsapp} onChange={(e) => set('whatsapp')(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t.fieldInstagram}>
          <input placeholder="@name" value={form.instagram} onChange={(e) => set('instagram')(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t.fieldCity}>
          <input value={form.city} onChange={(e) => set('city')(e.target.value)} className={inputClass} />
        </Field>
      </div>
      {isVenue && (
        <>
          <Field label={t.fieldAddress}>
            <input value={form.address} onChange={(e) => set('address')(e.target.value)} className={inputClass} />
          </Field>
          <Field label={t.fieldMapUrl} hint={t.fieldVenueMapUrlHint}>
            <input type="url" placeholder="https://2gis.kg/…" value={form.mapUrl} onChange={(e) => set('mapUrl')(e.target.value)} className={inputClass} />
          </Field>
        </>
      )}
      <SaveButton state={state} />
    </form>
  );
}
