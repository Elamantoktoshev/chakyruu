const STORAGE_KEY = 'chakyruu.clientId';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let memoryFallback: string | null = null;

/**
 * Anonymous, random per-browser id — only used so a browser can like each tilek once.
 * It identifies nobody and is never linked to a phone or account.
 */
export function getClientId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && UUID_PATTERN.test(stored)) return stored;
    const fresh = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    memoryFallback ??= crypto.randomUUID();
    return memoryFallback;
  }
}
