import {
  createInvitationSchema,
  invitationDraftSchema,
  invitationIdSchema,
  publishSchema,
} from '@chakyruu/shared';
import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { currentUser, requireAuth } from '../auth/auth.middleware.js';
import { guestRouter } from '../guests/guest.routes.js';
import { myTilekRouter } from '../tilek/tilek.routes.js';
import { HttpError, sendOk } from '../lib/http.js';
import type { PaymentProvider } from '../payments/payment.provider.js';
import type { StorageProvider } from '../storage/storage.provider.js';
import {
  createDraft,
  getOwnerInvitation,
  listMyInvitations,
  publishInvitation,
  setPhoto,
  updateDraft,
} from './my.service.js';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0 },
}).single('photo');

/** Runs multer and turns its errors into our HttpError envelope. */
const receivePhoto: RequestHandler = (req, res, next) => {
  photoUpload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      next(new HttpError(tooLarge ? 413 : 400, tooLarge ? 'Photo must be at most 5 MB' : 'Invalid upload'));
      return;
    }
    next(error);
  });
};

export interface MyInvitationsRouterDeps {
  storage: StorageProvider;
  payments: PaymentProvider;
}

export function createMyInvitationsRouter({ storage, payments }: MyInvitationsRouterDeps): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    sendOk(res, await listMyInvitations(currentUser(res)));
  });

  router.post('/', async (req, res) => {
    const { templateId } = createInvitationSchema.parse(req.body);
    sendOk(res, await createDraft(currentUser(res), templateId), 201);
  });

  router.get('/:id', async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    sendOk(res, await getOwnerInvitation(id, currentUser(res)));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    const input = invitationDraftSchema.parse(req.body);
    sendOk(res, await updateDraft(id, currentUser(res), input));
  });

  router.post('/:id/photo', receivePhoto, async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    if (!req.file) throw new HttpError(400, 'Attach the image as the "photo" field');
    sendOk(res, await setPhoto(id, currentUser(res), req.file.buffer, storage));
  });

  router.post('/:id/publish', async (req, res) => {
    const { id } = invitationIdSchema.parse(req.params);
    const { provider } = publishSchema.parse(req.body);
    sendOk(res, await publishInvitation(id, currentUser(res), provider, payments));
  });

  router.use('/:id/guests', guestRouter);
  router.use('/:id/tilekter', myTilekRouter);

  return router;
}
