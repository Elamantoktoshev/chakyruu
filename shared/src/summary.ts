import type { GuestStatus } from './guests.js';

export interface GuestSummary {
  /** Guests on the list (including self-registered). */
  totalGuests: number;
  attending: number;
  declined: number;
  noAnswer: number;
  /** People coming: sum of party sizes of attending guests. */
  totalPeople: number;
}

export interface GuestGroup {
  status: GuestStatus;
  /** Number of guests with this status. */
  count: number;
  /** Sum of their party sizes. */
  people: number;
}

const EMPTY: GuestSummary = { totalGuests: 0, attending: 0, declined: 0, noAnswer: 0, totalPeople: 0 };

/** From pre-aggregated rows (SQL GROUP BY status). */
export function summarizeGroups(groups: readonly GuestGroup[]): GuestSummary {
  return groups.reduce<GuestSummary>(
    (acc, { status, count, people }) => ({
      totalGuests: acc.totalGuests + count,
      attending: acc.attending + (status === 'ATTENDING' ? count : 0),
      declined: acc.declined + (status === 'DECLINED' ? count : 0),
      noAnswer: acc.noAnswer + (status === 'INVITED' ? count : 0),
      totalPeople: acc.totalPeople + (status === 'ATTENDING' ? people : 0),
    }),
    EMPTY,
  );
}

/** From a plain guest list (dashboard page). */
export function summarizeGuests(guests: readonly { status: GuestStatus; guestsCount: number }[]): GuestSummary {
  return summarizeGroups(guests.map((guest) => ({ status: guest.status, count: 1, people: guest.guestsCount })));
}
