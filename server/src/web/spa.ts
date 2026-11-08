import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { SLUG_PATTERN, isReservedSlug, legacyPublicRedirect, localizedPath, matchPublicPage, type PublicPage } from '@chakyruu/shared';
import express, { Router } from 'express';
import { publicInvitationQuerySchema } from '../invitations/invitation.schemas.js';
import { getPublicInvitation } from '../invitations/invitation.service.js';
import { findPublishedCard } from '../og/og.service.js';
import { scriptSafeJson } from './json.js';
import { injectMeta, invitationMeta } from './meta.js';
import { invitationModules, manifestPreloader, renderPreloadTags } from './preloads.js';
import { composePage, loadPageData, type SsrRender } from './ssr.js';
import { logger } from '../lib/logger.js';

/** Vite puts content-hashed files here: they never change. */
const IMMUTABLE_ASSETS = '/assets/';
const ONE_YEAR_SECONDS = 31_536_000;

interface WebDeps {
  /** client/dist */
  clientDir: string;
  appUrl: string;
  /** Added to every page (Sentry settings, analytics script). */
  headTags?: string;
  /** Server render of public pages (client/dist-ssr); null → they are drawn in the browser. */
  ssrRender?: SsrRender | null;
  /** Production: www / *.ondigitalocean.app page requests go to the appUrl host (one indexable site). */
  isCanonicalHostEnforced?: boolean;
}

/** App pages and unknown paths: never in search results (robots.txt also keeps crawlers out). */
const NOINDEX_TAG = '<meta name="robots" content="noindex, nofollow" />';

/** A file name with an extension ("/assets/app-1a2b.js", "/robots.txt"): never answered with index.html. */
const FILE_PATH = /\/[^/]+\.[a-z0-9]{1,8}$/i;

/** index.html, re-read when a new build replaces it (keeps a running server in sync with `vite build`). */
function indexHtmlReader(file: string): () => string {
  let cached = { mtimeMs: -1, html: '' };
  return () => {
    const { mtimeMs } = statSync(file);
    if (mtimeMs !== cached.mtimeMs) cached = { mtimeMs, html: readFileSync(file, 'utf8') };
    return cached.html;
  };
}

/** "/aibek-aizada" → "aibek-aizada"; anything else (nested paths, reserved words) → null. */
export function invitationSlugOf(pathname: string): string | null {
  const match = /^\/([^/]+)\/?$/.exec(pathname);
  const slug = match?.[1]?.toLowerCase();
  if (!slug || !SLUG_PATTERN.test(slug) || isReservedSlug(slug)) return null;
  return slug;
}

/** Must match client/src/api/embeddedInvitation.ts. */
const EMBEDDED_INVITATION_ID = 'invitation-data';

export { scriptSafeJson } from './json.js';

function embedInvitation(html: string, slug: string, data: unknown): string {
  const script = `<script id="${EMBEDDED_INVITATION_ID}" type="application/json">${scriptSafeJson({ slug, data })}</script>`;
  return html.replace('</body>', `${script}\n  </body>`);
}

/** Crawlers need an absolute og:image; index.html ships a site-relative one. */
function absoluteOgImage(html: string, appUrl: string): string {
  return html.replace(/(<meta\s+property="og:image"\s+content=")\/(?!\/)/, `$1${appUrl}/`);
}

function addToHead(html: string, tags: string): string {
  return tags ? html.replace('</head>', `  ${tags}\n  </head>`) : html;
}

/**
 * Production web server for the React app: static files plus index.html for every page.
 * For a published invitation (/:slug) the HTML carries Open Graph tags, so WhatsApp and
 * Telegram show the names, date and picture — bots do not run JavaScript.
 */
export function createWebRouter({ clientDir, appUrl, headTags = '', ssrRender = null, isCanonicalHostEnforced = false }: WebDeps): Router {
  const router = Router();
  const readIndexHtml = indexHtmlReader(path.join(clientDir, 'index.html'));
  const canonicalHost = new URL(appUrl).hostname;

  /** Full HTML of a public page; if the render fails, the browser draws it as before. */
  async function renderPublicPage(indexHtml: string, page: PublicPage, url: string): Promise<string> {
    const fallback = absoluteOgImage(indexHtml, appUrl);
    if (!ssrRender) return fallback;
    try {
      const data = await loadPageData(page);
      return composePage(indexHtml, await ssrRender({ url, data, siteUrl: appUrl }), data);
    } catch (error: unknown) {
      logger.error({ err: error, url }, '[ssr] render failed, serving the browser-rendered page');
      return fallback;
    }
  }
  const preloadsFor = manifestPreloader(clientDir);

  router.use(
    express.static(clientDir, {
      index: false,
      // A folder such as public/templates/ must not turn /templates into a 301 to /templates/.
      redirect: false,
      dotfiles: 'ignore',
      setHeaders: (res, filePath) => {
        const isHashed = filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes(IMMUTABLE_ASSETS);
        res.setHeader('Cache-Control', isHashed ? `public, max-age=${ONE_YEAR_SECONDS}, immutable` : 'public, max-age=3600');
      },
    }),
  );

  router.use(async (req, res, next) => {
    // Missing files (an old asset after a deploy) get a real 404, not the HTML page.
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api/') || FILE_PATH.test(req.path)) {
      next();
      return;
    }
    const query = req.originalUrl.slice(req.path.length);
    if (isCanonicalHostEnforced && req.hostname !== canonicalHost) {
      res.redirect(301, `${appUrl}${req.originalUrl}`);
      return;
    }
    const legacy = legacyPublicRedirect(req.path);
    if (legacy) {
      res.redirect(301, `${legacy}${query}`);
      return;
    }

    const indexHtml = addToHead(readIndexHtml(), headTags);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Pages change with every deploy; assets are versioned by name.
    res.setHeader('Cache-Control', 'no-cache');

    const publicPage = matchPublicPage(req.path);
    if (publicPage) {
      const canonicalPath = localizedPath(publicPage.locale, publicPage.page);
      if (req.path !== canonicalPath) {
        res.redirect(301, `${canonicalPath}${query}`);
        return;
      }
      res.send(await renderPublicPage(indexHtml, publicPage.page, req.originalUrl));
      return;
    }

    const slug = invitationSlugOf(req.path);
    const card = slug ? await findPublishedCard(slug) : null;
    if (!slug || !card) {
      res.send(addToHead(absoluteOgImage(indexHtml, appUrl), NOINDEX_TAG));
      return;
    }
    // Everything the first paint needs arrives with the HTML: data, template chunk, hero photo.
    const { g: guestToken } = publicInvitationQuerySchema.parse(req.query);
    const invitation = await getPublicInvitation(slug, undefined, guestToken);
    const preloads = renderPreloadTags(preloadsFor(invitationModules(card.template.componentKey, card.openingAnimation)));
    const withMeta = injectMeta(indexHtml, invitationMeta(card, invitation.guest?.name ?? null, appUrl));
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.send(embedInvitation(addToHead(withMeta, preloads), slug, invitation));
  });

  return router;
}
