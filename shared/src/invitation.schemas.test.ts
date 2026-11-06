import { describe, expect, it } from 'vitest';
import { invitationDraftSchema, slugSchema } from './invitation.schemas.js';

describe('invitationDraftSchema', () => {
  it('accepts a partial autosave payload and normalises empty optional text to null', () => {
    const parsed = invitationDraftSchema.parse({
      hostNames: ' Айбек & Айзада ',
      venueAddress: '',
      eventDate: '2027-06-15T17:00:00+06:00',
      musicTrackId: 'komuz-joy',
    });
    expect(parsed).toEqual({
      hostNames: 'Айбек & Айзада',
      venueAddress: null,
      eventDate: '2027-06-15T17:00:00+06:00',
      musicTrackId: 'komuz-joy',
    });
  });

  it('accepts only https 2GIS map links', () => {
    expect(invitationDraftSchema.safeParse({ venueMapUrl: 'https://2gis.kg/osh/firm/123' }).success).toBe(true);
    expect(invitationDraftSchema.safeParse({ venueMapUrl: 'https://go.2gis.com/abc' }).success).toBe(true);
    for (const url of ['http://2gis.kg/x', 'https://evil.example/2gis.kg', 'javascript:alert(1)', 'https://2gis.kg.evil.io']) {
      expect(invitationDraftSchema.safeParse({ venueMapUrl: url }).success, url).toBe(false);
    }
  });

  it('rejects unknown fields so the owner cannot set status or slug through autosave', () => {
    expect(invitationDraftSchema.safeParse({ status: 'PUBLISHED' }).success).toBe(false);
    expect(invitationDraftSchema.safeParse({ slug: 'mine' }).success).toBe(false);
  });

  it('rejects unknown music tracks and event types', () => {
    expect(invitationDraftSchema.safeParse({ musicTrackId: 'pirated-hit' }).success).toBe(false);
    expect(invitationDraftSchema.safeParse({ eventType: 'PARTY' }).success).toBe(false);
  });
});

describe('slugSchema', () => {
  it('lowercases and validates public slugs', () => {
    expect(slugSchema.parse('Aibek-Aizada')).toBe('aibek-aizada');
    expect(slugSchema.safeParse('айбек').success).toBe(false);
  });
});
