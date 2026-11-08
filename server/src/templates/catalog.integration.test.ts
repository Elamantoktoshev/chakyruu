import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createTemplateFixtures, resetDatabase } from '../../test/db.js';

const OWNER = '+996700000001';
const PREMIUM_ID = 'tpl-premium';
const HIDDEN_ID = 'tpl-hidden';
const COMPLETE = { hostNames: 'Айбек & Айзада', venueName: 'Ала-Тоо', eventDate: '2027-06-15T17:00:00+06:00' };

let ctx: TestContext;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createTemplateFixtures();
  await prisma.template.createMany({
    data: [
      {
        id: PREMIUM_ID,
        name: 'Premium',
        type: 'KECHE',
        componentKey: 'classic',
        sortOrder: 5,
        priceSom: 990,
        badge: 'HIT',
        description: { ky: 'Кыргызча сүрөттөмө', ru: 'Описание' },
      },
      { id: HIDDEN_ID, name: 'Hidden', type: 'WEDDING', componentKey: 'classic', sortOrder: 6, isActive: false },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('public template catalog', () => {
  it('lists active templates with their own price, or the default publish price', async () => {
    const res = await request(buildTestApp(ctx)).get('/api/public/templates').expect(200);
    const byId = new Map(res.body.data.map((template: { id: string }) => [template.id, template]));

    expect(byId.has(HIDDEN_ID)).toBe(false);
    expect(byId.get(PREMIUM_ID)).toMatchObject({
      priceSom: 990,
      badge: 'HIT',
      type: 'KECHE',
      description: { ky: 'Кыргызча сүрөттөмө', ru: 'Описание' },
    });
    expect(byId.get(TEST_TEMPLATE_ID)).toMatchObject({ priceSom: 499, badge: null });
  });

  it('filters by the new toi types', async () => {
    const res = await request(buildTestApp(ctx)).get('/api/public/templates?type=KECHE').expect(200);
    const ids = res.body.data.map((template: { id: string }) => template.id);
    expect(ids).toContain(PREMIUM_ID);
    expect(ids).not.toContain(TEST_TEMPLATE_ID);
  });

  it('refuses new invitations on a switched-off template', async () => {
    const owner = await loginAgent(ctx, OWNER);
    await owner.post('/api/my/invitations').send({ templateId: HIDDEN_ID }).expect(400);
  });
});

describe('publish price per template', () => {
  it('charges the template price and shows it to the owner before paying', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const { id } = (await owner.post('/api/my/invitations').send({ templateId: PREMIUM_ID }).expect(201)).body.data;
    await owner.patch(`/api/my/invitations/${id}`).send(COMPLETE).expect(200);

    const draft = await owner.get(`/api/my/invitations/${id}`).expect(200);
    expect(draft.body.data.priceSom).toBe(990);

    await owner.post(`/api/my/invitations/${id}/publish`).send({ provider: 'ODENGI' }).expect(200);
    const payment = await prisma.payment.findFirstOrThrow({ where: { invitationId: id } });
    expect(payment.amount).toBe(99_000);
  });

  it('falls back to the default publish price when the template has none', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const { id } = (await owner.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201)).body.data;
    expect((await owner.get(`/api/my/invitations/${id}`).expect(200)).body.data.priceSom).toBe(499);
  });

  it('keeps an existing draft publishable after its template is switched off', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const { id } = (await owner.post('/api/my/invitations').send({ templateId: PREMIUM_ID }).expect(201)).body.data;
    await owner.patch(`/api/my/invitations/${id}`).send(COMPLETE).expect(200);
    await prisma.template.update({ where: { id: PREMIUM_ID }, data: { isActive: false } });
    await owner.post(`/api/my/invitations/${id}/publish`).send({ provider: 'ODENGI' }).expect(200);
  });
});
