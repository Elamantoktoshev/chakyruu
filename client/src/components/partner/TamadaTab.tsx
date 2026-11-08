import { PARTNER_LANGUAGES } from '@chakyruu/shared';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { PartnerLanguage, PartnerProfile } from '../../api/types';
import { Field, inputClass } from '../../builder/fields';
import { useI18n } from '../../i18n/LanguageContext';
import { ImageUploadField } from './ImageUploadField';
import { SaveButton } from './SaveButton';
import { isValidationError, useSaveState } from './useSaveState';

type Props = { profile: PartnerProfile; onChange: (profile: PartnerProfile) => void };

export function TamadaTab({ profile, onChange }: Props) {
  const { t } = useI18n();
  const tamada = profile.tamadaProfile;
  const [displayName, setDisplayName] = useState(tamada?.displayName ?? profile.name);
  const [bio, setBio] = useState(tamada?.bio ?? '');
  const [languages, setLanguages] = useState<PartnerLanguage[]>(tamada?.languages ?? []);
  const [price, setPrice] = useState(tamada?.priceFromSom?.toString() ?? '');
  const [videos, setVideos] = useState((tamada?.videoUrls ?? []).join('\n'));
  const { state, run } = useSaveState((error) => (isValidationError(error) ? t.fieldVenueMapUrlError : t.errorGeneric));

  const toggleLanguage = (lang: PartnerLanguage) =>
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated = await run(() =>
      api.partner.updateTamada({
        displayName,
        bio,
        languages,
        priceFromSom: price ? Number(price) : null,
        videoUrls: videos.split('\n').map((url) => url.trim()).filter(Boolean),
      }),
    );
    if (updated) onChange(updated);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        {tamada && (
          <ImageUploadField
            label={t.fieldLogo}
            imageUrl={tamada.photoUrl}
            upload={async (file) => (await api.partner.uploadTamadaPhoto(file)).photoUrl}
            onUploaded={(photoUrl) => onChange({ ...profile, tamadaProfile: { ...tamada, photoUrl } })}
          />
        )}
        <Field label={t.fieldDisplayName}>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t.fieldBio}>
          <textarea rows={3} maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} className={`${inputClass} resize-y`} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-night/80">{t.fieldLanguages}</legend>
          <div className="flex gap-2">
            {PARTNER_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                aria-pressed={languages.includes(lang)}
                onClick={() => toggleLanguage(lang)}
                className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${
                  languages.includes(lang) ? 'border-brand bg-brand text-white' : 'border-line bg-white/70 text-brand'
                }`}
              >
                {t.languageNames[lang]}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label={t.fieldPriceFrom}>
          <input type="number" min={0} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t.fieldVideos}>
          <textarea rows={3} value={videos} onChange={(e) => setVideos(e.target.value)} placeholder="https://www.instagram.com/reel/…" className={`${inputClass} resize-y`} />
        </Field>
        <SaveButton state={state} />
      </form>
      <BusyDates dates={profile.busyDates} onChange={(busyDates) => onChange({ ...profile, busyDates })} />
    </div>
  );
}

function BusyDates({ dates, onChange }: { dates: readonly string[]; onChange: (dates: string[]) => void }) {
  const { t } = useI18n();
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function toggle(day: string, isBusy: boolean) {
    setError(null);
    try {
      await api.partner.setBusy(day, isBusy);
      onChange(isBusy ? [...new Set([...dates, day])].sort() : dates.filter((d) => d !== day));
      setDate('');
    } catch {
      setError(t.errorGeneric);
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="font-display font-extrabold text-xl text-night">{t.busyCalendar}</h3>
      <p className="text-xs text-night/60">{t.busyHint}</p>
      <div className="flex gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        <button type="button" disabled={!date} onClick={() => void toggle(date, true)} className="min-h-12 shrink-0 rounded-xl bg-brand px-5 font-semibold text-white disabled:opacity-50">
          {t.markBusy}
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      <ul className="flex flex-wrap gap-2">
        {dates.map((day) => (
          <li key={day}>
            <button
              type="button"
              onClick={() => void toggle(day, false)}
              className="min-h-11 rounded-xl border border-brand/40 bg-white/70 px-3 text-sm text-brand"
            >
              {day} ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
