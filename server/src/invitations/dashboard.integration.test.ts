import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { createInvitationFixture, resetDatabase } from '../../test/db.js';

const OWNER = '+996700000001';
const STRANGER = '+996555123456';

let ctx: TestContext;
let invitationId: string;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  invitationId = await createInvitationFixture({ slug: 'aibek-aizada', ownerPhone: OWNER, organizationId: null });
  await prisma.guest.createMany({
    data: [
      { invitationId, name: 'Асель', token: 'dash_token_asel_000001', status: 'ATTENDING', guestsCount: 3 },
      { invitationId, name: 'Бакыт', token: 'dash_token_bakyt_00001', status: 'DECLINED', guestsCount: 0 },
      { invitationId, name: 'Гүлнара', token: 'dash_token_gulnara_001', status: 'INVITED' },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/my/invitations', () => {
  it('lists my invitations with answer statistics', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const res = await owner.get('/api/my/invitations').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: invitationId,
      slug: 'aibek-aizada',
      status: 'PUBLISHED',
      summary: { totalGuests: 4, attending: 2, declined: 1, noAnswer: 1, totalPeople: 5 },
    });
  });

  it("does not show other people's invitations", async () => {
    const stranger = await loginAgent(ctx, STRANGER);
    expect((await stranger.get('/api/my/invitations').expect(200)).body.data).toEqual([]);
  });

  it('shows an org admin the invitations of their organization', async () => {
    const org = await prisma.organization.create({ data: { name: 'Тойкана', slug: 'toikana' } });
    await createInvitationFixture({ slug: 'org-toi', ownerPhone: '+996700000002', organizationId: org.id });
    await prisma.user.create({ data: { phone: STRANGER, role: 'ORG_ADMIN', organizationId: org.id } });

    const admin = await loginAgent(ctx, STRANGER);
    const slugs = (await admin.get('/api/my/invitations').expect(200)).body.data.map((i: { slug: string }) => i.slug);
    expect(slugs).toEqual(['org-toi']);
  });
});
