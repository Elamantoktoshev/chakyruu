import { TILEK_AUTHOR_MAX, TILEK_TEXT_MAX } from '@chakyruu/shared';
import { useCallback, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { Tilek } from '../../api/types';
import { useAsync } from '../../api/useAsync';
import { useI18n } from '../../i18n/LanguageContext';
import { getClientId } from '../../lib/clientId';
import { OrnamentDivider } from '../Ornament';

const MIN_LENGTH = 2;

type Props = {
  slug: string;
  /** Personal-link token: the wish is signed with the guest's name, no name field needed. */
  guestToken: string | null;
};

/** Public wishes wall on the invitation page: write, read, like (once per browser). */
export function TilekSection({ slug, guestToken }: Props) {
  const { t } = useI18n();
  const load = useCallback(() => api.listTilekter(slug, getClientId()), [slug]);
  const state = useAsync(load);
  const [added, setAdded] = useState<Tilek[]>([]);
  const [likes, setLikes] = useState<Readonly<Record<string, { likesCount: number; likedByMe: boolean }>>>({});

  const loaded = state.status === 'success' ? state.data : [];
  const tilekter = [...added, ...loaded.filter((tilek) => !added.some((own) => own.id === tilek.id))].map((tilek) => ({
    ...tilek,
    ...likes[tilek.id],
  }));

  async function handleLike(tilek: Tilek) {
    if (tilek.likedByMe) return;
    setLikes((prev) => ({ ...prev, [tilek.id]: { likesCount: tilek.likesCount + 1, likedByMe: true } }));
    try {
      const result = await api.likeTilek(tilek.id, getClientId());
      setLikes((prev) => ({ ...prev, [tilek.id]: { likesCount: result.likesCount, likedByMe: true } }));
    } catch {
      setLikes((prev) => ({ ...prev, [tilek.id]: { likesCount: tilek.likesCount, likedByMe: false } }));
    }
  }

  return (
    <section className="px-6 py-10">
      <OrnamentDivider className="mb-6" />
      <h2 className="text-center font-serif text-3xl text-burgundy">{t.tilekTitle}</h2>
      <p className="mb-6 mt-2 text-center text-sm text-ink/60">{t.tilekSubtitle}</p>
      <TilekForm slug={slug} guestToken={guestToken} onAdded={(tilek) => setAdded((prev) => [tilek, ...prev])} />

      {state.status === 'success' && tilekter.length === 0 && <p className="mt-8 text-center text-ink/60">{t.tilekEmpty}</p>}
      <ul className="mt-8 space-y-3">
        {tilekter.map((tilek) => (
          <li key={tilek.id} className="rounded-2xl border border-gold/30 bg-surface/70 p-4">
            <p className="whitespace-pre-line break-words text-ink/85">{tilek.text}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-burgundy">— {tilek.authorName}</span>
              <button
                type="button"
                aria-label={t.tilekLike}
                aria-pressed={tilek.likedByMe}
                disabled={tilek.likedByMe}
                onClick={() => void handleLike(tilek)}
                className={`flex min-h-11 min-w-16 items-center justify-center gap-1.5 rounded-full border px-3 text-sm transition ${
                  tilek.likedByMe ? 'border-burgundy bg-burgundy/10 text-burgundy' : 'border-gold/50 text-ink/60 hover:border-burgundy/60'
                }`}
              >
                <span aria-hidden="true">{tilek.likedByMe ? '♥' : '♡'}</span>
                <span className="tabular-nums">{tilek.likesCount}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

type FormProps = { slug: string; guestToken: string | null; onAdded: (tilek: Tilek) => void };

function TilekForm({ slug, guestToken, onAdded }: FormProps) {
  const { t } = useI18n();
  const [authorName, setAuthorName] = useState('');
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guestToken && authorName.trim().length < MIN_LENGTH) {
      setMessage({ kind: 'error', text: t.errorName });
      return;
    }
    if (text.trim().length < MIN_LENGTH) {
      setMessage({ kind: 'error', text: t.tilekErrorText });
      return;
    }
    setIsSending(true);
    setMessage(null);
    try {
      const identity = guestToken ? { token: guestToken } : { authorName };
      onAdded(await api.createTilek(slug, { ...identity, text }));
      setText('');
      setMessage({ kind: 'ok', text: t.tilekThanks });
    } catch (err: unknown) {
      setMessage({ kind: 'error', text: err instanceof ApiError && err.status === 429 ? t.errorTooMany : t.errorGeneric });
    } finally {
      setIsSending(false);
    }
  }

  const inputClass =
    'w-full min-h-12 rounded-xl border border-gold/50 bg-surface/80 px-4 py-3 text-base outline-none focus:border-burgundy focus:ring-2 focus:ring-burgundy/20';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {!guestToken && (
        <input
          aria-label={t.tilekNameLabel}
          placeholder={t.tilekNameLabel}
          maxLength={TILEK_AUTHOR_MAX}
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className={inputClass}
        />
      )}
      <textarea
        aria-label={t.tilekTextLabel}
        rows={3}
        maxLength={TILEK_TEXT_MAX}
        placeholder={t.tilekTextPlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={`${inputClass} resize-none`}
      />
      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-center text-sm ${message.kind === 'error' ? 'font-medium text-red-700' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={isSending} className="min-h-12 w-full rounded-full border-2 border-burgundy font-semibold text-burgundy transition hover:bg-burgundy hover:text-cream disabled:opacity-60">
        {isSending ? t.tilekSending : t.tilekSend}
      </button>
    </form>
  );
}
