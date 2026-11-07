import { EVENT_TITLES, buildIcs, rsvpSchema } from '@chakyruu/shared';
import { Router } from 'express';
import { answerRsvp } from '../guests/rsvp.service.js';
import { sendOk } from '../lib/http.js';
import { createPublicTilekRouter } from '../tilek/tilek.routes.js';
import { rateLimit } from '../lib/rateLimit.js';
import { publicInvitationQuerySchema, slugParamsSchema } from './invitation.schemas.js';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { getPublicInvitation } from './invitation.service.js';

const RSVP_WINDOW_MS = 10 * 60 * 1000;
const RSVP_MAX_PER_WINDOW = 20;

/** Mounted at /api/public/invitations — no login required. A factory so each app gets its own rate-limit state. */
/** Typical toi length for the calendar entry. */
const CALENDAR_EVENT_MINUTES = 5 * 60;

export function createPublicInvitationRouter({ appUrl }: { appUrl: string }): Router {
  const router = Router();

  /** "Календарга кошуу": an .ics the phone opens in its calendar app. Published invitations only. */
  router.get('/:slug/calendar.ics', async (req, res) => {
    const { slug } = slugParamsSchema.parse(req.params);
    const invitation = await prisma.invitation.findFirst({
      where: { slug, status: 'PUBLISHED', eventDate: { not: null } },
      select: { id: true, hostNames: true, eventType: true, eventDate: true, venueName: true, venueAddress: true },
    });
    if (!invitation?.eventDate) throw new HttpError(404, 'Invitation not found');
    const url = `${appUrl.replace(/\/+$/, '')}/${slug}`;
    const ics = buildIcs({
      uid: `${invitation.id}@chakyruu.kg`,
      title: `${invitation.hostNames} — ${EVENT_TITLES.KY[invitation.eventType]}`,
      description: `Сиздерди тойго чакырабыз! ${url}`,
      location: [invitation.venueName, invitation.venueAddress].filter(Boolean).join(', '),
      start: invitation.eventDate,
      durationMinutes: CALENDAR_EVENT_MINUTES,
      url,
    });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.ics"`);
    res.send(ics);
  });

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
