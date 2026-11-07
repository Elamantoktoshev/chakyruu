import { LEAD_NAME_MAX, LEAD_NAME_MIN, LEAD_VENUE_MAX, ORG_TYPES, isValidPhone, type OrgType } from '@chakyruu/shared';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { useI18n } from '../../i18n/LanguageContext';
import { PHONE_PREFIX, sanitizeLocalPart, toE164 } from '../../lib/phone';
import { track } from '../../lib/analytics';

const inputClass =
  'w-full min-h-12 rounded-xl border border-gold/50 bg-white/90 px-4 py-3 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30';

type Status = 'idle' | 'sending' | 'sent';

const hasLength = (value: string, max: number) => value.trim().length >= LEAD_NAME_MIN && value.trim().length <= max;

/** Quick check before sending; the server validates the lead fully. Kept zod-free for the landing page. */
function isCompleteLead(lead: { name: string; phone: string; venueName: string }): boolean {
  return hasLength(lead.name, LEAD_NAME_MAX) && hasLength(lead.venueName, LEAD_VENUE_MAX) && isValidPhone(lead.phone);
}

export function PartnerForm() {
  const { t } = useI18n();
  const [type, setType] = useState<OrgType>('VENUE');
  const [name, setName] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lead = { type, name, phone: toE164(localPhone), venueName, city };
    if (!isCompleteLead(lead)) {
      setError(t.partnerErrorFields);
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      await api.sendPartnerLead(lead);
      track('partner_lead', { type });
      setStatus('sent');
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.status === 429 ? t.errorTooMany : t.errorGeneric);
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return <p className="rounded-2xl bg-white/10 p-6 text-center font-serif text-xl text-cream">{t.partnerThanks}</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-3 sm:grid-cols-2">
      <fieldset className="flex flex-wrap gap-2 sm:col-span-2">
        {ORG_TYPES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            onClick={() => setType(value)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${
              type === value ? 'border-gold bg-gold text-burgundy-dark' : 'border-cream/40 text-cream hover:border-gold'
            }`}
          >
            {t.leadType[value]}
          </button>
        ))}
      </fieldset>
      <input aria-label={t.partnerName} placeholder={t.partnerName} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      <div className="flex gap-2">
        <span className="flex items-center rounded-xl border border-gold/50 bg-cream px-3 font-medium text-burgundy">{PHONE_PREFIX}</span>
        <input
          type="tel"
          inputMode="numeric"
          aria-label={t.partnerPhone}
          placeholder="700123456"
          value={localPhone}
          onChange={(e) => setLocalPhone(sanitizeLocalPart(e.target.value))}
          className={inputClass}
        />
      </div>
      <input aria-label={t.partnerVenueByType[type]} placeholder={t.partnerVenueByType[type]} value={venueName} onChange={(e) => setVenueName(e.target.value)} className={inputClass} />
      <input aria-label={t.partnerCity} placeholder={t.partnerCity} value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
      {error && (
        <p role="alert" className="text-sm font-medium text-gold-light sm:col-span-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="min-h-12 rounded-full bg-gold font-semibold text-burgundy-dark transition hover:bg-gold-light disabled:opacity-60 sm:col-span-2"
      >
        {status === 'sending' ? t.partnerSending : t.partnerSubmit}
      </button>
    </form>
  );
}
