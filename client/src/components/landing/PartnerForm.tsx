import { partnerLeadSchema } from '@chakyruu/shared';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { useI18n } from '../../i18n/LanguageContext';
import { PHONE_PREFIX, sanitizeLocalPart, toE164 } from '../../lib/phone';

const inputClass =
  'w-full min-h-12 rounded-xl border border-gold/50 bg-white/90 px-4 py-3 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30';

type Status = 'idle' | 'sending' | 'sent';

export function PartnerForm() {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lead = { name, phone: toE164(localPhone), venueName, city };
    if (!partnerLeadSchema.safeParse(lead).success) {
      setError(t.partnerErrorFields);
      return;
    }
    setStatus('sending');
    setError(null);
    try {
      await api.sendPartnerLead(lead);
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
      <input aria-label={t.partnerVenue} placeholder={t.partnerVenue} value={venueName} onChange={(e) => setVenueName(e.target.value)} className={inputClass} />
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
