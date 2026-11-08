import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { AddGuestsResult } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';

type Props = {
  invitationId: string;
  onAdded: (result: AddGuestsResult) => void;
};

export function AddGuestsForm({ invitationId, onAdded }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.addGuests(invitationId, text);
      onAdded(result);
      setText('');
      const added = t.addedGuests.replace('{n}', String(result.created.length));
      setNotice(result.skipped > 0 ? `${added}. ${t.skippedGuests.replace('{n}', String(result.skipped))}` : added);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-line bg-white/70 p-4">
      <label className="block">
        <span className="block font-display font-extrabold text-xl text-night">{t.addGuestsTitle}</span>
        <span className="mt-1 block text-xs text-night/60">{t.addGuestsHint}</span>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.addGuestsPlaceholder}
          className="mt-3 w-full resize-y rounded-xl border border-line bg-white/80 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
      {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isBusy || !text.trim()}
        className="mt-3 min-h-12 w-full rounded-xl bg-brand font-semibold text-white disabled:opacity-50"
      >
        {isBusy ? t.adding : t.addGuestsButton}
      </button>
    </form>
  );
}
