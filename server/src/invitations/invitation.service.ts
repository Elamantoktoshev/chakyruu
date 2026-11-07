import type { Prisma } from '@prisma/client';
import { canManageInvitation, type PolicyUser } from '../auth/policy.js';
import { findGuestByToken } from '../guests/rsvp.service.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

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
  musicTrackId: true,
  message: true,
  language: true,
  eventType: true,
  adultsOnly: true,
  template: { select: { id: true, name: true, type: true, config: true } },
  // Partner branding. The tamada's phone is never selected: contact goes through /contact.
  venueOrg: { select: { name: true, logoUrl: true, address: true, mapUrl: true } },
  hall: { select: { name: true } },
  tamadaOrg: { select: { id: true, tamadaProfile: { select: { displayName: true, photoUrl: true } } } },
} as const;

type PublicRow = Prisma.InvitationGetPayload<{ select: typeof publicInvitationSelect }>;

/** Flattens the partner relations into the "Той өтүүчү жай" and "Тамада" blocks. */
function partnerBlocks({ venueOrg, hall, tamadaOrg }: Pick<PublicRow, 'venueOrg' | 'hall' | 'tamadaOrg'>) {
  const venue = venueOrg ? { ...venueOrg, hallName: hall?.name ?? null } : null;
  const profile = tamadaOrg?.tamadaProfile;
  const tamada = tamadaOrg && profile ? { id: tamadaOrg.id, displayName: profile.displayName, photoUrl: profile.photoUrl } : null;
  return { venue, tamada };
}

/**
 * Public page data. Unpublished invitations exist only for the people who manage them
 * (they see it flagged `isDraft`); for everyone else it is a plain 404.
 * With a personal-link token the guest is included so the page can greet them.
 */
export async function getPublicInvitation(slug: string, viewer: PolicyUser | undefined, guestToken?: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { slug },
    select: { ...publicInvitationSelect, status: true, ownerId: true, organizationId: true },
  });
  if (!invitation) throw new HttpError(404, 'Invitation not found');
  const isDraft = invitation.status !== 'PUBLISHED';
  if (isDraft && !(viewer && canManageInvitation(viewer, invitation))) {
    throw new HttpError(404, 'Invitation not found');
  }
  const { status: _status, ownerId: _ownerId, organizationId: _organizationId, venueOrg, hall, tamadaOrg, ...rest } = invitation;
  const guest = await findGuestByToken(invitation.id, guestToken);
  return { ...rest, ...partnerBlocks({ venueOrg, hall, tamadaOrg }), isDraft, guest };
}
