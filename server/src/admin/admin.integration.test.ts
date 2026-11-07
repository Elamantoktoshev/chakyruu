import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createAdminUser, createOrgFixture, createTemplateFixtures, resetDatabase } from '../../test/db.js';

const ADMIN = '+996700000099';
const VENUE_ADMIN = '+996700000010';
const CLIENT = '+996555000111';

let ctx: TestContext;
let venueId: string;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createTemplateFixtures();
  await createAdminUser(ADMIN);
  ({ orgId: venueId } = await createOrgFixture({ type: 'VENUE', name: 'Ала-Тоо', adminPhone: VENUE_ADMIN }));
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('access', () => {
  it('is closed to clients and partners (403) and to anonymous users (401)', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const partner = await loginAgent(ctx, VENUE_ADMIN);
    for (const agent of [client, partner]) {
      await agent.get('/api/admin/organizations').expect(403);
      await agent.post(`/api/admin/organizations/${venueId}/credits`).send({ amount: 100 }).expect(403);
      await agent.patch('/api/admin/prices/INVITATION_PUBLISH').send({ amountSom: 1 }).expect(403);
    }
    await request(buildTestApp(ctx)).get('/api/admin/organizations').expect(401);
  });
});

describe('organizations', () => {
  it('lists organizations filtered by type with their admins', async () => {
    await createOrgFixture({ type: 'TAMADA', name: 'Нурбек', adminPhone: '+996700000020' });
    const admin = await loginAgent(ctx, ADMIN);
    const venues = (await admin.get('/api/admin/organizations?type=VENUE').expect(200)).body.data;
    expect(venues).toEqual([expect.objectContaining({ name: 'Ала-Тоо', adminPhones: [VENUE_ADMIN] })]);
    expect((await admin.get('/api/admin/organizations').expect(200)).body.data).toHaveLength(2);
  });

  it('grants credits and records who did it', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    const res = await admin.post(`/api/admin/organizations/${venueId}/credits`).send({ amount: 30 }).expect(200);
    expect(res.body.data.balance).toBe(30);
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { phone: ADMIN } });
    expect(await prisma.creditTransaction.findFirst({ where: { organizationId: venueId } })).toMatchObject({
      amount: 30,
      reason: 'ADMIN_GRANT',
      createdById: adminUser.id,
    });
    await admin.post(`/api/admin/organizations/${venueId}/credits`).send({ amount: 0 }).expect(400);
  });

  it('moderates the tamada catalogue', async () => {
    const { orgId: tamadaId } = await createOrgFixture({ type: 'TAMADA', name: 'Нурбек', adminPhone: '+996700000020' });
    const admin = await loginAgent(ctx, ADMIN);
    const app = buildTestApp(ctx);
    expect((await request(app).get('/api/public/tamadas').expect(200)).body.data).toEqual([]);
    await admin.patch(`/api/admin/organizations/${tamadaId}`).send({ catalogStatus: 'PUBLISHED' }).expect(200);
    expect((await request(app).get('/api/public/tamadas').expect(200)).body.data).toHaveLength(1);
    await admin.patch(`/api/admin/organizations/${tamadaId}`).send({ catalogStatus: 'HIDDEN' }).expect(200);
    expect((await request(app).get('/api/public/tamadas').expect(200)).body.data).toEqual([]);
  });
});

describe('leads', () => {
  async function submitLead(type: 'VENUE' | 'TAMADA', phone: string) {
    await request(buildTestApp(ctx))
      .post('/api/public/partner-leads')
      .send({ type, name: 'Бакыт', phone, venueName: type === 'TAMADA' ? 'Бакыт тамада' : 'Жаңы тойкана', city: 'бишкек' })
      .expect(201);
    return prisma.partnerLead.findFirstOrThrow({ where: { phone } });
  }

  it('creates an organization and an ORG_ADMIN from a lead, once', async () => {
    const lead = await submitLead('TAMADA', '+996555333444');
    const admin = await loginAgent(ctx, ADMIN);
    await admin.patch(`/api/admin/leads/${lead.id}`).send({ status: 'CONTACTED' }).expect(200);

    const org = (await admin.post(`/api/admin/leads/${lead.id}/convert`).send({}).expect(201)).body.data;
    expect(org).toMatchObject({ name: 'Бакыт тамада', type: 'TAMADA' });
    const stored = await prisma.organization.findUniqueOrThrow({ where: { id: org.id }, include: { tamadaProfile: true } });
    expect(stored).toMatchObject({ city: 'Бишкек', catalogStatus: 'HIDDEN' });
    expect(stored.tamadaProfile).not.toBeNull();
    expect(await prisma.user.findUniqueOrThrow({ where: { phone: '+996555333444' } })).toMatchObject({ role: 'ORG_ADMIN', organizationId: org.id });
    expect(await prisma.partnerLead.findUniqueOrThrow({ where: { id: lead.id } })).toMatchObject({ status: 'CONVERTED', organizationId: org.id });

    await admin.post(`/api/admin/leads/${lead.id}/convert`).send({}).expect(409);
    await admin.patch(`/api/admin/leads/${lead.id}`).send({ status: 'NEW' }).expect(404);
  });

  it("does not take over a phone that already runs another organization", async () => {
    const lead = await submitLead('VENUE', VENUE_ADMIN);
    const admin = await loginAgent(ctx, ADMIN);
    await admin.post(`/api/admin/leads/${lead.id}/convert`).send({}).expect(409);
    expect(await prisma.user.findUniqueOrThrow({ where: { phone: VENUE_ADMIN } })).toMatchObject({ organizationId: venueId });
  });

  it('filters leads by status', async () => {
    await submitLead('VENUE', '+996555333444');
    const admin = await loginAgent(ctx, ADMIN);
    expect((await admin.get('/api/admin/leads?status=NEW').expect(200)).body.data).toHaveLength(1);
    expect((await admin.get('/api/admin/leads?status=CONVERTED').expect(200)).body.data).toEqual([]);
  });
});

describe('prices', () => {
  it('serves prices from the database and uses them at checkout', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    await admin.patch('/api/admin/prices/INVITATION_PUBLISH').send({ amountSom: 900 }).expect(200);
    const prices = (await request(buildTestApp(ctx)).get('/api/public/prices').expect(200)).body.data;
    expect(prices).toContainEqual(expect.objectContaining({ code: 'INVITATION_PUBLISH', amountSom: 900 }));

    const client = await loginAgent(ctx, CLIENT);
    const { id } = (await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201)).body.data;
    await client
      .patch(`/api/my/invitations/${id}`)
      .send({ hostNames: 'Асан & Айгүл', venueName: 'Тойкана', eventDate: '2027-06-15T17:00:00+06:00' })
      .expect(200);
    await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    expect((await prisma.payment.findFirstOrThrow({ where: { invitationId: id } })).amount).toBe(90_000);
  });

  it('hides a switched-off price and refuses to sell it', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    await admin.patch('/api/admin/prices/VENUE_PACK_100').send({ active: false }).expect(200);
    const codes = (await request(buildTestApp(ctx)).get('/api/public/prices').expect(200)).body.data.map((p: { code: string }) => p.code);
    expect(codes).not.toContain('VENUE_PACK_100');
    await admin.patch('/api/admin/prices/NOPE').send({ active: false }).expect(404);
  });
});
