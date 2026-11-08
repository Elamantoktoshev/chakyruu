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

    for (const page of ['/ky/', '/dashboard', '/create?template=tpl-test']) {
      const res = await request(app()).get(page).expect(200);
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.text).toContain('<title>Chakyruu.kg — той чакыруулары</title>');
      // Without a server render bundle every page shares the landing's preview.
      expect(metaContent(res.text, 'og:title')).toBe('Chakyruu.kg landing');
    }
  });

  it('preloads chunks only for invitations', async () => {
    for (const page of ['/ky/', '/dashboard']) {
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
    const res = await request(app()).get('/ky/').expect(200);
    expect(metaContent(res.text, 'og:image')).toBe('http://localhost:5173/og-landing.png');
  });

  it('serves robots.txt and a sitemap of the public pages in both languages', async () => {
    const robots = await request(app()).get('/robots.txt').expect(200);
    expect(robots.headers['content-type']).toContain('text/plain');
    expect(robots.text).toContain('Allow: /api/og/');
    expect(robots.text).toContain('Disallow: /api/');
    expect(robots.text).toContain('Sitemap: http://localhost:5173/sitemap.xml');
    const sitemap = await request(app()).get('/sitemap.xml').expect(200);
    expect(sitemap.text).toContain('<loc>http://localhost:5173/ky/</loc>');
    expect(sitemap.text).toContain('<loc>http://localhost:5173/ru/templates</loc>');
    expect(sitemap.text).toContain('<xhtml:link rel="alternate" hreflang="ru" href="http://localhost:5173/ru/oferta"/>');
    expect(sitemap.text).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="http://localhost:5173/ky/oferta"/>');
    expect(sitemap.text.match(/<url>/g)).toHaveLength(12);
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

describe('public pages: server render, redirects, indexing', () => {
  const rendered = (overrides: Partial<Parameters<typeof buildTestApp>[1]> = {}) =>
    buildTestApp(ctx, {
      clientDir,
      ssrRender: async ({ url, data, siteUrl }) => ({
        html: `<main><h1>Rendered ${url}</h1><p>${Object.keys(data).join(',')}</p></main>`,
        head: `<title data-seo="">Page title</title>\n<link data-seo="" rel="canonical" href="${siteUrl}${url}" />`,
        lang: url.startsWith('/ru') ? 'ru' : 'ky',
      }),
      ...overrides,
    });

  it('returns the full page HTML with its own head, language and the data it was rendered with', async () => {
    const res = await request(rendered()).get('/ru/templates').expect(200);
    expect(res.text).toContain('<html lang="ru">');
    expect(res.text).toContain('<div id="root"><main><h1>Rendered /ru/templates</h1><p>templates</p></main></div>');
    expect(res.text).toContain('<title data-seo="">Page title</title>');
    // The default landing title and description are replaced, not duplicated.
    expect(res.text).not.toContain('Chakyruu.kg — той чакыруулары');
    expect(res.text).not.toContain('Default description');
    expect(res.text).toMatch(/<script id="initial-data" type="application\/json">\{"templates":\[.*\]\}<\/script>/);
    expect(res.text).not.toContain('noindex');
  });

  it('serves the browser-rendered page when the server render fails', async () => {
    const broken = buildTestApp(ctx, { clientDir, ssrRender: async () => Promise.reject(new Error('boom')) });
    const res = await request(broken).get('/ky/').expect(200);
    expect(res.text).toContain('<div id="root"></div>');
    expect(res.text).not.toContain('noindex');
  });

  it('moves old addresses to the Kyrgyz pages with 301, keeping the query', async () => {
    mkdirSync(path.join(clientDir, 'templates'), { recursive: true });
    for (const [from, to] of [
      ['/', '/ky/'],
      ['/templates', '/ky/templates'],
      ['/tamadalar?city=osh', '/ky/tamadalar?city=osh'],
      ['/oferta', '/ky/oferta'],
      ['/ky', '/ky/'],
      ['/ru/templates/', '/ru/templates'],
    ]) {
      const res = await request(rendered()).get(from).expect(301);
      expect(res.headers.location, from).toBe(to);
    }
  });

  it('marks app pages and unknown paths noindex', async () => {
    for (const page of ['/dashboard', '/login', '/no-such-thing']) {
      expect((await request(rendered()).get(page).expect(200)).text, page).toContain('<meta name="robots" content="noindex, nofollow" />');
    }
  });

  it('sends other hosts (www, *.ondigitalocean.app) to the main site in production, but not the API', async () => {
    const production = rendered({ isProduction: true, appUrl: 'https://chakyruu.kg' });
    const res = await request(production).get('/ru/templates?type=WEDDING').set('Host', 'www.chakyruu.kg').expect(301);
    expect(res.headers.location).toBe('https://chakyruu.kg/ru/templates?type=WEDDING');
    await request(production).get('/api/health').set('Host', 'chakyruu-umdne.ondigitalocean.app').expect(200);
  });
});

