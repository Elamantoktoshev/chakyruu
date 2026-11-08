import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createAdminUser, createOrgFixture, createTemplateFixtures, resetDatabase } from '../../test/db.js';
import { FAKE_SIGNATURE_HEADER, FakeGateway } from './fake.gateway.js';
import { ManualGateway } from './manual.gateway.js';

const CLIENT = '+996555000111';
const STRANGER = '+996555000222';
const TAMADA_ADMIN = '+996700000020';
const VENUE_ADMIN = '+996700000010';
const ADMIN = '+996700000099';
const MBANK_RECEIVER = '+996700555666';

let ctx: TestContext;
let gateway: FakeGateway;

beforeEach(async () => {
  gateway = new FakeGateway({ mode: 'redirect', webhookSecret: 'test-webhook-secret' });
  ctx = createTestContext(gateway);
  await resetDatabase();
  await createTemplateFixtures();
  await createAdminUser(ADMIN);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function readyInvitation(agent: Awaited<ReturnType<typeof loginAgent>>): Promise<string> {
  const { id } = (await agent.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201)).body.data;
  await agent
    .patch(`/api/my/invitations/${id}`)
    .send({ hostNames: 'Асан & Айгүл', venueName: 'Тойкана', eventDate: '2027-06-15T17:00:00+06:00' })
    .expect(200);
  return id as string;
}

function sendWebhook(externalId: string, status: 'SUCCEEDED' | 'FAILED', signature?: string) {
  const signed = gateway.signedWebhook(externalId, status);
  return request(buildTestApp(ctx))
    .post('/api/payments/webhook/fake')
    .set('Content-Type', 'application/json')
    .set(FAKE_SIGNATURE_HEADER, signature ?? signed.signature)
    .send(signed.body);
}

const invitationStatus = async (id: string) => (await prisma.invitation.findUniqueOrThrow({ where: { id } })).status;

describe('invitation payment through a redirect provider', () => {
  it('stays a draft until the webhook arrives, then publishes exactly once', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const res = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    expect(res.body.data).toMatchObject({ status: 'PENDING', checkout: { kind: 'redirect' } });
    expect(res.body.data.checkout.url).toContain(`/pay/result/${res.body.data.paymentId}`);
    expect(await invitationStatus(id)).toBe('DRAFT');

    const externalId = `fake_${res.body.data.paymentId}`;
    await sendWebhook(externalId, 'SUCCEEDED').expect(200);
    await sendWebhook(externalId, 'SUCCEEDED').expect(200);

    expect(await invitationStatus(id)).toBe('PUBLISHED');
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.body.data.paymentId } });
    expect(payment).toMatchObject({ status: 'SUCCEEDED', purpose: 'INVITATION', gateway: 'fake' });
    expect(payment.paidAt).not.toBeNull();
    expect(payment.rawResponse).toMatchObject({ externalId, status: 'SUCCEEDED' });
  });

  it('rejects a webhook with a bad signature and changes nothing', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const { paymentId } = (await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200)).body.data;
    await sendWebhook(`fake_${paymentId}`, 'SUCCEEDED', 'deadbeef').expect(401);
    expect(await invitationStatus(id)).toBe('DRAFT');
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe('PENDING');
  });

  it('answers 404 for an unknown payment or another gateway path', async () => {
    await sendWebhook('fake_nope', 'SUCCEEDED').expect(404);
    await request(buildTestApp(ctx)).post('/api/payments/webhook/mbank').send('{}').expect(404);
  });

  it('marks a failed payment and allows paying again', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const { paymentId } = (await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200)).body.data;
    await sendWebhook(`fake_${paymentId}`, 'FAILED').expect(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe('FAILED');
    await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'ELSOM' }).expect(200);
  });

  it('lets the payer poll the status, which also asks the provider (lost webhook)', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const { paymentId } = (await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200)).body.data;
    expect((await client.get(`/api/my/payments/${paymentId}`).expect(200)).body.data.status).toBe('PENDING');

    gateway.setStatus(`fake_${paymentId}`, 'SUCCEEDED');
    const polled = await client.get(`/api/my/payments/${paymentId}`).expect(200);
    expect(polled.body.data).toMatchObject({ status: 'SUCCEEDED', invitationSlug: 'asan-aigul' });
    expect(await invitationStatus(id)).toBe('PUBLISHED');

    const stranger = await loginAgent(ctx, STRANGER);
    await stranger.get(`/api/my/payments/${paymentId}`).expect(404);
  });
});

describe('credit packages', () => {
  it('adds the package credits once when the payment succeeds', async () => {
    const { orgId } = await createOrgFixture({ type: 'TAMADA', name: 'Нурбек', adminPhone: TAMADA_ADMIN, credits: 5 });
    const tamada = await loginAgent(ctx, TAMADA_ADMIN);
    const res = await tamada.post('/api/partner/credits/purchase').send({ priceCode: 'TAMADA_PACK_10', provider: 'ODENGI' }).expect(200);
    expect(res.body.data.status).toBe('PENDING');
    const externalId = `fake_${res.body.data.paymentId}`;

    await Promise.all([sendWebhook(externalId, 'SUCCEEDED'), sendWebhook(externalId, 'SUCCEEDED'), sendWebhook(externalId, 'SUCCEEDED')]);

    expect((await prisma.organization.findUniqueOrThrow({ where: { id: orgId } })).invitationCredits).toBe(15);
    expect(await prisma.creditTransaction.findMany({ where: { organizationId: orgId, reason: 'PURCHASE' } })).toHaveLength(1);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: res.body.data.paymentId } });
    expect(payment).toMatchObject({ purpose: 'CREDIT_PACKAGE', amount: 400_000, credits: 10, organizationId: orgId });
  });

  it('sells only the price list of the partner type, and only to partners', async () => {
    await createOrgFixture({ type: 'VENUE', name: 'Ала-Тоо', adminPhone: VENUE_ADMIN });
    const venue = await loginAgent(ctx, VENUE_ADMIN);
    await venue.post('/api/partner/credits/purchase').send({ priceCode: 'TAMADA_PACK_10', provider: 'MBANK' }).expect(400);
    await venue.post('/api/partner/credits/purchase').send({ priceCode: 'INVITATION_PUBLISH', provider: 'MBANK' }).expect(400);
    await venue.post('/api/partner/credits/purchase').send({ priceCode: 'VENUE_PACK_30', provider: 'MBANK' }).expect(200);

    const client = await loginAgent(ctx, CLIENT);
    await client.post('/api/partner/credits/purchase').send({ priceCode: 'VENUE_PACK_10', provider: 'MBANK' }).expect(403);
  });
});

describe('manual MBank transfers confirmed by the admin', () => {
  beforeEach(() => {
    ctx = createTestContext(new ManualGateway(MBANK_RECEIVER));
  });

  it('shows transfer instructions and publishes after the admin confirms, once', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const id = await readyInvitation(client);
    const res = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    expect(res.body.data.checkout).toEqual({
      kind: 'manual',
      instructions: { receiver: MBANK_RECEIVER, amountSom: 499, reference: expect.stringMatching(/^CH-[A-Z2-9]{5}$/) },
    });
    const { paymentId } = res.body.data;
    expect((await client.get(`/api/my/payments/${paymentId}`).expect(200)).body.data.checkout.kind).toBe('manual');

    await client.post(`/api/admin/payments/${paymentId}/confirm`).expect(403);
    const admin = await loginAgent(ctx, ADMIN);
    const pending = (await admin.get('/api/admin/payments?status=PENDING').expect(200)).body.data;
    expect(pending).toEqual([expect.objectContaining({ id: paymentId, reference: res.body.data.checkout.instructions.reference })]);

    await admin.post(`/api/admin/payments/${paymentId}/confirm`).expect(200);
    await admin.post(`/api/admin/payments/${paymentId}/confirm`).expect(409);
    expect(await invitationStatus(id)).toBe('PUBLISHED');
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { phone: ADMIN } });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).confirmedById).toBe(adminUser.id);
  });

  it('never accepts webhooks for manual payments', async () => {
    await request(buildTestApp(ctx)).post('/api/payments/webhook/manual').send('{}').expect(401);
  });
});
