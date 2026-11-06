import { Router } from 'express';
import { sendOk } from '../lib/http.js';
import { rateLimit } from '../lib/rateLimit.js';
import { rsvpBodySchema, slugParamsSchema } from './invitation.schemas.js';
import { createRsvp, getPublicInvitation, listRsvps } from './invitation.service.js';

const RSVP_WINDOW_MS = 10 * 60 * 1000;
const RSVP_MAX_PER_WINDOW = 20;

export const invitationRouter = Router();

invitationRouter.get('/:slug', async (req, res) => {
  const { slug } = slugParamsSchema.parse(req.params);
  sendOk(res, await getPublicInvitation(slug));
});

invitationRouter.post(
  '/:slug/rsvp',
  rateLimit({ windowMs: RSVP_WINDOW_MS, max: RSVP_MAX_PER_WINDOW }),
  async (req, res) => {
    const { slug } = slugParamsSchema.parse(req.params);
    const input = rsvpBodySchema.parse(req.body);
    sendOk(res, await createRsvp(slug, input), 201);
  },
);

// TODO(auth): restrict to the invitation owner / org admin once authentication is implemented.
invitationRouter.get('/:slug/rsvps', async (req, res) => {
  const { slug } = slugParamsSchema.parse(req.params);
  sendOk(res, await listRsvps(slug));
});
