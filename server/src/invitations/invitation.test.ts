import { describe, expect, it } from 'vitest';
import { rsvpBodySchema, slugParamsSchema } from './invitation.schemas.js';
import { summarizeRsvps } from './rsvp.summary.js';

describe('slugParamsSchema', () => {
  it('accepts kebab-case latin slugs and lowercases them', () => {
    expect(slugParamsSchema.parse({ slug: 'Aibek-Aizada' }).slug).toBe('aibek-aizada');
  });

  it('rejects slugs with spaces, cyrillic or leading dashes', () => {
    for (const slug of ['aibek aizada', 'айбек', '-aibek', 'ab']) {
      expect(slugParamsSchema.safeParse({ slug }).success).toBe(false);
    }
  });
});

describe('rsvpBodySchema', () => {
  it('defaults guestsCount to 1 and normalises empty comment to null', () => {
    const result = rsvpBodySchema.parse({ guestName: ' Нурлан ', attending: true, comment: '' });
    expect(result).toEqual({ guestName: 'Нурлан', attending: true, guestsCount: 1, comment: null });
  });

  it('forces guestsCount to 0 when the guest declines', () => {
    const result = rsvpBodySchema.parse({ guestName: 'Асель', attending: false, guestsCount: 4 });
    expect(result.guestsCount).toBe(0);
  });

  it('rejects missing name, non-boolean attending and too many guests', () => {
    expect(rsvpBodySchema.safeParse({ attending: true }).success).toBe(false);
    expect(rsvpBodySchema.safeParse({ guestName: 'Асель', attending: 'yes' }).success).toBe(false);
    expect(rsvpBodySchema.safeParse({ guestName: 'Асель', attending: true, guestsCount: 99 }).success).toBe(false);
  });
});

describe('summarizeRsvps', () => {
  it('returns zeros for an empty list', () => {
    expect(summarizeRsvps([])).toEqual({
      totalResponses: 0,
      attendingResponses: 0,
      declinedResponses: 0,
      totalGuests: 0,
    });
  });

  it('counts only attending guests in totalGuests', () => {
    const summary = summarizeRsvps([
      { attending: true, guestsCount: 3 },
      { attending: false, guestsCount: 0 },
      { attending: true, guestsCount: 2 },
    ]);
    expect(summary).toEqual({ totalResponses: 3, attendingResponses: 2, declinedResponses: 1, totalGuests: 5 });
  });
});
