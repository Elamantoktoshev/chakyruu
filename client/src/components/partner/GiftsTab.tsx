import { formatGiftCode } from '@chakyruu/shared';
import { useCallback, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { GiftStatus, Hall, PartnerGift } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { inputClass } from '../../builder/fields';
import { useI18n } from '../../i18n/LanguageContext';
import { formatEventDate } from '../../lib/format';
import { PHONE_PREFIX, sanitizeLocalPart, toE164 } from '../../lib/phone';
import { shareLink } from '../../lib/share';

const STATUS_STYLE: Record<GiftStatus, string> = {
  ACTIVE: 'bg-amber-100 text-amber-900',
  IN_PROGRESS: 'bg-sky-100 text-sky-900',
  USED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-stone-200 text-stone-700',
  EXPIRED: 'bg-stone-200 text-stone-700',
};

type Props = { halls: readonly Hall[]; onCreditsChange: (delta: number) => void };

export function GiftsTab({ halls, onCreditsChange }: Props) {
  const { t, lang } = useI18n();
  const load = useCallback(() => api.partner.gifts(), []);
  const state = useAsync(load);
  const [added, setAdded] = useState<PartnerGift[]>([]);
  const [cancelledIds, setCancelledIds] = useState<ReadonlySet<string>>(new Set());
  const loaded = state.status === 'success' ? state.data : [];
  const gifts = [...added, ...loaded.filter((gift) => !added.some((own) => own.id === gift.id))].map((gift) =>
    cancelledIds.has(gift.id) ? { ...gift, status: 'CANCELLED' as const } : gift,
  );

  async function handleCancel(gift: PartnerGift) {
    try {
      await api.partner.cancelGift(gift.id);
      setCancelledIds((prev) => new Set([...prev, gift.id]));
      onCreditsChange(1);
    } catch {
      window.alert(t.errorGeneric);
    }
  }

  return (
    <div className="space-y-6">
      <IssueGiftForm
        halls={halls}
        onIssued={(gift) => {
          setAdded((prev) => [gift, ...prev]);
          onCreditsChange(-1);
        }}
      />
      {state.status === 'success' && gifts.length === 0 && <p className="text-center text-ink/60">{t.noGifts}</p>}
      <ul className="space-y-2">
        {gifts.map((gift) => (
          <li key={gift.id} className="rounded-2xl border border-gold/30 bg-white/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-semibold tracking-wider text-burgundy">{formatGiftCode(gift.code)}</p>
                <p className="text-sm text-ink/70">
                  {gift.clientPhone} · {formatEventDate(gift.eventDate, lang).date}
                  {gift.hall ? ` · ${gift.hall.name}` : ''}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[gift.status]}`}>
                {t.giftStatus[gift.status]}
              </span>
            </div>
            {gift.status === 'ACTIVE' && (
              <button type="button" onClick={() => void handleCancel(gift)} className="mt-2 text-sm text-stone-600 underline">
                {t.giftCancel}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function IssueGiftForm({ halls, onIssued }: { halls: readonly Hall[]; onIssued: (gift: PartnerGift) => void }) {
  const { t } = useI18n();
  const [localPhone, setLocalPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hallId, setHallId] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<PartnerGift | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError(null);
    try {
      const gift = await api.partner.issueGift({ clientPhone: toE164(localPhone), eventDate, ...(hallId ? { hallId } : {}) });
      setIssued(gift);
      onIssued(gift);
      setLocalPhone('');
      setEventDate('');
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.status === 402 ? t.giftNoCredits : err instanceof ApiError && err.status === 400 ? t.errorPhone : t.errorGeneric);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleShare(gift: PartnerGift) {
    const text = t.giftShareText
      .replace('{url}', window.location.origin)
      .replace('{phone}', gift.clientPhone)
      .replace('{code}', formatGiftCode(gift.code));
    await shareLink({ title: 'Chakyruu.kg', text });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-3xl border border-gold/40 bg-white/70 p-4">
      <h3 className="font-serif text-xl text-burgundy">{t.giftTitle}</h3>
      <p className="text-xs text-ink/60">{t.giftHint}</p>
      <div className="flex gap-2">
        <span className="flex items-center rounded-xl border border-gold/50 bg-cream px-3 font-medium text-burgundy">{PHONE_PREFIX}</span>
        <input
          type="tel"
          inputMode="numeric"
          aria-label={t.giftClientPhone}
          placeholder="555123456"
          value={localPhone}
          onChange={(e) => setLocalPhone(sanitizeLocalPart(e.target.value))}
          className={inputClass}
        />
      </div>
      <input type="date" aria-label={t.giftEventDate} value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
      {halls.length > 0 && (
        <select aria-label={t.giftHall} value={hallId} onChange={(e) => setHallId(e.target.value)} className={inputClass}>
          <option value="">{t.giftHall}</option>
          {halls.map((hall) => (
            <option key={hall.id} value={hall.id}>
              {hall.name}
            </option>
          ))}
        </select>
      )}
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      <button type="submit" disabled={isBusy || localPhone.length < 9 || !eventDate} className="min-h-12 w-full rounded-full bg-burgundy font-semibold text-cream disabled:opacity-50">
        🎁 {t.giftIssue}
      </button>
      {issued && (
        <div className="rounded-2xl bg-emerald-50 p-3 text-center">
          <p className="text-sm text-emerald-900">{t.giftIssued}</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-emerald-900">{formatGiftCode(issued.code)}</p>
          <button type="button" onClick={() => void handleShare(issued)} className="mt-2 min-h-11 rounded-full bg-[#25D366] px-5 text-sm font-semibold text-white">
            {t.share}
          </button>
        </div>
      )}
    </form>
  );
}
