import { isPaletteOf, summarizeGroups, type GuestGroup, type InvitationDraftInput } from '@chakyruu/shared';
import type { Prisma } from '@prisma/client';
import type { SessionUser } from '../auth/auth.service.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { templateSelect } from '../templates/template.routes.js';
import { replaceImage } from '../storage/imageUpload.js';
import type { StorageProvider } from '../storage/storage.provider.js';
import { attachGift, findRedeemableGift, giftPrefill } from '../gifts/gift.service.js';
import { findManagedInvitation } from './access.js';
import { assertPartnerLinks } from './partnerLinks.js';
import { allocateSlug, isUniqueViolation, temporaryDraftSlug } from './slug.service.js';

const MAX_SLUG_RETRIES = 3;
/** Upper bound for one dashboard page (a тойкана with many events); pagination comes later. */
const MAX_DASHBOARD_INVITATIONS = 200;

/** Everything the builder needs to render the form and the live preview. */
export const ownerInvitationSelect = {
  id: true,
  slug: true,
  status: true,
  templateId: true,
  eventType: true,
  hostNames: true,
  eventDate: true,
  venueName: true,
  venueAddress: true,
  venueMapUrl: true,
  photoUrl: true,
  musicTrackId: true,
  message: true,
  language: true,
  adultsOnly: true,
  paletteId: true,
  heroNumber: true,
  openingAnimation: true,
  program: true,
  hideBranding: true,
  publishedAt: true,
  updatedAt: true,
  venueOrgId: true,
  tamadaOrgId: true,
  hallId: true,
  template: { select: templateSelect },
  giftCode: { select: { cancelledAt: true, organization: { select: { name: true, type: true } } } },
} as const;

type OwnerInvitationRow = Prisma.InvitationGetPayload<{ select: typeof ownerInvitationSelect }>;

/** Builder DTO: the raw gift relation becomes "is this a gift, and from whom". */
function toOwnerDto({ giftCode, ...invitation }: OwnerInvitationRow) {
  const isGift = giftCode !== null && giftCode.cancelledAt === null;
  return { ...invitation, isGift, giftFrom: isGift ? giftCode.organization : null };
}

async function assertTemplateExists(templateId: string) {
  const template = await prisma.template.findUnique({ where: { id: templateId }, select: { id: true, type: true, componentKey: true } });
  if (!template) throw new HttpError(400, 'Unknown template');
  return template;
}

export async function createDraft(user: SessionUser, templateId: string, giftCode?: string) {
  const template = await assertTemplateExists(templateId);
  const base = {
    slug: temporaryDraftSlug(),
    templateId: template.id,
    eventType: template.type,
    ownerId: user.id,
    organizationId: user.organizationId,
  };
  if (!giftCode) return toOwnerDto(await prisma.invitation.create({ data: base, select: ownerInvitationSelect }));

  // Gift from a partner: pre-fill the venue / tamada and attach the code in one transaction.
  const created = await prisma.$transaction(async (tx) => {
    const gift = await findRedeemableGift(tx, giftCode, user);
    const invitation = await tx.invitation.create({
      data: { ...base, ...giftPrefill(gift, gift.organization) },
      select: { id: true },
    });
    await attachGift(tx, gift.id, invitation.id);
    return invitation;
  });
  return getOwnerInvitation(created.id, user);
}

/** Invitations the user may manage: their own, plus their organization's for an ORG_ADMIN. */
function managedInvitationsWhere(user: SessionUser): Prisma.InvitationWhereInput {
  const ownOrg = user.role === 'ORG_ADMIN' && user.organizationId ? [{ organizationId: user.organizationId }] : [];
  return { OR: [{ ownerId: user.id }, ...ownOrg] };
}

const dashboardSelect = {
  id: true,
  slug: true,
  status: true,
  hostNames: true,
  eventType: true,
  eventDate: true,
  venueName: true,
  photoUrl: true,
  updatedAt: true,
} as const;

/** Dashboard list with answer statistics, computed with one GROUP BY for all invitations. */
export async function listMyInvitations(user: SessionUser) {
  const invitations = await prisma.invitation.findMany({
    where: managedInvitationsWhere(user),
    take: MAX_DASHBOARD_INVITATIONS,
    orderBy: [{ eventDate: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }],
    select: dashboardSelect,
  });
  const groups = await prisma.guest.groupBy({
    by: ['invitationId', 'status'],
    where: { invitationId: { in: invitations.map((invitation) => invitation.id) } },
    _count: { _all: true },
    _sum: { guestsCount: true },
  });
  const byInvitation = new Map<string, GuestGroup[]>();
  for (const group of groups) {
    const row: GuestGroup = { status: group.status, count: group._count._all, people: group._sum.guestsCount ?? 0 };
    byInvitation.set(group.invitationId, [...(byInvitation.get(group.invitationId) ?? []), row]);
  }
  return invitations.map((invitation) => ({
    ...invitation,
    summary: summarizeGroups(byInvitation.get(invitation.id) ?? []),
  }));
}

export async function getOwnerInvitation(id: string, user: SessionUser) {
  await findManagedInvitation(id, user);
  return toOwnerDto(await prisma.invitation.findUniqueOrThrow({ where: { id }, select: ownerInvitationSelect }));
}

function toUpdateData(input: InvitationDraftInput) {
  const { eventDate, ...rest } = input;
  return eventDate === undefined ? rest : { ...rest, eventDate: eventDate === null ? null : new Date(eventDate) };
}

/**
 * Template + palette consistency: a palette must belong to the (new) template, and switching
 * the template without a palette falls back to the new template's first palette (null).
 */
async function resolveDesign(invitationId: string, input: InvitationDraftInput): Promise<{ paletteId?: string | null }> {
  if (input.templateId === undefined && input.paletteId === undefined) return {};
  const current = await prisma.invitation.findUniqueOrThrow({
    where: { id: invitationId },
    select: { templateId: true, template: { select: { componentKey: true } } },
  });
  const isTemplateChange = input.templateId !== undefined && input.templateId !== current.templateId;
  const componentKey = isTemplateChange && input.templateId
    ? (await assertTemplateExists(input.templateId)).componentKey
    : current.template.componentKey;
  if (input.paletteId && !isPaletteOf(componentKey, input.paletteId)) {
    throw new HttpError(400, 'This colour palette does not belong to the template');
  }
  return isTemplateChange && input.paletteId === undefined ? { paletteId: null } : {};
}

/** Hiding "made with Chakyruu.kg" is a perk of invitations a partner paid for with a gift. */
async function assertGiftInvitation(invitationId: string): Promise<void> {
  const gift = await prisma.giftCode.count({ where: { invitationId, cancelledAt: null } });
  if (gift === 0) throw new HttpError(400, 'Only invitations gifted by a partner can hide the Chakyruu.kg line');
}

/** Autosave. While the invitation is a draft its slug follows the host names; publishing freezes it. */
export async function updateDraft(id: string, user: SessionUser, input: InvitationDraftInput) {
  const invitation = await findManagedInvitation(id, user);
  const design = await resolveDesign(id, input);
  if (input.hideBranding) await assertGiftInvitation(id);
  const links = await assertPartnerLinks(id, input);
  const followsNames = invitation.status === 'DRAFT' && Boolean(input.hostNames?.trim());

  for (let attempt = 1; ; attempt += 1) {
    const slug = followsNames ? await allocateSlug(input.hostNames ?? '', id) : undefined;
    try {
      const updated = await prisma.invitation.update({
        where: { id },
        data: { ...toUpdateData(input), ...design, ...links, ...(slug ? { slug } : {}) },
        select: ownerInvitationSelect,
      });
      return toOwnerDto(updated);
    } catch (error: unknown) {
      // Another invitation grabbed the same slug between our check and the write.
      if (!slug || !isUniqueViolation(error) || attempt >= MAX_SLUG_RETRIES) throw error;
    }
  }
}

export async function setPhoto(id: string, user: SessionUser, data: Buffer, storage: StorageProvider) {
  const invitation = await findManagedInvitation(id, user);
  const stored = await replaceImage(storage, data, invitation.photoKey, async ({ url, key }) => {
    await prisma.invitation.update({ where: { id }, data: { photoUrl: url, photoKey: key } });
  });
  return { photoUrl: stored.url };
}
