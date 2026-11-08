import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { ManualGateway } from '../payments/manual.gateway.js';
import { TEST_ORIGIN, buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createAdminUser, createTemplateFixtures, resetDatabase } from '../../test/db.js';
import { configureAdminNotifier, flushAdminNotifications, resetAdminNotifier } from './notifier.js';

const CLIENT = '+996555000111';
const ADMIN = '+996700000099';
const APP_URL = 'https://chakyruu.kg';

let ctx: TestContext;
let sent: string[];

beforeEach(async () => {
  ctx = createTestContext(new ManualGateway({ MBANK: '+996700555666', SIMBANK: '+996700555666' }));
  sent = [];
  configureAdminNotifier({ send: async (text) => void sent.push(text), appUrl: APP_URL });
  await resetDatabase();
  await createTemplateFixtures();
  await createAdminUser(ADMIN);
});

afterEach(() => resetAdminNotifier());
afterAll(async () => {
  await prisma.$disconnect();
});

/** Waits for the fire-and-forget announcements (they query the DB after the response). */
async function messages(): Promise<string[]> {
  for (let i = 0; i < 20; i += 1) {
    await flushAdminNotifications();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await flushAdminNotifications();
  return sent;
}

describe('admin Telegram notifications', () => {
  it('tells the admin about a new user, a pending MBank transfer and the publication after confirming', async () => {
    const client = await loginAgent(ctx, CLIENT);
    const { id } = (await client.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201)).body.data;
    await client
      .patch(`/api/my/invitations/${id}`)
      .send({ hostNames: 'Асан & Айгүл', venueName: 'Тойкана', eventDate: '2027-06-15T17:00:00+06:00' })
      .expect(200);
    const publish = await client.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    const { reference } = publish.body.data.checkout.instructions;

    const admin = await loginAgent(ctx, ADMIN);
    await admin.post(`/api/admin/payments/${publish.body.data.paymentId}/confirm`).expect(200);

    const texts = await messages();
    expect(texts.find((text) => text.includes('Жаңы колдонуучу'))).toContain('+996*******11');
    const pendingText = texts.find((text) => text.includes('ырастоону күтүүдө'));
    expect(pendingText).toContain(reference);
    // Telegram HTML mode: the payer's comment arrives escapes included ("&" → "&amp;").
    expect(pendingText).toContain(String(publish.body.data.checkout.instructions.comment).replace(/&/g, '&amp;'));
    expect(texts.some((text) => text.includes('Төлөм өттү') && text.includes('499 сом'))).toBe(true);
    expect(texts.find((text) => text.includes('Чакыруу жарыяланды'))).toContain('Асан &amp; Айгүл');
    // The admin was already registered by the fixture: no "new user" message for them.
    expect(texts.filter((text) => text.includes('Жаңы колдонуучу'))).toHaveLength(1);
  });

  it('tells the admin about a partner lead with the phone masked', async () => {
    const lead = { type: 'TAMADA', name: 'Нурлан', phone: '+996700123456', venueName: 'Нурлан тамада', city: 'Ош' };
    await request(buildTestApp(ctx)).post('/api/public/partner-leads').set('Origin', TEST_ORIGIN).send(lead).expect(201);
    const [text = ''] = await messages();
    expect(text).toContain('Тамада');
    expect(text).toContain('+996*******56');
    expect(text).not.toContain('700123456');
  });
});
