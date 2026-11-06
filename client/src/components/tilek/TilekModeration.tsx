import { useState } from 'react';
import { api } from '../../api/client';
import type { OwnerTilek } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';

type Props = {
  invitationId: string;
  tilekter: readonly OwnerTilek[];
  onChange: (tilekter: OwnerTilek[]) => void;
};

/** Dashboard list of wishes with a hide/show toggle. */
export function TilekModeration({ invitationId, tilekter, onChange }: Props) {
  const { t } = useI18n();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(tilek: OwnerTilek) {
    setBusyId(tilek.id);
    setError(null);
    try {
      const updated = await api.setTilekHidden(invitationId, tilek.id, !tilek.hidden);
      onChange(tilekter.map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl text-burgundy">{t.tilekTitle}</h2>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {tilekter.length === 0 ? (
        <p className="py-4 text-center text-ink/60">{t.tilekModerationEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {tilekter.map((tilek) => (
            <li key={tilek.id} className={`rounded-2xl border border-gold/30 p-4 ${tilek.hidden ? 'bg-stone-100 opacity-70' : 'bg-white/70'}`}>
              <p className="whitespace-pre-line break-words text-ink/85">{tilek.text}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-burgundy">
                  — {tilek.authorName} · ♥ {tilek.likesCount}
                  {tilek.hidden && <span className="ml-2 text-xs text-ink/55">({t.tilekHidden})</span>}
                </span>
                <button
                  type="button"
                  disabled={busyId === tilek.id}
                  onClick={() => void toggle(tilek)}
                  className="min-h-11 shrink-0 rounded-full border border-burgundy/40 px-4 font-medium text-burgundy disabled:opacity-50"
                >
                  {tilek.hidden ? t.tilekShow : t.tilekHide}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
