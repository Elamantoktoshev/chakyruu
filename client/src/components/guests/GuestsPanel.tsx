import { GUEST_STATUSES, type GuestStatus } from '@chakyruu/shared';
import { useState } from 'react';
import { api } from '../../api/client';
import type { Guest } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { AddGuestsForm } from './AddGuestsForm';
import { GuestRow, type ShareContext } from './GuestRow';

type Filter = GuestStatus | 'ALL';

type Props = {
  invitationId: string;
  share: ShareContext;
  guests: readonly Guest[];
  onGuestsChange: (guests: Guest[]) => void;
};

/** Add-by-paste form, status filter and the guest list with WhatsApp / copy buttons. */
export function GuestsPanel({ invitationId, share, guests, onGuestsChange }: Props) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [error, setError] = useState<string | null>(null);
  const visible = filter === 'ALL' ? guests : guests.filter((guest) => guest.status === filter);
  const countOf = (value: Filter) => (value === 'ALL' ? guests.length : guests.filter((g) => g.status === value).length);

  async function handleDelete(guest: Guest) {
    if (!window.confirm(t.confirmDeleteGuest)) return;
    setError(null);
    try {
      await api.deleteGuest(invitationId, guest.id);
      onGuestsChange(guests.filter((existing) => existing.id !== guest.id));
    } catch {
      setError(t.errorGeneric);
    }
  }

  return (
    <section className="space-y-4">
      <AddGuestsForm invitationId={invitationId} onAdded={(result) => onGuestsChange([...guests, ...result.created])} />

      <h2 className="font-serif text-2xl text-burgundy">{t.guestsHeading}</h2>
      <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {(['ALL', ...GUEST_STATUSES] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${
              filter === value ? 'border-burgundy bg-burgundy text-cream' : 'border-gold/50 bg-white/70 text-burgundy'
            }`}
          >
            {value === 'ALL' ? t.guestFilterAll : t.guestStatus[value]} · {countOf(value)}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {visible.length === 0 ? (
        <p className="py-6 text-center text-ink/60">{t.noGuests}</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((guest) => (
            <GuestRow key={guest.id} guest={guest} share={share} onDelete={(g) => void handleDelete(g)} />
          ))}
        </ul>
      )}
    </section>
  );
}
