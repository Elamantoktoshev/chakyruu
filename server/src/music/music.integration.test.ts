import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { TINY_MP3, TINY_PNG, buildTestApp, createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createAdminUser, createTemplateFixtures, resetDatabase } from '../../test/db.js';

const ADMIN = '+996700000099';
const OWNER = '+996700000001';
const STRANGER = '+996555123456';
const ELEVEN_MB = 11 * 1024 * 1024;

let ctx: TestContext;

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createTemplateFixtures();
  await createAdminUser(ADMIN);
  await prisma.track.createMany({
    data: [
      { id: 'komuz', title: 'Комуз', category: 'ULUTTUK', file: '/music/komuz.mp3', durationSec: 180, active: true },
      { id: 'piano', title: 'Пианино', category: 'ZAMANBAP', file: '/music/piano.mp3', active: true, sortOrder: 1 },
      { id: 'hidden', title: 'Өчүрүлгөн', category: 'KLASSIKA', file: '/music/hidden.mp3', active: false },
      { id: 'no-file', title: 'Файлсыз', category: 'BALDARGA', file: null, active: false },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function ownerWithDraft() {
  const owner = await loginAgent(ctx, OWNER);
  const res = await owner.post('/api/my/invitations').send({ templateId: TEST_TEMPLATE_ID }).expect(201);
  return { owner, id: res.body.data.id as string, slug: res.body.data.slug as string };
}

describe('catalogue', () => {
  it('lists only enabled tracks that have a file', async () => {
    const res = await request(buildTestApp(ctx)).get('/api/public/tracks').expect(200);
    expect(res.body.data.map((track: { id: string }) => track.id)).toEqual(['komuz', 'piano']);
    expect(res.body.data[0]).toEqual({ id: 'komuz', title: 'Комуз', category: 'ULUTTUK', file: '/music/komuz.mp3', durationSec: 180 });
  });
});

describe('admin tracks', () => {
  it('is admin-only', async () => {
    const owner = await loginAgent(ctx, OWNER);
    await owner.get('/api/admin/tracks').expect(403);
    await owner.post('/api/admin/tracks').send({ title: 'x', category: 'ULUTTUK' }).expect(403);
  });

  it('creates a track, refuses to enable it without a file, then uploads and enables it', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    const created = await admin.post('/api/admin/tracks').send({ title: 'Жаңы обон', category: 'ZAMANBAP' }).expect(201);
    const id = created.body.data.id as string;
    expect(created.body.data).toMatchObject({ active: false, file: null });

    await admin.patch(`/api/admin/tracks/${id}`).send({ active: true }).expect(400);
    await admin.post(`/api/admin/tracks/${id}/file`).attach('file', TINY_PNG, 'song.mp3').expect(400);
    const uploaded = await admin
      .post(`/api/admin/tracks/${id}/file`)
      .field('durationSec', '200')
      .attach('file', TINY_MP3, 'song.mp3')
      .expect(200);
    expect(uploaded.body.data.file).toMatch(/^\/uploads\/[a-f0-9-]{36}\.mp3$/);
    expect(uploaded.body.data.durationSec).toBe(200);

    await admin.patch(`/api/admin/tracks/${id}`).send({ active: true }).expect(200);
    const list = await admin.get('/api/admin/tracks').expect(200);
    expect(list.body.data.find((track: { id: string }) => track.id === id)).toMatchObject({ active: true, isUploaded: true, usedBy: 0 });
  });

  it('accepts only bundled /music paths as track files', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    await admin.post('/api/admin/tracks').send({ title: 'x', category: 'ULUTTUK', file: 'https://evil.example/x.mp3' }).expect(400);
    await admin.post('/api/admin/tracks').send({ title: 'x', category: 'ULUTTUK', file: '/music/ok.mp3' }).expect(201);
  });
});

describe('invitation music', () => {
  it('picks an enabled track with a start second and shows it on the page', async () => {
    const { owner, id, slug } = await ownerWithDraft();
    const saved = await owner.patch(`/api/my/invitations/${id}`).send({ musicTrackId: 'komuz', musicStartSec: 35 }).expect(200);
    expect(saved.body.data.music).toEqual({ src: '/music/komuz.mp3', title: 'Комуз', durationSec: 180, startSec: 35, isCustom: false });

    const page = await owner.get(`/api/public/invitations/${slug}`).expect(200);
    expect(page.body.data.music).toMatchObject({ src: '/music/komuz.mp3', startSec: 35 });
    expect(page.body.data).not.toHaveProperty('customMusicKey');
  });

  it('refuses disabled, file-less and unknown tracks', async () => {
    const { owner, id } = await ownerWithDraft();
    for (const musicTrackId of ['hidden', 'no-file', 'missing']) {
      await owner.patch(`/api/my/invitations/${id}`).send({ musicTrackId }).expect(400);
    }
    await owner.patch(`/api/my/invitations/${id}`).send({ musicStartSec: 601 }).expect(400);
  });

  it('stops playing a track once the admin disables it', async () => {
    const { owner, id } = await ownerWithDraft();
    await owner.patch(`/api/my/invitations/${id}`).send({ musicTrackId: 'komuz' }).expect(200);
    await prisma.track.update({ where: { id: 'komuz' }, data: { active: false } });
    const res = await owner.get(`/api/my/invitations/${id}`).expect(200);
    expect(res.body.data.music).toBeNull();
    // Re-saving the same (now disabled) track is not an error.
    await owner.patch(`/api/my/invitations/${id}`).send({ musicTrackId: 'komuz' }).expect(200);
  });

  it('uploads an own mp3 that replaces the track, and deletes it when a track is picked again', async () => {
    const { owner, id } = await ownerWithDraft();
    await owner.patch(`/api/my/invitations/${id}`).send({ musicTrackId: 'komuz', musicStartSec: 20 }).expect(200);

    const uploaded = await owner.post(`/api/my/invitations/${id}/music`).field('durationSec', '95').attach('music', TINY_MP3, 'my.mp3').expect(200);
    expect(uploaded.body.data).toMatchObject({ musicTrackId: null, musicStartSec: 0 });
    expect(uploaded.body.data.music).toMatchObject({ isCustom: true, durationSec: 95, title: null });
    expect(ctx.storage.size).toBe(1);

    await owner.patch(`/api/my/invitations/${id}`).send({ musicTrackId: 'piano' }).expect(200);
    expect(ctx.storage.size).toBe(0);
  });

  it('removes an own mp3', async () => {
    const { owner, id } = await ownerWithDraft();
    await owner.post(`/api/my/invitations/${id}/music`).attach('music', TINY_MP3, 'my.mp3').expect(200);
    const res = await owner.delete(`/api/my/invitations/${id}/music`).expect(200);
    expect(res.body.data.music).toBeNull();
    expect(ctx.storage.size).toBe(0);
  });

  it('checks the mp3 by content and the 10 MB limit', async () => {
    const { owner, id } = await ownerWithDraft();
    await owner.post(`/api/my/invitations/${id}/music`).attach('music', Buffer.from('<html><script>alert(1)</script>'), 'x.mp3').expect(400);
    const tooBig = Buffer.concat([TINY_MP3, Buffer.alloc(ELEVEN_MB)]);
    await owner.post(`/api/my/invitations/${id}/music`).attach('music', tooBig, 'big.mp3').expect(413);
    await owner.post(`/api/my/invitations/${id}/music`).field('durationSec', '-5').attach('music', TINY_MP3, 'x.mp3').expect(400);
    expect(ctx.storage.size).toBe(0);
  });

  it('does not let strangers upload music to someone else\'s invitation', async () => {
    const { id } = await ownerWithDraft();
    const stranger = await loginAgent(ctx, STRANGER);
    await stranger.post(`/api/my/invitations/${id}/music`).attach('music', TINY_MP3, 'x.mp3').expect(403);
    expect(ctx.storage.size).toBe(0);
  });
});
