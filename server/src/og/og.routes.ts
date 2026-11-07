import { Router } from 'express';
import { HttpError } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { slugParamsSchema } from '../invitations/invitation.schemas.js';
import { findPublishedCard, invitationQrPng, type PictureKind, type PictureRenderer } from './og.service.js';

/** Rendering is CPU-heavy; cached pictures are cheap, but a flood of fresh slugs must not stall the API. */
const PICTURE_WINDOW_MS = 60 * 1000;
/** Link-preview crawlers (Telegram, Facebook) share a few IPs; cached pictures cost almost nothing. */
const PICTURES_PER_WINDOW = 120;
/** URLs carry ?v=<updatedAt>, so a picture may be cached for a long time. */
const PICTURE_CACHE = 'public, max-age=86400';

interface Deps {
  renderer: PictureRenderer;
  appUrl: string;
}

/**
 * GET /api/og/:slug.png        — 1200×630 link preview (og:image)
 * GET /api/og/:slug/story.png  — 1080×1920 Stories picture with a QR code
 * GET /api/og/:slug/qr.png     — QR code of the invitation link, for printing
 */
export function createOgRouter({ renderer, appUrl }: Deps): Router {
  const router = Router();
  router.use(rateLimit({ windowMs: PICTURE_WINDOW_MS, max: PICTURES_PER_WINDOW }));

  async function sendPicture(slugParam: unknown, kind: PictureKind, res: import('express').Response, filename?: string) {
    const { slug } = slugParamsSchema.parse({ slug: slugParam });
    const picture = await renderer.render(slug, kind);
    if (!picture) throw new HttpError(404, 'Invitation not found');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', PICTURE_CACHE);
    if (filename) res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(picture.png);
  }

  router.get('/:slug.png', (req, res) => sendPicture(req.params.slug, 'og', res));
  router.get('/:slug/story.png', (req, res) => sendPicture(req.params.slug, 'story', res, `${String(req.params.slug)}-stories.png`));

  router.get('/:slug/qr.png', async (req, res) => {
    const { slug } = slugParamsSchema.parse(req.params);
    if (!(await findPublishedCard(slug))) throw new HttpError(404, 'Invitation not found');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', PICTURE_CACHE);
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-qr.png"`);
    res.send(await invitationQrPng(`${appUrl}/${slug}`));
  });

  return router;
}
