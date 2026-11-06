import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { useI18n } from '../i18n/LanguageContext';

const MAX_GUESTS = 20;
const MIN_NAME_LENGTH = 2;

interface FormState {
  guestName: string;
  attending: boolean | null;
  guestsCount: number;
  comment: string;
}

type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'done'; attending: boolean };

const INITIAL_FORM: FormState = { guestName: '', attending: null, guestsCount: 1, comment: '' };

interface RsvpFormProps {
  slug: string;
}

export function RsvpForm({ slug }: RsvpFormProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function validate(): string | null {
    if (form.guestName.trim().length < MIN_NAME_LENGTH) return t.errorName;
    if (form.attending === null) return t.errorChoose;
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError || form.attending === null) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmit({ status: 'submitting' });
    try {
      await api.createRsvp(slug, {
        guestName: form.guestName.trim(),
        attending: form.attending,
        guestsCount: form.attending ? form.guestsCount : 1,
        comment: form.comment.trim() || undefined,
      });
      setSubmit({ status: 'done', attending: form.attending });
    } catch (err: unknown) {
      setSubmit({ status: 'idle' });
      setError(err instanceof ApiError && err.status === 429 ? t.errorTooMany : t.errorGeneric);
    }
  }

  if (submit.status === 'done') {
    return (
      <div className="animate-fade-up space-y-4 py-6 text-center">
        <p className="font-serif text-2xl text-burgundy">{submit.attending ? t.thanksYes : t.thanksNo}</p>
        <button
          type="button"
          onClick={() => {
            setForm(INITIAL_FORM);
            setSubmit({ status: 'idle' });
          }}
          className="text-sm text-burgundy underline underline-offset-4"
        >
          {t.answerAgain}
        </button>
      </div>
    );
  }

  const isSubmitting = submit.status === 'submitting';
  const inputClass =
    'w-full rounded-xl border border-gold/50 bg-white/80 px-4 py-3 text-base outline-none transition focus:border-burgundy focus:ring-2 focus:ring-burgundy/20';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-left">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink/80">{t.nameLabel}</span>
        <input
          type="text"
          autoComplete="name"
          maxLength={100}
          value={form.guestName}
          onChange={(e) => update('guestName', e.target.value)}
          placeholder={t.namePlaceholder}
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {([true, false] as const).map((value) => {
          const selected = form.attending === value;
          return (
            <button
              key={String(value)}
              type="button"
              aria-pressed={selected}
              onClick={() => update('attending', value)}
              className={`rounded-xl border-2 px-3 py-3.5 font-medium transition ${
                selected
                  ? 'border-burgundy bg-burgundy text-cream shadow-md'
                  : 'border-gold/50 bg-white/70 text-burgundy hover:border-burgundy/60'
              }`}
            >
              {value ? t.attendYes : t.attendNo}
            </button>
          );
        })}
      </div>

      {form.attending && (
        <div className="animate-fade-up">
          <span className="mb-1.5 block text-sm font-medium text-ink/80">{t.guestsCountLabel}</span>
          <div className="flex items-center justify-center gap-5">
            <StepButton
              label="−"
              disabled={form.guestsCount <= 1}
              onClick={() => update('guestsCount', form.guestsCount - 1)}
            />
            <span className="w-10 text-center font-serif text-3xl font-bold tabular-nums text-burgundy">
              {form.guestsCount}
            </span>
            <StepButton
              label="+"
              disabled={form.guestsCount >= MAX_GUESTS}
              onClick={() => update('guestsCount', form.guestsCount + 1)}
            />
          </div>
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink/80">{t.commentLabel}</span>
        <textarea
          rows={3}
          maxLength={500}
          value={form.comment}
          onChange={(e) => update('comment', e.target.value)}
          placeholder={t.commentPlaceholder}
          className={`${inputClass} resize-none`}
        />
      </label>

      {error && (
        <p role="alert" className="text-center text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-burgundy py-4 font-semibold tracking-wide text-cream shadow-lg shadow-burgundy/20 transition hover:bg-burgundy-dark disabled:opacity-60"
      >
        {isSubmitting ? t.submitting : t.submit}
      </button>
    </form>
  );
}

interface StepButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
}

function StepButton({ label, disabled, onClick }: StepButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-11 w-11 rounded-full border-2 border-gold text-2xl leading-none text-burgundy transition hover:bg-gold/10 disabled:opacity-30"
    >
      {label}
    </button>
  );
}
