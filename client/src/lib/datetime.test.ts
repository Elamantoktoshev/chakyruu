import { describe, expect, it } from 'vitest';
import { fromEventIso, toEventIso } from './datetime';

describe('toEventIso', () => {
  it('combines date and time inputs in Bishkek time', () => {
    expect(toEventIso({ date: '2027-06-15', time: '17:00' })).toBe('2027-06-15T17:00:00+06:00');
  });

  it('returns null until both parts are valid', () => {
    expect(toEventIso({ date: '2027-06-15', time: '' })).toBeNull();
    expect(toEventIso({ date: '', time: '17:00' })).toBeNull();
    expect(toEventIso({ date: '2027-13-45', time: '17:00' })).toBeNull();
  });
});

describe('fromEventIso', () => {
  it('converts a stored UTC timestamp back to Bishkek inputs', () => {
    expect(fromEventIso('2027-06-15T11:00:00.000Z')).toEqual({ date: '2027-06-15', time: '17:00' });
  });

  it('round-trips with toEventIso', () => {
    const local = { date: '2027-01-01', time: '00:30' };
    expect(fromEventIso(toEventIso(local))).toEqual(local);
  });

  it('gives empty inputs for a missing date', () => {
    expect(fromEventIso(null)).toEqual({ date: '', time: '' });
  });
});
