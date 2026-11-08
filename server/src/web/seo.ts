import { DEFAULT_SITE_LOCALE, PUBLIC_PAGES, SITE_LOCALES, localizedPath } from '@chakyruu/shared';
import { Router } from 'express';

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

/**
 * Every public page in both languages. Each <url> lists its language versions (hreflang),
 * x-default being the Kyrgyz page. Invitations are personal (noindex) and never listed.
 */
export function sitemapXml(appUrl: string): string {
  const site = appUrl.replace(/\/+$/, '');
  const alternates = (page: string) => [
    ...SITE_LOCALES.map((locale) => `    <xhtml:link rel="alternate" hreflang="${locale}" href="${site}${localizedPath(locale, page)}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${site}${localizedPath(DEFAULT_SITE_LOCALE, page)}"/>`,
  ];
  const urls = PUBLIC_PAGES.flatMap((page) =>
    SITE_LOCALES.map((locale) => ['  <url>', `    <loc>${site}${localizedPath(locale, page)}</loc>`, ...alternates(page), '  </url>'].join('\n')),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
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
