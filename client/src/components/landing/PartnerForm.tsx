import { LEAD_NAME_MAX, LEAD_NAME_MIN, LEAD_VENUE_MAX, ORG_TYPES, isValidPhone, type OrgType } from '@chakyruu/shared';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { useI18n } from '../../i18n/LanguageContext';
import { PHONE_PREFIX, sanitizeLocalPart, toE164 } from '../../lib/phone';
import { track } from '../../lib/analytics';

const inputClass =
  'w-full min-h-12 rounded-xl border border-white/0 bg-white px-4 py-3 text-base text-night outline-none placeholder:text-muted focus:ring-4 focus:ring-white/40';

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
    return <p className="rounded-2xl bg-white/15 p-6 text-center font-display text-xl font-bold text-white">{t.partnerThanks}</p>;
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
            className={`min-h-11 rounded-xl border px-4 text-sm font-bold transition ${
              type === value ? 'border-white bg-white text-brand' : 'border-white/40 text-white hover:border-white'
            }`}
          >
            {t.leadType[value]}
          </button>
        ))}
      </fieldset>
      <input aria-label={t.partnerName} placeholder={t.partnerName} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      <div className="flex gap-2">
        <span className="flex items-center rounded-xl bg-white/90 px-3 font-bold text-brand">{PHONE_PREFIX}</span>
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
        <p role="alert" className="rounded-xl bg-night/30 px-3 py-2 text-sm font-medium text-white sm:col-span-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="min-h-13 rounded-xl bg-night font-display font-bold text-white transition hover:bg-night/85 disabled:opacity-60 sm:col-span-2"
      >
        {status === 'sending' ? t.partnerSending : t.partnerSubmit}
      </button>
    </form>
  );
}
