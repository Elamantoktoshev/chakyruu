import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { SLUG_PATTERN, isReservedSlug } from '@chakyruu/shared';
import express, { Router } from 'express';
import { publicInvitationQuerySchema } from '../invitations/invitation.schemas.js';
import { getPublicInvitation } from '../invitations/invitation.service.js';
import { findPublishedCard } from '../og/og.service.js';
import { injectMeta, invitationMeta } from './meta.js';
import { invitationModules, manifestPreloader, renderPreloadTags } from './preloads.js';

/** Vite puts content-hashed files here: they never change. */
const IMMUTABLE_ASSETS = '/assets/';
const ONE_YEAR_SECONDS = 31_536_000;

interface WebDeps {
  /** client/dist */
  clientDir: string;
  appUrl: string;
}

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

/** JSON inside <script>: "<" is escaped so user text can never close the tag. */
export function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function embedInvitation(html: string, slug: string, data: unknown): string {
  const script = `<script id="${EMBEDDED_INVITATION_ID}" type="application/json">${scriptSafeJson({ slug, data })}</script>`;
  return html.replace('</body>', `${script}\n  </body>`);
}

function addToHead(html: string, tags: string): string {
  return tags ? html.replace('</head>', `  ${tags}\n  </head>`) : html;
}

/**
 * Production web server for the React app: static files plus index.html for every page.
 * For a published invitation (/:slug) the HTML carries Open Graph tags, so WhatsApp and
 * Telegram show the names, date and picture — bots do not run JavaScript.
 */
export function createWebRouter({ clientDir, appUrl }: WebDeps): Router {
  const router = Router();
  const readIndexHtml = indexHtmlReader(path.join(clientDir, 'index.html'));
  const preloadsFor = manifestPreloader(clientDir);

  router.use(
    express.static(clientDir, {
      index: false,
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
    const indexHtml = readIndexHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Pages change with every deploy; assets are versioned by name.
    res.setHeader('Cache-Control', 'no-cache');

    const slug = invitationSlugOf(req.path);
    const card = slug ? await findPublishedCard(slug) : null;
    if (!slug || !card) {
      res.send(indexHtml);
      return;
    }
    // Everything the first paint needs arrives with the HTML: data, template chunk, hero photo.
    const { g: guestToken } = publicInvitationQuerySchema.parse(req.query);
    const invitation = await getPublicInvitation(slug, undefined, guestToken);
    const preloads = renderPreloadTags(preloadsFor(invitationModules(card.template.componentKey, card.openingAnimation !== 'NONE')));
    const withMeta = injectMeta(indexHtml, invitationMeta(card, invitation.guest?.name ?? null, appUrl));
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.send(embedInvitation(addToHead(withMeta, preloads), slug, invitation));
  });

  return router;
}
