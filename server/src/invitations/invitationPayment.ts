import { INVITATION_PRICE_CODE, type PaymentProviderId } from '@chakyruu/shared';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { createPendingPayment, type CheckoutView } from '../payments/checkout.service.js';

/** A redirect checkout the payer abandoned stops counting after this long. */
const PENDING_PAYMENT_TTL_MS = 30 * 60 * 1000;
/** A payment this young without a checkout yet is still being set up by a parallel request. */
const PREPARING_GRACE_MS = 60 * 1000;
const CHECKOUT_KINDS = new Set(['redirect', 'qr', 'manual']);

export interface InvitationPaymentRequest {
  invitationId: string;
  provider: PaymentProviderId;
  amountTyiyn: number;
  gatewayId: string;
  promoCodeId: string | null;
}

export type StartedPayment =
  /** Same bank, amount and code as an open payment: show its instructions again. */
  | { kind: 'resume'; paymentId: string; checkout: CheckoutView }
  | { kind: 'new'; payment: { id: string; reference: string } };

function storedCheckout(raw: unknown): CheckoutView | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const kind = (raw as { kind?: unknown }).kind;
  return typeof kind === 'string' && CHECKOUT_KINDS.has(kind) ? (raw as CheckoutView) : null;
}

/**
 * Starts the payment under a row lock on the invitation, so parallel taps are serialized.
 * - already paid → 409 (reason "paid");
 * - an open payment with the same bank, amount and promo code → its instructions again;
 * - any other open payment (another bank, a promo code applied since) → replaced by a new one.
 * The provider is called after this short transaction, never inside it.
 */
export async function startOrResumeInvitationPayment(request: InvitationPaymentRequest): Promise<StartedPayment> {
  const { invitationId, provider, amountTyiyn, gatewayId, promoCodeId } = request;
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Invitation" WHERE id = ${invitationId} FOR UPDATE`;
    const now = Date.now();
    const paid = await tx.payment.findFirst({ where: { invitationId, status: 'SUCCEEDED' }, select: { id: true } });
    if (paid) throw new HttpError(409, 'This invitation is already paid', { reason: 'paid' });

    const open = await tx.payment.findFirst({
      where: { invitationId, status: 'PENDING', createdAt: { gt: new Date(now - PENDING_PAYMENT_TTL_MS) } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, provider: true, amount: true, gateway: true, promoCodeId: true, rawResponse: true, createdAt: true },
    });
    if (open) {
      const checkout = storedCheckout(open.rawResponse);
      const isSameRequest =
        open.provider === provider && open.amount === amountTyiyn && open.gateway === gatewayId && open.promoCodeId === promoCodeId;
      if (isSameRequest && checkout) return { kind: 'resume', paymentId: open.id, checkout };
      if (!checkout && now - open.createdAt.getTime() < PREPARING_GRACE_MS) {
        throw new HttpError(409, 'The payment is still being prepared, try again in a moment', { reason: 'in_progress' });
      }
    }
    // Whatever is still open for this invitation is superseded by the new attempt.
    await tx.payment.updateMany({
      where: { invitationId, status: 'PENDING' },
      data: { status: 'FAILED', rawResponse: { replaced: true } },
    });
    const payment = await createPendingPayment(
      { purpose: 'INVITATION', invitationId, priceCode: INVITATION_PRICE_CODE, amount: amountTyiyn, provider, gateway: gatewayId, promoCodeId },
      tx,
    );
    return { kind: 'new', payment };
  });
}
