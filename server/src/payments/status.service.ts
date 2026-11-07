import type { SessionUser } from '../auth/auth.service.js';
import { canManageInvitation } from '../auth/policy.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { fulfillPayment, markPaymentFailed } from './fulfill.service.js';
import type { PaymentGateway } from './gateway.js';
import { logger } from '../lib/logger.js';

const statusSelect = {
  id: true,
  purpose: true,
  status: true,
  amount: true,
  gateway: true,
  externalId: true,
  reference: true,
  rawResponse: true,
  credits: true,
  organizationId: true,
  invitation: { select: { slug: true, ownerId: true, organizationId: true } },
} as const;

/** The payer (invitation owner / partner admin) or an ADMIN; everyone else gets 404. */
function canSeePayment(
  user: SessionUser,
  payment: { organizationId: string | null; invitation: { ownerId: string; organizationId: string | null } | null },
): boolean {
  if (user.role === 'ADMIN') return true;
  if (payment.invitation) return canManageInvitation(user, payment.invitation);
  return user.role === 'ORG_ADMIN' && payment.organizationId !== null && user.organizationId === payment.organizationId;
}

/** Asks the provider when a redirect/QR payment is still pending (covers a lost webhook). */
async function refreshFromGateway(payment: { id: string; gateway: string; externalId: string | null }, gateway: PaymentGateway) {
  if (payment.gateway !== gateway.id || gateway.id === 'manual' || !payment.externalId) return;
  try {
    const status = await gateway.checkStatus(payment.externalId);
    if (status === 'SUCCEEDED') await fulfillPayment(payment.id, { raw: { checkStatus: status } });
    if (status === 'FAILED') await markPaymentFailed(payment.id, { checkStatus: status });
  } catch (error: unknown) {
    logger.error({ err: error }, `[payments] checkStatus failed for payment ${payment.id}`);
  }
}

export async function getPaymentStatus(paymentId: string, user: SessionUser, gateway: PaymentGateway) {
  const found = await prisma.payment.findUnique({ where: { id: paymentId }, select: statusSelect });
  if (!found || !canSeePayment(user, found)) throw new HttpError(404, 'Payment not found');
  if (found.status === 'PENDING') await refreshFromGateway(found, gateway);

  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, select: statusSelect });
  return {
    id: payment.id,
    purpose: payment.purpose,
    status: payment.status,
    amountSom: payment.amount / 100,
    reference: payment.reference,
    credits: payment.credits,
    invitationSlug: payment.invitation?.slug ?? null,
    // What the payer still has to do (manual instructions / redirect), only while pending.
    checkout: payment.status === 'PENDING' ? payment.rawResponse : null,
  };
}

export async function listPaymentsForAdmin(status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | undefined) {
  return prisma.payment.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      purpose: true,
      status: true,
      amount: true,
      provider: true,
      gateway: true,
      reference: true,
      credits: true,
      createdAt: true,
      paidAt: true,
      invitation: { select: { slug: true, hostNames: true, owner: { select: { phone: true } } } },
      organization: { select: { name: true, phone: true } },
    },
  });
}

/** ADMIN saw the transfer arrive: fulfil once; a second confirmation is a 409. */
export async function confirmPaymentByAdmin(paymentId: string, adminId: string): Promise<void> {
  const exists = await prisma.payment.count({ where: { id: paymentId } });
  if (exists === 0) throw new HttpError(404, 'Payment not found');
  const fulfilled = await fulfillPayment(paymentId, { confirmedById: adminId, raw: { confirmedManually: true } });
  if (!fulfilled) throw new HttpError(409, 'This payment is already processed');
}
