import { discountedSom, type MissingForPublish, type PaymentProviderId } from '@chakyruu/shared';
import type { SessionUser } from '../auth/auth.service.js';
import { publishWithGift } from '../gifts/gift.service.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { transferComment } from '../payments/transferComment.js';
import { runCheckout, type CheckoutView } from '../payments/checkout.service.js';
import { fulfillPayment } from '../payments/fulfill.service.js';
import { findUsablePromo } from '../promo/promo.service.js';
import { startOrResumeInvitationPayment } from './invitationPayment.js';
import type { PaymentGateway } from '../payments/gateway.js';
import { announcePublished } from '../notify/announce.js';
import { TYIYN_PER_SOM, getTemplatePublishPrice } from '../pricing/price.service.js';
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

/** Where the payer returns from the provider and where links in emails / SMS point. */
export interface PublishContext {
  gateway: PaymentGateway;
  appUrl: string;
}

/** Gateway name stored on payments a 100 % promo code covers completely (no money moves). */
const PROMO_GATEWAY_ID = 'promo';

export type PublishResult =
  | { status: 'PUBLISHED'; slug: string; paymentId: string | null }
  | { status: 'PENDING'; slug: string; paymentId: string; checkout: CheckoutView };

export interface PublishOptions {
  provider: PaymentProviderId;
  promoCode?: string;
}

/** What the pay page shows after "Колдонуу": the code works, and the new price. */
export interface PromoPreview {
  code: string;
  discountPercent: number;
  priceSom: number;
  finalPriceSom: number;
}

async function invitationPrice(id: string) {
  const { template, hostNames, eventDate } = await prisma.invitation.findUniqueOrThrow({
    where: { id },
    select: { hostNames: true, eventDate: true, template: { select: { priceSom: true } } },
  });
  return { price: await getTemplatePublishPrice(template.priceSom), hostNames, eventDate };
}

export async function previewPromo(id: string, user: SessionUser, code: string): Promise<PromoPreview> {
  await findManagedInvitation(id, user);
  const [{ price }, promo] = await Promise.all([invitationPrice(id), findUsablePromo(code)]);
  return { code: promo.code, discountPercent: promo.discountPercent, priceSom: price.amountSom, finalPriceSom: discountedSom(price.amountSom, promo.discountPercent) };
}

export async function publishInvitation(
  id: string,
  user: SessionUser,
  { provider, promoCode }: PublishOptions,
  { gateway, appUrl }: PublishContext,
): Promise<PublishResult> {
  const invitation = await findManagedInvitation(id, user);
  if (invitation.status === 'PUBLISHED') throw new HttpError(409, 'Invitation is already published', { reason: 'paid' });
  const missing = await missingForPublish(id);
  if (missing.length > 0) throw new HttpError(400, 'Invitation is not ready to publish', missing);
  // A partner's gift pays for it: no checkout at all.
  if (await publishWithGift(id)) {
    void announcePublished(id, true);
    return { status: 'PUBLISHED', slug: invitation.slug, paymentId: null };
  }

  const { price, hostNames, eventDate } = await invitationPrice(id);
  const promo = promoCode ? await findUsablePromo(promoCode) : null;
  const amountTyiyn = promo ? discountedSom(price.amountSom, promo.discountPercent) * TYIYN_PER_SOM : price.amountTyiyn;
  const isFree = amountTyiyn === 0;
  const started = await startOrResumeInvitationPayment({
    invitationId: id,
    provider,
    amountTyiyn,
    gatewayId: isFree ? PROMO_GATEWAY_ID : gateway.id,
    promoCodeId: promo?.id ?? null,
  });
  if (started.kind === 'resume') {
    return { status: 'PENDING', slug: invitation.slug, paymentId: started.paymentId, checkout: started.checkout };
  }
  if (isFree) {
    // The code covers everything: no bank involved, publish right away.
    await fulfillPayment(started.payment.id, { raw: { promoCode: promo?.code } });
    return { status: 'PUBLISHED', slug: invitation.slug, paymentId: started.payment.id };
  }

  const outcome = await runCheckout(gateway, {
    payment: started.payment,
    amountTyiyn,
    method: provider,
    description: `Chakyruu.kg: ${invitation.slug}${promo ? ` (${promo.code} −${promo.discountPercent}%)` : ''}`,
    // A ready invitation always has a date; today is only a safety net.
    comment: transferComment(hostNames, eventDate ?? new Date()),
    appUrl,
  });
  if (outcome.status === 'SUCCEEDED' || !outcome.checkout) {
    return { status: 'PUBLISHED', slug: invitation.slug, paymentId: outcome.paymentId };
  }
  return { status: 'PENDING', slug: invitation.slug, paymentId: outcome.paymentId, checkout: outcome.checkout };
}
