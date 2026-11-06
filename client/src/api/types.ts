import type { EventType, GuestStatus, GuestSummary, Language } from '@chakyruu/shared';

export type { EventType, GuestStatus, Language } from '@chakyruu/shared';
export type TemplateType = EventType;
export type InvitationStatus = 'DRAFT' | 'PAID' | 'PUBLISHED';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { message: string; details?: unknown } | null;
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  config: unknown;
}

/** Fields the invitation page renders — shared by the public page, the builder preview and template cards. */
export interface InvitationContent {
  slug: string;
  hostNames: string;
  eventType: EventType;
  eventDate: string | null;
  venueName: string;
  venueAddress: string | null;
  venueMapUrl: string | null;
  photoUrl: string | null;
  musicTrackId: string | null;
  message: string | null;
  language: Language;
  adultsOnly: boolean;
  template: Template;
}

/** What the invitation page knows about the guest behind a personal link. */
export interface PublicGuest {
  name: string;
  status: GuestStatus;
  guestsCount: number;
}

export interface Invitation extends InvitationContent {
  id: string;
  /** True when the owner is looking at an unpublished invitation. */
  isDraft: boolean;
  /** Present when opened through a personal link (?g=token). */
  guest: PublicGuest | null;
}

export interface Guest extends PublicGuest {
  id: string;
  phone: string | null;
  token: string;
  source: 'INVITED' | 'SELF';
  respondedAt: string | null;
  createdAt: string;
}

export interface AddGuestsResult {
  created: Guest[];
  skipped: number;
}

export interface RsvpResult {
  guest: PublicGuest;
  /** Issued to a guest who answered on the shared link, to change the answer later. */
  token: string | null;
}

export interface OwnerInvitation extends InvitationContent {
  id: string;
  status: InvitationStatus;
  templateId: string;
  publishedAt: string | null;
  updatedAt: string;
}

export type PublishResult = { status: 'PUBLISHED'; slug: string } | { status: 'PENDING'; redirectUrl: string };

export type UserRole = 'OWNER' | 'ORG_ADMIN' | 'ADMIN';

export interface SessionUser {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  organizationId: string | null;
}

export interface OtpRequestResult {
  expiresInSeconds: number;
}

export interface Tilek {
  id: string;
  authorName: string;
  text: string;
  likesCount: number;
  createdAt: string;
  likedByMe: boolean;
}

export interface OwnerTilek extends Omit<Tilek, 'likedByMe'> {
  hidden: boolean;
  guestId: string | null;
}

export interface DashboardInvitation {
  id: string;
  slug: string;
  status: InvitationStatus;
  hostNames: string;
  eventType: EventType;
  eventDate: string | null;
  venueName: string;
  photoUrl: string | null;
  updatedAt: string;
  summary: GuestSummary;
}
