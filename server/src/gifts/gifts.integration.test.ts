import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createOrgFixture, createTemplateFixtures, resetDatabase } from '../../test/db.js';

const VENUE_ADMIN = '+996700000010';
const CLIENT = '+996555000111';
const OTHER_CLIENT = '+996555000222';

let ctx: TestContext;
let venueId: string;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createTemplateFixtures();
  ({ orgId: venueId } = await createOrgFixture({ type: 'VENUE', name: 'Ала-Тоо', adminPhone: VENUE_ADMIN, credits: 2 }));
});

afterAll(async () => {
  await prisma.$disconnect();
});

const credits = async () => (await prisma.organization.findUniqueOrThrow({ where: { id: venueId } })).invitationCredits;

async function issueGift(agent: Awaited<ReturnType<typeof loginAgent>>, clientPhone = CLIENT) {
  const res = await agent.post('/api/partner/gifts').send({ clientPhone, eventDate: '2027-06-15' }).expect(201);
  return res.body.data as { id: string; code: string };
}

describe('issuing gifts', () => {
  it('reserves one credit per gift and records it in the ledger', async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const gift = await issueGift(partner);
    expect(gift.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(await credits()).toBe(1);
    const ledger = await prisma.creditTransaction.findMany({ where: { organizationId: venueId } });
    expect(ledger).toEqual([expect.objectContaining({ amount: -1, reason: 'GIFT_ISSUED', giftCodeId: gift.id })]);
  });

  it('refuses to issue a gift with a zero balance', async () => {
    await prisma.organization.update({ where: { id: venueId }, data: { invitationCredits: 0 } });
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const res = await partner.post('/api/partner/gifts').send({ clientPhone: CLIENT, eventDate: '2027-06-15' }).expect(402);
    expect(res.body.error.message).toMatch(/credits/i);
    expect(await prisma.giftCode.count()).toBe(0);
  });

  it('never goes below zero under parallel requests', async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const results = await Promise.all(
      [1, 2, 3, 4].map(() => partner.post('/api/partner/gifts').send({ clientPhone: CLIENT, eventDate: '2027-06-15' })),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(await credits()).toBe(0);
  });

  it('refunds the credit when an unused gift is cancelled', async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const gift = await issueGift(partner);
    await partner.post(`/api/partner/gifts/${gift.id}/cancel`).expect(200);
    expect(await credits()).toBe(2);
    await partner.post(`/api/partner/gifts/${gift.id}/cancel`).expect(409);
    expect(await credits()).toBe(2);
  });

  it('is only available to partner accounts', async () => {
    const client = await loginAgent(ctx, CLIENT);
    await client.post('/api/partner/gifts').send({ clientPhone: CLIENT, eventDate: '2027-06-15' }).expect(403);
    await client.get('/api/partner/profile').expect(403);
    await request(buildTestApp(ctx)).get('/api/partner/profile').expect(401);
  });
});

describe('redeeming gifts', () => {
  it('shows the gift to the client with that phone and pre-fills the venue', async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const gift = await issueGift(partner);
    const client = await loginAgent(ctx, CLIENT);

    const mine = await client.get('/api/my/gifts').expect(200);
    expect(mine.body.data).toEqual([expect.objectContaining({ code: gift.code, organization: expect.objectContaining({ name: 'Ала-Тоо', type: 'VENUE' }) })]);

    const draft = await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: gift.code }).expect(201);
    expect(draft.body.data).toMatchObject({
      venueName: 'Ала-Тоо',
      venueAddress: 'Ош ш., Ленин көч. 1',
      venueMapUrl: 'https://2gis.kg/osh/firm/1',
      venueOrgId: venueId,
      isGift: true,
    });
    expect(draft.body.data.eventDate).toMatch(/^2027-06-15/);
  });

  it('publishes for free and marks the code used', async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const gift = await issueGift(partner);
    const client = await loginAgent(ctx, CLIENT);
    const { id } = (await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: gift.code }).expect(201)).body.data;
    await client.patch(`/api/my/invitations/${id}`).send({ hostNames: 'Асан & Айгүл' }).expect(200);

    const res = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    expect(res.body.data.status).toBe('PUBLISHED');
    expect(await prisma.payment.count()).toBe(0);
    expect((await prisma.giftCode.findUniqueOrThrow({ where: { id: gift.id } })).usedAt).not.toBeNull();
    expect(await credits()).toBe(1);
  });

  it('forbids using the same code twice', async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const gift = await issueGift(partner);
    const client = await loginAgent(ctx, CLIENT);
    await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: gift.code }).expect(201);
    await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: gift.code }).expect(409);

    // Parallel taps on "use gift" must still create only one invitation.
    const second = await issueGift(partner, OTHER_CLIENT);
    const other = await loginAgent(ctx, OTHER_CLIENT);
    const parallel = await Promise.all(
      [1, 2, 3].map(() => other.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: second.code })),
    );
    expect(parallel.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await prisma.invitation.count({ where: { giftCode: { id: second.id } } })).toBe(1);
  });

  it('does not let another phone number use the code', async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const gift = await issueGift(partner);
    const stranger = await loginAgent(ctx, OTHER_CLIENT);
    await stranger.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: gift.code }).expect(404);
    expect((await stranger.get('/api/my/gifts').expect(200)).body.data).toEqual([]);
  });

  it('rejects cancelled and expired codes', async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const cancelled = await issueGift(partner);
    await partner.post(`/api/partner/gifts/${cancelled.id}/cancel`).expect(200);
    const expired = await issueGift(partner);
    await prisma.giftCode.update({ where: { id: expired.id }, data: { expiresAt: new Date('2020-01-01') } });

    const client = await loginAgent(ctx, CLIENT);
    for (const code of [cancelled.code, expired.code]) {
      await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: code }).expect(404);
    }
  });

  it("keeps the gifting partner on the invitation (its credit must not advertise a competitor)", async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const gift = await issueGift(partner);
    const { orgId: rival } = await createOrgFixture({ type: 'VENUE', name: 'Башка', adminPhone: '+996700000013', catalogStatus: 'PUBLISHED' });
    const client = await loginAgent(ctx, CLIENT);
    const { id } = (await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: gift.code }).expect(201)).body.data;

    await client.patch(`/api/my/invitations/${id}`).send({ venueOrgId: rival }).expect(400);
    await client.patch(`/api/my/invitations/${id}`).send({ venueOrgId: null }).expect(400);
    // Other fields, and a tamada from the catalogue, stay editable.
    await client.patch(`/api/my/invitations/${id}`).send({ hostNames: 'Асан & Айгүл' }).expect(200);
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id } })).venueOrgId).toBe(venueId);
    // A gift may hide the "made with Chakyruu.kg" line.
    await client.patch(`/api/my/invitations/${id}`).send({ hideBranding: true }).expect(200);
  });

  it('does not give the partner access to the client guests', async () => {
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    const gift = await issueGift(partner);
    const client = await loginAgent(ctx, CLIENT);
    const { id } = (await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: gift.code }).expect(201)).body.data;
    await partner.get(`/api/my/invitations/${id}`).expect(403);
    await partner.get(`/api/my/invitations/${id}/guests`).expect(403);
  });
});
