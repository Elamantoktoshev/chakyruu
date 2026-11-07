import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { TEST_ORIGIN, buildTestApp, createTestContext, type TestContext } from '../../test/app.js';
import { resetDatabase } from '../../test/db.js';

const URL = '/api/public/partner-leads';
const LEAD = { type: 'VENUE', name: 'Нурлан', phone: '+996700123456', venueName: '«Ала-Тоо» тойканасы', city: 'Ош' };

let ctx: TestContext;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('partner leads', () => {
  it('stores a partnership request from the landing page', async () => {
    const res = await request(buildTestApp(ctx)).post(URL).set('Origin', TEST_ORIGIN).send(LEAD).expect(201);
    expect(res.body.data).toEqual({ received: true });
    expect(await prisma.partnerLead.findFirst()).toMatchObject({ ...LEAD, status: 'NEW' });
  });

  it('validates the phone and required fields', async () => {
    const app = buildTestApp(ctx);
    await request(app).post(URL).send({ ...LEAD, phone: '0700123456' }).expect(400);
    await request(app).post(URL).send({ phone: LEAD.phone }).expect(400);
    await request(app).post(URL).send({ ...LEAD, admin: true }).expect(400);
    expect(await prisma.partnerLead.count()).toBe(0);
  });

  it('limits how many requests one visitor can send', async () => {
    const app = buildTestApp(ctx);
    for (let i = 0; i < 3; i += 1) await request(app).post(URL).send(LEAD).expect(201);
    await request(app).post(URL).send(LEAD).expect(429);
  });
});
