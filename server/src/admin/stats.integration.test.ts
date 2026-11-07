import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createAdminUser, createTemplateFixtures, resetDatabase } from '../../test/db.js';
import { conversionPercent, getAdminStats } from './stats.service.js';

const NOW = new Date('2027-03-10T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
const ADMIN = '+996700000099';

let ctx: TestContext;

async function invitation(slug: string, createdAt: Date, publishedAt: Date | null) {
  const owner = await prisma.user.upsert({ where: { phone: '+996700000001' }, update: {}, create: { phone: '+996700000001', createdAt: daysAgo(100) } });
  return prisma.invitation.create({
    data: { slug, templateId: TEST_TEMPLATE_ID, ownerId: owner.id, createdAt, publishedAt, status: publishedAt ? 'PUBLISHED' : 'DRAFT' },
  });
}

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createTemplateFixtures();
  const recent = await invitation('recent-paid', daysAgo(2), daysAgo(1));
  await invitation('recent-draft', daysAgo(3), null);
  await invitation('old-published', daysAgo(40), daysAgo(5));
  await prisma.user.createMany({ data: [{ phone: '+996555000001', createdAt: daysAgo(0.5) }, { phone: '+996555000002', createdAt: daysAgo(20) }] });
  await prisma.payment.createMany({
    data: [
      { invitationId: recent.id, amount: 70_000, provider: 'MBANK', status: 'SUCCEEDED', paidAt: daysAgo(1) },
      { invitationId: recent.id, amount: 70_000, provider: 'MBANK', status: 'FAILED', createdAt: daysAgo(1) },
      { invitationId: recent.id, amount: 500_000, provider: 'MBANK', status: 'SUCCEEDED', paidAt: daysAgo(25) },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('getAdminStats', () => {
  it('counts users, invitations, revenue and conversion for the week', async () => {
    expect(await getAdminStats('week', NOW)).toMatchObject({
      period: 'week',
      newUsers: 1,
      invitationsCreated: 2,
      invitationsPublished: 2,
      revenueSom: 700,
      paidPayments: 1,
      conversionPercent: 50,
    });
  });

  it('widens to the month and narrows to the day', async () => {
    expect(await getAdminStats('month', NOW)).toMatchObject({ newUsers: 2, revenueSom: 5700, paidPayments: 2 });
    expect(await getAdminStats('day', NOW)).toMatchObject({ newUsers: 1, invitationsCreated: 0, conversionPercent: 0 });
  });
});

describe('conversionPercent', () => {
  it('rounds to one decimal and handles zero', () => {
    expect(conversionPercent(1, 3)).toBe(33.3);
    expect(conversionPercent(0, 0)).toBe(0);
  });
});

describe('GET /api/admin/stats', () => {
  it('is for the admin only and validates the period', async () => {
    await createAdminUser(ADMIN);
    const admin = await loginAgent(ctx, ADMIN);
    const res = await admin.get('/api/admin/stats?period=month').expect(200);
    expect(res.body.data.period).toBe('month');
    await admin.get('/api/admin/stats?period=year').expect(400);
    const owner = await loginAgent(ctx, '+996700000002');
    await owner.get('/api/admin/stats').expect(403);
  });
});
