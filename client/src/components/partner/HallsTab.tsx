import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import type { Hall } from '../../api/types';
import { inputClass } from '../../builder/fields';
import { useI18n } from '../../i18n/LanguageContext';

const DEFAULT_CAPACITY = 200;

type Props = { halls: readonly Hall[]; onChange: (halls: Hall[]) => void };

export function HallsTab({ halls, onChange }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      const hall = await api.partner.addHall({ name, capacity });
      onChange([...halls, hall]);
      setName('');
    } catch {
      setError(t.errorGeneric);
    }
  }

  async function handleDelete(hallId: string) {
    setError(null);
    try {
      await api.partner.deleteHall(hallId);
      onChange(halls.filter((hall) => hall.id !== hallId));
    } catch {
      setError(t.errorGeneric);
    }
  }

  return (
    <div className="space-y-4">
      {halls.length === 0 ? (
        <p className="text-center text-night/60">{t.noHalls}</p>
      ) : (
        <ul className="space-y-2">
          {halls.map((hall) => (
            <li key={hall.id} className="flex items-center justify-between rounded-2xl border border-line bg-white/70 p-4">
              <span className="font-medium">
                {hall.name} <span className="text-sm text-night/60">· {hall.capacity}</span>
              </span>
              <button
                type="button"
                aria-label={`${t.deleteGuest}: ${hall.name}`}
                onClick={() => void handleDelete(hall.id)}
                className="min-h-11 min-w-11 rounded-full border border-stone-300 text-stone-500 hover:text-red-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="grid grid-cols-[1fr_7rem] gap-2">
        <input aria-label={t.hallName} placeholder={t.hallName} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        <input
          aria-label={t.hallCapacity}
          type="number"
          min={1}
          max={5000}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className={inputClass}
        />
        <button type="submit" className="col-span-2 min-h-12 rounded-xl bg-brand font-semibold text-white">
          + {t.addHall}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
