import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { createInvitationFixture, fixtureGuestToken, resetDatabase } from '../../test/db.js';

const OWNER = '+996700000001';
const STRANGER = '+996555123456';
const SLUG = 'aibek-aizada';

let ctx: TestContext;
let invitationId: string;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  invitationId = await createInvitationFixture({ slug: SLUG, ownerPhone: OWNER, organizationId: null });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const guestsUrl = (id = invitationId) => `/api/my/invitations/${id}/guests`;

describe('adding guests', () => {
  it('creates one guest per pasted line, with phones and unique personal tokens', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const res = await owner
      .post(`${guestsUrl()}/bulk`)
      .send({ text: 'Асан байке +996700123456\n\n  Айгүл эже\nАсан байке' })
      .expect(201);

    expect(res.body.data.skipped).toBe(0);
    const created = res.body.data.created as { name: string; phone: string | null; token: string; status: string }[];
    expect(created.map((g) => [g.name, g.phone, g.status])).toEqual([
      ['Асан байке', '+996700123456', 'INVITED'],
      ['Айгүл эже', null, 'INVITED'],
    ]);
    expect(new Set(created.map((g) => g.token)).size).toBe(2);
    for (const guest of created) expect(guest.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('skips names that are already on the list', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const res = await owner.post(`${guestsUrl()}/bulk`).send({ text: 'нурлан\nАсель' }).expect(201);
    expect(res.body.data).toMatchObject({ skipped: 1 });
    expect(res.body.data.created.map((g: { name: string }) => g.name)).toEqual(['Асель']);
  });

  it('accepts a long pasted list (Cyrillic, well above 20 KB) and answers 413, not 500, when the body is huge', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const names = Array.from({ length: 300 }, (_, i) => `Конок Асанбековдун чоң үй-бүлөсү жана туугандары ${i}`).join('\n');
    expect(Buffer.byteLength(JSON.stringify({ text: names }))).toBeGreaterThan(20 * 1024);
    const res = await owner.post(`${guestsUrl()}/bulk`).send({ text: names }).expect(201);
    expect(res.body.data.created).toHaveLength(300);

    const huge = await owner.post(`${guestsUrl()}/bulk`).send({ text: 'Ы'.repeat(80_000) }).expect(413);
    expect(huge.body).toMatchObject({ success: false, error: { message: 'Request body is too large' } });
  });

  it('rejects an empty paste', async () => {
    const owner = await loginAgent(ctx, OWNER);
    await owner.post(`${guestsUrl()}/bulk`).send({ text: ' \n \n' }).expect(400);
  });
});

describe('managing guests', () => {
  it('lists guests and filters them by status', async () => {
    const owner = await loginAgent(ctx, OWNER);
    await owner.post(`${guestsUrl()}/bulk`).send({ text: 'Асель\nБакыт' }).expect(201);

    const all = await owner.get(guestsUrl()).expect(200);
    expect(all.body.data.map((g: { name: string }) => g.name)).toEqual(['Нурлан', 'Асель', 'Бакыт']);
    const attending = await owner.get(`${guestsUrl()}?status=ATTENDING`).expect(200);
    expect(attending.body.data.map((g: { name: string }) => g.name)).toEqual(['Нурлан']);
    await owner.get(`${guestsUrl()}?status=MAYBE`).expect(400);
  });

  it('deletes a guest', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const [guest] = (await owner.get(guestsUrl()).expect(200)).body.data as { id: string }[];
    await owner.delete(`${guestsUrl()}/${guest?.id}`).expect(200);
    expect(await prisma.guest.count()).toBe(0);
  });

  it("forbids reading, adding or deleting someone else's guests (403)", async () => {
    const owner = await loginAgent(ctx, OWNER);
    const [guest] = (await owner.get(guestsUrl()).expect(200)).body.data as { id: string }[];
    const stranger = await loginAgent(ctx, STRANGER);

    await stranger.get(guestsUrl()).expect(403);
    await stranger.post(`${guestsUrl()}/bulk`).send({ text: 'Hacker' }).expect(403);
    await stranger.delete(`${guestsUrl()}/${guest?.id}`).expect(403);
    expect(await prisma.guest.count()).toBe(1);
  });

  it('requires login', async () => {
    await request(buildTestApp(ctx)).get(guestsUrl()).expect(401);
  });

  it('does not delete a guest through another invitation id', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const otherId = await createInvitationFixture({ slug: 'other-toi', ownerPhone: OWNER, organizationId: null });
    const [guest] = (await owner.get(guestsUrl()).expect(200)).body.data as { id: string }[];
    await owner.delete(`${guestsUrl(otherId)}/${guest?.id}`).expect(404);
  });
});

describe('personal link', () => {
  it('returns the guest for a valid token so the page can greet them', async () => {
    const res = await request(buildTestApp(ctx))
      .get(`/api/public/invitations/${SLUG}?g=${fixtureGuestToken(SLUG)}`)
      .expect(200);
    expect(res.body.data.guest).toEqual({ name: 'Нурлан', status: 'ATTENDING', guestsCount: 2 });
    expect(res.body.data.guest.token).toBeUndefined();
  });

  it('ignores unknown tokens and tokens of another invitation', async () => {
    await createInvitationFixture({ slug: 'other-toi', ownerPhone: OWNER, organizationId: null });
    const app = buildTestApp(ctx);
    const unknown = await request(app).get(`/api/public/invitations/${SLUG}?g=nope_nope_nope_nope_00`).expect(200);
    expect(unknown.body.data.guest).toBeNull();
    const foreign = await request(app).get(`/api/public/invitations/${SLUG}?g=${fixtureGuestToken('other-toi')}`).expect(200);
    expect(foreign.body.data.guest).toBeNull();
  });

  it('works without a token (shared link)', async () => {
    const res = await request(buildTestApp(ctx)).get(`/api/public/invitations/${SLUG}`).expect(200);
    expect(res.body.data.guest).toBeNull();
  });
});

describe('RSVP', () => {
  const rsvpUrl = `/api/public/invitations/${SLUG}/rsvp`;

  it('updates the invited guest when they answer through their personal link', async () => {
    const owner = await loginAgent(ctx, OWNER);
    const created = (await owner.post(`${guestsUrl()}/bulk`).send({ text: 'Асель' }).expect(201)).body.data.created;
    const token = created[0].token as string;

    const res = await request(buildTestApp(ctx)).post(rsvpUrl).send({ token, attending: true, guestsCount: 3 }).expect(200);
    expect(res.body.data.guest).toEqual({ name: 'Асель', status: 'ATTENDING', guestsCount: 3 });

    await request(buildTestApp(ctx)).post(rsvpUrl).send({ token, attending: false }).expect(200);
    const guest = await prisma.guest.findUniqueOrThrow({ where: { token } });
    expect(guest).toMatchObject({ status: 'DECLINED', guestsCount: 0 });
    expect(guest.respondedAt).not.toBeNull();
  });

  it('creates a self-registered guest on the shared link and returns a token to change the answer later', async () => {
    const app = buildTestApp(ctx);
    const res = await request(app).post(rsvpUrl).send({ name: 'Бакыт', attending: true, guestsCount: 2 }).expect(201);
    expect(res.body.data.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const guest = await prisma.guest.findUniqueOrThrow({ where: { token: res.body.data.token } });
    expect(guest).toMatchObject({ name: 'Бакыт', source: 'SELF', status: 'ATTENDING', guestsCount: 2 });
  });

  it('rejects an unknown token', async () => {
    await request(buildTestApp(ctx)).post(rsvpUrl).send({ token: 'nope_nope_nope_nope_00', attending: true }).expect(404);
  });

  it('does not accept answers for an unpublished invitation', async () => {
    await prisma.invitation.update({ where: { id: invitationId }, data: { status: 'DRAFT' } });
    await request(buildTestApp(ctx)).post(rsvpUrl).send({ name: 'Бакыт', attending: true }).expect(404);
  });
});
