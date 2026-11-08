import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { announcePaid } from '../notify/announce.js';
import { countPromoUse } from '../promo/promo.service.js';

interface FulfillDetails {
  externalId?: string;
  raw?: unknown;
  /** ADMIN who confirmed a manual transfer. */
  confirmedById?: string;
}

/** Provider payloads are stored for audits; anything non-JSON is dropped rather than crashing. */
function toJson(raw: unknown): Prisma.InputJsonValue | undefined {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

/**
 * The single place where money turns into a product: publishes the invitation or adds the credits.
 * Only the PENDING → SUCCEEDED transition does anything, so repeated or parallel webhooks,
 * status polls and admin confirmations are safe. Returns true if this call did the fulfilment.
 */
export async function fulfillPayment(paymentId: string, details: FulfillDetails = {}): Promise<boolean> {
  const didFulfil = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const { count } = await tx.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: {
        status: 'SUCCEEDED',
        paidAt: now,
        rawResponse: toJson(details.raw),
        confirmedById: details.confirmedById ?? null,
        ...(details.externalId ? { externalId: details.externalId } : {}),
      },
    });
    if (count === 0) return false;

    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: { purpose: true, invitationId: true, organizationId: true, credits: true, promoCodeId: true },
    });
    if (payment.promoCodeId) await countPromoUse(tx, payment.promoCodeId);
    if (payment.purpose === 'INVITATION' && payment.invitationId) {
      await tx.invitation.updateMany({
        where: { id: payment.invitationId, status: { not: 'PUBLISHED' } },
        data: { status: 'PUBLISHED', publishedAt: now },
      });
    }
    if (payment.purpose === 'CREDIT_PACKAGE' && payment.organizationId && payment.credits) {
      await tx.organization.update({
        where: { id: payment.organizationId },
        data: { invitationCredits: { increment: payment.credits } },
      });
      await tx.creditTransaction.create({
        data: { organizationId: payment.organizationId, amount: payment.credits, reason: 'PURCHASE', paymentId },
      });
    }
    return true;
  });
  // Outside the transaction: the admin hears about it only once it is committed.
  if (didFulfil) void announcePaid(paymentId);
  return didFulfil;
}

export async function markPaymentFailed(paymentId: string, raw?: unknown): Promise<void> {
  await prisma.payment.updateMany({ where: { id: paymentId, status: 'PENDING' }, data: { status: 'FAILED', rawResponse: toJson(raw) } });
}
