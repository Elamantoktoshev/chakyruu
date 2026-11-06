import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';
import type { RsvpInput } from './invitation.schemas.js';
import { summarizeRsvps } from './rsvp.summary.js';

/** Fields that are safe to expose on the public invitation page. */
const publicInvitationSelect = {
  id: true,
  slug: true,
  hostNames: true,
  eventDate: true,
  venueName: true,
  venueAddress: true,
  venueMapUrl: true,
  photoUrl: true,
  musicUrl: true,
  message: true,
  language: true,
  template: { select: { id: true, name: true, type: true, config: true } },
} as const;

const rsvpSelect = {
  id: true,
  guestName: true,
  attending: true,
  guestsCount: true,
  comment: true,
  createdAt: true,
} as const;

async function findPublishedIdOrThrow(slug: string): Promise<string> {
  const invitation = await prisma.invitation.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!invitation) throw new HttpError(404, 'Invitation not found');
  return invitation.id;
}

export async function getPublicInvitation(slug: string) {
  // TODO: allow the owner to preview DRAFT/PAID invitations once auth exists.
  const invitation = await prisma.invitation.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: publicInvitationSelect,
  });
  if (!invitation) throw new HttpError(404, 'Invitation not found');
  return invitation;
}

export async function createRsvp(slug: string, input: RsvpInput) {
  const invitationId = await findPublishedIdOrThrow(slug);
  return prisma.rsvp.create({ data: { ...input, invitationId }, select: rsvpSelect });
}

export async function listRsvps(slug: string) {
  const invitationId = await findPublishedIdOrThrow(slug);
  const rsvps = await prisma.rsvp.findMany({
    where: { invitationId },
    orderBy: { createdAt: 'desc' },
    select: rsvpSelect,
  });
  return { rsvps, summary: summarizeRsvps(rsvps) };
}
