import { MAX_PARTY_SIZE } from '@chakyruu/shared';
import { useState } from 'react';
import type { PublicGuest } from '../api/types';
import { useI18n } from '../i18n/LanguageContext';
import { useRsvp } from '../rsvp/useRsvp';

const MIN_NAME_LENGTH = 2;

type Props = {
  slug: string;
  /** Token from a personal link (?g=…). */
  guestToken: string | null;
  guest: PublicGuest | null;
};

/** "Келем" / "Келе албайм" in one tap; the party size is adjusted afterwards and saved automatically. */
export function RsvpForm({ slug, guestToken, guest }: Props) {
  const { t } = useI18n();
  const rsvp = useRsvp(slug, guestToken, guest);
  const [typedName, setTypedName] = useState('');
  const [nameError, setNameError] = useState(false);
  const needsName = rsvp.knownName === null;

  function handleAnswer(attending: boolean) {
    if (needsName && typedName.trim().length < MIN_NAME_LENGTH) {
      setNameError(true);
      return;
    }
    setNameError(false);
    void rsvp.answer(attending, typedName);
  }

  const errorText = nameError ? t.errorName : rsvp.error === 'tooMany' ? t.errorTooMany : rsvp.error ? t.errorGeneric : null;

  return (
    <div className="space-y-5 text-left">
      {needsName && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink/80">{t.nameLabel}</span>
          <input
            type="text"
            autoComplete="name"
            maxLength={100}
            value={typedName}
            aria-invalid={nameError}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="min-h-12 w-full rounded-xl border border-gold/50 bg-surface/80 px-4 py-3 text-base outline-none transition focus:border-burgundy focus:ring-2 focus:ring-burgundy/20"
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        {([true, false] as const).map((attending) => {
          const isSelected = rsvp.status === (attending ? 'ATTENDING' : 'DECLINED');
          return (
            <button
              key={String(attending)}
              type="button"
              disabled={rsvp.isSending}
              aria-pressed={isSelected}
              onClick={() => handleAnswer(attending)}
              className={`min-h-14 rounded-2xl border-2 px-3 text-lg font-semibold transition disabled:opacity-70 ${
                isSelected
                  ? 'border-burgundy bg-burgundy text-cream shadow-md'
                  : 'border-gold/50 bg-surface/70 text-burgundy hover:border-burgundy/60'
              }`}
            >
              {attending ? t.attendYes : t.attendNo}
            </button>
          );
        })}
      </div>

      {rsvp.status === 'ATTENDING' && (
        <div className="animate-fade-up text-center">
          <span className="mb-2 block text-sm font-medium text-ink/80">{t.guestsCountLabel}</span>
          <div className="flex items-center justify-center gap-5">
            <StepButton label="−" disabled={rsvp.guestsCount <= 1} onClick={() => rsvp.setGuestsCount(rsvp.guestsCount - 1)} />
            <span className="w-12 text-center font-serif text-4xl font-bold tabular-nums text-burgundy" aria-live="polite">
              {rsvp.guestsCount}
            </span>
            <StepButton
              label="+"
              disabled={rsvp.guestsCount >= MAX_PARTY_SIZE}
              onClick={() => rsvp.setGuestsCount(rsvp.guestsCount + 1)}
            />
          </div>
        </div>
      )}

      {rsvp.status !== 'INVITED' && (
        <p className="text-center font-serif text-xl text-burgundy" aria-live="polite">
          {rsvp.status === 'ATTENDING' ? t.thanksYes : t.thanksNo}
          <span className="mt-1 block font-sans text-xs text-ink/55">{t.rsvpChangeHint}</span>
        </p>
      )}

      {errorText && (
        <p role="alert" className="text-center text-sm font-medium text-red-700">
          {errorText}
        </p>
      )}
    </div>
  );
}

type StepButtonProps = { label: string; disabled: boolean; onClick: () => void };

function StepButton({ label, disabled, onClick }: StepButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-12 w-12 rounded-full border-2 border-gold text-2xl leading-none text-burgundy transition hover:bg-gold/10 disabled:opacity-30"
    >
      {label}
    </button>
  );
}
