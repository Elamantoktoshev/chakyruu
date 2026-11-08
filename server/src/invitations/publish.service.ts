import { INVITATION_PRICE_CODE, type MissingForPublish, type PaymentProviderId } from '@chakyruu/shared';
import type { SessionUser } from '../auth/auth.service.js';
import { publishWithGift } from '../gifts/gift.service.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { transferComment } from '../payments/transferComment.js';
import { createPendingPayment, runCheckout, type CheckoutView } from '../payments/checkout.service.js';
import type { PaymentGateway } from '../payments/gateway.js';
import { announcePublished } from '../notify/announce.js';
import { getTemplatePublishPrice } from '../pricing/price.service.js';
import { findManagedInvitation } from './access.js';

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

/** Where the payer returns from the provider and where links in emails / SMS point. */
export interface PublishContext {
  gateway: PaymentGateway;
  appUrl: string;
}

/**
 * Creates the PENDING payment under a row lock on the invitation, so a double tap on "Pay"
 * cannot start two checkouts: the second request waits, sees the first payment and gets 409.
 * The provider is called after this short transaction, never inside it.
 */
async function startInvitationPayment(
  invitationId: string,
  provider: PaymentProviderId,
  amountTyiyn: number,
  gateway: PaymentGateway,
) {
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
    return createPendingPayment(
      { purpose: 'INVITATION', invitationId, priceCode: INVITATION_PRICE_CODE, amount: amountTyiyn, provider, gateway: gateway.id },
      tx,
    );
  });
}

export type PublishResult =
  | { status: 'PUBLISHED'; slug: string; paymentId: string | null }
  | { status: 'PENDING'; slug: string; paymentId: string; checkout: CheckoutView };

export async function publishInvitation(
  id: string,
  user: SessionUser,
  provider: PaymentProviderId,
  { gateway, appUrl }: PublishContext,
): Promise<PublishResult> {
  const invitation = await findManagedInvitation(id, user);
  if (invitation.status === 'PUBLISHED') throw new HttpError(409, 'Invitation is already published');
  const missing = await missingForPublish(id);
  if (missing.length > 0) throw new HttpError(400, 'Invitation is not ready to publish', missing);
  // A partner's gift pays for it: no checkout at all.
  if (await publishWithGift(id)) {
    void announcePublished(id, true);
    return { status: 'PUBLISHED', slug: invitation.slug, paymentId: null };
  }

  const { template, hostNames, eventDate } = await prisma.invitation.findUniqueOrThrow({
    where: { id },
    select: { hostNames: true, eventDate: true, template: { select: { priceSom: true } } },
  });
  const price = await getTemplatePublishPrice(template.priceSom);
  const payment = await startInvitationPayment(id, provider, price.amountTyiyn, gateway);
  const outcome = await runCheckout(gateway, {
    payment,
    amountTyiyn: price.amountTyiyn,
    method: provider,
    description: `Chakyruu.kg: ${invitation.slug}`,
    // A ready invitation always has a date; today is only a safety net.
    comment: transferComment(hostNames, eventDate ?? new Date()),
    appUrl,
  });
  if (outcome.status === 'SUCCEEDED' || !outcome.checkout) {
    return { status: 'PUBLISHED', slug: invitation.slug, paymentId: outcome.paymentId };
  }
  return { status: 'PENDING', slug: invitation.slug, paymentId: outcome.paymentId, checkout: outcome.checkout };
}
