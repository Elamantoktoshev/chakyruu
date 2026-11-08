import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createTestContext, loginAgent, type TestContext } from '../../test/app.js';
import { TEST_TEMPLATE_ID, createAdminUser, createTemplateFixtures, resetDatabase } from '../../test/db.js';

const ADMIN = '+996700000099';
const CLIENT = '+996555000111';
const ILLUSTRATED_ID = 'tpl-illustrated';
const MANIFEST = {
  version: 1,
  slug: 'test-design',
  palette: { primary: '#5A1E2B', accent: '#C9A24B', background: '#FBF5EA', ink: '#2B1A14', card: '#F3E4E7', isDark: false },
  font: 'serif',
  opening: { kind: 'hands', layers: [] },
  features: ['envelope'],
  uploads: {},
  placeholders: {},
};

let ctx: TestContext;
let cover: Buffer;
let squareOpaque: Buffer;
let handWithAlpha: Buffer;

beforeAll(async () => {
  cover = await sharp({ create: { width: 270, height: 480, channels: 3, background: '#7a1f2b' } }).png().toBuffer();
  squareOpaque = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#ffffff' } }).png().toBuffer();
  handWithAlpha = await sharp({ create: { width: 400, height: 300, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } }).png().toBuffer();
});

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createTemplateFixtures();
  await createAdminUser(ADMIN);
  await prisma.template.create({
    data: { id: ILLUSTRATED_ID, name: 'Test design', type: 'WEDDING', componentKey: 'illustrated', sortOrder: 9, config: MANIFEST },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const assetsOf = async () => ((await prisma.template.findUniqueOrThrow({ where: { id: ILLUSTRATED_ID } })).config as { uploads: Record<string, string>; placeholders: Record<string, string> });

describe('admin templates', () => {
  it('is admin-only', async () => {
    const client = await loginAgent(ctx, CLIENT);
    await client.get('/api/admin/templates').expect(403);
    await client.patch(`/api/admin/templates/${TEST_TEMPLATE_ID}`).send({ priceSom: 1 }).expect(403);
  });

  it('lists every template, switched off ones too, with the asset slots of illustrated ones', async () => {
    await prisma.template.update({ where: { id: TEST_TEMPLATE_ID }, data: { isActive: false } });
    const admin = await loginAgent(ctx, ADMIN);
    const list = (await admin.get('/api/admin/templates').expect(200)).body.data as Array<{ id: string; isActive: boolean; assets: Array<{ file: string; url: string; isUploaded: boolean }> }>;
    expect(list.find((template) => template.id === TEST_TEMPLATE_ID)?.isActive).toBe(false);
    const illustrated = list.find((template) => template.id === ILLUSTRATED_ID);
    expect(illustrated?.assets).toContainEqual({ file: 'cover.webp', label: 'Обложка', url: '/templates/test-design/cover.webp', isUploaded: false });
    expect(illustrated?.assets.map((asset) => asset.file)).toContain('layers/hand-left.webp');
  });

  it('edits price, badge, toi type, order, on/off and the card text', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    const patch = { name: 'Жаңы ат', priceSom: 990, badge: 'NEW', type: 'KECHE', sortOrder: 1, isActive: false, description: { ky: 'Кыска текст', ru: 'Короткий текст' } };
    await admin.patch(`/api/admin/templates/${ILLUSTRATED_ID}`).send(patch).expect(200);
    expect(await prisma.template.findUniqueOrThrow({ where: { id: ILLUSTRATED_ID } })).toMatchObject(patch);

    await admin.patch(`/api/admin/templates/${ILLUSTRATED_ID}`).send({ priceSom: null, badge: null }).expect(200);
    expect(await prisma.template.findUniqueOrThrow({ where: { id: ILLUSTRATED_ID } })).toMatchObject({ priceSom: null, badge: null });

    await admin.patch(`/api/admin/templates/${ILLUSTRATED_ID}`).send({ priceSom: -5 }).expect(400);
    await admin.patch(`/api/admin/templates/${ILLUSTRATED_ID}`).send({ badge: 'SUPER' }).expect(400);
    await admin.patch('/api/admin/templates/nope').send({ priceSom: 1 }).expect(404);
  });

  it('stores an uploaded cover as webp with a blurred preview, replacing the previous upload', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    const first = await admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=cover.webp`).attach('image', cover, 'cover.png').expect(200);
    expect(first.body.data.url).toMatch(/^\/uploads\/[a-f0-9-]{36}\.webp$/);
    const { uploads, placeholders } = await assetsOf();
    expect(uploads['cover.webp']).toBe(first.body.data.url);
    expect(placeholders['cover.webp']).toMatch(/^data:image\/webp;base64,/);
    expect(ctx.storage.size).toBe(1);

    await admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=cover.webp`).attach('image', cover, 'cover.png').expect(200);
    expect(ctx.storage.size).toBe(1);

    await admin.delete(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=cover.webp`).expect(200);
    expect((await assetsOf()).uploads['cover.webp']).toBeUndefined();
    expect(ctx.storage.size).toBe(0);
  });

  it('checks the cover proportions and that animation layers have a transparent background', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    const wrongCover = await admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=cover.webp`).attach('image', squareOpaque, 'square.png').expect(400);
    expect(wrongCover.body.error.message).toContain('9:16');

    const opaqueLayer = await admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=layers/hand-left.webp`).attach('image', squareOpaque, 'hand.png').expect(400);
    expect(opaqueLayer.body.error.message).toContain('transparent');

    await admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=layers/hand-left.webp`).attach('image', handWithAlpha, 'hand.png').expect(200);
    const stored = (await assetsOf()).uploads['layers/hand-left.webp'];
    expect(stored).toBeDefined();
  });

  it('refuses files that are not a slot of this design, and uploads to code-drawn templates', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    await admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=layers/cloche.webp`).attach('image', handWithAlpha, 'x.png').expect(400);
    await admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=../../etc.webp`).attach('image', handWithAlpha, 'x.png').expect(400);
    await admin.post(`/api/admin/templates/${TEST_TEMPLATE_ID}/assets?file=cover.webp`).attach('image', cover, 'x.png').expect(400);
    await admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=cover.webp`).attach('image', Buffer.from('not an image'), 'x.png').expect(400);
  });

  it('merges the card text by language instead of wiping the other one', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    await admin.patch(`/api/admin/templates/${ILLUSTRATED_ID}`).send({ description: { ky: 'Кыргызча', ru: 'По-русски' } }).expect(200);
    await admin.patch(`/api/admin/templates/${ILLUSTRATED_ID}`).send({ description: { ky: 'Жаңы' } }).expect(200);
    expect((await prisma.template.findUniqueOrThrow({ where: { id: ILLUSTRATED_ID } })).description).toEqual({ ky: 'Жаңы', ru: 'По-русски' });
  });

  it('keeps both files when two artwork uploads arrive at the same time', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    await Promise.all([
      admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=layers/hand-left.webp`).attach('image', handWithAlpha, 'l.png').expect(200),
      admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=layers/hand-right.webp`).attach('image', handWithAlpha, 'r.png').expect(200),
    ]);
    const { uploads } = await assetsOf();
    expect(Object.keys(uploads).sort()).toEqual(['layers/hand-left.webp', 'layers/hand-right.webp']);
  });

  it('never sends storage keys of uploads to the public', async () => {
    const admin = await loginAgent(ctx, ADMIN);
    await admin.post(`/api/admin/templates/${ILLUSTRATED_ID}/assets?file=cover.webp`).attach('image', cover, 'cover.png').expect(200);
    const list = (await admin.get('/api/public/templates').expect(200)).body.data as Array<{ id: string; config: Record<string, unknown> }>;
    const config = list.find((template) => template.id === ILLUSTRATED_ID)?.config;
    expect(config?.uploads).toBeDefined();
    expect(config?.uploadKeys).toBeUndefined();
  });
});

