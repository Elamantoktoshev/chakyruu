import { partnerLeadSchema } from '@chakyruu/shared';
import { Router } from 'express';
import { sendOk } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { rateLimit } from '../lib/rateLimit.js';

const WINDOW_MS = 60 * 60 * 1000;
const LEADS_PER_IP = 3;

/** Mounted at /api/public/partner-leads. A factory so each app gets its own rate-limit state. */
export function createPartnerRouter(): Router {
  const router = Router();
  router.post('/', rateLimit({ windowMs: WINDOW_MS, max: LEADS_PER_IP }), async (req, res) => {
    const lead = partnerLeadSchema.parse(req.body);
    await prisma.partnerLead.create({ data: { ...lead, city: lead.city ?? null } });
    // Nothing is echoed back: the lead contains a phone number.
    sendOk(res, { received: true }, 201);
  });
  return router;
}
