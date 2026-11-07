import { catalogQuerySchema, slugSchema } from '@chakyruu/shared';
import { Router } from 'express';
import { z } from 'zod';
import { sendOk } from '../lib/http.js';
import { listTamadas, listVenues, recordTamadaClick, tamadaContact } from './catalog.service.js';

const CLICK_DEDUPE_MS = 10 * 60 * 1000;
const MAX_TRACKED_CLICKS = 10_000;

const orgParams = z.object({ id: z.string().min(1).max(40) });
const contactQuery = z.object({ invitation: slugSchema.optional() });
const venueQuery = z.object({ city: z.string().trim().min(1).max(60).optional() });

/** Mounted at /api/public. A factory so each app has its own click-dedupe memory. */
export function createCatalogRouter(): Router {
  const router = Router();
  const recentClicks = new Map<string, number>();

  /** The same visitor tapping again within 10 minutes is not a new lead for the tamada. */
  function isRepeatClick(key: string, now: number): boolean {
    const last = recentClicks.get(key);
    recentClicks.set(key, now);
    if (recentClicks.size > MAX_TRACKED_CLICKS) {
      for (const [k, at] of recentClicks) if (now - at > CLICK_DEDUPE_MS) recentClicks.delete(k);
    }
    return last !== undefined && now - last < CLICK_DEDUPE_MS;
  }

  router.get('/tamadas', async (req, res) => sendOk(res, await listTamadas(catalogQuerySchema.parse(req.query))));
  router.get('/venues', async (req, res) => sendOk(res, await listVenues(venueQuery.parse(req.query).city)));

  router.get('/tamadas/:id/contact', async (req, res) => {
    const { id } = orgParams.parse(req.params);
    const { invitation } = contactQuery.parse(req.query);
    const contact = await tamadaContact(id, invitation);
    if (!isRepeatClick(`${req.ip}:${id}`, Date.now())) await recordTamadaClick(id, contact.invitationId);
    res.redirect(302, contact.url);
  });

  return router;
}
