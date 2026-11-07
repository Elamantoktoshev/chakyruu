import type { InvitationDraftInput } from '@chakyruu/shared';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

type OrgKind = 'VENUE' | 'TAMADA';

export interface PartnerLinkUpdate {
  venueOrgId?: string | null;
  tamadaOrgId?: string | null;
  hallId?: string | null;
}

/**
 * A client may show a partner on the invitation if it is published in the catalogue,
 * or if that partner gave them the gift this invitation was created from.
 */
async function assertLinkable(invitationId: string, orgId: string, kind: OrgKind): Promise<void> {
  const org = await prisma.organization.findFirst({
    where: {
      id: orgId,
      type: kind,
      OR: [{ catalogStatus: 'PUBLISHED' }, { giftCodes: { some: { invitationId } } }],
    },
    select: { id: true },
  });
  if (!org) throw new HttpError(400, kind === 'VENUE' ? 'Unknown venue' : 'Unknown tamada');
}

/**
 * The partner who paid for a gift with their credit stays on the invitation:
 * a venue gift cannot be switched to another venue (or removed), same for a tamada gift.
 */
async function assertGiftPartnerKept(invitationId: string, input: InvitationDraftInput): Promise<void> {
  const gift = await prisma.giftCode.findFirst({
    where: { invitationId, cancelledAt: null },
    select: { organization: { select: { id: true, type: true } } },
  });
  if (!gift) return;
  const { id, type } = gift.organization;
  const field = type === 'VENUE' ? input.venueOrgId : type === 'TAMADA' ? input.tamadaOrgId : undefined;
  if (field !== undefined && field !== id) {
    throw new HttpError(400, 'The partner who gave this gift cannot be replaced on the invitation');
  }
}

/** Validates venue / tamada / hall changes from autosave and returns what to write. */
export async function assertPartnerLinks(invitationId: string, input: InvitationDraftInput): Promise<PartnerLinkUpdate> {
  const touchesLinks = input.venueOrgId !== undefined || input.tamadaOrgId !== undefined || input.hallId !== undefined;
  if (!touchesLinks) return {};
  await assertGiftPartnerKept(invitationId, input);

  if (input.venueOrgId) await assertLinkable(invitationId, input.venueOrgId, 'VENUE');
  if (input.tamadaOrgId) await assertLinkable(invitationId, input.tamadaOrgId, 'TAMADA');

  const current = await prisma.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: { venueOrgId: true } });
  const venueOrgId = input.venueOrgId === undefined ? current.venueOrgId : input.venueOrgId;
  const venueChanged = input.venueOrgId !== undefined && input.venueOrgId !== current.venueOrgId;

  let hallId = input.hallId;
  if (hallId) {
    const hall = venueOrgId ? await prisma.hall.findFirst({ where: { id: hallId, organizationId: venueOrgId } }) : null;
    if (!hall) throw new HttpError(400, 'The hall does not belong to the chosen venue');
  } else if (venueChanged) {
    // A hall of the previous venue would make no sense any more.
    hallId = null;
  }

  return {
    ...(input.venueOrgId !== undefined ? { venueOrgId: input.venueOrgId } : {}),
    ...(input.tamadaOrgId !== undefined ? { tamadaOrgId: input.tamadaOrgId } : {}),
    ...(hallId !== undefined ? { hallId } : {}),
  };
}
