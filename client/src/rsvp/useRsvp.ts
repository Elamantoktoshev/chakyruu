import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { GuestStatus, PublicGuest } from '../api/types';
import { loadStoredRsvp, saveStoredRsvp } from './rsvpStorage';
import { track } from '../lib/analytics';

/** Changing the party size is saved after the guest stops tapping +/−. */
const COUNT_SAVE_DELAY_MS = 700;

export type RsvpError = 'tooMany' | 'generic' | null;

export interface RsvpState {
  status: GuestStatus;
  guestsCount: number;
  /** Known name (personal link or earlier shared-link answer); null means the guest must type it. */
  knownName: string | null;
  isSending: boolean;
  error: RsvpError;
  answer: (attending: boolean, typedName?: string) => Promise<void>;
  setGuestsCount: (count: number) => void;
}

function toError(error: unknown): RsvpError {
  return error instanceof ApiError && error.status === 429 ? 'tooMany' : 'generic';
}

/**
 * One-tap RSVP. Personal links answer with their token; on the shared link the first answer
 * creates a guest and the returned token is remembered so later taps update the same guest.
 */
export function useRsvp(slug: string, personalToken: string | null, guest: PublicGuest | null): RsvpState {
  const [stored] = useState(() => (personalToken ? null : loadStoredRsvp(slug)));
  const token = useRef<string | null>(personalToken ?? stored?.token ?? null);
  const [knownName, setKnownName] = useState<string | null>(guest?.name ?? stored?.name ?? null);
  const [status, setStatus] = useState<GuestStatus>(guest?.status ?? 'INVITED');
  const [guestsCount, setCount] = useState(guest && guest.guestsCount > 0 ? guest.guestsCount : 1);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<RsvpError>(null);
  const countTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(countTimer.current), []);

  async function send(attending: boolean, count: number, typedName?: string): Promise<void> {
    const name = knownName ?? typedName?.trim();
    const identity = token.current ? { token: token.current } : { name };
    setIsSending(true);
    setError(null);
    try {
      const result = await api.answerRsvp(slug, { ...identity, attending, guestsCount: count });
      setStatus(result.guest.status);
      track('guest_rsvp', { attending, people: attending ? count : 0, personal: Boolean(identity.token) });
      if (result.token) {
        token.current = result.token;
        saveStoredRsvp(slug, { token: result.token, name: result.guest.name });
      }
      setKnownName(result.guest.name);
    } catch (err: unknown) {
      setError(toError(err));
    } finally {
      setIsSending(false);
    }
  }

  function setGuestsCount(count: number) {
    setCount(count);
    window.clearTimeout(countTimer.current);
    countTimer.current = window.setTimeout(() => void send(true, count), COUNT_SAVE_DELAY_MS);
  }

  return {
    status,
    guestsCount,
    knownName,
    isSending,
    error,
    answer: (attending, typedName) => send(attending, guestsCount, typedName),
    setGuestsCount,
  };
}
