import type { Invitation } from './types';

/** Must match server/src/web/spa.ts. */
export const EMBEDDED_INVITATION_ID = 'invitation-data';

/**
 * The server puts a published invitation into the HTML of /:slug, so the first paint does not wait
 * for a separate API request. Taken once: client-side navigation later fetches as usual.
 */
export function takeEmbeddedInvitation(slug: string): Invitation | null {
  const element = document.getElementById(EMBEDDED_INVITATION_ID);
  if (!element) return null;
  element.remove();
  try {
    const payload: unknown = JSON.parse(element.textContent ?? '');
    if (typeof payload !== 'object' || payload === null) return null;
    const { slug: embeddedSlug, data } = payload as { slug?: unknown; data?: unknown };
    return embeddedSlug === slug && typeof data === 'object' && data !== null ? (data as Invitation) : null;
  } catch {
    return null;
  }
}
