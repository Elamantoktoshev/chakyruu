import { Router } from 'express';

/** Public pages worth indexing. Invitations are personal (noindex) and never listed. */
export const SITEMAP_PATHS = ['/', '/tamadalar', '/oferta', '/privacy', '/contacts'] as const;

/**
 * Crawling: everything public is allowed so crawlers can also see the noindex of invitation pages.
 * Private areas and the API are disallowed — except link-preview pictures (/api/og/), which
 * Telegram, Facebook and X fetch only if robots.txt permits.
 */
export function robotsTxt(appUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /api/og/',
    'Disallow: /api/',
    'Disallow: /create',
    'Disallow: /dashboard',
    'Disallow: /pay',
    'Disallow: /admin',
    'Disallow: /partner',
    'Disallow: /login',
    'Disallow: /uploads/',
    '',
    `Sitemap: ${appUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

export function sitemapXml(appUrl: string): string {
  const urls = SITEMAP_PATHS.map((path) => `  <url><loc>${appUrl}${path === '/' ? '/' : path}</loc></url>`);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
}

const ONE_DAY_SECONDS = 86_400;

export function createSeoRouter(appUrl: string): Router {
  const router = Router();
  router.get('/robots.txt', (_req, res) => {
    res.type('text/plain').setHeader('Cache-Control', `public, max-age=${ONE_DAY_SECONDS}`).send(robotsTxt(appUrl));
  });
  router.get('/sitemap.xml', (_req, res) => {
    res.type('application/xml').setHeader('Cache-Control', `public, max-age=${ONE_DAY_SECONDS}`).send(sitemapXml(appUrl));
  });
  return router;
}
