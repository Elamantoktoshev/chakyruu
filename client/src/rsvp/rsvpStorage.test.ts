// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { loadStoredRsvp, saveStoredRsvp } from './rsvpStorage';

const TOKEN = 'abcdefghijklmnopqrstuv';

beforeEach(() => localStorage.clear());

describe('rsvpStorage', () => {
  it('round-trips the shared-link token per invitation', () => {
    saveStoredRsvp('aibek-aizada', { token: TOKEN, name: 'Бакыт' });
    expect(loadStoredRsvp('aibek-aizada')).toEqual({ token: TOKEN, name: 'Бакыт' });
    expect(loadStoredRsvp('other-toi')).toBeNull();
  });

  it('ignores corrupted or tampered values', () => {
    localStorage.setItem('chakyruu.rsvp.a', '{not json');
    localStorage.setItem('chakyruu.rsvp.b', JSON.stringify({ token: '../evil', name: 'x' }));
    localStorage.setItem('chakyruu.rsvp.c', JSON.stringify({ token: TOKEN }));
    expect(loadStoredRsvp('a')).toBeNull();
    expect(loadStoredRsvp('b')).toBeNull();
    expect(loadStoredRsvp('c')).toBeNull();
  });
});
