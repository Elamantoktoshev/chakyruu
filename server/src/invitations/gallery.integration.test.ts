import { MAX_IMAGE_BYTES } from '@chakyruu/shared';
import sharp from 'sharp';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { TINY_PNG, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
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

async function ownerWithDraft() {
  const owner = await loginAgent(ctx, OWNER);
  const res = await owner.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201);
  return { owner, id: res.body.data.id as string, slug: res.body.data.slug as string };
}

describe('gallery', () => {
  it('stores photos as webp ≤ 1600 px and shows them on the page in order', async () => {
    const { owner, id, slug } = await ownerWithDraft();
    const big = await sharp({ create: { width: 3200, height: 2400, channels: 3, background: '#d4a64a' } }).jpeg().toBuffer();

    await owner.post(`/api/my/invitations/${id}/gallery`).attach('photo', big, 'big.jpg').expect(201);
    const second = await owner.post(`/api/my/invitations/${id}/gallery`).attach('photo', TINY_PNG, 'small.png').expect(201);
    expect(second.body.data).toHaveLength(2);
    expect(second.body.data[0]).toMatchObject({ width: 1600, height: 1200 });
    expect(second.body.data[0].url).toMatch(/\.webp$/);

    const page = await owner.get(`/api/public/invitations/${slug}`).expect(200);
    expect(page.body.data.gallery.map((photo: { width: number }) => photo.width)).toEqual([1600, 1]);
    expect(page.body.data.gallery[0]).not.toHaveProperty('key');
  });

  it('holds at most 6 photos', async () => {
    const { owner, id } = await ownerWithDraft();
    for (let i = 0; i < 6; i += 1) await owner.post(`/api/my/invitations/${id}/gallery`).attach('photo', TINY_PNG, 'a.png').expect(201);
    await owner.post(`/api/my/invitations/${id}/gallery`).attach('photo', TINY_PNG, 'a.png').expect(400);
    expect(ctx.storage.size).toBe(6);
  });

  it('keeps the limit when uploads run in parallel', async () => {
    const { owner, id } = await ownerWithDraft();
    const uploads = Array.from({ length: 9 }, () => owner.post(`/api/my/invitations/${id}/gallery`).attach('photo', TINY_PNG, 'a.png'));
    const statuses = (await Promise.all(uploads)).map((res) => res.status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(6);
    expect(await prisma.invitationPhoto.count({ where: { invitationId: id } })).toBe(6);
    // Rejected uploads leave no files behind.
    expect(ctx.storage.size).toBe(6);
  });

  it('checks images by content and size', async () => {
    const { owner, id } = await ownerWithDraft();
    await owner.post(`/api/my/invitations/${id}/gallery`).attach('photo', Buffer.from('<svg onload="alert(1)"/>'), 'x.png').expect(400);
    await owner.post(`/api/my/invitations/${id}/gallery`).attach('photo', Buffer.alloc(MAX_IMAGE_BYTES + 1), 'x.jpg').expect(413);
    expect(ctx.storage.size).toBe(0);
  });

  it('deletes a photo with its file and reorders the rest', async () => {
    const { owner, id } = await ownerWithDraft();
    for (let i = 0; i < 3; i += 1) await owner.post(`/api/my/invitations/${id}/gallery`).attach('photo', TINY_PNG, 'a.png').expect(201);
    const before = (await owner.get(`/api/my/invitations/${id}`).expect(200)).body.data.gallery as { id: string }[];

    const afterDelete = await owner.delete(`/api/my/invitations/${id}/gallery/${before[0].id}`).expect(200);
    expect(afterDelete.body.data).toHaveLength(2);
    expect(ctx.storage.size).toBe(2);

    const [a, b] = afterDelete.body.data as { id: string }[];
    const reordered = await owner.put(`/api/my/invitations/${id}/gallery/order`).send({ photoIds: [b.id, a.id] }).expect(200);
    expect(reordered.body.data.map((photo: { id: string }) => photo.id)).toEqual([b.id, a.id]);
    await owner.put(`/api/my/invitations/${id}/gallery/order`).send({ photoIds: [b.id] }).expect(400);
    await owner.put(`/api/my/invitations/${id}/gallery/order`).send({ photoIds: [b.id, b.id] }).expect(400);
  });

  it('is closed to strangers', async () => {
    const { owner, id } = await ownerWithDraft();
    const added = await owner.post(`/api/my/invitations/${id}/gallery`).attach('photo', TINY_PNG, 'a.png').expect(201);
    const stranger = await loginAgent(ctx, STRANGER);
    await stranger.post(`/api/my/invitations/${id}/gallery`).attach('photo', TINY_PNG, 'a.png').expect(403);
    await stranger.delete(`/api/my/invitations/${id}/gallery/${added.body.data[0].id}`).expect(403);
    expect(ctx.storage.size).toBe(1);
  });
});
