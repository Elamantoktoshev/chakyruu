export type Language = 'KY' | 'RU';
export type TemplateType = 'WEDDING' | 'BESHIK' | 'SUNNOT' | 'MAARAKE';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { message: string; details?: unknown } | null;
}

export interface Invitation {
  id: string;
  slug: string;
  hostNames: string;
  eventDate: string;
  venueName: string;
  venueAddress: string | null;
  venueMapUrl: string | null;
  photoUrl: string | null;
  musicUrl: string | null;
  message: string | null;
  language: Language;
  template: { id: string; name: string; type: TemplateType; config: unknown };
}

export interface Rsvp {
  id: string;
  guestName: string;
  attending: boolean;
  guestsCount: number;
  comment: string | null;
  createdAt: string;
}

export interface RsvpInput {
  guestName: string;
  attending: boolean;
  guestsCount: number;
  comment?: string;
}

export interface RsvpSummary {
  totalResponses: number;
  attendingResponses: number;
  declinedResponses: number;
  totalGuests: number;
}

export interface RsvpList {
  rsvps: Rsvp[];
  summary: RsvpSummary;
}
