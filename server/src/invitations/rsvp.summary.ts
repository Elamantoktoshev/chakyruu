export interface RsvpLike {
  attending: boolean;
  guestsCount: number;
}

export interface RsvpSummary {
  totalResponses: number;
  attendingResponses: number;
  declinedResponses: number;
  /** Total number of people coming (sum of guestsCount of attending responses). */
  totalGuests: number;
}

export function summarizeRsvps(rsvps: readonly RsvpLike[]): RsvpSummary {
  return rsvps.reduce<RsvpSummary>(
    (acc, rsvp) => ({
      totalResponses: acc.totalResponses + 1,
      attendingResponses: acc.attendingResponses + (rsvp.attending ? 1 : 0),
      declinedResponses: acc.declinedResponses + (rsvp.attending ? 0 : 1),
      totalGuests: acc.totalGuests + (rsvp.attending ? rsvp.guestsCount : 0),
    }),
    { totalResponses: 0, attendingResponses: 0, declinedResponses: 0, totalGuests: 0 },
  );
}
