import {
  PUBLISH_PRICE_TYIYN,
  summarizeGroups,
  type GuestGroup,
  type InvitationDraftInput,
  type MissingForPublish,
  type PaymentProviderId,
} from '@chakyruu/shared';
import type { Prisma } from '@prisma/client';
import type { SessionUser } from '../auth/auth.service.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import type { PaymentProvider } from '../payments/payment.provider.js';
import { detectImageType } from '../storage/image.js';
import type { StorageProvider } from '../storage/storage.provider.js';
import { findManagedInvitation } from './access.js';
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
  publishedAt: true,
  updatedAt: true,
  template: { select: { id: true, name: true, type: true, config: true } },
} as const;

async function assertTemplateExists(templateId: string) {
  const template = await prisma.template.findUnique({ where: { id: templateId }, select: { id: true, type: true } });
  if (!template) throw new HttpError(400, 'Unknown template');
  return template;
}

export async function createDraft(user: SessionUser, templateId: string) {
  const template = await assertTemplateExists(templateId);
  return prisma.invitation.create({
    data: {
      slug: temporaryDraftSlug(),
      templateId: template.id,
      eventType: template.type,
      ownerId: user.id,
      organizationId: user.organizationId,
    },
    select: ownerInvitationSelect,
  });
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
  return prisma.invitation.findUniqueOrThrow({ where: { id }, select: ownerInvitationSelect });
}

function toUpdateData(input: InvitationDraftInput) {
  const { eventDate, ...rest } = input;
  return eventDate === undefined ? rest : { ...rest, eventDate: eventDate === null ? null : new Date(eventDate) };
}

/** Autosave. While the invitation is a draft its slug follows the host names; publishing freezes it. */
export async function updateDraft(id: string, user: SessionUser, input: InvitationDraftInput) {
  const invitation = await findManagedInvitation(id, user);
  if (input.templateId) await assertTemplateExists(input.templateId);
  const followsNames = invitation.status === 'DRAFT' && Boolean(input.hostNames?.trim());

  for (let attempt = 1; ; attempt += 1) {
    const slug = followsNames ? await allocateSlug(input.hostNames ?? '', id) : undefined;
    try {
      return await prisma.invitation.update({
        where: { id },
        data: { ...toUpdateData(input), ...(slug ? { slug } : {}) },
        select: ownerInvitationSelect,
      });
    } catch (error: unknown) {
      // Another invitation grabbed the same slug between our check and the write.
      if (!slug || !isUniqueViolation(error) || attempt >= MAX_SLUG_RETRIES) throw error;
    }
  }
}

export async function setPhoto(id: string, user: SessionUser, data: Buffer, storage: StorageProvider) {
  const invitation = await findManagedInvitation(id, user);
  const type = detectImageType(data);
  if (!type) throw new HttpError(400, 'Only JPEG, PNG or WebP images are allowed');

  const stored = await storage.saveImage(data, type);
  const updated = await prisma.invitation.update({
    where: { id },
    data: { photoUrl: stored.url, photoKey: stored.key },
    select: { photoUrl: true },
  });
  if (invitation.photoKey) {
    await storage.remove(invitation.photoKey).catch((error: unknown) => {
      console.error(`[storage] could not delete replaced photo ${invitation.photoKey}`, error);
    });
  }
  return updated;
}

async function missingForPublish(id: string): Promise<MissingForPublish[]> {
  const fields = await prisma.invitation.findUniqueOrThrow({
    where: { id },
    select: { hostNames: true, eventDate: true, venueName: true },
  });
  return [
    ...(fields.hostNames.trim().length < 2 ? (['hostNames'] as const) : []),
    ...(fields.eventDate ? [] : (['eventDate'] as const)),
    ...(fields.venueName.trim().length < 2 ? (['venueName'] as const) : []),
  ];
}

/** A redirect checkout the guest abandoned stops blocking a new attempt after this long. */
const PENDING_PAYMENT_TTL_MS = 30 * 60 * 1000;

/**
 * Creates the PENDING payment under a row lock on the invitation, so a double tap on "Pay"
 * cannot start two checkouts: the second request waits, sees the first payment and gets 409.
 * The provider is called after this short transaction, never inside it.
 */
async function startPayment(invitationId: string, provider: PaymentProviderId): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Invitation" WHERE id = ${invitationId} FOR UPDATE`;
    const active = await tx.payment.findFirst({
      where: {
        invitationId,
        OR: [{ status: 'SUCCEEDED' }, { status: 'PENDING', createdAt: { gt: new Date(Date.now() - PENDING_PAYMENT_TTL_MS) } }],
      },
      select: { id: true },
    });
    if (active) throw new HttpError(409, 'A payment for this invitation is already in progress');
    return tx.payment.create({ data: { invitationId, amount: PUBLISH_PRICE_TYIYN, provider }, select: { id: true } });
  });
}

export type PublishResult =
  | { status: 'PUBLISHED'; slug: string }
  | { status: 'PENDING'; redirectUrl: string };

export async function publishInvitation(
  id: string,
  user: SessionUser,
  provider: PaymentProviderId,
  payments: PaymentProvider,
): Promise<PublishResult> {
  const invitation = await findManagedInvitation(id, user);
  if (invitation.status === 'PUBLISHED') throw new HttpError(409, 'Invitation is already published');
  const missing = await missingForPublish(id);
  if (missing.length > 0) throw new HttpError(400, 'Invitation is not ready to publish', missing);

  const payment = await startPayment(id, provider);

  let checkout;
  try {
    checkout = await payments.createCheckout({
      paymentId: payment.id,
      amountTyiyn: PUBLISH_PRICE_TYIYN,
      provider,
      description: `Chakyruu.kg: ${invitation.slug}`,
    });
  } catch (error: unknown) {
    console.error(`[payments] checkout failed for payment ${payment.id}`, error);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    throw new HttpError(502, 'Payment provider is unavailable, please try again');
  }

  if (checkout.kind === 'redirect') {
    await prisma.payment.update({ where: { id: payment.id }, data: { externalId: checkout.externalId } });
    return { status: 'PENDING', redirectUrl: checkout.url };
  }

  const [, published] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCEEDED', externalId: checkout.externalId },
    }),
    prisma.invitation.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      select: { slug: true },
    }),
  ]);
  return { status: 'PUBLISHED', slug: published.slug };
}
