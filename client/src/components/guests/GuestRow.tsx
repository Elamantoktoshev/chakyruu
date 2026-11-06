import { guestLink, inviteMessage, whatsappUrl } from '@chakyruu/shared';
import { useEffect, useState } from 'react';
import type { Guest, Language } from '../../api/types';
import { useI18n } from '../../i18n/LanguageContext';
import { copyText } from '../../lib/share';

const COPIED_NOTICE_MS = 2000;

export interface ShareContext {
  slug: string;
  hostNames: string;
  /** Language of the invitation — the message to guests is written in it. */
  language: Language;
}

const STATUS_STYLE: Record<Guest['status'], string> = {
  ATTENDING: 'bg-emerald-100 text-emerald-800',
  DECLINED: 'bg-stone-200 text-stone-700',
  INVITED: 'bg-amber-100 text-amber-800',
};

type Props = {
  guest: Guest;
  share: ShareContext;
  onDelete: (guest: Guest) => void;
};

export function GuestRow({ guest, share, onDelete }: Props) {
  const { t } = useI18n();
  const [isCopied, setIsCopied] = useState(false);
  const url = guestLink(window.location.origin, share.slug, guest.token);
  const message = inviteMessage({ lang: share.language, guestName: guest.name, hostNames: share.hostNames, url });

  useEffect(() => {
    if (!isCopied) return undefined;
    const id = window.setTimeout(() => setIsCopied(false), COPIED_NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [isCopied]);

  async function handleCopy() {
    setIsCopied(await copyText(message));
  }

  return (
    <li className="rounded-2xl border border-gold/30 bg-white/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{guest.name}</p>
          <p className="mt-0.5 text-xs text-ink/55">
            {guest.phone ?? (guest.source === 'SELF' ? t.selfRegistered : '')}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[guest.status]}`}>
          {t.guestStatus[guest.status]}
          {guest.status === 'ATTENDING' && ` · ${t.guestPeople.replace('{n}', String(guest.guestsCount))}`}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={whatsappUrl(guest.phone, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#25D366] px-3 text-sm font-semibold text-white"
        >
          {t.sendWhatsApp}
        </a>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="min-h-11 flex-1 rounded-full border border-burgundy/40 px-3 text-sm font-medium text-burgundy"
        >
          {isCopied ? t.copied : t.copyGuestLink}
        </button>
        <button
          type="button"
          aria-label={`${t.deleteGuest}: ${guest.name}`}
          onClick={() => onDelete(guest)}
          className="min-h-11 min-w-11 rounded-full border border-stone-300 text-stone-500 hover:border-red-300 hover:text-red-700"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
