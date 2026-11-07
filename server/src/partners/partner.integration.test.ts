import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { TINY_PNG, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createOrgFixture, createTemplateFixtures, resetDatabase } from '../../test/db.js';

const VENUE_ADMIN = '+996700000010';
const TAMADA_ADMIN = '+996700000020';
const CLIENT = '+996555000111';

let ctx: TestContext;
let venueId: string;
let tamadaId: string;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createTemplateFixtures();
  ({ orgId: venueId } = await createOrgFixture({ type: 'VENUE', name: 'Ала-Тоо', adminPhone: VENUE_ADMIN, credits: 3 }));
  ({ orgId: tamadaId } = await createOrgFixture({ type: 'TAMADA', name: 'Нурбек', adminPhone: TAMADA_ADMIN, catalogStatus: 'PUBLISHED' }));
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('partner profile', () => {
  it('updates the public profile but not the balance or moderation', async () => {
    const venue = await loginAgent(ctx, VENUE_ADMIN);
    const res = await venue.patch('/api/partner/profile').send({ city: ' ош ', instagram: '@ala_too', whatsapp: '+996700111222' }).expect(200);
    expect(res.body.data).toMatchObject({ id: venueId, city: 'Ош', instagram: 'ala_too', invitationCredits: 3 });
    await venue.patch('/api/partner/profile').send({ invitationCredits: 999 }).expect(400);
    await venue.patch('/api/partner/profile').send({ catalogStatus: 'PUBLISHED' }).expect(400);
  });

  it('uploads a logo', async () => {
    const venue = await loginAgent(ctx, VENUE_ADMIN);
    const res = await venue.post('/api/partner/logo').attach('logo', TINY_PNG, 'logo.png').expect(200);
    expect(res.body.data.logoUrl).toMatch(/^\/uploads\//);
  });
});

describe('venue halls', () => {
  it('manages halls of its own venue only', async () => {
    const venue = await loginAgent(ctx, VENUE_ADMIN);
    const hall = (await venue.post('/api/partner/halls').send({ name: 'Чоң зал', capacity: 400 }).expect(201)).body.data;
    await venue.patch(`/api/partner/halls/${hall.id}`).send({ name: 'Ак зал', capacity: 350 }).expect(200);

    const other = await createOrgFixture({ type: 'VENUE', name: 'Башка', adminPhone: '+996700000099' });
    const foreignHall = await prisma.hall.create({ data: { organizationId: other.orgId, name: 'Чужой', capacity: 10 } });
    await venue.delete(`/api/partner/halls/${foreignHall.id}`).expect(404);
    await venue.patch(`/api/partner/halls/${foreignHall.id}`).send({ name: 'x', capacity: 1 }).expect(404);
    expect(await prisma.hall.count({ where: { id: foreignHall.id } })).toBe(1);
  });

  it('is not available to a tamada', async () => {
    const tamada = await loginAgent(ctx, TAMADA_ADMIN);
    await tamada.post('/api/partner/halls').send({ name: 'Зал', capacity: 100 }).expect(400);
  });
});

describe('tamada profile', () => {
  it('edits the profile and the busy-dates calendar', async () => {
    const tamada = await loginAgent(ctx, TAMADA_ADMIN);
    await tamada
      .patch('/api/partner/tamada')
      .send({ displayName: 'Нурбек Асанов', languages: ['KY', 'RU', 'UZ'], priceFromSom: 25000, videoUrls: ['https://youtu.be/abc'] })
      .expect(200);
    await tamada.put('/api/partner/busy-dates/2027-06-15').expect(200);
    await tamada.put('/api/partner/busy-dates/2027-06-15').expect(200);

    const profile = (await tamada.get('/api/partner/profile').expect(200)).body.data;
    expect(profile.tamadaProfile).toMatchObject({ displayName: 'Нурбек Асанов', priceFromSom: 25000 });
    expect(profile.busyDates).toEqual(['2027-06-15']);

    await tamada.delete('/api/partner/busy-dates/2027-06-15').expect(200);
    expect((await tamada.get('/api/partner/profile').expect(200)).body.data.busyDates).toEqual([]);
  });

  it('is not available to a venue', async () => {
    const venue = await loginAgent(ctx, VENUE_ADMIN);
    await venue.patch('/api/partner/tamada').send({ displayName: 'X' }).expect(400);
  });
});

describe('partner statistics', () => {
  it('counts gifts, invitations, people coming and tamada clicks', async () => {
    const venue = await loginAgent(ctx, VENUE_ADMIN);
    const gift = (await venue.post('/api/partner/gifts').send({ clientPhone: CLIENT, eventDate: '2030-06-15' }).expect(201)).body.data;
    await venue.post('/api/partner/gifts').send({ clientPhone: '+996555000222', eventDate: '2030-07-01' }).expect(201);

    const client = await loginAgent(ctx, CLIENT);
    const { id } = (await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID, giftCode: gift.code }).expect(201)).body.data;
    await client.patch(`/api/my/invitations/${id}`).send({ hostNames: 'Асан & Айгүл', tamadaOrgId: tamadaId }).expect(200);
    await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    await prisma.guest.create({ data: { invitationId: id, name: 'Конок', token: 'stats_token_000000001', status: 'ATTENDING', guestsCount: 4 } });
    await prisma.tamadaClick.create({ data: { organizationId: tamadaId, invitationId: id } });

    const venueStats = (await venue.get('/api/partner/stats').expect(200)).body.data;
    expect(venueStats).toMatchObject({ invitations: 1, peopleComing: 4, gifts: { issued: 2, USED: 1, ACTIVE: 1 } });
    expect(venueStats.calendar).toEqual([expect.objectContaining({ hostNames: 'Асан & Айгүл' })]);
    expect(JSON.stringify(venueStats)).not.toContain('Конок');

    const tamada = await loginAgent(ctx, TAMADA_ADMIN);
    const tamadaStats = (await tamada.get('/api/partner/stats').expect(200)).body.data;
    expect(tamadaStats).toMatchObject({ invitations: 1, peopleComing: 4, tamadaClicks: { total: 1 } });
  });

  it('shows the credit ledger', async () => {
    const venue = await loginAgent(ctx, VENUE_ADMIN);
    await venue.post('/api/partner/gifts').send({ clientPhone: CLIENT, eventDate: '2030-06-15' }).expect(201);
    const credits = (await venue.get('/api/partner/credits').expect(200)).body.data;
    expect(credits.balance).toBe(2);
    expect(credits.ledger).toEqual([expect.objectContaining({ amount: -1, reason: 'GIFT_ISSUED' })]);
  });
});
