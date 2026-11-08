import type { StatsPeriod } from '@chakyruu/shared';
import { prisma } from '../lib/prisma.js';
import { TYIYN_PER_SOM } from '../pricing/price.service.js';

const PERIOD_DAYS: Readonly<Record<StatsPeriod, number>> = { day: 1, week: 7, month: 30 };
const DAY_MS = 24 * 60 * 60 * 1000;
const PERCENT = 100;

export interface AdminStats {
  period: StatsPeriod;
  since: string;
  newUsers: number;
  invitationsCreated: number;
  invitationsPublished: number;
  /** Paid in this period, in som. */
  revenueSom: number;
  paidPayments: number;
  /** Of the invitations created in this period, the share already published (0–100, one decimal). */
  conversionPercent: number;
}

export function conversionPercent(published: number, created: number): number {
  if (created === 0) return 0;
  return Math.round((published / created) * PERCENT * 10) / 10;
}

/** Dashboard numbers for /admin: one query per figure, all in parallel. */
export async function getAdminStats(period: StatsPeriod, now: Date = new Date()): Promise<AdminStats> {
  const since = new Date(now.getTime() - PERIOD_DAYS[period] * DAY_MS);
  const [newUsers, invitationsCreated, invitationsPublished, createdThenPublished, payments] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.invitation.count({ where: { createdAt: { gte: since } } }),
    prisma.invitation.count({ where: { publishedAt: { gte: since } } }),
    prisma.invitation.count({ where: { createdAt: { gte: since }, publishedAt: { not: null } } }),
    prisma.payment.aggregate({ where: { status: 'SUCCEEDED', paidAt: { gte: since } }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  return {
    period,
    since: since.toISOString(),
    newUsers,
    invitationsCreated,
    invitationsPublished,
    revenueSom: (payments._sum.amount ?? 0) / TYIYN_PER_SOM,
    paidPayments: payments._count._all,
    conversionPercent: conversionPercent(createdThenPublished, invitationsCreated),
  };
}
