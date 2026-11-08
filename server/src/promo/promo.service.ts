import { normalizePromoCode, type PromoCreateInput } from '@chakyruu/shared';
import type { Prisma } from '@prisma/client';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { isUniqueViolation } from '../invitations/slug.service.js';

export interface UsablePromo {
  id: string;
  code: string;
  discountPercent: number;
}

const promoSelect = {
  id: true,
  code: true,
  discountPercent: true,
  maxUses: true,
  usedCount: true,
  expiresAt: true,
  isActive: true,
  note: true,
  createdAt: true,
} as const;

export type AdminPromoCode = Prisma.PromoCodeGetPayload<{ select: typeof promoSelect }>;

/** Why a code does not work, for the payer: unknown/off, expired, or all uses taken. */
export type PromoRejection = 'not_found' | 'expired' | 'used_up';

const rejected = (reason: PromoRejection) => new HttpError(400, 'Promo code is not valid', { reason });

/** The code as it can be used right now, or a 400 that says why not. */
export async function findUsablePromo(rawCode: string, now: Date = new Date()): Promise<UsablePromo> {
  const promo = await prisma.promoCode.findUnique({ where: { code: normalizePromoCode(rawCode) }, select: promoSelect });
  if (!promo || !promo.isActive) throw rejected('not_found');
  if (promo.expiresAt && promo.expiresAt <= now) throw rejected('expired');
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) throw rejected('used_up');
  return { id: promo.id, code: promo.code, discountPercent: promo.discountPercent };
}

/** Called inside the fulfilment transaction: a code is "used" only by a payment that succeeded. */
export async function countPromoUse(tx: Prisma.TransactionClient, promoCodeId: string): Promise<void> {
  await tx.promoCode.update({ where: { id: promoCodeId }, data: { usedCount: { increment: 1 } } });
}

export async function listPromoCodes(): Promise<AdminPromoCode[]> {
  return prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' }, select: promoSelect });
}

export async function createPromoCode(input: PromoCreateInput): Promise<AdminPromoCode> {
  try {
    return await prisma.promoCode.create({
      data: {
        code: input.code,
        discountPercent: input.discountPercent,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        note: input.note || null,
      },
      select: promoSelect,
    });
  } catch (error: unknown) {
    if (isUniqueViolation(error)) throw new HttpError(409, 'This promo code already exists');
    throw error;
  }
}

export async function setPromoActive(id: string, isActive: boolean): Promise<AdminPromoCode> {
  const { count } = await prisma.promoCode.updateMany({ where: { id }, data: { isActive } });
  if (count === 0) throw new HttpError(404, 'Promo code not found');
  return prisma.promoCode.findUniqueOrThrow({ where: { id }, select: promoSelect });
}
