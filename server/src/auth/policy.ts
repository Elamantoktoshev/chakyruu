import type { UserRole } from '@prisma/client';

export interface PolicyUser {
  id: string;
  role: UserRole;
  organizationId: string | null;
}

export interface InvitationAccessTarget {
  ownerId: string;
  organizationId: string | null;
}

/** Who may see private invitation data (guest list): owner, admin of its org, platform admin. */
export function canManageInvitation(user: PolicyUser, invitation: InvitationAccessTarget): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.id === invitation.ownerId) return true;
  return (
    user.role === 'ORG_ADMIN' &&
    invitation.organizationId !== null &&
    user.organizationId === invitation.organizationId
  );
}
