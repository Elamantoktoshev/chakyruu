import { packageAudience, type PaymentProviderId } from '@chakyruu/shared';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { getActivePrice } from '../pricing/price.service.js';
import { createPendingPayment, runCheckout, type CheckoutOutcome } from './checkout.service.js';
import type { PaymentGateway } from './gateway.js';

/** A partner buys an invitation package; credits are added when the payment succeeds. */
export async function purchaseCredits(
  organizationId: string,
  priceCode: string,
  method: PaymentProviderId,
  { gateway, appUrl }: { gateway: PaymentGateway; appUrl: string },
): Promise<CheckoutOutcome> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { type: true, name: true } });
  const price = await getActivePrice(priceCode);
  const row = await prisma.price.findUniqueOrThrow({ where: { code: priceCode }, select: { audience: true } });
  // A tamada cannot buy the venue price list and vice versa; single-invitation prices are not packages.
  if (!price.credits || row.audience !== packageAudience(org.type)) throw new HttpError(400, 'This package is not available for your account');

  const payment = await createPendingPayment({
    purpose: 'CREDIT_PACKAGE',
    organizationId,
    priceCode,
    credits: price.credits,
    amount: price.amountTyiyn,
    provider: method,
    gateway: gateway.id,
  });
  return runCheckout(gateway, {
    payment,
    amountTyiyn: price.amountTyiyn,
    method,
    description: `Chakyruu.kg: ${price.credits} × ${org.name}`,
    appUrl,
  });
}
