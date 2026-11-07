import { GUEST_TOKEN_PATTERN } from '@chakyruu/shared';

const KEY_PREFIX = 'chakyruu.rsvp.';

/** A guest who answered on the shared link gets a token back; it is kept per invitation in this browser. */
export interface StoredRsvp {
  token: string;
  name: string;
}

export function loadStoredRsvp(slug: string): StoredRsvp | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + slug);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRsvp>;
    const isValid = typeof parsed.name === 'string' && typeof parsed.token === 'string' && GUEST_TOKEN_PATTERN.test(parsed.token);
    return isValid ? { token: parsed.token as string, name: parsed.name as string } : null;
  } catch {
    return null;
  }
}

export function saveStoredRsvp(slug: string, value: StoredRsvp): void {
  try {
    localStorage.setItem(KEY_PREFIX + slug, JSON.stringify(value));
  } catch {
    // Private mode / storage full: the guest can still answer, just not edit later from this browser.
  }
}
