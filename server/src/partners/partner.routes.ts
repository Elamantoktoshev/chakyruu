import {
  createGiftSchema,
  dateOnlySchema,
  hallSchema,
  orgProfileSchema,
  purchaseCreditsSchema,
  tamadaProfileSchema,
} from '@chakyruu/shared';
import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../auth/auth.middleware.js';
import { currentOrgId, requireOrgAdmin } from '../auth/requireRole.js';
import { cancelGift, issueGift, listOrgGifts } from '../gifts/gift.service.js';
import { sendOk } from '../lib/http.js';
import { purchaseCredits } from '../payments/credits.service.js';
import type { PaymentGateway } from '../payments/gateway.js';
import { receiveImage } from '../storage/imageUpload.js';
import type { StorageProvider } from '../storage/storage.provider.js';
import {
  addHall,
  deleteHall,
  getCredits,
  getPartnerProfile,
  setBusyDate,
  setPartnerLogo,
  setTamadaPhoto,
  updateHall,
  updatePartnerProfile,
  updateTamadaProfile,
} from './partner.service.js';
import { getPartnerStats } from './stats.service.js';

const hallParams = z.object({ hallId: z.string().min(1).max(40) });
const giftParams = z.object({ giftId: z.string().min(1).max(40) });
const dateParams = z.object({ date: dateOnlySchema });

interface PartnerCabinetDeps {
  storage: StorageProvider;
  checkout: { gateway: PaymentGateway; appUrl: string };
}

/**
 * Mounted at /api/partner. Every handler works on currentOrgId(res) — the organization
 * comes from the session, so a partner can never address another organization.
 */
export function createPartnerCabinetRouter({ storage, checkout }: PartnerCabinetDeps): Router {
  const router = Router();
  router.use(requireAuth, requireOrgAdmin);

  router.get('/profile', async (_req, res) => sendOk(res, await getPartnerProfile(currentOrgId(res))));
  router.patch('/profile', async (req, res) => {
    sendOk(res, await updatePartnerProfile(currentOrgId(res), orgProfileSchema.parse(req.body)));
  });
  router.post('/logo', receiveImage('logo'), async (req, res) => {
    sendOk(res, await setPartnerLogo(currentOrgId(res), req.file?.buffer ?? Buffer.alloc(0), storage));
  });

  router.post('/halls', async (req, res) => sendOk(res, await addHall(currentOrgId(res), hallSchema.parse(req.body)), 201));
  router.patch('/halls/:hallId', async (req, res) => {
    const { hallId } = hallParams.parse(req.params);
    sendOk(res, await updateHall(currentOrgId(res), hallId, hallSchema.parse(req.body)));
  });
  router.delete('/halls/:hallId', async (req, res) => {
    await deleteHall(currentOrgId(res), hallParams.parse(req.params).hallId);
    sendOk(res, { deleted: true });
  });

  router.patch('/tamada', async (req, res) => {
    sendOk(res, await updateTamadaProfile(currentOrgId(res), tamadaProfileSchema.parse(req.body)));
  });
  router.post('/tamada/photo', receiveImage('photo'), async (req, res) => {
    sendOk(res, await setTamadaPhoto(currentOrgId(res), req.file?.buffer ?? Buffer.alloc(0), storage));
  });
  router.put('/busy-dates/:date', async (req, res) => {
    await setBusyDate(currentOrgId(res), dateParams.parse(req.params).date, true);
    sendOk(res, { busy: true });
  });
  router.delete('/busy-dates/:date', async (req, res) => {
    await setBusyDate(currentOrgId(res), dateParams.parse(req.params).date, false);
    sendOk(res, { busy: false });
  });

  router.get('/credits', async (_req, res) => sendOk(res, await getCredits(currentOrgId(res))));
  router.post('/credits/purchase', async (req, res) => {
    const { priceCode, provider } = purchaseCreditsSchema.parse(req.body);
    sendOk(res, await purchaseCredits(currentOrgId(res), priceCode, provider, checkout));
  });
  router.get('/stats', async (_req, res) => sendOk(res, await getPartnerStats(currentOrgId(res))));

  router.get('/gifts', async (_req, res) => sendOk(res, await listOrgGifts(currentOrgId(res))));
  router.post('/gifts', async (req, res) => {
    const gift = await issueGift(currentOrgId(res), createGiftSchema.parse(req.body), currentUser(res).id);
    sendOk(res, gift, 201);
  });
  router.post('/gifts/:giftId/cancel', async (req, res) => {
    await cancelGift(currentOrgId(res), giftParams.parse(req.params).giftId);
    sendOk(res, { cancelled: true });
  });

  return router;
}
