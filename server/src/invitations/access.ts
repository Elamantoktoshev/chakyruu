import { canManageInvitation, type PolicyUser } from '../auth/policy.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

export interface ManagedInvitationRef {
  id: string;
  slug: string;
  status: 'DRAFT' | 'PAID' | 'PUBLISHED';
  ownerId: string;
  organizationId: string | null;
  photoKey: string | null;
}

/**
 * Loads an invitation for a management (/api/my) request.
 * 404 when it does not exist, 403 when it belongs to someone else (ids are unguessable cuids).
 */
export async function findManagedInvitation(id: string, user: PolicyUser): Promise<ManagedInvitationRef> {
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, ownerId: true, organizationId: true, photoKey: true },
  });
  if (!invitation) throw new HttpError(404, 'Invitation not found');
  if (!canManageInvitation(user, invitation)) throw new HttpError(403, 'You do not have access to this invitation');
  return invitation;
}
