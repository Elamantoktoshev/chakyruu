import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { TEST_ORIGIN, TINY_PNG, buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createTemplateFixtures, resetDatabase } from '../../test/db.js';

const OWNER = '+996700000001';
const STRANGER = '+996555123456';

let ctx: TestContext;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createTemplateFixtures();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createDraft(agent: Awaited<ReturnType<typeof loginAgent>>): Promise<string> {
  const res = await agent.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201);
  return res.body.data.id as string;
}

const COMPLETE = {
  hostNames: 'Айбек & Айзада',
  eventDate: '2027-06-15T17:00:00+06:00',
  venueName: '«Ала-Тоо» тойканасы',
};

describe('templates', () => {
  it('lists templates and filters by type', async () => {
    const app = buildTestApp(ctx);
    const all = await request(app).get('/api/public/templates').expect(200);
    expect(all.body.data.map((t: { id: string }) => t.id)).toEqual(['tpl-test', 'tpl-test-beshik', 'tpl-test-shyrdak']);
    expect(all.body.data[0].componentKey).toBe('classic');
    // A universal template shows up under every toi type.
    const beshik = await request(app).get('/api/public/templates?type=BESHIK').expect(200);
    expect(beshik.body.data.map((t: { id: string }) => t.id)).toEqual(['tpl-test-beshik', 'tpl-test-shyrdak']);
    await request(app).get('/api/public/templates?type=PARTY').expect(400);
  });
});

describe('drafts', () => {
  it('requires login to create a draft', async () => {
    await request(buildTestApp(ctx)).post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(401);
  });

  it('creates a draft with the template type and a temporary slug', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const res = await owner.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201);
    expect(res.body.data).toMatchObject({ status: 'DRAFT', eventType: 'WEDDING', hostNames: '' });
    expect(res.body.data.slug).toMatch(/^draft-[a-z0-9]+$/);
  });

  it('autosaves fields and derives the slug from the host names', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    const res = await owner.patch(`/api/my/invitations/${id}`).send(COMPLETE).expect(200);
    expect(res.body.data).toMatchObject({ slug: 'aibek-aizada', hostNames: 'Айбек & Айзада' });
  });

  it('adds a numeric suffix when the slug is taken', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const first = await createDraft(owner);
    const second = await createDraft(owner);
    await owner.patch(`/api/my/invitations/${first}`).send({ hostNames: 'Айбек Айзада' }).expect(200);
    const res = await owner.patch(`/api/my/invitations/${second}`).send({ hostNames: 'Айбек & Айзада' }).expect(200);
    expect(res.body.data.slug).toBe('aibek-aizada-2');
  });

  it("accepts only a palette of the invitation's template and resets it when the template changes", async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    await owner.patch(`/api/my/invitations/${id}`).send({ paletteId: 'emerald-gold' }).expect(200);
    await owner.patch(`/api/my/invitations/${id}`).send({ paletteId: 'pink' }).expect(400);

    const switched = await owner.patch(`/api/my/invitations/${id}`).send({ templateId: 'tpl-test-beshik' }).expect(200);
    expect(switched.body.data).toMatchObject({ templateId: 'tpl-test-beshik', paletteId: null });
    expect(switched.body.data.template.componentKey).toBe('bala');
    await owner.patch(`/api/my/invitations/${id}`).send({ templateId: 'tpl-test', paletteId: 'plum' }).expect(200);
    // Re-sending the same template keeps the chosen palette.
    const same = await owner.patch(`/api/my/invitations/${id}`).send({ templateId: 'tpl-test' }).expect(200);
    expect(same.body.data.paletteId).toBe('plum');
  });

  it('saves the opening animation (Боз үй by default) and rejects unknown ones', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    expect((await owner.get(`/api/my/invitations/${id}`).expect(200)).body.data.openingAnimation).toBe('BOZ_UY');
    await owner.patch(`/api/my/invitations/${id}`).send({ openingAnimation: 'CURTAINS' }).expect(200);
    expect((await owner.get(`/api/my/invitations/${id}`).expect(200)).body.data.openingAnimation).toBe('CURTAINS');
    await owner.patch(`/api/my/invitations/${id}`).send({ openingAnimation: 'FIREWORKS' }).expect(400);
  });

  it('saves the toi programme and validates it', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    const program = [{ time: '18:00', title: 'Тосуп алуу' }, { time: '19:30', title: 'Бата' }];
    expect((await owner.patch(`/api/my/invitations/${id}`).send({ program }).expect(200)).body.data.program).toEqual(program);
    await owner.patch(`/api/my/invitations/${id}`).send({ program: [{ time: '7pm', title: 'x' }] }).expect(400);
  });

  it('lets only partner gifts hide the "made with Chakyruu.kg" line', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    await owner.patch(`/api/my/invitations/${id}`).send({ hideBranding: true }).expect(400);
    await owner.patch(`/api/my/invitations/${id}`).send({ hideBranding: false }).expect(200);
  });

  it('rejects fields the owner must not set directly', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    await owner.patch(`/api/my/invitations/${id}`).send({ status: 'PUBLISHED' }).expect(400);
  });

  it("forbids reading or editing someone else's draft", async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    const stranger = await loginAgent(ctx, STRANGER);
    await stranger.get(`/api/my/invitations/${id}`).expect(403);
    await stranger.patch(`/api/my/invitations/${id}`).send({ hostNames: 'Hacked' }).expect(403);
    await stranger.get('/api/my/invitations/does-not-exist').expect(404);
  });
});

describe('public page of a draft', () => {
  it('is hidden from everyone but the owner, who sees it flagged as a draft', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    await owner.patch(`/api/my/invitations/${id}`).send(COMPLETE).expect(200);

    await request(buildTestApp(ctx)).get('/api/public/invitations/aibek-aizada').expect(404);
    const stranger = await loginAgent(ctx, STRANGER);
    await stranger.get('/api/public/invitations/aibek-aizada').expect(404);

    const own = await owner.get('/api/public/invitations/aibek-aizada').expect(200);
    expect(own.body.data.isDraft).toBe(true);
  });
});

describe('calendar file', () => {
  it('serves an .ics for a published invitation with a date', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    await owner.patch(`/api/my/invitations/${id}`).send(COMPLETE).expect(200);
    const app = buildTestApp(ctx);
    await request(app).get('/api/public/invitations/aibek-aizada/calendar.ics').expect(404);

    await owner.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    const res = await request(app).get('/api/public/invitations/aibek-aizada/calendar.ics').expect(200);
    expect(res.headers['content-type']).toMatch(/^text\/calendar/);
    expect(res.headers['content-disposition']).toContain('aibek-aizada.ics');
    expect(res.text).toContain('DTSTART:20270615T110000Z');
    expect(res.text).toContain('SUMMARY:Айбек & Айзада');
  });
});

describe('photo upload', () => {
  it('stores a real image and rejects anything else', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);

    const ok = await owner
      .post(`/api/my/invitations/${id}/photo`)
      .set('Origin', TEST_ORIGIN)
      .attach('photo', TINY_PNG, { filename: 'me.png', contentType: 'image/png' })
      .expect(200);
    // Every photo is re-encoded to webp (smaller, no EXIF).
    expect(ok.body.data.photoUrl).toMatch(/^\/uploads\/[a-f0-9-]+\.webp$/);
    expect(ctx.storage.size).toBe(1);

    await owner
      .post(`/api/my/invitations/${id}/photo`)
      .attach('photo', Buffer.from('<svg onload="alert(1)"/>'), { filename: 'x.png', contentType: 'image/png' })
      .expect(400);
  });

  it('replaces the previous photo instead of piling up files', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    for (let i = 0; i < 2; i += 1) {
      await owner.post(`/api/my/invitations/${id}/photo`).attach('photo', TINY_PNG, 'a.png').expect(200);
    }
    expect(ctx.storage.size).toBe(1);
  });
});

describe('publishing', () => {
  it('refuses to publish an incomplete draft and lists what is missing', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    const res = await owner.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(400);
    expect(res.body.error.details).toEqual(expect.arrayContaining(['hostNames', 'eventDate', 'venueName']));
  });

  it('charges the publish price through the payment provider and makes the page public', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    await owner.patch(`/api/my/invitations/${id}`).send(COMPLETE).expect(200);

    const res = await owner.post(`/api/my/invitations/${id}/publish`).send({ provider: 'SIMBANK' }).expect(200);
    expect(res.body.data).toMatchObject({ status: 'PUBLISHED', slug: 'aibek-aizada' });

    const payment = await prisma.payment.findFirstOrThrow({ where: { invitationId: id } });
    expect(payment).toMatchObject({ amount: 49_900, provider: 'SIMBANK', status: 'SUCCEEDED' } /* 499 som default price, in tyiyn */);

    const pub = await request(buildTestApp(ctx)).get('/api/public/invitations/aibek-aizada').expect(200);
    expect(pub.body.data.isDraft).toBe(false);

    await owner.post(`/api/my/invitations/${id}/publish`).send({ provider: 'SIMBANK' }).expect(409);
  });

  it('publishes and charges only once when "Pay" is tapped twice at the same time', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    await owner.patch(`/api/my/invitations/${id}`).send(COMPLETE).expect(200);

    const results = await Promise.all(
      [0, 1].map(() => owner.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.payment.count({ where: { invitationId: id, status: 'SUCCEEDED' } })).toBe(1);
  });

  it('freezes the slug after publishing', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const id = await createDraft(owner);
    await owner.patch(`/api/my/invitations/${id}`).send(COMPLETE).expect(200);
    await owner.post(`/api/my/invitations/${id}/publish`).send({ provider: 'MBANK' }).expect(200);
    const res = await owner.patch(`/api/my/invitations/${id}`).send({ hostNames: 'Нурлан & Асель' }).expect(200);
    expect(res.body.data.slug).toBe('aibek-aizada');
  });
});
