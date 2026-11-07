import {
  adminIdParamsSchema,
  adminLeadQuerySchema,
  adminOrgPatchSchema,
  adminOrgQuerySchema,
  adminPaymentQuerySchema,
  adminStatsQuerySchema,
  convertLeadSchema,
  grantCreditsSchema,
  leadPatchSchema,
  priceCodeParamsSchema,
  pricePatchSchema,
} from '@chakyruu/shared';
import { Router } from 'express';
import { currentUser, requireAuth } from '../auth/auth.middleware.js';
import { requireAdmin } from '../auth/requireRole.js';
import { sendOk } from '../lib/http.js';
import { createAdminTrackRouter, type AdminTrackDeps } from '../music/track.routes.js';
import { confirmPaymentByAdmin, listPaymentsForAdmin } from '../payments/status.service.js';
import { listAllPrices, updatePrice } from '../pricing/price.service.js';
import { getAdminStats } from './stats.service.js';
import { convertLead, grantCredits, listLeads, listOrganizations, setCatalogStatus, setLeadStatus } from './admin.service.js';

/** Mounted at /api/admin — super-admin only (everyone else gets 403). */
export function createAdminRouter(tracks: AdminTrackDeps): Router {
  const router = Router();
  router.use(requireAuth, requireAdmin);
  router.use('/tracks', createAdminTrackRouter(tracks));

  router.get('/stats', async (req, res) => sendOk(res, await getAdminStats(adminStatsQuerySchema.parse(req.query).period)));

  router.get('/organizations', async (req, res) => {
    sendOk(res, await listOrganizations(adminOrgQuerySchema.parse(req.query).type));
  });
  router.patch('/organizations/:id', async (req, res) => {
    const { id } = adminIdParamsSchema.parse(req.params);
    sendOk(res, await setCatalogStatus(id, adminOrgPatchSchema.parse(req.body).catalogStatus));
  });
  router.post('/organizations/:id/credits', async (req, res) => {
    const { id } = adminIdParamsSchema.parse(req.params);
    sendOk(res, await grantCredits(id, grantCreditsSchema.parse(req.body).amount, currentUser(res).id));
  });

  router.get('/leads', async (req, res) => sendOk(res, await listLeads(adminLeadQuerySchema.parse(req.query).status)));
  router.patch('/leads/:id', async (req, res) => {
    const { id } = adminIdParamsSchema.parse(req.params);
    sendOk(res, await setLeadStatus(id, leadPatchSchema.parse(req.body).status));
  });
  router.post('/leads/:id/convert', async (req, res) => {
    const { id } = adminIdParamsSchema.parse(req.params);
    sendOk(res, await convertLead(id, convertLeadSchema.parse(req.body).name), 201);
  });

  router.get('/prices', async (_req, res) => sendOk(res, await listAllPrices()));
  router.patch('/prices/:code', async (req, res) => {
    const { code } = priceCodeParamsSchema.parse(req.params);
    sendOk(res, await updatePrice(code, pricePatchSchema.parse(req.body)));
  });

  router.get('/payments', async (req, res) => {
    sendOk(res, await listPaymentsForAdmin(adminPaymentQuerySchema.parse(req.query).status));
  });
  router.post('/payments/:id/confirm', async (req, res) => {
    await confirmPaymentByAdmin(adminIdParamsSchema.parse(req.params).id, currentUser(res).id);
    sendOk(res, { confirmed: true });
  });

  return router;
}
