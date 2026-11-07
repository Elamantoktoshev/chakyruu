import type { Prisma } from '@prisma/client';
import { giftStatus, refundExpiredGifts, type GiftStatus } from '../gifts/gift.service.js';
import { prisma } from '../lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 30;
const CALENDAR_LIMIT = 200;

/** Published invitations that show this partner (gifted or picked by the client). */
const linkedInvitationsWhere = (orgId: string): Prisma.InvitationWhereInput => ({
  status: 'PUBLISHED',
  OR: [{ venueOrgId: orgId }, { tamadaOrgId: orgId }],
});

async function giftCounts(orgId: string): Promise<Record<GiftStatus, number>> {
  const gifts = await prisma.giftCode.findMany({
    where: { organizationId: orgId },
    select: { usedAt: true, cancelledAt: true, expiresAt: true, invitationId: true },
  });
  const now = new Date();
  return gifts.reduce<Record<GiftStatus, number>>(
    (acc, gift) => {
      const status = giftStatus(gift, now);
      return { ...acc, [status]: acc[status] + 1 };
    },
    { ACTIVE: 0, IN_PROGRESS: 0, USED: 0, CANCELLED: 0, EXPIRED: 0 },
  );
}

/**
 * Partner dashboard numbers. Only aggregates and the public part of invitations
 * (names, date, hall) are returned — never the client's guest list.
 */
export async function getPartnerStats(orgId: string) {
  await refundExpiredGifts(orgId);
  const today = new Date(new Date().toISOString().slice(0, 10));
  const recentSince = new Date(Date.now() - RECENT_DAYS * DAY_MS);

  const [gifts, invitationCount, people, clicksTotal, clicksRecent, calendar] = await Promise.all([
    giftCounts(orgId),
    prisma.invitation.count({ where: linkedInvitationsWhere(orgId) }),
    prisma.guest.aggregate({
      where: { status: 'ATTENDING', invitation: linkedInvitationsWhere(orgId) },
      _sum: { guestsCount: true },
    }),
    prisma.tamadaClick.count({ where: { organizationId: orgId } }),
    prisma.tamadaClick.count({ where: { organizationId: orgId, createdAt: { gte: recentSince } } }),
    prisma.invitation.findMany({
      where: { ...linkedInvitationsWhere(orgId), eventDate: { gte: today } },
      orderBy: { eventDate: 'asc' },
      take: CALENDAR_LIMIT,
      select: { slug: true, hostNames: true, eventDate: true, eventType: true, hall: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    gifts: { ...gifts, issued: Object.values(gifts).reduce((sum, n) => sum + n, 0) },
    invitations: invitationCount,
    peopleComing: people._sum.guestsCount ?? 0,
    tamadaClicks: { total: clicksTotal, last30Days: clicksRecent },
    calendar,
  };
}
