import { rsvpSchema } from '@chakyruu/shared';
import { Router } from 'express';
import { answerRsvp } from '../guests/rsvp.service.js';
import { sendOk } from '../lib/http.js';
import { createPublicTilekRouter } from '../tilek/tilek.routes.js';
import { rateLimit } from '../lib/rateLimit.js';
import { publicInvitationQuerySchema, slugParamsSchema } from './invitation.schemas.js';
import { getPublicInvitation } from './invitation.service.js';

const RSVP_WINDOW_MS = 10 * 60 * 1000;
const RSVP_MAX_PER_WINDOW = 20;

/** Mounted at /api/public/invitations — no login required. A factory so each app gets its own rate-limit state. */
export function createPublicInvitationRouter(): Router {
  const router = Router();

  router.get('/:slug', async (req, res) => {
    const { slug } = slugParamsSchema.parse(req.params);
    const { g } = publicInvitationQuerySchema.parse(req.query);
    sendOk(res, await getPublicInvitation(slug, res.locals.user, g));
  });

  router.post('/:slug/rsvp', rateLimit({ windowMs: RSVP_WINDOW_MS, max: RSVP_MAX_PER_WINDOW }), async (req, res) => {
    const { slug } = slugParamsSchema.parse(req.params);
    const body = rsvpSchema.parse(req.body);
    const result = await answerRsvp(slug, body);
    sendOk(res, { guest: result.guest, token: result.token }, result.created ? 201 : 200);
  });

  router.use('/:slug/tilekter', createPublicTilekRouter());
  return router;
}
