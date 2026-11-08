import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createAdminUser, createTemplateFixtures, resetDatabase } from '../../test/db.js';
import { ManualGateway } from '../payments/manual.gateway.js';

const CLIENT = '+996555000111';
const ADMIN = '+996700000099';
const RECEIVERS = { MBANK: '+996700555666', SIMBANK: '+996555444333' };
const DAY_MS = 24 * 60 * 60 * 1000;

let ctx: TestContext;

beforeEach(async () => {
  ctx = createTestContext(new ManualGateway(RECEIVERS));
  await resetDatabase();
  await createTemplateFixtures();
  await createAdminUser(ADMIN);
});

afterAll(async () => {
  await prisma.$disconnect();
});

type Agent = Awaited<ReturnType<typeof loginAgent>>;

async function readyInvitation(agent: Agent): Promise<string> {
  const { id } = (await agent.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201)).body.data;
  await agent
    .patch(`/api/my/invitations/${id}`)
    .send({ hostNames: 'Асан & Айгүл', venueName: 'Тойкана', eventDate: '2027-06-15T17:00:00+06:00' })
    .expect(200);
  return id as string;
}

async function createPromo(body: Record<string, unknown>) {
  const admin = await loginAgent(ctx, ADMIN);
  return (await admin.post('/api/admin/promo-codes').send(body).expect(200)).body.data;
}

describe('paying again after going back', () => {
  it('shows the same transfer instructions instead of "already published"', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const first = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    const again = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);

    expect(again.body.data).toEqual(first.body.data);
    expect(await prisma.payment.count({ where: { invitationId: id } })).toBe(1);
  });

  it('replaces the open payment when another bank is picked', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const mbank = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    const simbank = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'SIMBANK' }).expect(200);

    expect(simbank.body.data.checkout.instructions).toMatchObject({ bank: 'SIMBANK', receiver: RECEIVERS.SIMBANK });
    expect(simbank.body.data.paymentId).not.toBe(mbank.body.data.paymentId);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: mbank.body.data.paymentId } })).status).toBe('FAILED');
  });

  it('says "already paid" only after a successful payment', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const { paymentId } = (await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200)).body.data;
    const admin = await loginAgent(ctx, ADMIN);
    await admin.post(`/api/admin/payments/${paymentId}/confirm`).expect(200);

    const res = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(409);
    expect(res.body.error.details).toEqual({ reason: 'paid' });
  });
});

describe('promo codes', () => {
  it('previews and applies a percent discount; the use counts once the payment is confirmed', async () => {
    const promo = await createPromo({ code: 'toi2027', discountPercent: 20, maxUses: 5, note: 'Instagram' });
    expect(promo).toMatchObject({ code: 'TOI2027', discountPercent: 20, maxUses: 5, usedCount: 0, isActive: true });

    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const preview = await client.post(`/api/my/invitations/${id}/promo`).send({ code: ' toi2027 ' }).expect(200);
    expect(preview.body.data).toEqual({ code: 'TOI2027', discountPercent: 20, priceSom: 499, finalPriceSom: 399 });

    const res = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK', promoCode: 'toi2027' }).expect(200);
    expect(res.body.data.checkout.instructions.amountSom).toBe(399);
    expect(await prisma.promoCode.findUniqueOrThrow({ where: { code: 'TOI2027' } })).toMatchObject({ usedCount: 0 });

    const admin = await loginAgent(ctx, ADMIN);
    await admin.post(`/api/admin/payments/${res.body.data.paymentId}/confirm`).expect(200);
    expect(await prisma.promoCode.findUniqueOrThrow({ where: { code: 'TOI2027' } })).toMatchObject({ usedCount: 1 });
  });

  it('publishes for free with a 100 % code, without any bank', async () => {
    await createPromo({ code: 'FREE', discountPercent: 100 });
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);

    const res = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK', promoCode: 'free' }).expect(200);
    expect(res.body.data).toMatchObject({ status: 'PUBLISHED' });
    expect(await prisma.payment.findFirstOrThrow({ where: { invitationId: id } })).toMatchObject({ amount: 0, gateway: 'promo', status: 'SUCCEEDED' });
    expect((await prisma.invitation.findUniqueOrThrow({ where: { id } })).status).toBe('PUBLISHED');
    expect(await prisma.promoCode.findUniqueOrThrow({ where: { code: 'FREE' } })).toMatchObject({ usedCount: 1 });
  });

  it('a new code replaces the open payment at the old price', async () => {
    await createPromo({ code: 'HALF', discountPercent: 50 });
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    const res = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK', promoCode: 'HALF' }).expect(200);
    expect(res.body.data.checkout.instructions.amountSom).toBe(250);
    expect(await prisma.payment.count({ where: { invitationId: id, status: 'PENDING' } })).toBe(1);
  });

  it.each([
    ['unknown', {}, 'NOPE', 'not_found'],
    ['switched off', { isActive: false }, 'OFF', 'not_found'],
    ['expired', { expiresAt: new Date(Date.now() - DAY_MS) }, 'OLD', 'expired'],
    ['used up', { maxUses: 1, usedCount: 1 }, 'ONCE', 'used_up'],
  ])('refuses a code that is %s', async (_label, fields, code, reason) => {
    if (code !== 'NOPE') await prisma.promoCode.create({ data: { code, discountPercent: 30, ...fields } });
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const preview = await client.post(`/api/my/invitations/${id}/promo`).send({ code }).expect(400);
    expect(preview.body.error.details).toEqual({ reason });
    await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK', promoCode: code }).expect(400);
    expect(await prisma.payment.count()).toBe(0);
  });

  it('admin can list, switch off and not duplicate codes; others cannot touch them', async () => {
    const promo = await createPromo({ code: 'TOI', discountPercent: 10 });
    const admin = await loginAgent(ctx, ADMIN);
    await admin.post('/api/admin/promo-codes').send({ code: 'toi', discountPercent: 15 }).expect(409);
    const off = await admin.patch(`/api/admin/promo-codes/${promo.id}`).send({ isActive: false }).expect(200);
    expect(off.body.data.isActive).toBe(false);
    expect((await admin.get('/api/admin/promo-codes').expect(200)).body.data).toHaveLength(1);

    const client = await loginAgent(ctx, CLIENT);
    await client.get('/api/admin/promo-codes').expect(403);
    await client.post('/api/admin/promo-codes').send({ code: 'HACK', discountPercent: 100 }).expect(403);
  });
});
