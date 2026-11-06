import {
  createTilekSchema,
  hideTilekSchema,
  likeTilekSchema,
  myTilekParamsSchema,
  tilekListQuerySchema,
  tilekParamsSchema,
  invitationIdSchema,
} from '@chakyruu/shared';
import { Router } from 'express';
import { currentUser } from '../auth/auth.middleware.js';
import { slugParamsSchema } from '../invitations/invitation.schemas.js';
import { sendOk } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { createTilek, likeTilek, listOwnerTilekter, listPublicTilekter, setTilekHidden } from './tilek.service.js';

const WINDOW_MS = 10 * 60 * 1000;
const TILEKTER_PER_IP = 5;
const LIKES_PER_IP = 60;

/** Mounted at /api/public/invitations/:slug/tilekter. A factory so each app gets its own rate-limit state. */
export function createPublicTilekRouter(): Router {
  const router = Router({ mergeParams: true });

  router.get('/', async (req, res) => {
    const { slug } = slugParamsSchema.parse(req.params);
    const { clientId } = tilekListQuerySchema.parse(req.query);
    sendOk(res, await listPublicTilekter(slug, clientId));
  });

  router.post('/', rateLimit({ windowMs: WINDOW_MS, max: TILEKTER_PER_IP }), async (req, res) => {
    const { slug } = slugParamsSchema.parse(req.params);
    sendOk(res, await createTilek(slug, createTilekSchema.parse(req.body)), 201);
  });

  return router;
}

/** Mounted at /api/public/tilekter. */
export function createTilekLikeRouter(): Router {
  const router = Router();
  router.post('/:tilekId/like', rateLimit({ windowMs: WINDOW_MS, max: LIKES_PER_IP }), async (req, res) => {
    const { tilekId } = tilekParamsSchema.parse(req.params);
    const { clientId } = likeTilekSchema.parse(req.body);
    sendOk(res, await likeTilek(tilekId, clientId));
  });
  return router;
}

/** Mounted at /api/my/invitations/:id/tilekter (behind requireAuth). */
export const myTilekRouter = Router({ mergeParams: true });

myTilekRouter.get('/', async (req, res) => {
  const { id } = invitationIdSchema.parse(req.params);
  sendOk(res, await listOwnerTilekter(id, currentUser(res)));
});

myTilekRouter.patch('/:tilekId', async (req, res) => {
  const { id, tilekId } = myTilekParamsSchema.parse(req.params);
  const { hidden } = hideTilekSchema.parse(req.body);
  sendOk(res, await setTilekHidden(id, tilekId, hidden, currentUser(res)));
});
