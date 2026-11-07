import { Router } from 'express';
import { currentUser, requireAuth } from '../auth/auth.middleware.js';
import { sendOk } from '../lib/http.js';
import { listMyGifts } from './gift.service.js';

/** Mounted at /api/my/gifts — gifts addressed to the logged-in client's phone. */
export const myGiftRouter = Router();
myGiftRouter.use(requireAuth);
myGiftRouter.get('/', async (_req, res) => sendOk(res, await listMyGifts(currentUser(res))));
