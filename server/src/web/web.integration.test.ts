import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { TEST_ORIGIN, buildTestApp, createTestContext, type TestContext } from '../../test/app.js';
import { createInvitationFixture, fixtureGuestToken, resetDatabase } from '../../test/db.js';

const SLUG = 'aibek-aizada';
const RENDER_TIMEOUT_MS = 30_000;
const INDEX_HTML = `<!doctype html><html lang="ky"><head>
    <title>Chakyruu.kg — той чакыруулары</title>
    <meta name="description" content="Default description" />
    <meta property="og:title" content="Chakyruu.kg landing" />
    <meta property="og:image" content="/og-landing.png" />
    <meta name="twitter:card" content="summary_large_image" />
  </head><body><div id="root"></div></body></html>`;

let ctx: TestContext;
let clientDir: string;

beforeAll(() => {
  clientDir = mkdtempSync(path.join(tmpdir(), 'chakyruu-client-'));
  writeFileSync(path.join(clientDir, 'index.html'), INDEX_HTML);
  mkdirSync(path.join(clientDir, 'assets'));
  writeFileSync(path.join(clientDir, 'assets', 'app-abc123.js'), 'console.info(1)');
  mkdirSync(path.join(clientDir, '.vite'));
  writeFileSync(
    path.join(clientDir, '.vite', 'manifest.json'),
    JSON.stringify({
      'index.html': { file: 'assets/index-1.js', isEntry: true },
      'src/templates/classic/index.tsx': { file: 'assets/classic-1.js', imports: ['index.html'] },
      'src/openings/scenes.tsx': { file: 'assets/scenes-1.js', css: ['assets/scenes-1.css'] },
    }),
  );
});

afterAll(async () => {
  rmSync(clientDir, { recursive: true, force: true });
  await prisma.$disconnect();
});

beforeEach(async () => {
  ctx = createTestContext();
  await resetDatabase();
  await createInvitationFixture({ slug: SLUG, ownerPhone: '+996700000001', organizationId: null });
});

const app = () => buildTestApp(ctx, { clientDir });
const metaContent = (html: string, property: string) =>
  new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`).exec(html)?.[1];

describe('web pages', () => {
  it('serves hashed assets as immutable and pages as no-cache', async () => {
    const asset = await request(app()).get('/assets/app-abc123.js').expect(200);
    expect(asset.headers['cache-control']).toContain('immutable');

    for (const page of ['/', '/dashboard', '/create?template=tpl-test']) {
      const res = await request(app()).get(page).expect(200);
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.text).toContain('<title>Chakyruu.kg — той чакыруулары</title>');
      // Every non-invitation page shares the landing's preview.
      expect(metaContent(res.text, 'og:title')).toBe('Chakyruu.kg landing');
    }
  });

  it('preloads chunks only for invitations', async () => {
    for (const page of ['/', '/dashboard']) {
      expect((await request(app()).get(page).expect(200)).text).not.toContain('modulepreload');
    }
  });

  it('puts the invitation data and its template chunk into the HTML', async () => {
    const token = fixtureGuestToken(SLUG);
    const res = await request(app()).get(`/${SLUG}?g=${token}`).expect(200);
    expect(res.text).toContain('href="/assets/classic-1.js"');
    const json = /<script id="invitation-data" type="application\/json">([^<]*)<\/script>/.exec(res.text)?.[1];
    const payload = JSON.parse(json ?? 'null') as { slug: string; data: { hostNames: string; guest: { name: string } } };
    expect(payload.slug).toBe(SLUG);
    expect(payload.data.hostNames).toBe('Test & Test');
    expect(payload.data.guest.name).toBe('Нурлан');
    expect(res.text).not.toContain(token);
  });

  it('cannot break out of the embedded JSON', async () => {
    await prisma.invitation.update({ where: { slug: SLUG }, data: { message: '</script><script>alert(1)</script>' } });
    const res = await request(app()).get(`/${SLUG}`).expect(200);
    expect(res.text).not.toContain('</script><script>alert(1)');
    expect(res.text).toContain('\\u003c/script>\\u003cscript>alert(1)');
  });

  it('answers missing files with 404 instead of the page', async () => {
    await request(app()).get('/assets/app-old999.js').expect(404);
    await request(app()).get('/missing.png').expect(404);
  });

  it('gives the landing an absolute preview picture', async () => {
    const res = await request(app()).get('/').expect(200);
    expect(metaContent(res.text, 'og:image')).toBe('http://localhost:5173/og-landing.png');
  });

  it('serves robots.txt and a sitemap of public pages only', async () => {
    const robots = await request(app()).get('/robots.txt').expect(200);
    expect(robots.headers['content-type']).toContain('text/plain');
    expect(robots.text).toContain('Allow: /api/og/');
    expect(robots.text).toContain('Disallow: /api/');
    expect(robots.text).toContain('Sitemap: http://localhost:5173/sitemap.xml');
    const sitemap = await request(app()).get('/sitemap.xml').expect(200);
    expect(sitemap.text).toContain('<loc>http://localhost:5173/oferta</loc>');
    expect(sitemap.text).not.toContain(SLUG);
  });

  it('keeps unknown API paths as JSON 404s', async () => {
    const res = await request(app()).get('/api/nope').expect(404);
    expect(res.body.success).toBe(false);
  });

  it('adds Open Graph tags and noindex to a published invitation', async () => {
    const res = await request(app()).get(`/${SLUG}`).expect(200);
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.text).toContain('<title>Test &amp; Test — Үйлөнүү той</title>');
    expect(res.text.match(/<title>/g)).toHaveLength(1);
    // The landing's default Open Graph tags are replaced, not duplicated.
    expect(res.text.match(/property="og:title"/g)).toHaveLength(1);
    expect(res.text).not.toContain('og-landing.png');
    expect(metaContent(res.text, 'og:title')).toBe('Test &amp; Test — Үйлөнүү той');
    expect(metaContent(res.text, 'og:description')).toContain('15-июнь, 2027-ж. · 17:00 · Test hall');
    expect(metaContent(res.text, 'og:image')).toMatch(new RegExp(`/api/og/${SLUG}\\.png\\?v=\\d+$`));
    expect(metaContent(res.text, 'robots')).toBe('noindex, nofollow');
    expect(res.text).not.toContain('Default description');
  });

  it('greets the guest by name on a personal link without exposing the token', async () => {
    const token = fixtureGuestToken(SLUG);
    const res = await request(app()).get(`/${SLUG}?g=${token}`).expect(200);
    expect(metaContent(res.text, 'og:title')).toBe('Урматтуу Нурлан, сизди тойго чакырабыз!');
    expect(res.text).not.toContain(token);

    // A wrong token falls back to the general title.
    const wrong = await request(app()).get(`/${SLUG}?g=not_a_real_token_123`).expect(200);
    expect(metaContent(wrong.text, 'og:title')).toBe('Test &amp; Test — Үйлөнүү той');
  });

  it('escapes names so they cannot inject HTML', async () => {
    await prisma.invitation.update({ where: { slug: SLUG }, data: { hostNames: '"><script>alert(1)</script>' } });
    const res = await request(app()).get(`/${SLUG}`).expect(200);
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('uses the Russian title for Russian invitations', async () => {
    await prisma.invitation.update({ where: { slug: SLUG }, data: { language: 'RU' } });
    const res = await request(app()).get(`/${SLUG}?g=${fixtureGuestToken(SLUG)}`).expect(200);
    expect(metaContent(res.text, 'og:title')).toBe('Нурлан, приглашаем вас на той!');
    expect(metaContent(res.text, 'og:locale')).toBe('ru_RU');
  });

  it('preloads the hero photo, but only safe URLs', async () => {
    await prisma.invitation.update({ where: { slug: SLUG }, data: { photoUrl: '/uploads/abc.webp' } });
    const own = await request(app()).get(`/${SLUG}`).expect(200);
    expect(own.text).toContain('<link rel="preload" as="image" href="/uploads/abc.webp" fetchpriority="high" />');

    await prisma.invitation.update({ where: { slug: SLUG }, data: { photoUrl: 'javascript:alert(1)' } });
    const unsafe = await request(app()).get(`/${SLUG}`).expect(200);
    expect(unsafe.text).not.toContain('rel="preload" as="image"');
  });

  it('does not reveal drafts', async () => {
    await prisma.invitation.update({ where: { slug: SLUG }, data: { status: 'DRAFT' } });
    const res = await request(app()).get(`/${SLUG}`).expect(200);
    expect(res.text).not.toContain('Test &amp; Test');
    await request(app()).get(`/api/og/${SLUG}.png`).expect(404);
  });
});

describe('pictures', () => {
  it('renders the 1200×630 preview and caches it', { timeout: RENDER_TIMEOUT_MS }, async () => {
    const testApp = app();
    const first = await request(testApp).get(`/api/og/${SLUG}.png`).expect(200);
    expect(first.headers['content-type']).toBe('image/png');
    expect(await sharp(first.body as Buffer).metadata()).toMatchObject({ width: 1200, height: 630, format: 'png' });

    const started = Date.now();
    const second = await request(testApp).get(`/api/og/${SLUG}.png`).expect(200);
    expect(Buffer.compare(first.body as Buffer, second.body as Buffer)).toBe(0);
    expect(Date.now() - started).toBeLessThan(200);
  });

  it('renders the 1080×1920 Stories picture as a download', { timeout: RENDER_TIMEOUT_MS }, async () => {
    const res = await request(app()).get(`/api/og/${SLUG}/story.png`).expect(200);
    expect(res.headers['content-disposition']).toBe(`attachment; filename="${SLUG}-stories.png"`);
    expect(await sharp(res.body as Buffer).metadata()).toMatchObject({ width: 1080, height: 1920 });
  });

  it('gives a printable QR code of the invitation link', async () => {
    const res = await request(app()).get(`/api/og/${SLUG}/qr.png`).set('Origin', TEST_ORIGIN).expect(200);
    expect(res.headers['content-disposition']).toBe(`attachment; filename="${SLUG}-qr.png"`);
    expect((await sharp(res.body as Buffer).metadata()).width).toBeGreaterThanOrEqual(1000);
  });

  it('rejects malformed slugs and unknown invitations', async () => {
    await request(app()).get('/api/og/..%2F..%2Fetc.png').expect(400);
    await request(app()).get('/api/og/no-such-toi.png').expect(404);
    await request(app()).get('/api/og/no-such-toi/qr.png').expect(404);
  });
});
