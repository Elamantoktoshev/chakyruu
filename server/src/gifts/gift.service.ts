import { randomInt } from 'node:crypto';
import {
  GIFT_CODE_ALPHABET,
  GIFT_CODE_LENGTH,
  GIFT_VALID_DAYS_AFTER_EVENT,
  type CreateGiftInput,
} from '@chakyruu/shared';
import type { Prisma } from '@prisma/client';
import type { SessionUser } from '../auth/auth.service.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { isUniqueViolation } from '../invitations/slug.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 3;
/** Gifted invitations start at 18:00 Bishkek time; the client can change it in the builder. */
const DEFAULT_EVENT_TIME = 'T18:00:00+06:00';

export function generateGiftCode(): string {
  return Array.from({ length: GIFT_CODE_LENGTH }, () => GIFT_CODE_ALPHABET[randomInt(GIFT_CODE_ALPHABET.length)]).join('');
}

const toDate = (day: string): Date => new Date(`${day}T00:00:00Z`);

export type GiftStatus = 'ACTIVE' | 'IN_PROGRESS' | 'USED' | 'CANCELLED' | 'EXPIRED';

interface GiftRow {
  usedAt: Date | null;
  cancelledAt: Date | null;
  expiresAt: Date;
  invitationId: string | null;
}

export function giftStatus(gift: GiftRow, now = new Date()): GiftStatus {
  if (gift.usedAt) return 'USED';
  if (gift.cancelledAt) return 'CANCELLED';
  if (gift.expiresAt <= now) return 'EXPIRED';
  return gift.invitationId ? 'IN_PROGRESS' : 'ACTIVE';
}

/** Takes one credit atomically: the WHERE clause makes a parallel request see the new balance. */
async function takeCredit(tx: Prisma.TransactionClient, organizationId: string): Promise<void> {
  const { count } = await tx.organization.updateMany({
    where: { id: organizationId, invitationCredits: { gte: 1 } },
    data: { invitationCredits: { decrement: 1 } },
  });
  if (count === 0) throw new HttpError(402, 'Not enough invitation credits — buy a package first');
}

async function assertOwnHall(tx: Prisma.TransactionClient, organizationId: string, hallId: string | undefined) {
  if (!hallId) return;
  const hall = await tx.hall.findFirst({ where: { id: hallId, organizationId }, select: { id: true } });
  if (!hall) throw new HttpError(400, 'Unknown hall');
}

export async function issueGift(organizationId: string, input: CreateGiftInput, createdById: string) {
  const eventDate = toDate(input.eventDate);
  if (eventDate.getTime() < Date.now() - DAY_MS) throw new HttpError(400, 'The toi date is in the past');
  const expiresAt = new Date(eventDate.getTime() + (GIFT_VALID_DAYS_AFTER_EVENT + 1) * DAY_MS);

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await assertOwnHall(tx, organizationId, input.hallId);
        await takeCredit(tx, organizationId);
        const gift = await tx.giftCode.create({
          data: {
            code: generateGiftCode(),
            organizationId,
            clientPhone: input.clientPhone,
            eventDate,
            hallId: input.hallId ?? null,
            expiresAt,
          },
          select: giftSelect,
        });
        await tx.creditTransaction.create({
          data: { organizationId, amount: -1, reason: 'GIFT_ISSUED', giftCodeId: gift.id, createdById },
        });
        return { ...gift, status: giftStatus(gift) };
      });
    } catch (error: unknown) {
      // A code collision (31^8 combinations) is astronomically rare; just draw again.
      if (!isUniqueViolation(error) || attempt >= MAX_CODE_ATTEMPTS) throw error;
    }
  }
}

const giftSelect = {
  id: true,
  code: true,
  clientPhone: true,
  eventDate: true,
  expiresAt: true,
  usedAt: true,
  cancelledAt: true,
  invitationId: true,
  createdAt: true,
  hall: { select: { id: true, name: true } },
} as const;

/** Gives the credit back for a gift that will not be used. Guarded so it can happen only once. */
async function refundGift(tx: Prisma.TransactionClient, giftId: string, organizationId: string): Promise<boolean> {
  const { count } = await tx.giftCode.updateMany({
    where: { id: giftId, organizationId, usedAt: null, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });
  if (count === 0) return false;
  await tx.organization.update({ where: { id: organizationId }, data: { invitationCredits: { increment: 1 } } });
  await tx.creditTransaction.create({ data: { organizationId, amount: 1, reason: 'GIFT_REFUND', giftCodeId: giftId } });
  return true;
}

export async function cancelGift(organizationId: string, giftId: string): Promise<void> {
  const gift = await prisma.giftCode.findFirst({ where: { id: giftId, organizationId }, select: { invitationId: true } });
  if (!gift) throw new HttpError(404, 'Gift not found');
  // Once the client started building with it, the gift belongs to them.
  if (gift.invitationId) throw new HttpError(409, 'The client already started an invitation with this gift');
  const refunded = await prisma.$transaction((tx) => refundGift(tx, giftId, organizationId));
  if (!refunded) throw new HttpError(409, 'This gift is already used or cancelled');
}

/** Expired, unused gifts return their credit. Run lazily whenever the partner looks at gifts. */
export async function refundExpiredGifts(organizationId: string): Promise<void> {
  const expired = await prisma.giftCode.findMany({
    where: { organizationId, usedAt: null, cancelledAt: null, expiresAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const gift of expired) {
    await prisma.$transaction((tx) => refundGift(tx, gift.id, organizationId));
  }
}

export async function listOrgGifts(organizationId: string) {
  await refundExpiredGifts(organizationId);
  const gifts = await prisma.giftCode.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: giftSelect,
  });
  return gifts.map((gift) => ({ ...gift, status: giftStatus(gift) }));
}

/** Unused gifts addressed to the logged-in client's phone. */
export async function listMyGifts(user: SessionUser) {
  return prisma.giftCode.findMany({
    where: { clientPhone: user.phone, usedAt: null, cancelledAt: null, invitationId: null, expiresAt: { gt: new Date() } },
    orderBy: { eventDate: 'asc' },
    select: {
      id: true,
      code: true,
      eventDate: true,
      expiresAt: true,
      hall: { select: { name: true } },
      organization: { select: { name: true, type: true, city: true, logoUrl: true } },
    },
  });
}

/** Invitation fields pre-filled from the partner who gave the gift. */
export function giftPrefill(
  gift: { eventDate: Date; hallId: string | null },
  org: { id: string; type: string; name: string; address: string | null; mapUrl: string | null },
) {
  const eventDate = new Date(`${gift.eventDate.toISOString().slice(0, 10)}${DEFAULT_EVENT_TIME}`);
  if (org.type === 'VENUE') {
    return { eventDate, venueOrgId: org.id, venueName: org.name, venueAddress: org.address, venueMapUrl: org.mapUrl, hallId: gift.hallId };
  }
  return org.type === 'TAMADA' ? { eventDate, tamadaOrgId: org.id } : { eventDate };
}

/**
 * Finds a usable gift of this client. Not found / someone else's / cancelled / expired → 404,
 * already attached to an invitation → 409.
 */
export async function findRedeemableGift(tx: Prisma.TransactionClient, code: string, user: SessionUser) {
  const gift = await tx.giftCode.findFirst({
    where: { code, clientPhone: user.phone, usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      eventDate: true,
      hallId: true,
      invitationId: true,
      organization: { select: { id: true, type: true, name: true, address: true, mapUrl: true } },
    },
  });
  if (!gift) throw new HttpError(404, 'Gift code not found');
  if (gift.invitationId) throw new HttpError(409, 'This gift code is already used');
  return gift;
}

/** Links the gift to the new invitation; the WHERE guard makes parallel redeems lose. */
export async function attachGift(tx: Prisma.TransactionClient, giftId: string, invitationId: string): Promise<void> {
  const { count } = await tx.giftCode.updateMany({ where: { id: giftId, invitationId: null }, data: { invitationId } });
  if (count === 0) throw new HttpError(409, 'This gift code is already used');
}

/** Free publish with an attached, still valid gift. Returns false when there is no usable gift. */
export async function publishWithGift(invitationId: string): Promise<boolean> {
  const gift = await prisma.giftCode.findFirst({
    where: { invitationId, usedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!gift) return false;
  await prisma.$transaction(async (tx) => {
    const used = await tx.giftCode.updateMany({ where: { id: gift.id, usedAt: null }, data: { usedAt: new Date() } });
    const published = await tx.invitation.updateMany({
      where: { id: invitationId, status: { not: 'PUBLISHED' } },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    if (used.count === 0 || published.count === 0) throw new HttpError(409, 'Invitation is already published');
  });
  return true;
}
