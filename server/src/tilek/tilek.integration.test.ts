import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { createInvitationFixture, fixtureGuestToken, resetDatabase } from '../../test/db.js';

const OWNER = '+996700000001';
const STRANGER = '+996555123456';
const SLUG = 'aibek-aizada';
const BROWSER_A = '8f14e45f-ceea-4e7a-9d3b-1c2a3b4c5d6e';
const BROWSER_B = '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d';

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

const publicUrl = `/api/public/invitations/${SLUG}/tilekter`;

async function postTilek(body: Record<string, unknown>) {
  const res = await request(buildTestApp(ctx)).post(publicUrl).send(body).expect(201);
  return res.body.data as { id: string; authorName: string; text: string; likesCount: number };
}

describe('writing tilekter', () => {
  it('lets a guest on the shared link leave a wish under a typed name', async () => {
    const tilek = await postTilek({ authorName: 'Асель', text: 'Бактылуу болгула!' });
    expect(tilek).toMatchObject({ authorName: 'Асель', text: 'Бактылуу болгула!', likesCount: 0 });
  });

  it('signs a wish from a personal link with the guest name', async () => {
    const tilek = await postTilek({ token: fixtureGuestToken(SLUG), text: 'Ак жол!', authorName: 'Fake' });
    expect(tilek.authorName).toBe('Нурлан');
    const stored = await prisma.tilek.findUniqueOrThrow({ where: { id: tilek.id } });
    expect(stored.guestId).not.toBeNull();
  });

  it('requires a name when the token is unknown', async () => {
    await request(buildTestApp(ctx)).post(publicUrl).send({ token: 'nope_nope_nope_nope_00', text: 'Ак жол!' }).expect(400);
  });

  it('is closed for unpublished invitations', async () => {
    await prisma.invitation.update({ where: { id: invitationId }, data: { status: 'DRAFT' } });
    await request(buildTestApp(ctx)).post(publicUrl).send({ authorName: 'Асель', text: 'Ак жол!' }).expect(404);
  });
});

describe('likes', () => {
  it('counts one like per browser and reports likedByMe', async () => {
    const tilek = await postTilek({ authorName: 'Асель', text: 'Бактылуу болгула!' });
    const app = buildTestApp(ctx);
    const likeUrl = `/api/public/tilekter/${tilek.id}/like`;

    expect((await request(app).post(likeUrl).send({ clientId: BROWSER_A }).expect(200)).body.data).toEqual({ likesCount: 1, liked: true });
    expect((await request(app).post(likeUrl).send({ clientId: BROWSER_A }).expect(200)).body.data.likesCount).toBe(1);
    expect((await request(app).post(likeUrl).send({ clientId: BROWSER_B }).expect(200)).body.data.likesCount).toBe(2);

    const list = await request(app).get(`${publicUrl}?clientId=${BROWSER_A}`).expect(200);
    expect(list.body.data[0]).toMatchObject({ likesCount: 2, likedByMe: true });
    const anonymous = await request(app).get(publicUrl).expect(200);
    expect(anonymous.body.data[0].likedByMe).toBe(false);
  });

  it('keeps the count right under concurrent likes from the same browser', async () => {
    const tilek = await postTilek({ authorName: 'Асель', text: 'Бактылуу болгула!' });
    const app = buildTestApp(ctx);
    await Promise.all(
      Array.from({ length: 5 }, () => request(app).post(`/api/public/tilekter/${tilek.id}/like`).send({ clientId: BROWSER_A })),
    );
    const stored = await prisma.tilek.findUniqueOrThrow({ where: { id: tilek.id } });
    expect(stored.likesCount).toBe(1);
  });

  it('rejects a malformed client id', async () => {
    const tilek = await postTilek({ authorName: 'Асель', text: 'Бактылуу болгула!' });
    await request(buildTestApp(ctx)).post(`/api/public/tilekter/${tilek.id}/like`).send({ clientId: 'me' }).expect(400);
  });
});

describe('moderation by the owner', () => {
  it('hides a wish from the public page but keeps it in the dashboard', async () => {
    const tilek = await postTilek({ authorName: 'Тролль', text: 'Спам спам спам' });
    const owner = await loginAgent(ctx, OWNER);

    await owner.patch(`/api/my/invitations/${invitationId}/tilekter/${tilek.id}`).send({ hidden: true }).expect(200);

    const app = buildTestApp(ctx);
    expect((await request(app).get(publicUrl).expect(200)).body.data).toEqual([]);
    await request(app).post(`/api/public/tilekter/${tilek.id}/like`).send({ clientId: BROWSER_A }).expect(404);

    const mine = await owner.get(`/api/my/invitations/${invitationId}/tilekter`).expect(200);
    expect(mine.body.data).toEqual([expect.objectContaining({ id: tilek.id, hidden: true })]);

    await owner.patch(`/api/my/invitations/${invitationId}/tilekter/${tilek.id}`).send({ hidden: false }).expect(200);
    expect((await request(app).get(publicUrl).expect(200)).body.data).toHaveLength(1);
  });

  it("forbids moderating someone else's tilekter", async () => {
    const tilek = await postTilek({ authorName: 'Асель', text: 'Бактылуу болгула!' });
    const stranger = await loginAgent(ctx, STRANGER);
    await stranger.get(`/api/my/invitations/${invitationId}/tilekter`).expect(403);
    await stranger.patch(`/api/my/invitations/${invitationId}/tilekter/${tilek.id}`).send({ hidden: true }).expect(403);
  });
});
