import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { notifyAdmin } from './notifier.js';

const TYIYN_PER_SOM = 100;

/** After an invitation goes public (paid or by a gift code). Never throws into the caller. */
export async function announcePublished(invitationId: string, isGift: boolean): Promise<void> {
  try {
    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId }, select: { hostNames: true, slug: true } });
    if (invitation) notifyAdmin({ type: 'invitation_published', hostNames: invitation.hostNames, slug: invitation.slug, isGift });
  } catch (error: unknown) {
    logger.warn({ err: error }, '[notify] could not load the published invitation');
  }
}

/** After fulfilPayment did the PENDING → SUCCEEDED step: money arrived (and maybe a page went public). */
export async function announcePaid(paymentId: string): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { amount: true, provider: true, purpose: true, credits: true, invitationId: true, organization: { select: { name: true } } },
    });
    if (!payment) return;
    const description =
      payment.purpose === 'CREDIT_PACKAGE'
        ? `${payment.organization?.name ?? '—'}: +${payment.credits ?? 0} кредит`
        : 'Чакыруу жарыялоо';
    notifyAdmin({ type: 'payment_succeeded', amountSom: payment.amount / TYIYN_PER_SOM, method: payment.provider, description });
    if (payment.purpose === 'INVITATION' && payment.invitationId) await announcePublished(payment.invitationId, false);
  } catch (error: unknown) {
    logger.warn({ err: error }, '[notify] could not load the paid payment');
  }
}
