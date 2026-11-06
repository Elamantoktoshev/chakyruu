import { describe, expect, it } from 'vitest';
import { summarizeGroups, summarizeGuests } from './summary.js';

describe('summarizeGuests', () => {
  it('counts answers and the people coming', () => {
    const summary = summarizeGuests([
      { status: 'ATTENDING', guestsCount: 3 },
      { status: 'ATTENDING', guestsCount: 2 },
      { status: 'DECLINED', guestsCount: 0 },
      { status: 'INVITED', guestsCount: 1 },
    ]);
    expect(summary).toEqual({ totalGuests: 4, attending: 2, declined: 1, noAnswer: 1, totalPeople: 5 });
  });

  it('does not count party sizes of guests who did not confirm', () => {
    expect(summarizeGuests([{ status: 'INVITED', guestsCount: 4 }]).totalPeople).toBe(0);
  });

  it('is all zeros for an empty list', () => {
    expect(summarizeGuests([])).toEqual({ totalGuests: 0, attending: 0, declined: 0, noAnswer: 0, totalPeople: 0 });
  });
});

describe('summarizeGroups', () => {
  it('matches the per-guest summary for grouped rows', () => {
    expect(
      summarizeGroups([
        { status: 'ATTENDING', count: 2, people: 5 },
        { status: 'INVITED', count: 7, people: 7 },
      ]),
    ).toEqual({ totalGuests: 9, attending: 2, declined: 0, noAnswer: 7, totalPeople: 5 });
  });
});
